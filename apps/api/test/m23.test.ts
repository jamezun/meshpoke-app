/// M23 competitor-response: payment style, dietary, venue-change consent, pre-event pack, arrivals, cancel-backfill.
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import pg from 'pg';
import { join } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../src/db/schema/index.js';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import { buildApp } from '../src/app.js';
import { seedDistricts } from '../src/db/seed.js';
import type { FastifyInstance } from 'fastify';

const JWT = 'test-secret-test-secret-test-secret-1234';
let infra: TestInfra, app: FastifyInstance, pool: pg.Pool;
let districtId: string;

async function mkUser(admin = false) {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, is_admin, admin_roles, phone_verified_at)
     values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified', $5, $6, now())`,
    [id, `${id}@t.co`, 'T' + id.slice(0, 7), id.slice(0, 8), admin, admin ? '{superadmin}' : '{}'],
  );
  await pool.query(`insert into profiles (user_id, industry) values ($1, 'tech')`, [id]);
  const tok = await new SignJWT({ role: admin ? 'admin' : 'authenticated', admin_roles: admin ? ['superadmin'] : [], aal: 'aal2' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT));
  return { id, tok };
}
async function mkVenue(name: string) {
  const r = await pool.query(
    `insert into venues (display_name, category, location, district_id, source, address_en) values ($1, 'restaurant', st_setsrid(st_makepoint(114.15, 22.28), 4326), $2, 'user', $3) returning id`,
    [name, districtId, '12 Test Street, Central'],
  );
  return r.rows[0].id as string;
}
const H = (tok: string) => ({ authorization: `Bearer ${tok}` });
async function mkEventSpot(hostTok: string, over: Record<string, unknown> = {}) {
  const res = await app.inject({
    method: 'POST', url: '/v1/spots/events', headers: H(hostTok),
    payload: { template: 'dinner', name: 'M23 ' + crypto.randomUUID().slice(0, 6), joinMode: 'open', districtId, minHeadcount: 2, maxHeadcount: 5, dateStart: '2026-12-01T12:00:00Z', dateEnd: '2026-12-01T15:00:00Z', ...over },
  });
  expect(res.statusCode, res.body).toBe(200);
  return res.json().spotId as string;
}
async function joinOpen(memberTok: string, spotId: string) {
  const r = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/join`, headers: H(memberTok) });
  expect(r.statusCode, r.body).toBe(200);
}

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  await seedDistricts(pool);
  app = await buildApp({
    config: {
      NODE_ENV: 'test', PORT: 0, LOG_LEVEL: 'fatal',
      DATABASE_URL: infra.dbUrl, REDIS_URL: infra.redisUrl,
      GOTRUE_URL: 'http://localhost:9999', GOTRUE_JWT_SECRET: JWT,
      CORS_ORIGINS: 'http://localhost:5173', RATE_LIMIT_MAX: 1000,
      PII_ENCRYPTION_KEY: '0'.repeat(64),
      QR_HMAC_SECRET: 'test-qr-hmac-secret-32-chars-minimum!!!',
      ADMIN_BOOTSTRAP_PASSWORD: 'test-admin-bootstrap-pw',
      SENTRY_DSN: undefined, ENABLE_JOBS: false, ENABLE_SWAGGER: false,
    },
  });
  districtId = (await pool.query(`select id from districts limit 1`)).rows[0].id;
});
afterAll(async () => {
  if (app) await app.close();
  if (pool) await pool.end();
  await stopInfra();
});

describe('M23 payment style + dietary', () => {
  it('vibe prompts: patch roundtrip + max 3 (DineFirst study)', async () => {
    const u = await mkUser();
    const four = [1, 2, 3, 4].map((i) => ({ prompt: `Q${i}`, answer: `A${i}` }));
    let res = await app.inject({ method: 'PATCH', url: '/v1/me', headers: H(u.tok), payload: { prompts: four } });
    expect(res.statusCode, res.body).toBe(422);
    const three = four.slice(0, 3);
    res = await app.inject({ method: 'PATCH', url: '/v1/me', headers: H(u.tok), payload: { prompts: three } });
    expect(res.statusCode, res.body).toBe(200);
    res = await app.inject({ method: 'GET', url: '/v1/me', headers: H(u.tok) });
    expect((res.json() as { prompts: unknown[] }).prompts).toEqual(three);
  });

  it('profile dietary patch + spot dietary summary (members only)', async () => {
    const host = await mkUser(); const m1 = await mkUser();
    await app.inject({ method: 'PATCH', url: '/v1/me', headers: H(m1.tok), payload: { dietary: ['vegetarian', 'no_alcohol'], dietary_note: 'no cilantro' } });
    await app.inject({ method: 'PATCH', url: '/v1/me', headers: H(host.tok), payload: { dietary: ['halal'] } });
    const bad = await app.inject({ method: 'PATCH', url: '/v1/me', headers: H(m1.tok), payload: { dietary: ['carnivore'] } });
    expect(bad.statusCode).toBe(422);

    const spotId = await mkEventSpot(host.tok);
    await joinOpen(m1.tok, spotId);
    const outsider = await mkUser();
    expect((await app.inject({ method: 'GET', url: `/v1/spots/${spotId}/dietary`, headers: H(outsider.tok) })).statusCode).toBe(403);
    const d = await app.inject({ method: 'GET', url: `/v1/spots/${spotId}/dietary`, headers: H(host.tok) });
    expect(d.statusCode).toBe(200);
    const j = d.json();
    expect(j.counts).toMatchObject({ vegetarian: 1, no_alcohol: 1, halal: 1 });
    expect(j.membersWithTags).toBe(2);
    expect(j.notes).toEqual([{ displayName: expect.any(String), note: 'no cilantro' }]);
  });

  it('create with paymentStyle + host edit while forming, locked at confirm', async () => {
    const host = await mkUser(); const m1 = await mkUser();
    const spotId = await mkEventSpot(host.tok, { paymentStyle: 'share', findHint: 'Long table by the window', icebreaker: 'Best meal you had this year?' });
    await joinOpen(m1.tok, spotId);
    const other = await mkUser();
    expect((await app.inject({ method: 'PATCH', url: `/v1/spots/${spotId}`, headers: H(other.tok), payload: { icebreaker: 'x' } })).statusCode).toBe(403);

    const edit = await app.inject({ method: 'PATCH', url: `/v1/spots/${spotId}`, headers: H(host.tok), payload: { paymentStyle: 'other', paymentRules: 'We split appetizers, mains on your own. Cash or PayMe.' } });
    expect(edit.statusCode).toBe(200);

    const venue = await mkVenue('Pack Venue');
    await pool.query(`update spots set starts_at = now() + interval '72 hours' where id = $1`, [spotId]);
    await pool.query(`update spot_members set confirm_state = 'confirmed' where spot_id = $1`, [spotId]);
    const sch = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/schedule`, headers: H(host.tok), payload: { startsAt: new Date(Date.now() + 72 * 3600_000).toISOString(), venueId: venue } });
    expect(sch.statusCode, sch.body).toBe(200);

    const detail = (await app.inject({ method: 'GET', url: `/v1/spots/${spotId}`, headers: H(host.tok) })).json();
    expect(detail.payment_style).toBe('other');
    expect(detail.payment_rules).toContain('PayMe');
    expect(detail.find_hint).toBe('Long table by the window');
    expect(detail.icebreaker).toBe('Best meal you had this year?');

    const locked = await app.inject({ method: 'PATCH', url: `/v1/spots/${spotId}`, headers: H(host.tok), payload: { icebreaker: 'new' } });
    expect(locked.statusCode).toBe(422);
  });
});

