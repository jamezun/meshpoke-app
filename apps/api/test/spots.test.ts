/// T9.1: event spot creation — validation, liveness gate, hosting cap (both kinds),
/// plan event cap, room + host member created.
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
let userTok: string, userId: string, districtId: string;

async function token(sub: string) {
  return new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' }).setSubject(sub)
    .setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(JWT));
}

const mkUser = async (liveness = 'verified') => {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, is_admin, admin_roles)
     values ($1, $2, 'email', 'T', '1990-01-01', $3, $4, false, '{}')`,
    [id, `${id}@t.co`, id.slice(0, 8), liveness],
  );
  return id;
};

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
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
  userId = await mkUser();
  userTok = await token(userId);
  await seedDistricts(pool);
  const d = await pool.query(`select id from districts limit 1`);
  districtId = d.rows[0].id;
});

afterAll(async () => {
  await app.close();
  await pool.end();
  await stopInfra();
});

const baseBody = (over: Record<string, unknown> = {}) => ({
  template: 'dinner', name: 'Friday dinner', joinMode: 'application',
  districtId, minHeadcount: 4, maxHeadcount: 8,
  dateStart: '2026-12-01T12:00:00Z', dateEnd: '2026-12-01T15:00:00Z',
  ...over,
});

describe('POST /v1/spots/events', () => {
  it('creates a forming event spot with room and host member', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${userTok}` }, payload: baseBody({ requiredKeywords: ['finance'], priceRange: '$$' }) });
    expect(res.statusCode).toBe(200);
    const { spotId } = res.json();
    const spot = (await pool.query(`select kind, state, template, join_mode, min_headcount, max_headcount, required_keywords, price_range, date_range from spots where id = $1`, [spotId])).rows[0];
    expect(spot).toMatchObject({ kind: 'event', state: 'forming', template: 'dinner', join_mode: 'application', min_headcount: 4, max_headcount: 8, required_keywords: ['finance'], price_range: '$$' });
    const room = (await pool.query(`select kind from rooms where spot_id = $1`, [spotId])).rows[0];
    expect(room?.kind).toBe('event');
    const member = (await pool.query(`select role from spot_members where spot_id = $1 and user_id = $2`, [spotId, userId])).rows[0];
    expect(member?.role).toBe('host');
  });

  it('rejects 4 keywords', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${userTok}` }, payload: baseBody({ requiredKeywords: ['a', 'b', 'c', 'd'] }) });
    expect(res.statusCode).toBe(422);
  });

  it('rejects maxHeadcount < minHeadcount and bad dates', async () => {
    const r1 = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${userTok}` }, payload: baseBody({ maxHeadcount: 3 }) });
    expect(r1.statusCode).toBe(422);
    const r2 = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${userTok}` }, payload: baseBody({ dateEnd: '2026-11-30T12:00:00Z' }) });
    expect(r2.statusCode).toBe(422);
  });

  it('403 when phone unverified', async () => {
    const uid = await mkUser('none');
    const res = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${await token(uid)}` }, payload: baseBody() });
    expect(res.statusCode).toBe(403);
  });

  it('hosting cap 1 → second active spot 402', async () => {
    // user already hosts 1 (from test 1); default hosting capacity = 1
    const res = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${userTok}` }, payload: baseBody({ name: 'Another dinner' }) });
    expect(res.statusCode).toBe(402);
    expect(res.json().problem.capType).toBe('hosting');
  });

  it('host with capacity 3: 3rd ok, 4th 402', async () => {
    const uid = await mkUser();
    await pool.query(`insert into hosting_capacity (user_id, max_active) values ($1, 3)`, [uid]);
    const tok = await token(uid);
    for (let i = 0; i < 3; i++) {
      const r = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${tok}` }, payload: baseBody({ name: `Host ${i}` }) });
      expect(r.statusCode).toBe(200);
    }
    const fourth = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${tok}` }, payload: baseBody({ name: 'Host four' }) });
    expect(fourth.statusCode).toBe(402);
  });

  it('free plan event cap 3 → 4th event 402 even with hosting capacity 5', async () => {
    const uid = await mkUser();
    await pool.query(`insert into hosting_capacity (user_id, max_active) values ($1, 5)`, [uid]);
    const tok = await token(uid);
    for (let i = 0; i < 3; i++) {
      const r = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${tok}` }, payload: baseBody({ name: `Event ${i}` }) });
      expect(r.statusCode).toBe(200);
    }
    const fourth = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${tok}` }, payload: baseBody({ name: 'Event four' }) });
    expect(fourth.statusCode).toBe(402);
    expect(fourth.json().problem.capType).toBe('activeEventSpots');
  });
});
