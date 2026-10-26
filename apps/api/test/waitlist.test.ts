/// T8.5: public waitlist — insert, idempotent dup (case-insensitive), 422 invalid, admin gate.
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

async function token(sub: string, extra: Record<string, unknown> = {}) {
  return new SignJWT({ role: 'authenticated', ...extra }).setProtectedHeader({ alg: 'HS256' }).setSubject(sub)
    .setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(JWT));
}

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  app = await buildApp({
    config: {
      NODE_ENV: 'test', PORT: 0, LOG_LEVEL: 'fatal',
      DATABASE_URL: infra.dbUrl, REDIS_URL: infra.redisUrl,
      GOTRUE_URL: 'http://localhost:9999',
      GOTRUE_JWT_SECRET: JWT,
      CORS_ORIGINS: 'http://localhost:5173', RATE_LIMIT_MAX: 1000,
      PII_ENCRYPTION_KEY: '0'.repeat(64),
      QR_HMAC_SECRET: 'test-qr-hmac-secret-32-chars-minimum!!!',
      ADMIN_BOOTSTRAP_PASSWORD: 'test-admin-bootstrap-pw',
      SENTRY_DSN: undefined, ENABLE_JOBS: false, ENABLE_SWAGGER: false,
    },
  });
});

afterAll(async () => {
  await app.close();
  await pool.end();
  await stopInfra();
});

describe('POST /v1/waitlist', () => {
  it('inserts a signup', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/waitlist', payload: { email: 'Tester@Example.com' } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok', alreadyJoined: false });
  });

  it('duplicate (case-insensitive) is idempotent → alreadyJoined', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/waitlist', payload: { email: 'tester@example.com' } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ alreadyJoined: true });
  });

  it('invalid email → 422 problem+json', async () => {
    const res = await app.inject({ method: 'POST', url: '/v1/waitlist', payload: { email: 'nope' } });
    expect(res.statusCode).toBe(422);
  });

  it('admin list requires support role', async () => {
    const noTok = await app.inject({ method: 'GET', url: '/v1/admin/waitlist' });
    expect(noTok.statusCode).toBe(401);
    const uid = crypto.randomUUID();
    await pool.query(
      `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, is_admin, admin_roles)
       values ($1::uuid, $2, 'email', 'W', '1990-01-01', left($1::text,8), 'verified', true, '{superadmin}')`,
      [uid, `${uid}@t.test`]);
    const superTok = await token(uid, { admin_roles: ['superadmin'], aal: 'aal2' });
    const ok = await app.inject({ method: 'GET', url: '/v1/admin/waitlist', headers: { authorization: `Bearer ${superTok}` } });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().signups).toHaveLength(1);
  });
});