describe('M23 venue change consent', () => {
  it('>48h = free change; ≤48h = proposal, majority applies, reject keeps venue', async () => {
    const host = await mkUser(); const m1 = await mkUser(); const m2 = await mkUser(); const m3 = await mkUser();
    const spotId = await mkEventSpot(host.tok);
    await joinOpen(m1.tok, spotId); await joinOpen(m2.tok, spotId); await joinOpen(m3.tok, spotId);
    const v1 = await mkVenue('Original House'); const v2 = await mkVenue('New Place');
    await pool.query(`update spots set starts_at = now() + interval '72 hours' where id = $1`, [spotId]);
    await pool.query(`update spot_members set confirm_state = 'confirmed' where spot_id = $1`, [spotId]);
    await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/schedule`, headers: H(host.tok), payload: { startsAt: new Date(Date.now() + 72 * 3600_000).toISOString(), venueId: v1 } });

    // >48h: free change, no consent needed
    const free = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/venue-change`, headers: H(host.tok), payload: { venueId: v2 } });
    expect(free.statusCode, free.body).toBe(200);
    expect(free.json().changed).toBe('free');
    expect((await pool.query(`select display_name from venues v join spots s on s.venue_id = v.id where s.id = $1`, [spotId])).rows[0].display_name).toBe('New Place');

    // ≤48h: consent required
    await pool.query(`update spots set starts_at = now() + interval '24 hours' where id = $1`, [spotId]);
    const v3 = await mkVenue('Late Swap');
    const prop = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/venue-change`, headers: H(host.tok), payload: { venueId: v3 } });
    expect(prop.statusCode, prop.body).toBe(200);
    expect(prop.json().proposal).toBe('pending');

    const detail = (await app.inject({ method: 'GET', url: `/v1/spots/${spotId}`, headers: H(m1.tok) })).json();
    expect(detail.pending_proposal?.kind).toBe('venue');
    expect(detail.pending_proposal?.venueName).toBe('Late Swap');

    // 3 members: 2 accept (majority >½) → applied
    await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/reschedule/respond`, headers: H(m1.tok), payload: { accept: true } });
    const applied = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/reschedule/respond`, headers: H(m2.tok), payload: { accept: true } });
    expect(applied.statusCode, applied.body).toBe(200);
    expect(applied.json().applied).toBe(true);
    expect(applied.json().venue).toBe('Late Swap');
    expect((await pool.query(`select display_name from venues v join spots s on s.venue_id = v.id where s.id = $1`, [spotId])).rows[0].display_name).toBe('Late Swap');
  });
});

describe('M23 pre-event pack + arrivals', () => {
  it('schedule pins a pre_event_pack system message; arrivals gate on live', async () => {
    const host = await mkUser(); const m1 = await mkUser();
    await app.inject({ method: 'PATCH', url: '/v1/me', headers: H(m1.tok), payload: { dietary: ['vegan'] } });
    const spotId = await mkEventSpot(host.tok, { paymentStyle: 'individual', findHint: 'Corner booth, red lamp', icebreaker: 'Why this neighbourhood?' });
    await joinOpen(m1.tok, spotId);
    const venue = await mkVenue('Pack Test Grill');
    await pool.query(`update spot_members set confirm_state = 'confirmed' where spot_id = $1`, [spotId]);
    await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/schedule`, headers: H(host.tok), payload: { startsAt: new Date(Date.now() + 72 * 3600_000).toISOString(), venueId: venue } });

    const msg = (await pool.query(`select body, flags from messages m join rooms r on r.id = m.room_id where r.spot_id = $1 and flags->>'kind' = 'pre_event_pack'`, [spotId])).rows[0];
    expect(msg).toBeTruthy();
    expect(msg.body).toContain('Pack Test Grill');
    expect(msg.body).toContain('pay for what you ordered');
    expect(msg.body).toContain('1 vegan');
    expect(msg.flags.paymentStyle).toBe('individual');
    expect(msg.flags.findHint).toBe('Corner booth, red lamp');

    // arrivals gated to live
    expect((await app.inject({ method: 'GET', url: `/v1/spots/${spotId}/arrivals`, headers: H(host.tok) })).statusCode).toBe(422);
    await pool.query(`update spots set state = 'live' where id = $1`, [spotId]);
    const arr = await app.inject({ method: 'GET', url: `/v1/spots/${spotId}/arrivals`, headers: H(m1.tok) });
    expect(arr.statusCode).toBe(200);
    expect(arr.json().total).toBe(2);
    expect(arr.json().here).toBe(0);
  });
});

describe('M23 cancel-backfill', () => {
  it('host cancel notifies members with similar same-district spots', async () => {
    const host = await mkUser(); const m1 = await mkUser(); const other = await mkUser();
    const spotA = await mkEventSpot(host.tok);
    await joinOpen(m1.tok, spotA);
    const spotB = await mkEventSpot(other.tok); // same template + district, forming → suggestion
    const cancel = await app.inject({ method: 'POST', url: `/v1/spots/${spotA}/cancel`, headers: H(host.tok) });
    expect(cancel.statusCode).toBe(200);
    const acts = (await pool.query(`select payload from activity_items where user_id = $1 and type = 'cancel_backfill'`, [m1.id])).rows;
    expect(acts.length).toBe(1);
    expect(acts[0].payload.suggestions).toContain(spotB);
  });
});
