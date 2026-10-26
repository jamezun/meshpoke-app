import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { join } from 'node:path';
import { SignJWT } from 'jose';
import { buildApp } from '../src/app.js';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import * as schema from '../src/db/schema/index.js';
import { seedDistricts } from '../src/db/seed.js';

const JWT_SECRET = 'test-secret-test-secret-test-secret!';

let infra: TestInfra | null = null;
let pool: pg.Pool | null = null;
let app: Awaited<ReturnType<typeof buildApp>> | null = null;
let headers: Record<string, string> = {};
let centralDistrict = '';
let islandsDistrict = '';

async function mkToken(sub: string) {
  return new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' }).setSubject(sub)
    .setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(JWT_SECRET));
}

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  await seedDistricts(pool);

  const { default: Fastify } = await import('fastify');
  const mock = Fastify();
  mock.post('/otp', async () => ({}));
  mock.get('/admin/users/:id', async () => ({}));
  mock.post('/admin/users/:id/logout', async () => ({}));
  await mock.listen({ port: 0, host: '127.0.0.1' });
  const port = (mock.server.address() as { port: number }).port;

  app = await buildApp({
    config: {
      NODE_ENV: 'test', PORT: '0', LOG_LEVEL: 'silent', DATABASE_URL: infra.dbUrl, REDIS_URL: infra.redisUrl,
      GOTRUE_URL: `http://127.0.0.1:${port}`, GOTRUE_JWT_SECRET: JWT_SECRET, CORS_ORIGINS: 'http://localhost:5173',
      RATE_LIMIT_MAX: '1000', SENTRY_DSN: '', PII_ENCRYPTION_KEY: 'a'.repeat(64), QR_HMAC_SECRET: 'b'.repeat(32),
      ADMIN_BOOTSTRAP_PASSWORD: 'adminpw', ENABLE_SWAGGER: false,
    } as never,
  });

  const id = crypto.randomUUID();
  headers = { authorization: `Bearer ${await mkToken(id)}` };
  await app!.inject({ method: 'POST', url: '/v1/me/onboard', headers, payload: { date_of_birth: '1995-01-01' } });

  const d = await pool!.query(`SELECT id FROM districts WHERE name_en = 'Central and Western'`);
  centralDistrict = d.rows[0].id;
  const i = await pool!.query(`SELECT id FROM districts WHERE name_en = 'Islands'`);
  islandsDistrict = i.rows[0].id;

  // venue in Central → trigger assigns Central district
  await pool!.query(
    `INSERT INTO venues (id, display_name, source, category, location, status)
     VALUES ('11111111-1111-1111-1111-111111111111', 'Central Test Cafe', 'user', 'cafe',
             ST_SetSRID(ST_MakePoint(114.1547, 22.2820), 4326), 'active')`,
  );
  // spot anchored to Central
  await pool!.query(
    `INSERT INTO spots (kind, name, template, join_mode, state, min_headcount, max_headcount, host_user_id, district_id, starts_at)
     VALUES ('event','Tennis in Central','tennis','open','forming',2,6,$1,$2, now() + interval '2 days')`,
    [id, centralDistrict],
  );
});

afterAll(async () => {
  await app?.close();
  await pool?.end();
  await stopInfra();
});

describe('T4.1 districts & viewport', () => {
  it('venue insert trigger assigns district via ST_Contains', async () => {
    const r = await pool!.query(`SELECT district_id FROM venues WHERE id = '11111111-1111-1111-1111-111111111111'`);
    expect(r.rows[0].district_id).toBe(centralDistrict);
  });

  it('GET /districts returns 18 with zh names', async () => {
    const res = await app!.inject({ method: 'GET', url: '/v1/districts', headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().districts).toHaveLength(18);
    expect(res.json().districts[0]).toHaveProperty('name_zh');
  });

  it('GET /map/viewport returns venue + spot in Central bbox', async () => {
    // tight bbox around Central
    const res = await app!.inject({ method: 'GET', url: '/v1/map/viewport?bbox=114.14,22.27,114.17,22.29', headers });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.venues).toHaveLength(1);
    expect(body.venues[0].name).toBe('Central Test Cafe');
    expect(body.spots).toHaveLength(1);
    expect(body.spots[0].name).toBe('Tennis in Central');
  });

  it('bbox in empty area (Lantau waters) → no Central content', async () => {
    const res = await app!.inject({ method: 'GET', url: '/v1/map/viewport?bbox=113.90,22.20,113.95,22.25', headers });
    expect(res.statusCode).toBe(200);
    expect(res.json().venues).toHaveLength(0);
    expect(res.json().spots).toHaveLength(0);
  });

  it('oversized bbox rejected (no world queries)', async () => {
    const res = await app!.inject({ method: 'GET', url: '/v1/map/viewport?bbox=-180,-90,180,90', headers });
    expect(res.statusCode).toBe(422);
  });

  it('invalid bbox rejected 422; missing bbox 400', async () => {
    expect((await app!.inject({ method: 'GET', url: '/v1/map/viewport?bbox=999,0,1000,1', headers })).statusCode).toBe(422);
    expect((await app!.inject({ method: 'GET', url: '/v1/map/viewport', headers })).statusCode).toBe(400);
  });

  it('GET /districts/:id/spots lists scoped spots; unknown district 404', async () => {
    const res = await app!.inject({ method: 'GET', url: `/v1/districts/${centralDistrict}/spots`, headers });
    expect(res.json().spots).toHaveLength(1);
    const none = await app!.inject({ method: 'GET', url: `/v1/districts/22222222-2222-2222-2222-222222222222/spots`, headers });
    expect(none.statusCode).toBe(404);
    const empty = await app!.inject({ method: 'GET', url: `/v1/districts/${islandsDistrict}/spots`, headers });
    expect(empty.json().spots).toHaveLength(0);
  });
});
