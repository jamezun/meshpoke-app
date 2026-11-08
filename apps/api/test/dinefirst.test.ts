/// DineFirst study follow-ups: nearly-full push + venue pulse.
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

async function mkUser() {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, phone_verified_at)
     values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified', now())`,
    [id, `${id}@t.co`, 'T' + id.slice(0, 7), id.slice(0, 8)],
  );
  await pool.query(`insert into profiles (user_id, industry) values ($1, 'tech')`, [id]);
  const tok = await new SignJWT({ role: 'authenticated', admin_roles: [], aal: 'aal2' })
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

describe('DineFirst #1: nearly-full push', () => {
  it('joining to one-seat-left pings saved-venue users (not joiner/host/strangers)', async () => {
    const host = await mkUser();
    const joiner = await mkUser();
    const saver = await mkUser();
    const stranger = await mkUser();
    const venueId = await mkVenue('Pulse Venue NF');
    await pool.query(`insert into saved_venues (user_id, venue_id) values ($1, $2)`, [saver.id, venueId]);

    const res = await app.inject({
      method: 'POST', url: '/v1/spots/events', headers: H(host.tok),
      payload: {
        template: 'dinner', name: 'NF dinner ' + crypto.randomUUID().slice(0, 6), joinMode: 'open',
        districtId, venueId, minHeadcount: 2, maxHeadcount: 3,
        dateStart: '2026-12-01T12:00:00Z', dateEnd: '2026-12-01T15:00:00Z',
      },
    });
    expect(res.statusCode, res.body).toBe(200);
    const spotId = res.json().spotId as string;
    await pool.query(`update spots set venue_id = $1 where id = $2`, [venueId, spotId]); // set at schedule in real flow

    // host(1) + joiner → n=2 == max-1 → trigger
    const j = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/join`, headers: H(joiner.tok) });
    expect(j.statusCode, j.body).toBe(200);

    const acts = await pool.query(
      `select user_id, type from activity_items where type = 'spot_nearly_full' and payload->>'spotId' = $1`, [spotId]);
    const notified = acts.rows.map((r) => r.user_id);
    expect(notified).toContain(saver.id);
    expect(notified).not.toContain(joiner.id);
    expect(notified).not.toContain(host.id);
    expect(notified).not.toContain(stranger.id);
  });
});

describe('DineFirst #2: venue pulse', () => {
  it('attendee rates venue within window; stranger blocked; aggregate on venue detail', async () => {
    const host = await mkUser();
    const member = await mkUser();
    const outsider = await mkUser();
    const venueId = await mkVenue('Pulse Venue VP');

    const res = await app.inject({
      method: 'POST', url: '/v1/spots/events', headers: H(host.tok),
      payload: {
        template: 'dinner', name: 'VP dinner ' + crypto.randomUUID().slice(0, 6), joinMode: 'open',
        districtId, venueId, minHeadcount: 2, maxHeadcount: 4,
        dateStart: '2026-12-01T12:00:00Z', dateEnd: '2026-12-01T15:00:00Z',
      },
    });
    expect(res.statusCode, res.body).toBe(200);
    const spotId = res.json().spotId as string;
    await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/join`, headers: H(member.tok) });

    // fast-forward: confirm, schedule, live→done (white-box)
    await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/confirm`, headers: H(member.tok) });
    await app.inject({
      method: 'POST', url: `/v1/spots/${spotId}/schedule`, headers: H(host.tok),
      payload: { startsAt: new Date(Date.now() + 2 * 3600_000).toISOString(), venueId },
    });
    await pool.query(`update spots set state = 'done' where id = $1`, [spotId]);
    for (const u of [host.id, member.id]) {
      await pool.query(`insert into attendance (spot_id, user_id, status) values ($1, $2, 'attended')`, [spotId, u]);
    }

    // stranger → 403
    const bad = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/venue-pulse`, headers: H(outsider.tok), payload: { enjoyed: true } });
    expect(bad.statusCode).toBe(403);
    // attendee → ok, upsert note
    const ok = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/venue-pulse`, headers: H(member.tok), payload: { enjoyed: true, note: 'great vibe' } });
    expect(ok.statusCode, JSON.stringify(ok.body)).toBe(200);
    const ok2 = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/venue-pulse`, headers: H(host.tok), payload: { enjoyed: false } });
    expect(ok2.statusCode, ok2.body).toBe(200);

    const v = await app.inject({ method: 'GET', url: `/v1/venues/${venueId}`, headers: H(member.tok) });
    expect(v.statusCode).toBe(200);
    expect(v.json().venue.pulse_count).toBe(2);
    expect(v.json().venue.pulse_pct).toBe(50);
  });
});
