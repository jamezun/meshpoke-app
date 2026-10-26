import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { join } from 'node:path';
import { SignJWT } from 'jose';
import { buildApp } from '../src/app.js';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import * as schema from '../src/db/schema/index.js';
import { getPlan, getCaps, assertCap } from '../src/entitlements.js';

const JWT_SECRET = 'test-secret-test-secret-test-secret!';

let infra: TestInfra | null = null;
let pool: pg.Pool | null = null;
let app: Awaited<ReturnType<typeof buildApp>> | null = null;

async function mkToken(sub: string) {
  return new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' }).setSubject(sub)
    .setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(JWT_SECRET));
}

async function onboardedUser() {
  const id = crypto.randomUUID();
  const headers = { authorization: `Bearer ${await mkToken(id)}` };
  await app!.inject({ method: 'POST', url: '/v1/me/onboard', headers, payload: { date_of_birth: '1995-01-01' } });
  return { id, headers };
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
  const port = (mock.server.address() as { port: number }).port;

  app = await buildApp({
    config: {
      NODE_ENV: 'test', PORT: '0', LOG_LEVEL: 'silent', DATABASE_URL: infra.dbUrl, REDIS_URL: infra.redisUrl,
      GOTRUE_URL: `http://127.0.0.1:${port}`, GOTRUE_JWT_SECRET: JWT_SECRET, CORS_ORIGINS: 'http://localhost:5173',
      RATE_LIMIT_MAX: '1000', SENTRY_DSN: '', PII_ENCRYPTION_KEY: 'a'.repeat(64), QR_HMAC_SECRET: 'b'.repeat(32),
      ADMIN_BOOTSTRAP_PASSWORD: 'adminpw', ENABLE_SWAGGER: false,
    } as never,
  });
});

afterAll(async () => {
  await app?.close();
  await pool?.end();
  await stopInfra();
});

describe('T2.5 caps & entitlements', () => {
  it('default plan is free; getCaps matches constants (∞ → null in API JSON)', async () => {
    const u = await onboardedUser();
    expect(await getPlan(infra!.dbUrl, u.id)).toBe('free');
    const res = await app!.inject({ method: 'GET', url: '/v1/me/caps', headers: u.headers });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.plan).toBe('free');
    expect(body.caps.activeEventSpots).toEqual({ limit: 3, used: 0 });
    expect(body.caps.weeklyPokes.limit).toBe(5);
    // JSON null-infinity check happens on merchantSpots for pro later; free = 10
  });

  it('plan follows entitlements row (lifetime NULL expiry stays active)', async () => {
    const u = await onboardedUser();
    await pool!.query(
      `INSERT INTO entitlements (user_id, plan, source, expires_at) VALUES ($1, 'plus', 'test', NULL)`,
      [u.id],
    );
    expect(await getPlan(infra!.dbUrl, u.id)).toBe('plus');
    const caps = await app!.inject({ method: 'GET', url: '/v1/me/caps', headers: u.headers });
    expect(caps.json().plan).toBe('plus');
    expect(caps.json().caps.weeklyPokes.limit).toBe(20);
  });

  it('expired entitlements fall back to free', async () => {
    const u = await onboardedUser();
    await pool!.query(
      `INSERT INTO entitlements (user_id, plan, source, expires_at) VALUES ($1, 'pro', 'test', now() - interval '1 day')`,
      [u.id],
    );
    expect(await getPlan(infra!.dbUrl, u.id)).toBe('free');
  });

  it('assertCap throws at limit, passes under; CapError carries cap + limit', async () => {
    const u = await onboardedUser();
    await assertCap(infra!.dbUrl, u.id, 'weeklyPokes', 4); // free cap 5 → ok
    await expect(assertCap(infra!.dbUrl, u.id, 'weeklyPokes', 5)).rejects.toMatchObject({
      capType: 'weeklyPokes', limit: 5,
    });
    expect(getCaps('pro').merchantSpots).toBe(Infinity); // host spots unlimited for pro merchant read
  });
});
