import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import pg from 'pg';
import { join } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../src/db/schema/index.js';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

const JWT = 'test-secret-test-secret-test-secret-1234';
let infra: TestInfra, app: FastifyInstance, pool: pg.Pool;
let verified: string, unverified: string, cityRoom: string;
let tokV: string, tokU: string;

async function token(sub: string) {
  return new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' }).setSubject(sub)
    .setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(JWT));
}

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  const { default: Fastify } = await import('fastify');
  const mock = Fastify();
  mock.post('/otp', async () => ({}));
  mock.get('/admin/users/:id', async () => ({}));
  mock.post('/admin/users/:id/logout', async () => ({}));
  await mock.listen({ port: 0, host: '127.0.0.1' });
  const mp = mock.server.address();
  const port = typeof mp === 'object' && mp !== null ? mp.port : 0;
  app = await buildApp({ config: {
    NODE_ENV: 'test', PORT: '0', LOG_LEVEL: 'silent', DATABASE_URL: infra.dbUrl, REDIS_URL: infra.redisUrl,
    GOTRUE_URL: `http://127.0.0.1:${port}`, GOTRUE_JWT_SECRET: JWT,
    CORS_ORIGINS: 'http://localhost:5173', RATE_LIMIT_MAX: '1000', SENTRY_DSN: '',
    PII_ENCRYPTION_KEY: 'a'.repeat(64), QR_HMAC_SECRET: 'b'.repeat(32),
    ADMIN_BOOTSTRAP_PASSWORD: 'adminpw', ENABLE_SWAGGER: false,
  } as never });
  await app.ready();

  verified = crypto.randomUUID(); unverified = crypto.randomUUID();
  for (const [id, live] of [[verified, 'verified'], [unverified, 'none']] as const) {
    await pool.query(`insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, phone_verified_at)
      values ($1::uuid, $2, 'email', $3, '1995-01-01', left($1::text,8), $4, case $4::liveness_state when 'verified' then now() else null end)`,
      [id, `${id}@t.test`, live === 'verified' ? 'V' : 'U', live]);
  }
  tokV = await token(verified); tokU = await token(unverified);
  const r = await pool.query(`insert into rooms (id, kind) values (default, 'city') returning id`);
  cityRoom = r.rows[0].id;
}, 200_000);

afterAll(async () => {
  await app.close();
  await pool.end();
  await stopInfra();
});

describe('T7.2 rooms', () => {
  it('unverified can join read-only but is blocked from hosting a chat spot', async () => {
    const join = await app.inject({ method: 'POST', url: `/v1/rooms/${cityRoom}/join`, headers: { authorization: `Bearer ${tokU}` } });
    expect(join.statusCode).toBe(200);
    const msgs = await app.inject({ method: 'GET', url: `/v1/rooms/${cityRoom}/messages`, headers: { authorization: `Bearer ${tokU}` } });
    expect(msgs.statusCode).toBe(200);
    expect(msgs.json().messages).toEqual([]);
    const spot = await app.inject({ method: 'POST', url: '/v1/spots', headers: { authorization: `Bearer ${tokU}` }, payload: { name: 'U room', districtId: crypto.randomUUID() } });
    expect(spot.statusCode).toBe(403); // phone verification gate
  });

  it('verified user creates chat spot, becomes host-room member', async () => {
    const d = await pool.query(`insert into districts (name_en, name_zh, boundary) values ('IslandsT7','離島測', st_geomfromgeojson('{"type":"MultiPolygon","coordinates":[[[[113.8,22.1],[114.1,22.1],[114.1,22.4],[113.8,22.4],[113.8,22.1]]]]}')) returning id`);
    const res = await app.inject({ method: 'POST', url: '/v1/spots', headers: { authorization: `Bearer ${tokV}` }, payload: { name: 'HK island chat', districtId: d.rows[0].id } });
    expect(res.statusCode).toBe(200);
    const { spotId } = res.json();
    const rm = await pool.query(`select rm.role::text from rooms r join room_members rm on rm.room_id = r.id where r.spot_id = $1`, [spotId]);
    expect(rm.rows[0].role).toBe('host');
  });

  it('free-tier chat-room cap returns 402 at 6th join', async () => {
    // user already in 1 (own spot room + city). join 4 more → at 6th total → 402
    for (let i = 0; i < 4; i++) {
      const r = await pool.query(`insert into rooms (kind) values ('chat') returning id`);
      const res = await app.inject({ method: 'POST', url: `/v1/rooms/${r.rows[0].id}/join`, headers: { authorization: `Bearer ${tokV}` } });
      expect(res.statusCode).toBe(200);
    }
    const extra = await pool.query(`insert into rooms (kind) values ('chat') returning id`);
    const res = await app.inject({ method: 'POST', url: `/v1/rooms/${extra.rows[0].id}/join`, headers: { authorization: `Bearer ${tokV}` } });
    expect(res.statusCode).toBe(402);
    expect(res.json().problem.detail).toContain('5 rooms');
  });
});
