import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { join } from 'node:path';
import { SignJWT } from 'jose';
import { Redis } from 'ioredis';
import Fastify, { type FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { registerAuth } from '../src/auth.js';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import * as schema from '../src/db/schema/index.js';

const JWT_SECRET = 'test-secret-test-secret-test-secret!';

let infra: TestInfra | null = null;
let pool: pg.Pool | null = null;
let app: Awaited<ReturnType<typeof buildApp>> | null = null;
let redis: Redis | null = null;
let userCounter = 0;

async function mkToken(sub: string, opts: { exp?: string } = {}) {
  return new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '1h')
    .sign(new TextEncoder().encode(JWT_SECRET));
}

/** Create a users row + token. */
async function mkUser(opts: { phoneVerified?: boolean; admin?: boolean } = {}) {
  const id = crypto.randomUUID();
  userCounter += 1;
  await pool!.query(
    `INSERT INTO users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, is_admin, phone_verified_at)
     VALUES ($1, $2, 'email', $3, '1996-05-01', $4, 'verified', $5, $6)`,
    [id, `u${userCounter}@t.test`, `U${userCounter}`, `RC${String(userCounter).padStart(6, '0')}`, opts.admin ?? false, opts.phoneVerified ? new Date() : null],
  );
  return { id, token: await mkToken(id) };
}

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  redis = new Redis(infra.redisUrl);
  app = await buildApp({
    config: {
      NODE_ENV: 'test', PORT: '0', LOG_LEVEL: 'silent', DATABASE_URL: infra.dbUrl, REDIS_URL: infra.redisUrl,
      GOTRUE_URL: 'http://localhost:9999', GOTRUE_JWT_SECRET: JWT_SECRET, CORS_ORIGINS: 'http://localhost:5173',
      RATE_LIMIT_MAX: '1000', SENTRY_DSN: '', PII_ENCRYPTION_KEY: 'a'.repeat(64), QR_HMAC_SECRET: 'b'.repeat(32),
      ADMIN_BOOTSTRAP_PASSWORD: 'adminpw', ENABLE_SWAGGER: false,
    } as never,
  });
});

let probe: FastifyInstance;

// mini app exercising the real middleware (can't add routes to a listening app)
function buildProbe() {
  const p = Fastify();
  registerAuth(p, infra!.dbUrl, redis!, JWT_SECRET);
  p.get('/auth-probe', { preHandler: [p.authenticate] }, async (req) => ({ id: req.user!.id, phoneVerified: req.user!.phoneVerified }));
  p.get('/phone-probe', { preHandler: [p.authenticate, p.requirePhoneVerified] }, async () => 'ok');
  p.get('/admin-probe', { preHandler: [p.authenticate, p.requireRole('admin')] }, async () => 'ok');
  return p;
}

afterAll(async () => {
  await probe?.close();
  await app?.close();
  await pool?.end();
  await stopInfra();
});

describe('T2.1 auth middleware', () => {
  it('guards: 401 no token, 401 expired, 401 forged, 200 valid', async () => {
    probe = buildProbe();
    const u = await mkUser();

    expect((await probe.inject({ method: 'GET', url: '/auth-probe' })).statusCode).toBe(401);
    const expired = await mkToken(u.id, { exp: '-1h' });
    expect((await probe.inject({ method: 'GET', url: '/auth-probe', headers: { authorization: `Bearer ${expired}` } })).statusCode).toBe(401);
    const forged = await new SignJWT({ sub: u.id }).setProtectedHeader({ alg: 'HS256' }).sign(new TextEncoder().encode('wrong-secret-wrong-secret-wrong!!'));
    expect((await probe.inject({ method: 'GET', url: '/auth-probe', headers: { authorization: `Bearer ${forged}` } })).statusCode).toBe(401);

    const ok = await probe.inject({ method: 'GET', url: '/auth-probe', headers: { authorization: `Bearer ${u.token}` } });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().id).toBe(u.id);
  });

  it('phone-verified guard: 403 unverified, 200 verified; admin guard 403 non-admin', async () => {
    probe = probe ?? buildProbe();
    const unverified = await mkUser();
    const verified = await mkUser({ phoneVerified: true });
    const admin = await mkUser({ admin: true, phoneVerified: true });

    expect((await probe.inject({ method: 'GET', url: '/phone-probe', headers: { authorization: `Bearer ${unverified.token}` } })).statusCode).toBe(403);
    expect((await probe.inject({ method: 'GET', url: '/phone-probe', headers: { authorization: `Bearer ${verified.token}` } })).statusCode).toBe(200);
    expect((await probe.inject({ method: 'GET', url: '/admin-probe', headers: { authorization: `Bearer ${verified.token}` } })).statusCode).toBe(403);
    expect((await probe.inject({ method: 'GET', url: '/admin-probe', headers: { authorization: `Bearer ${admin.token}` } })).statusCode).toBe(200);
  });

  it('user not onboarded (GoTrue exists, users row missing) → authenticated, onboarded:false', async () => {
    probe = probe ?? buildProbe();
    const ghostToken = await mkToken(crypto.randomUUID());
    const res = await probe.inject({ method: 'GET', url: '/auth-probe', headers: { authorization: `Bearer ${ghostToken}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().phoneVerified).toBe(false);
  });
});
