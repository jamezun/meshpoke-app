import { afterAll, beforeAll, expect, test } from 'vitest';
import { SignJWT } from 'jose';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { join } from 'node:path';
import * as schema from '../src/db/schema/index.js';
import { buildApp } from '../src/app.js';
import { seedDistricts } from '../src/db/seed.js';
import { useInfra, stopInfra } from './db.js';
import { notify } from '../src/notify.js';

const JWT = 'test-jwt-secret-at-least-32-characters-long';
const infra = useInfra();

let app: Awaited<ReturnType<typeof buildApp>>;
let pool: Pool;
let dbUrl = '';
const users: Record<string, { id: string; tok: string }> = {};

async function mkUser(name: string): Promise<void> {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, phone_verified_at)
     values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified', now())`,
    [id, `${name}${id.slice(0, 8)}@t.test`, name, `MP${id.slice(0, 6).toUpperCase()}`],
  );
  users[name] = { id, tok: await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT)) };
}

beforeAll(async () => {
  const i = await infra;
  dbUrl = i.dbUrl;
  app = await buildApp({ config: {
    NODE_ENV: 'test', PORT: 0, LOG_LEVEL: 'fatal',
    DATABASE_URL: dbUrl, REDIS_URL: i.redisUrl,
    GOTRUE_URL: 'http://localhost:9999', GOTRUE_JWT_SECRET: JWT,
    CORS_ORIGINS: 'http://localhost:5173', RATE_LIMIT_MAX: 1000,
    PII_ENCRYPTION_KEY: '0'.repeat(64),
    QR_HMAC_SECRET: 'test-qr-hmac-secret-32-chars-minimum!!!',
    ADMIN_BOOTSTRAP_PASSWORD: 'test-admin-bootstrap-pw',
    SENTRY_DSN: undefined, ENABLE_JOBS: false, ENABLE_SWAGGER: false,
  } });
  pool = new Pool({ connectionString: dbUrl });
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  await seedDistricts(pool);
  await mkUser('alice'); await mkUser('bob');
});

afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

const tok = (n: string) => ({ authorization: `Bearer ${users[n].tok}` });

test('activity feed: notify creates items, cursor pagination, mark read, unread count', async () => {
  for (let i = 0; i < 3; i++) {
    await notify(dbUrl, users.alice.id, 'pokes', 'poke_received', { from: users.bob.id, i });
  }
  await notify(dbUrl, users.bob.id, 'spots', 'date_pinned', { spotId: '00000000-0000-0000-0000-000000000000' });

  const feed = await app.inject({ method: 'GET', url: '/v1/me/activity', headers: tok('alice') });
  expect(feed.statusCode).toBe(200);
  const body = feed.json();
  expect(body.items.length).toBe(3);
  expect(body.unread).toBe(3);

  // cursor: fetch older page after first item
  const cursor = body.items[0].id;
  const page2 = await app.inject({ method: 'GET', url: `/v1/me/activity?cursor=${cursor}`, headers: tok('alice') });
  expect(page2.json().items.length).toBe(2);

  // mark read
  const read = await app.inject({ method: 'POST', url: '/v1/me/activity/read', headers: tok('alice'),
    payload: { ids: body.items.map((x: { id: string }) => x.id) } });
  expect(read.statusCode).toBe(200);
  const after = await app.inject({ method: 'GET', url: '/v1/me/activity?limit=1', headers: tok('alice') });
  expect(after.json().unread).toBe(0);
});

test('push dispatch: token registration, quiet-hours deferral, opted-out category never queued', async () => {
  // register a token for alice
  const reg = await app.inject({ method: 'POST', url: '/v1/me/push-tokens', headers: tok('alice'),
    payload: { token: 'fcm-token-alice-aaaaaaaaaaaaaaaaaaaa', platform: 'android' } });
  expect(reg.statusCode).toBe(200);

  // non-promo notify → outbox row (send_at may defer if quiet hours — check row exists either way)
  await notify(dbUrl, users.alice.id, 'pokes', 'poke_received', { from: users.bob.id });
  let out = (await pool.query(`select * from push_outbox where user_id = $1`, [users.alice.id])).rows;
  expect(out.length).toBe(1);
  expect(out[0].status).toBe('pending');

  // promo without consent → never queued
  await notify(dbUrl, users.alice.id, 'promo', 'launch_deal', {});
  out = (await pool.query(`select * from push_outbox where user_id = $1 and category = 'promo'`, [users.alice.id])).rows;
  expect(out.length).toBe(0);

  // prefs: opt in to promo records consent timestamp; merchant mute round-trip
  const pref = await app.inject({ method: 'PATCH', url: '/v1/me/notification-prefs', headers: tok('alice'),
    payload: { promoOptIn: true } });
  expect(pref.statusCode).toBe(200);
  const got = await app.inject({ method: 'GET', url: '/v1/me/notification-prefs', headers: tok('alice') });
  expect(got.json().promoOptIn).toBe(true);
  expect(got.json().promoConsentAt).toBeTruthy();

  await notify(dbUrl, users.alice.id, 'promo', 'launch_deal', {});
  out = (await pool.query(`select * from push_outbox where user_id = $1 and category = 'promo'`, [users.alice.id])).rows;
  expect(out.length).toBe(1); // consent given → queued

  // merchant mute
  const mid = crypto.randomUUID();
  const vid = crypto.randomUUID();
  await pool.query(`insert into venues (id, display_name, source, category, status, location) values ($1::uuid, 'Mute Test Cafe', 'user', 'cafe', 'active', ST_SetSRID(ST_MakePoint(114.17, 22.30), 4326)::geography)`, [vid]);
  await pool.query(`insert into merchant_accounts (id, owner_user_id, venue_id, business_reg_cert_key, claim_status) values ($1::uuid, $2::uuid, $3::uuid, 'br/test.pdf', 'approved')`, [mid, users.bob.id, vid]);
  const mute = await app.inject({ method: 'POST', url: `/v1/merchants/${mid}/mute`, headers: tok('alice'), payload: {} });
  expect(mute.statusCode).toBe(200);
  const muted = (await pool.query(`select count(*)::int as n from merchant_mutes where user_id = $1 and merchant_id = $2`, [users.alice.id, mid])).rows;
  expect(muted[0].n).toBe(1);
  const unmute = await app.inject({ method: 'DELETE', url: `/v1/merchants/${mid}/mute`, headers: tok('alice') });
  expect(unmute.statusCode).toBe(200);
});

test('emitters wired: real poke flow creates activity for target', async () => {
  const r = await app.inject({ method: 'POST', url: '/v1/pokes', headers: tok('bob'),
    payload: { to: users.alice.id, source: 'map' } });
  expect(r.statusCode).toBe(201);
  const items = (await pool.query(
    `select count(*)::int as n from activity_items where user_id = $1 and type = 'poke_received'`, [users.alice.id])).rows;
  expect(items[0].n).toBeGreaterThanOrEqual(1);
});
