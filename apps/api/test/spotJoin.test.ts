/// T9.2: join & apply — hard filters, event join caps, waitlist, leave.
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

async function token(sub: string) {
  return new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' }).setSubject(sub)
    .setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(JWT));
}

async function mkUser(liveness = 'verified') {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, is_admin, admin_roles)
     values ($1, $2, 'email', 'T', '1990-01-01', $3, $4, false, '{}')`,
    [id, `${id}@t.co`, id.slice(0, 8), liveness],
  );
  return { id, tok: await token(id) };
}

async function mkEvent(hostTok: string, over: Record<string, unknown> = {}) {
  const res = await app.inject({
    method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${hostTok}` },
    payload: { template: 'dinner', name: 'Dinner ' + crypto.randomUUID().slice(0, 6), joinMode: 'application', districtId, minHeadcount: 4, maxHeadcount: 8, dateStart: '2026-12-01T12:00:00Z', dateEnd: '2026-12-01T15:00:00Z', ...over },
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

afterAll(async () => {
  await app.close();
  await pool.end();
  await stopInfra();
});

describe('POST /v1/spots/:id/apply', () => {
  it('hard filter: missing required keywords → 422 with which', async () => {
    const host = await mkUser();
    const spotId = await mkEvent(host.tok, { requiredKeywords: ['hiking', 'tennis'] });
    const guest = await mkUser();
    await pool.query(`insert into keywords (user_id, keyword, level) values ($1, 'hiking', 5)`, [guest.id]);
    const res = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/apply`, headers: { authorization: `Bearer ${guest.tok}` }, payload: { note: 'hi' } });
    expect(res.statusCode).toBe(422);
    expect(res.json().problem.detail).toContain('tennis');
  });

  it('hard filter: unproven score vs minScore 0.7 → 422; proven 0.8 → pending', async () => {
    const host = await mkUser();
    const spotId = await mkEvent(host.tok, { minScore: 0.7 });
    const unproven = await mkUser();
    const r1 = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/apply`, headers: { authorization: `Bearer ${unproven.tok}` }, payload: {} });
    expect(r1.statusCode).toBe(422);
    expect(r1.json().problem.detail).toContain('unproven');

    const proven = await mkUser();
    await pool.query(`insert into showup_scores (user_id, score, events_count, proven_state) values ($1, 0.8, 5, 'proven')`, [proven.id]);
    const r2 = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/apply`, headers: { authorization: `Bearer ${proven.tok}` }, payload: {} });
    expect(r2.statusCode).toBe(200);
    expect(r2.json().status).toBe('pending');
  });

  it('duplicate pending application → 409; unverified phone → 403', async () => {
    const host = await mkUser();
    const spotId = await mkEvent(host.tok);
    const guest = await mkUser();
    await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/apply`, headers: { authorization: `Bearer ${guest.tok}` }, payload: {} });
    const dup = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/apply`, headers: { authorization: `Bearer ${guest.tok}` }, payload: {} });
    expect(dup.statusCode).toBe(409);
    const bot = await mkUser('none');
    const r = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/apply`, headers: { authorization: `Bearer ${bot.tok}` }, payload: {} });
    expect(r.statusCode).toBe(403);
  });

  it('open mode join: member until cap, then waitlist', async () => {
    const host = await mkUser();
    const spotId = await mkEvent(host.tok, { joinMode: 'open', maxHeadcount: 4, minHeadcount: 2 }); // host + 3 members
    const toks = [];
    for (let i = 0; i < 4; i++) toks.push(await mkUser());
    const roles = [];
    for (const g of toks) {
      const r = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/join`, headers: { authorization: `Bearer ${g.tok}` } });
      expect(r.statusCode).toBe(200);
      roles.push(r.json().role);
    }
    expect(roles).toEqual(['member', 'member', 'member', 'waitlist']); // max_headcount includes host
  });

  it('free join cap: 4th active event spot → 402', async () => {
    const guest = await mkUser();
    // guest joins 3 open events (each with different host), 4th → 402
    for (let i = 0; i < 3; i++) {
      const host = await mkUser();
      const spotId = await mkEvent(host.tok, { joinMode: 'open', maxHeadcount: 8, minHeadcount: 2 });
      const r = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/join`, headers: { authorization: `Bearer ${guest.tok}` } });
      expect(r.statusCode).toBe(200);
    }
    const host4 = await mkUser();
    const spot4 = await mkEvent(host4.tok, { joinMode: 'open', maxHeadcount: 8, minHeadcount: 2 });
    const r4 = await app.inject({ method: 'POST', url: `/v1/spots/${spot4}/join`, headers: { authorization: `Bearer ${guest.tok}` } });
    expect(r4.statusCode).toBe(402);
    expect(r4.json().problem.capType).toBe('activeEventSpots');
  });

  it('leave closes membership + pending application', async () => {
    const host = await mkUser();
    const spotId = await mkEvent(host.tok, { joinMode: 'open', maxHeadcount: 8, minHeadcount: 2 });
    const guest = await mkUser();
    await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/join`, headers: { authorization: `Bearer ${guest.tok}` } });
    const leave = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/leave`, headers: { authorization: `Bearer ${guest.tok}` } });
    expect(leave.statusCode).toBe(200);
    const again = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/join`, headers: { authorization: `Bearer ${guest.tok}` } });
    expect(again.statusCode).toBe(200); // can rejoin after leaving
  });
});
