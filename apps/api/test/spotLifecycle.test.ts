/// T9.4: full state machine — decisions → date-on-fill → confirm/bail → dissolve/backfill → host cancel.
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
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, is_admin, admin_roles)
     values ($1, $2, 'email', 'T', '1990-01-01', $3, 'verified', $4, $5)`,
    [id, `${id}@t.co`, id.slice(0, 8), admin, admin ? '{superadmin}' : '{}'],
  );
  const tok = await new SignJWT({ role: admin ? 'admin' : 'authenticated', admin_roles: admin ? ['superadmin'] : [], aal: 'aal2' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT));
  return { id, tok };
}
async function mkVenue() {
  const r = await pool.query(`insert into venues (display_name, category, location, district_id, source) values ($1, 'restaurant', st_setsrid(st_makepoint(114.15, 22.28), 4326), $2, 'user') returning id`, ['Test Cafe', districtId]);
  return r.rows[0].id as string;
}
async function mkEventSpot(hostTok: string, over: Record<string, unknown> = {}) {
  const res = await app.inject({
    method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${hostTok}` },
    payload: { template: 'dinner', name: 'SM ' + crypto.randomUUID().slice(0, 6), joinMode: 'application', districtId, minHeadcount: 3, maxHeadcount: 5, dateStart: '2026-12-01T12:00:00Z', dateEnd: '2026-12-01T15:00:00Z', ...over },
  });
  expect(res.statusCode).toBe(200);
  return res.json().spotId as string;
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
afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

