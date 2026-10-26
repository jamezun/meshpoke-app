import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { join } from 'node:path';
import { SignJWT } from 'jose';
import Fastify, { type FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import * as schema from '../src/db/schema/index.js';

const JWT_SECRET = 'test-secret-test-secret-test-secret!';

let infra: TestInfra | null = null;
let pool: pg.Pool | null = null;
let app: Awaited<ReturnType<typeof buildApp>> | null = null;
let gotrueMock: FastifyInstance | null = null;
let gotruePort = 0;

/** Mock GoTrue state: userId → { phone, phone_confirmed_at } */
const gtUsers = new Map<string, { phone?: string; phone_confirmed_at?: string }>();

async function mkToken(sub: string) {
  return new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' }).setSubject(sub)
    .setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(JWT_SECRET));
}

async function onboardedUser(dob = '1995-01-01') {
  const id = crypto.randomUUID();
  const headers = { authorization: `Bearer ${await mkToken(id)}` };
  const res = await app!.inject({ method: 'POST', url: '/v1/me/onboard', headers, payload: { date_of_birth: dob } });
  expect(res.statusCode).toBe(201);
  return { id, headers };
}

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });

  gotrueMock = Fastify();
  gotrueMock.post('/otp', async (req) => { gtUsers.set('__last_otp__', { phone: (req.body as { phone: string }).phone }); return {}; });
  gotrueMock.get('/admin/users/:id', async (req) => gtUsers.get((req.params as { id: string }).id) ?? {});
  gotrueMock.post('/admin/users/:id/logout', async () => ({}));
  await gotrueMock.listen({ port: 0, host: '127.0.0.1' });
  gotruePort = (gotrueMock.server.address() as { port: number }).port;

  app = await buildApp({
    config: {
      NODE_ENV: 'test', PORT: '0', LOG_LEVEL: 'silent', DATABASE_URL: infra.dbUrl, REDIS_URL: infra.redisUrl,
      GOTRUE_URL: `http://127.0.0.1:${gotruePort}`, GOTRUE_JWT_SECRET: JWT_SECRET, CORS_ORIGINS: 'http://localhost:5173',
      RATE_LIMIT_MAX: '1000', SENTRY_DSN: '', PII_ENCRYPTION_KEY: 'a'.repeat(64), QR_HMAC_SECRET: 'b'.repeat(32),
      ADMIN_BOOTSTRAP_PASSWORD: 'adminpw', ENABLE_SWAGGER: false,
    } as never,
  });
});

afterAll(async () => {
  await app?.close();
  await gotrueMock?.close();
  await pool?.end();
  await stopInfra();
});

describe('T2.3 phone verification', () => {
  it('rejects non-852 numbers (422), happy path stores encrypted + hash + verified_at', async () => {
    const u = await onboardedUser();
    const bad = await app!.inject({ method: 'POST', url: '/v1/me/phone/otp', headers: u.headers, payload: { phone: '+14155550100' } });
    expect(bad.statusCode).toBe(422);

    const otp = await app!.inject({ method: 'POST', url: '/v1/me/phone/otp', headers: u.headers, payload: { phone: '+85291234567' } });
    expect(otp.statusCode).toBe(200);
    expect(otp.json().sent).toBe(true);

    // user completes OTP at GoTrue → phone_confirmed_at set
    gtUsers.set(u.id, { phone: '+85291234567', phone_confirmed_at: new Date().toISOString() });
    const confirm = await app!.inject({ method: 'POST', url: '/v1/me/phone/confirm', headers: u.headers, payload: {} });
    expect(confirm.statusCode).toBe(200);

    const { rows } = await pool!.query('SELECT phone_e164, phone_hash, phone_verified_at FROM users WHERE id = $1', [u.id]);
    expect(rows[0].phone_e164).toMatch(/^v1:/);          // encrypted envelope, not plaintext
    expect(rows[0].phone_e164).not.toContain('91234567'); // ciphertext ≠ plaintext
    expect(rows[0].phone_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(rows[0].phone_verified_at).not.toBeNull();
  });

  it('409 on unconfirmed phone, 422 on non-852 from GoTrue', async () => {
    const u = await onboardedUser();
    const unconfirmed = await app!.inject({ method: 'POST', url: '/v1/me/phone/confirm', headers: u.headers, payload: {} });
    expect(unconfirmed.statusCode).toBe(409);

    gtUsers.set(u.id, { phone: '+447700900123', phone_confirmed_at: new Date().toISOString() });
    const foreign = await app!.inject({ method: 'POST', url: '/v1/me/phone/confirm', headers: u.headers, payload: {} });
    expect(foreign.statusCode).toBe(422);
  });

  it('duplicate phone → 409 (one account per phone)', async () => {
    const a = await onboardedUser();
    const b = await onboardedUser();
    gtUsers.set(a.id, { phone: '+85298765432', phone_confirmed_at: new Date().toISOString() });
    gtUsers.set(b.id, { phone: '+85298765432', phone_confirmed_at: new Date().toISOString() });
    expect((await app!.inject({ method: 'POST', url: '/v1/me/phone/confirm', headers: a.headers, payload: {} })).statusCode).toBe(200);
    expect((await app!.inject({ method: 'POST', url: '/v1/me/phone/confirm', headers: b.headers, payload: {} })).statusCode).toBe(409);
  });

  it('OTP rate limit: 3/h per user, 4th → 429', async () => {
    const u = await onboardedUser();
    for (let i = 0; i < 3; i++) {
      const r = await app!.inject({ method: 'POST', url: '/v1/me/phone/otp', headers: u.headers, payload: { phone: `+85291230${String(i).padStart(3, '0')}` } });
      expect(r.statusCode).toBe(200);
    }
    const fourth = await app!.inject({ method: 'POST', url: '/v1/me/phone/otp', headers: u.headers, payload: { phone: '+85291239999' } });
    expect(fourth.statusCode).toBe(429);
  });
});
