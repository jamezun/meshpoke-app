import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { join } from 'node:path';
import { SignJWT } from 'jose';


import { buildApp } from '../src/app.js';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import * as schema from '../src/db/schema/index.js';

const JWT_SECRET = 'test-secret-test-secret-test-secret!';

let infra: TestInfra | null = null;
let pool: pg.Pool | null = null;
let app: Awaited<ReturnType<typeof buildApp>> | null = null;

async function mkToken(sub: string) {
  return new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT_SECRET));
}

async function freshUserHeaders() {
  const id = crypto.randomUUID();
  return { authorization: `Bearer ${await mkToken(id)}`, id };
}

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  app = await buildApp({
    config: {
      NODE_ENV: 'test', PORT: '0', LOG_LEVEL: 'silent', DATABASE_URL: infra.dbUrl, REDIS_URL: infra.redisUrl,
      GOTRUE_URL: 'http://localhost:9999', GOTRUE_JWT_SECRET: JWT_SECRET, CORS_ORIGINS: 'http://localhost:5173',
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

function dobFor(now: Date, years: number, dayOffset: number): string {
  // HKT today; dob = today minus `years` years plus dayOffset days
  const hkt = new Date(now.getTime() + 8 * 3600 * 1000);
  const d = new Date(Date.UTC(hkt.getUTCFullYear() - years, hkt.getUTCMonth(), hkt.getUTCDate() + dayOffset));
  return d.toISOString().slice(0, 10);
}

describe('T2.2 onboarding', () => {
  it('rejects 17y364d, accepts 18y0d (HKT calendar math)', async () => {
    const now = new Date();
    const u17 = await freshUserHeaders();
    const res17 = await app!.inject({
      method: 'POST', url: '/v1/me/onboard', headers: u17,
      payload: { date_of_birth: dobFor(now, 18, 1) }, // 18th birthday is tomorrow HKT → 17y364d/365d
    });
    expect(res17.statusCode).toBe(422);
    expect(res17.json().detail).toContain('18');

    const u18 = await freshUserHeaders();
    const res18 = await app!.inject({
      method: 'POST', url: '/v1/me/onboard', headers: u18,
      payload: { date_of_birth: dobFor(now, 18, 0) }, // 18th birthday today
    });
    expect(res18.statusCode).toBe(201);
  });

  it('rejects bad payload (422), requires auth (401)', async () => {
    const u = await freshUserHeaders();
    const bad = await app!.inject({ method: 'POST', url: '/v1/me/onboard', headers: u, payload: { date_of_birth: 'not-a-date' } });
    expect(bad.statusCode).toBe(422);
    const noauth = await app!.inject({ method: 'POST', url: '/v1/me/onboard', payload: { date_of_birth: '1990-01-01' } });
    expect(noauth.statusCode).toBe(401);
  });

  it('duplicate onboard is idempotent (200 already-onboarded)', async () => {
    const u = await freshUserHeaders();
    const first = await app!.inject({ method: 'POST', url: '/v1/me/onboard', headers: u, payload: { date_of_birth: '1996-05-01' } });
    expect(first.statusCode).toBe(201);
    const second = await app!.inject({ method: 'POST', url: '/v1/me/onboard', headers: u, payload: { date_of_birth: '1996-05-01' } });
    expect(second.statusCode).toBe(200);
    expect(second.json().status).toBe('already-onboarded');
  });

  it('creates profiles row + referral link, GET /me returns it; PATCH /me updates sketch fields', async () => {
    const referrer = await freshUserHeaders();
    await app!.inject({ method: 'POST', url: '/v1/me/onboard', headers: referrer, payload: { date_of_birth: '1990-01-01' } });
    const refMe = await app!.inject({ method: 'GET', url: '/v1/me', headers: referrer });
    const refCode = refMe.json().referral_code;
    expect(refCode).toMatch(/^MP[A-Z2-9]{6}$/);

    const child = await freshUserHeaders();
    await app!.inject({ method: 'POST', url: '/v1/me/onboard', headers: child, payload: { date_of_birth: '1995-06-15', referral_code: refCode } });
    const { rows } = await pool!.query('SELECT referred_by FROM users WHERE id = $1', [child.id]);
    expect(rows[0].referred_by).toBe(referrer.id);

    // self-referral is ignored
    const loner = await freshUserHeaders();
    await app!.inject({ method: 'POST', url: '/v1/me/onboard', headers: loner, payload: { date_of_birth: '1995-06-15', referral_code: refCode } });
    const patched = await app!.inject({
      method: 'PATCH', url: '/v1/me', headers: loner,
      payload: { display_name: 'Wan Chai Runner', industry: 'finance', role_oneliner: 'PM by day, trails by night' },
    });
    expect(patched.statusCode).toBe(200);
    const me = await app!.inject({ method: 'GET', url: '/v1/me', headers: loner });
    expect(me.json().display_name).toBe('Wan Chai Runner');
    expect(me.json().industry).toBe('finance');
    expect(me.json().role_oneliner).toBe('PM by day, trails by night');
  });

  it('PATCH /me rejects invalid industry + overlong oneliner (422)', async () => {
    const u = await freshUserHeaders();
    await app!.inject({ method: 'POST', url: '/v1/me/onboard', headers: u, payload: { date_of_birth: '1990-01-01' } });
    const bad = await app!.inject({ method: 'PATCH', url: '/v1/me', headers: u, payload: { industry: 'astronaut' } });
    expect(bad.statusCode).toBe(422);
    const long = await app!.inject({ method: 'PATCH', url: '/v1/me', headers: u, payload: { role_oneliner: 'x'.repeat(41) } });
    expect(long.statusCode).toBe(422);
  });
});
