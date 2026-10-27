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
import { signQrToken, qrWindow } from '../src/routes/userQr.js';

const JWT = 'test-jwt-secret-at-least-32-characters-long';
const SECRET = 'test-qr-hmac-secret-32-chars-minimum!!!';
const infra = useInfra();

let app: Awaited<ReturnType<typeof buildApp>>;
let pool: Pool;
const users: Record<string, { id: string; tok: string }> = {};

async function mkUser(name: string): Promise<string> {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, phone_verified_at)
     values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified', now())`,
    [id, `${name}${id.slice(0, 8)}@t.test`, name, `MP${id.slice(0, 6).toUpperCase()}`],
  );
  users[name] = { id, tok: await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT)) };
  return id;
}

const VENUE_ID = '11111111-1111-4111-8111-111111111111';
let merchantId = '';

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
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  await seedDistricts(pool);
  const ownerId = await mkUser('owner');
  await mkUser('guest1'); await mkUser('guest2');
  await pool.query(`insert into venues (id, display_name, source, status, category, location)
    values ($1::uuid, 'Scan Test Bar', 'merchant', 'active', 'bar', ST_SetSRID(ST_MakePoint(114.1700, 22.3000), 4326)::geography)`, [VENUE_ID]);
  merchantId = crypto.randomUUID();
  await pool.query(`insert into merchant_accounts (id, owner_user_id, venue_id, claim_status, business_reg_cert_key)
    values ($1::uuid, $2::uuid, $3::uuid, 'approved', 'test/br.pdf')`, [merchantId, ownerId, VENUE_ID]);
});

afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

const tok = (n: string) => ({ authorization: `Bearer ${users[n].tok}` });
const freshQr = (n: string) => signQrToken(users[n].id, qrWindow(), SECRET);

async function claimDrop(user: string, dropId: string): Promise<void> {
  await pool.query(`insert into drop_claims (drop_id, user_id) values ($1::uuid, $2::uuid)`, [dropId, users[user].id]);
}

test('drop context: claimed drop redeems on scan; GPS high when guest pinged nearby', async () => {
  const dropId = crypto.randomUUID();
  await pool.query(`insert into drops (id, venue_id, kind, title, offer_text, capacity, starts_at, ends_at, status)
    values ($1::uuid, $2::uuid, 'individual', 'Free coffee', 'Free coffee with any cake', 10, now() - interval '1 hour', now() + interval '1 hour', 'active')`, [dropId, VENUE_ID]);
  await claimDrop('guest1', dropId);

  // guest location ping near venue (same coords)
  const ping = await app.inject({ method: 'POST', url: '/v1/me/location-ping', headers: tok('guest1'),
    payload: { lat: 22.3000, lng: 114.1700, accuracyM: 30, purpose: 'qr' } });
  expect(ping.statusCode).toBe(200);

  const scan = await app.inject({ method: 'POST', url: '/v1/merchant/scan', headers: tok('owner'),
    payload: { qrPayload: freshQr('guest1') } });
  expect(scan.statusCode).toBe(200);
  const b = scan.json();
  expect(b.context).toBe('drop');
  expect(b.dropId).toBe(dropId);
  expect(b.confidence).toBe('high');
  expect(b.billable).toBe(true);
  expect(b.guest.displayName).toBe('guest1');

  // claim redeemed
  const redeemed = (await pool.query(`select redeemed_at is not null as r from drop_claims where drop_id = $1 and user_id = $2`, [dropId, users.guest1.id])).rows;
  expect(redeemed[0].r).toBe(true);

  // checkin row written
  const chk = (await pool.query(`select context, confidence from merchant_checkins where venue_id = $1 and user_id = $2`, [VENUE_ID, users.guest1.id])).rows;
  expect(chk[0]).toMatchObject({ context: 'drop', confidence: 'high' });
});

test('member_visit: once per day; second scan same day 409; low confidence not billable', async () => {
  await pool.query(`insert into memberships (id, venue_id, user_id, kind, status)
    values ($1, $2::uuid, $3::uuid, 'founding_circle', 'active')`, [crypto.randomUUID(), VENUE_ID, users.guest2.id]);

  // guest2 pings far away → low confidence
  const ping = await app.inject({ method: 'POST', url: '/v1/me/location-ping', headers: tok('guest2'),
    payload: { lat: 22.35, lng: 114.20, accuracyM: 30, purpose: 'qr' } });
  expect(ping.statusCode).toBe(200);

  const first = await app.inject({ method: 'POST', url: '/v1/merchant/scan', headers: tok('owner'),
    payload: { qrPayload: freshQr('guest2') } });
  expect(first.statusCode).toBe(200);
  const b = first.json();
  expect(b.context).toBe('member_visit');
  expect(b.confidence).toBe('low');
  expect(b.billable).toBe(false); // low confidence never billable

  // membership visit counted
  const m = (await pool.query(`select visits_count, last_visit_at is not null as t from memberships where user_id = $1`, [users.guest2.id])).rows;
  expect(m[0]).toMatchObject({ visits_count: 1, t: true });

  // second same-day member visit → 409
  const second = await app.inject({ method: 'POST', url: '/v1/merchant/scan', headers: tok('owner'),
    payload: { qrPayload: freshQr('guest2') } });
  expect(second.statusCode).toBe(409);

  // no context user → 422
  const noAcct = crypto.randomUUID();
  await pool.query(`insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, phone_verified_at)
    values ($1::uuid, $2, 'email', 'stranger', '1990-01-01', 'MPSTRANG', 'verified', now())`, [noAcct, `s${noAcct.slice(0, 8)}@t.test`]);
  const stranger = signQrToken(noAcct, qrWindow(), SECRET);
  const s = await app.inject({ method: 'POST', url: '/v1/merchant/scan', headers: tok('owner'), payload: { qrPayload: stranger } });
  expect(s.statusCode).toBe(422);

  // replay: same QR scanned twice → 409 (fresh guest1 QR)
  const rp = freshQr('guest1');
  const r1 = await app.inject({ method: 'POST', url: '/v1/merchant/scan', headers: tok('owner'), payload: { qrPayload: rp } });
  expect(r1.statusCode).toBeGreaterThanOrEqual(200);
  const r2 = await app.inject({ method: 'POST', url: '/v1/merchant/scan', headers: tok('owner'), payload: { qrPayload: rp } });
  expect(r2.statusCode).toBe(409);

  // non-staff 403
  const guestScan = await app.inject({ method: 'POST', url: '/v1/merchant/scan', headers: tok('guest1'),
    payload: { qrPayload: freshQr('guest2') } });
  expect(guestScan.statusCode).toBe(403);
});
