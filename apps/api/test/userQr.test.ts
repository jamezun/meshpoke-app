import { afterAll, beforeAll, expect, test } from 'vitest';
import { SignJWT } from 'jose';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { join } from 'node:path';
import * as schema from '../src/db/schema/index.js';
import { buildApp } from '../src/app.js';
import { seedDistricts } from '../src/db/seed.js';
import { useInfra, stopInfra } from './db.js';
import { signQrToken, verifyQrToken, markQrUsed, qrWindow } from '../src/routes/userQr.js';

const JWT = 'test-jwt-secret-at-least-32-characters-long';
const SECRET = 'test-qr-hmac-secret-32-chars-minimum!!!';
const infra = useInfra();

let app: Awaited<ReturnType<typeof buildApp>>;
let pool: Pool;
let redis: Redis;
const users: Record<string, { id: string; tok: string; phone?: boolean }> = {};

async function mkUser(name: string, phone = true): Promise<void> {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, phone_verified_at)
     values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified', ${phone ? 'now()' : 'null'})`,
    [id, `${name}${id.slice(0, 8)}@t.test`, name, `MP${id.slice(0, 6).toUpperCase()}`],
  );
  users[name] = { id, tok: await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT)), phone };
}

beforeAll(async () => {
  const i = await infra;
  app = await buildApp({ config: {
    NODE_ENV: 'test', PORT: 0, LOG_LEVEL: 'fatal',
    DATABASE_URL: i.dbUrl, REDIS_URL: i.redisUrl,
    GOTRUE_URL: 'http://localhost:9999', GOTRUE_JWT_SECRET: JWT,
    CORS_ORIGINS: 'http://localhost:5173', RATE_LIMIT_MAX: 1000,
    PII_ENCRYPTION_KEY: '0'.repeat(64),
    QR_HMAC_SECRET: SECRET,
    ADMIN_BOOTSTRAP_PASSWORD: 'test-admin-bootstrap-pw',
    SENTRY_DSN: undefined, ENABLE_JOBS: false, ENABLE_SWAGGER: false,
  } });
  pool = new Pool({ connectionString: i.dbUrl });
  redis = new Redis(i.redisUrl);
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  await seedDistricts(pool);
  await mkUser('alice'); await mkUser('bob', false);
});


// T21.6: proximity perk — daily cap; non-joined venue never triggers
test('T21.6 proximity ping: pro-venue member gets perk once/day; non-joined never', async () => {
  const bob = users.bob!;
  // pro merchant venue at 114.16, 22.28 (same coords as QR test venue pattern)
  const vname = `Prox venue ${crypto.randomUUID().slice(0, 6)}`;
  await pool.query(
    `insert into venues (source, display_name, category, location, status)
     values ('merchant', $1, 'bar', ST_SetSRID(ST_MakePoint(114.16, 22.28), 4326), 'active')`, [vname]);
  const vid = (await pool.query(`select id from venues where display_name = $1`, [vname])).rows[0].id;
  await pool.query(
    `insert into merchant_accounts (owner_user_id, venue_id, business_reg_cert_key, claim_status, tier)
     values ($1, $2, 'k', 'approved', 'pro')`, [users.carol?.id ?? bob.id, vid]);
  // bob NOT a member yet → no perk
  const p1 = await app.inject({ method: 'POST', url: '/v1/me/location-ping', headers: { authorization: `Bearer ${bob.tok}` }, payload: { lat: 22.28, lng: 114.16, purpose: 'proximity' } });
  expect(p1.statusCode).toBe(200);
  expect(p1.json().perk).toBeNull();
  // join → perk fires
  await pool.query(`insert into memberships (venue_id, user_id, kind, status, level_position) values ($1, $2, 'member', 'active', 0)`, [vid, bob.id]);
  const p2 = await app.inject({ method: 'POST', url: '/v1/me/location-ping', headers: { authorization: `Bearer ${bob.tok}` }, payload: { lat: 22.28, lng: 114.16, purpose: 'proximity' } });
  expect(p2.json().perk).toMatchObject({ venueId: vid });
  // same day → capped
  const p3 = await app.inject({ method: 'POST', url: '/v1/me/location-ping', headers: { authorization: `Bearer ${bob.tok}` }, payload: { lat: 22.28, lng: 114.16, purpose: 'proximity' } });
  expect(p3.json().perk).toBeNull();
});

afterAll(async () => { await app.close(); await pool.end(); await redis.quit(); await stopInfra(); });

const tok = (n: string) => ({ authorization: `Bearer ${users[n].tok}` });

test('unit: sign → verify round-trip; expired and tampered rejected', () => {
  const win = qrWindow();
  const p = signQrToken(users.alice.id, win, SECRET);
  expect(verifyQrToken(p, SECRET)).toEqual({ ok: true, userId: users.alice.id, window: win });

  // expired: window far in the past
  const old = signQrToken(users.alice.id, win - 10, SECRET);
  expect(verifyQrToken(old, SECRET)).toEqual({ ok: false, reason: 'expired' });

  // tampered: flip a char in signature
  const parts = Buffer.from(p, 'base64url').toString().split('|');
  const bad = Buffer.from(`${parts[0]}|${parts[1]}|${parts[2].slice(0, -2)}xx`).toString('base64url');
  expect(verifyQrToken(bad, SECRET)).toEqual({ ok: false, reason: 'bad_sig' });

  // malformed
  expect(verifyQrToken(Buffer.from('garbage').toString('base64url'), SECRET)).toEqual({ ok: false, reason: 'malformed' });
});

test('GET /me/qr: phone-verified gate + payload verifies; unverified 403', async () => {
  const denied = await app.inject({ method: 'GET', url: '/v1/me/qr', headers: tok('bob') });
  expect(denied.statusCode).toBe(403);

  const r = await app.inject({ method: 'GET', url: '/v1/me/qr', headers: tok('alice') });
  expect(r.statusCode).toBe(200);
  const body = r.json();
  expect(body.secondsRemaining).toBeGreaterThan(0);
  expect(body.secondsRemaining).toBeLessThanOrEqual(30);
  expect(verifyQrToken(body.payload, SECRET)).toMatchObject({ ok: true, userId: users.alice.id });
});

test('location ping stored in Redis only; replay protection single-use', async () => {
  const p = await app.inject({ method: 'POST', url: '/v1/me/location-ping', headers: tok('alice'),
    payload: { lat: 22.30, lng: 114.17, accuracyM: 20, purpose: 'qr' } });
  expect(p.statusCode).toBe(200);

  const raw = await redis.get(`qr:loc:${users.alice.id}`);
  expect(raw).toBeTruthy();
  expect(JSON.parse(raw!)).toEqual({ lat: 22.30, lng: 114.17, accuracyM: 20 });
  // never persisted to Postgres — no location columns exist; sanity: no row anywhere
  const cols = (await pool.query(`select column_name from information_schema.columns where table_name = 'users' and column_name like '%lat%'`)).rows;
  expect(cols).toHaveLength(0);

  const payload = signQrToken(users.alice.id, qrWindow(), SECRET);
  expect(await markQrUsed(redis, payload)).toBe(true);   // first use OK
  expect(await markQrUsed(redis, payload)).toBe(false);  // replay rejected
});
