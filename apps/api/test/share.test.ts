import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../src/db/schema/index.js';
import { join } from 'node:path';
import pg from 'pg';
import type { FastifyInstance } from 'fastify';

let infra: TestInfra;
let app: FastifyInstance;
let pool: pg.Pool;
let spotId: string;

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  pool.query(`insert into districts (name_en, name_zh, boundary) values ('Test District', '測試', ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[[[[114,22],[114.1,22],[114.1,22.1],[114,22.1],[114,22]]]]}')) on conflict (name_en) do nothing`);
  let port = 0;
  const { default: Fastify } = await import('fastify');
  const mock = Fastify();
  mock.post('/otp', async () => ({}));
  mock.get('/admin/users/:id', async () => ({}));
  await mock.listen({ port: 0, host: '127.0.0.1' });
  const addr = mock.server.address();
  port = typeof addr === 'object' && addr !== null ? addr.port : 0;
  app = await buildApp({
    config: {
      NODE_ENV: 'test', PORT: '0', LOG_LEVEL: 'silent', DATABASE_URL: infra.dbUrl, REDIS_URL: infra.redisUrl,
      GOTRUE_URL: `http://127.0.0.1:${port}`, GOTRUE_JWT_SECRET: 'test-secret-test-secret-test-secret-1234',
      CORS_ORIGINS: 'http://localhost:5173', RATE_LIMIT_MAX: '1000', SENTRY_DSN: '',
      PII_ENCRYPTION_KEY: 'a'.repeat(64), QR_HMAC_SECRET: 'b'.repeat(32),
      ADMIN_BOOTSTRAP_PASSWORD: 'adminpw', ENABLE_SWAGGER: false,
    } as never,
  });
});

afterAll(async () => {
  await app.close();
  await pool.end();
  await stopInfra();
});

describe('GET /v1/spots/:id/share (public, no member data)', () => {
  it('404s unknown spots', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/spots/00000000-0000-0000-0000-000000000000/share' });
    expect(res.statusCode).toBe(404);
  });

  it('returns share card fields only', async () => {
    const district = await pool.query(`select id from districts order by name_en limit 1`);
    const s = await pool.query(
      `insert into spots (kind, template, name, join_mode, min_headcount, max_headcount, district_id)
       values ('event', 'tennis', 'Friday doubles', 'application', 2, 4, $1) returning id`,
      [district.rows[0].id]);
    spotId = s.rows[0].id;
    const res = await app.inject({ method: 'GET', url: `/v1/spots/${spotId}/share` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ name: 'Friday doubles', template: 'tennis', state: 'forming', headcount: 0, maxHeadcount: 4 });
    expect(Object.keys(body).sort()).toEqual(['district', 'eventDate', 'headcount', 'maxHeadcount', 'name', 'state', 'template']);
  });
});