describe('spot lifecycle', () => {
  it('decision → date-on-fill → confirm → live; dissolve when below min after deadline; host cancel posts apology', async () => {
    const host = await mkUser();
    const guests = [await mkUser(), await mkUser(), await mkUser(), await mkUser()];
    const spotId = await mkEventSpot(host.tok, { minHeadcount: 3, maxHeadcount: 5 });

    // 4 applications
    const appIds: string[] = [];
    for (const g of guests) {
      const r = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/apply`, headers: { authorization: `Bearer ${g.tok}` }, payload: {} });
      expect(r.statusCode).toBe(200);
      const row = await pool.query(`select a.id from applications a where a.spot_id = $1 and a.user_id = $2`, [spotId, g.id]);
      appIds.push(row.rows[0].id);
    }

    // schedule refused before min accepted
    const early = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/schedule`, headers: { authorization: `Bearer ${host.tok}` }, payload: { startsAt: '2026-12-01T12:00:00Z', venueId: await mkVenue() } });
    expect(early.statusCode).toBe(422);

    // accept 3, decline 1 with reason
    for (let i = 0; i < 3; i++) {
      const d = await app.inject({ method: 'POST', url: `/v1/applications/${appIds[i]}/decision`, headers: { authorization: `Bearer ${host.tok}` }, payload: { decision: 'accept' } });
      expect(d.statusCode).toBe(200);
      expect(d.json().status).toBe('accepted');
    }
    const dec = await app.inject({ method: 'POST', url: `/v1/applications/${appIds[3]}/decision`, headers: { authorization: `Bearer ${host.tok}` }, payload: { decision: 'decline', reason: 'full', note: 'sorry' } });
    expect(dec.statusCode).toBe(200);
    const reasonRow = await pool.query(`select decline_reason from applications where id = $1`, [appIds[3]]);
    expect(reasonRow.rows[0].decline_reason).toContain('full');
    expect(reasonRow.rows[0].decline_reason).toContain('sorry');

    // non-host cannot schedule
    const venueId = await mkVenue();
    const notHost = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/schedule`, headers: { authorization: `Bearer ${guests[0].tok}` }, payload: { startsAt: '2026-12-01T12:00:00Z', venueId } });
    expect(notHost.statusCode).toBe(403);

    // schedule → confirmed + 48h deadline
    const sch = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/schedule`, headers: { authorization: `Bearer ${host.tok}` }, payload: { startsAt: '2026-12-01T12:00:00Z', venueId } });
    expect(sch.statusCode).toBe(200);
    expect(sch.json().state).toBe('confirmed');
    const spotState = await pool.query(`select state, confirm_deadline from spots where id = $1`, [spotId]);
    expect(spotState.rows[0].state).toBe('confirmed');
    expect(new Date(spotState.rows[0].confirm_deadline).getTime()).toBeGreaterThan(Date.now() + 47 * 3600_000);

    // members confirm
    for (const g of guests.slice(0, 2)) {
      const c = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/confirm`, headers: { authorization: `Bearer ${g.tok}` } });
      expect(c.statusCode).toBe(200);
    }

    // guest 3 (index 2) BAILS late (< 24h to start? event is far — set starts_at near to test penalty)
    // late-bail test: schedule another spot with starts_at in 1h, bail → late_cancel score event
    const host2 = await mkUser();
    const spot2 = await mkEventSpot(host2.tok, { joinMode: 'open', minHeadcount: 2, maxHeadcount: 5 });
    const gA = await mkUser();
    const gB = await mkUser();
    for (const g of [gA, gB]) await app.inject({ method: 'POST', url: `/v1/spots/${spot2}/join`, headers: { authorization: `Bearer ${g.tok}` } });
    const sch2 = await app.inject({ method: 'POST', url: `/v1/spots/${spot2}/schedule`, headers: { authorization: `Bearer ${host2.tok}` }, payload: { startsAt: new Date(Date.now() + 3600_000).toISOString().replace('.000', ''), venueId: await mkVenue() } });
    expect(sch2.statusCode).toBe(200);
    const bail = await app.inject({ method: 'POST', url: `/v1/spots/${spot2}/bail`, headers: { authorization: `Bearer ${gA.tok}` } });
    expect(bail.statusCode).toBe(200);
    expect(bail.json().penalty).toBe('bailUnder24'); // 1h out → 0.5 points
    const se = await pool.query(`select type from score_events where user_id = $1 and spot_id = $2`, [gA.id, spot2]);
    expect(se.rows[0]?.type).toBe('late_cancel');

    // waitlist backfill: fill spot to cap with waitlisted member, then a member bails → promotion
    const host3 = await mkUser();
    const spot3 = await mkEventSpot(host3.tok, { joinMode: 'open', minHeadcount: 2, maxHeadcount: 3 });
    const m1 = await mkUser(), m2 = await mkUser(), wl = await mkUser();
    for (const g of [m1, m2, wl]) await app.inject({ method: 'POST', url: `/v1/spots/${spot3}/join`, headers: { authorization: `Bearer ${g.tok}` } });
    const wlRole = await pool.query(`select role from spot_members where spot_id = $1 and user_id = $2`, [spot3, wl.id]);
    expect(wlRole.rows[0].role).toBe('waitlist');
    await app.inject({ method: 'POST', url: `/v1/spots/${spot3}/bail`, headers: { authorization: `Bearer ${m1.tok}` } });
    const promoted = await pool.query(`select role from spot_members where spot_id = $1 and user_id = $2`, [spot3, wl.id]);
    expect(promoted.rows[0].role).toBe('member');

    // dissolve: confirm_deadline passed with < min confirmed
    await pool.query(`update spots set confirm_deadline = now() - interval '1 hour' where id = $1`, [spotId]);
    const admin = await mkUser(true);
    const sweep = await app.inject({ method: 'POST', url: '/v1/internal/spot-sweep', headers: { authorization: `Bearer ${admin.tok}` } });
    expect(sweep.statusCode).toBe(200);
    expect(sweep.json().dissolved).toBeGreaterThanOrEqual(1);
    const dissolvedState = await pool.query(`select state from spots where id = $1`, [spotId]);
    expect(dissolvedState.rows[0].state).toBe('dissolved');

    // host cancel after confirm → host_cancel score event + system apology message
    const host4 = await mkUser();
    const spot4 = await mkEventSpot(host4.tok, { joinMode: 'open', minHeadcount: 2, maxHeadcount: 4 });
    const g4 = await mkUser();
    await app.inject({ method: 'POST', url: `/v1/spots/${spot4}/join`, headers: { authorization: `Bearer ${g4.tok}` } });
    await app.inject({ method: 'POST', url: `/v1/spots/${spot4}/schedule`, headers: { authorization: `Bearer ${host4.tok}` }, payload: { startsAt: '2026-12-05T12:00:00Z', venueId: await mkVenue() } });
    const cancel = await app.inject({ method: 'POST', url: `/v1/spots/${spot4}/cancel`, headers: { authorization: `Bearer ${host4.tok}` } });
    expect(cancel.statusCode).toBe(200);
    expect(cancel.json().state).toBe('cancelled');
    const hse = await pool.query(`select type from score_events where user_id = $1 and spot_id = $2`, [host4.id, spot4]);
    expect(hse.rows[0]?.type).toBe('host_cancel');
    const apology = await pool.query(`select m.body from messages m join rooms r on r.id = m.room_id where r.spot_id = $1 and m.flags->>'system' = 'true'`, [spot4]);
    expect(apology.rows.length).toBeGreaterThanOrEqual(1);
    expect(String(apology.rows[0].body)).toContain('sorry');
  });
});
