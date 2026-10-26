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
let verified: { id: string; headers: Record<string, string> };
let unverified: { id: string; headers: Record<string, string> };
let venueId = '';

async function mkToken(sub: string) {
  return new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' }).setSubject(sub)
    .setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(JWT_SECRET));
}

async function onboard() {
  const id = crypto.randomUUID();
  const headers = { authorization: `Bearer ${await mkToken(id)}` };
  await app!.inject({ method: 'POST', url: '/v1/me/onboard', headers, payload: { date_of_birth: '1995-01-01' } });
  return { id, headers };
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
      ADMIN_BOOTSTRAP_PASSWORD: 'adminpw', ENABLE_SWAGGER: false, ENABLE_JOBS: false,
    } as never,
  });

  verified = await onboard();
  await pool!.query(`UPDATE users SET phone_verified_at = now() WHERE id = $1`, [verified.id]);
  unverified = await onboard();
});

afterAll(async () => {
  await app?.close();
  await pool?.end();
  await stopInfra();
});

const VENUE = { name: 'Peak View Cafe', category: 'cafe', lat: 22.2750, lng: 114.1450 };

describe('T4.4 user venues', () => {
  it('unverified user → 403; verified → 201', async () => {
    const forbidden = await app!.inject({ method: 'POST', url: '/v1/venues', headers: unverified.headers, payload: VENUE });
    expect(forbidden.statusCode).toBe(403);
    const ok = await app!.inject({ method: 'POST', url: '/v1/venues', headers: verified.headers, payload: VENUE });
    expect(ok.statusCode).toBe(201);
    venueId = ok.json().venue.id;
  });

  it('dedupe: same name within 50 m → 409 with duplicates unless force=true', async () => {
    const dupe = await app!.inject({ method: 'POST', url: '/v1/venues', headers: verified.headers, payload: { ...VENUE } });
    expect(dupe.statusCode).toBe(409);
    expect(dupe.json().duplicates).toHaveLength(1);

    const farAway = await app!.inject({ method: 'POST', url: '/v1/venues', headers: verified.headers, payload: { ...VENUE, lat: 22.3000, lng: 114.1700 } });
    expect(farAway.statusCode).toBe(201); // same name, >50m away → allowed

    const forced = await app!.inject({ method: 'POST', url: '/v1/venues', headers: verified.headers, payload: { ...VENUE, force: true } });
    expect(forced.statusCode).toBe(201);
  });

  it('invalid category → 422', async () => {
    const bad = await app!.inject({ method: 'POST', url: '/v1/venues', headers: verified.headers, payload: { ...VENUE, category: 'nightclub' } });
    expect(bad.statusCode).toBe(422);
  });

  it('reports: 3 distinct reporters escalate; repeat report by same user is a no-op', async () => {
    const report = (h: Record<string, string>) =>
      app!.inject({ method: 'POST', url: `/v1/venues/${venueId}/report`, headers: h, payload: { reason: 'closed' } });
    const r1 = await report(verified.headers);
    expect(r1.statusCode).toBe(201);
    const again = await report(verified.headers);
   
    expect(again.json().already_reported).toBe(true);

    const u2 = await onboard();
    const u3 = await onboard();
    const r2 = await report(u2.headers);
    const r3 = await report(u3.headers);
    expect(r2.json().escalated).toBe(false);
    expect(r3.json().escalated).toBe(true);

    const st = await pool!.query(`SELECT count(*)::int AS n FROM venue_reports WHERE venue_id=$1 AND status='escalated'`, [venueId]);
    expect(st.rows[0].n).toBe(3);
  });

  it('save/unsave idempotent', async () => {
    const s1 = await app!.inject({ method: 'POST', url: `/v1/venues/${venueId}/save`, headers: verified.headers });
    expect(s1.json().saved).toBe(true);
    const s2 = await app!.inject({ method: 'POST', url: `/v1/venues/${venueId}/save`, headers: verified.headers });
    expect(s2.json().saved).toBe(false); // already saved
    const del = await app!.inject({ method: 'DELETE', url: `/v1/venues/${venueId}/save`, headers: verified.headers });
    expect(del.json().saved).toBe(false);
  });

  it('search: trigram + ilike, ranked by similarity', async () => {
    const res = await app!.inject({ method: 'GET', url: '/v1/venues/search?q=peak view', headers: verified.headers });
    expect(res.statusCode).toBe(200);
    const names = res.json().venues.map((v: { display_name: string }) => v.display_name);
    expect(names).toContain('Peak View Cafe');

    const zh = await app!.inject({ method: 'GET', url: '/v1/venues/search?q=PEAK', headers: verified.headers });
    expect(zh.json().venues.length).toBeGreaterThanOrEqual(2); // case-insensitive

    const none = await app!.inject({ method: 'GET', url: '/v1/venues/search?q=', headers: verified.headers });
    expect(none.json().venues).toHaveLength(0);
  });
});

describe('T4.6 attributions', () => {
  it('GET /meta/attributions is public and includes DATA.GOV.HK wording', async () => {
    const res = await app!.inject({ method: 'GET', url: '/v1/meta/attributions' });
    expect(res.statusCode).toBe(200);
    expect(res.json().attributions.data_gov_hk).toContain('DATA.GOV.HK');
    expect(res.json().attributions.als).toContain('Lands Department');
  });
});
