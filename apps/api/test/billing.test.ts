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
import { onCheckin, onDropActivated } from '../src/billing.js';
import { signQrToken, qrWindow } from '../src/routes/userQr.js';

const JWT = 'test-jwt-secret-at-least-32-characters-long';
const SECRET = 'test-qr-hmac-secret-32-chars-minimum!!!';
const infra = useInfra();

let app: Awaited<ReturnType<typeof buildApp>>;
let pool: Pool;
let db: ReturnType<typeof drizzle>;
const users: Record<string, { id: string; tok: string }> = {};

async function mkUser(name: string, accountAgeDays = 30): Promise<string> {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, phone_verified_at, created_at)
     values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified', now(), now() - ($5 || ' days')::interval)`,
    [id, `${name}${id.slice(0, 8)}@t.test`, name, `MP${id.slice(0, 6).toUpperCase()}`, String(accountAgeDays)],
  );
  users[name] = { id, tok: await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT)) };
  return id;
}

const VENUE = crypto.randomUUID();
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
  db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  await seedDistricts(pool);
  const ownerId = await mkUser('mowner');
  await pool.query(`insert into venues (id, display_name, source, status, category, location)
    values ($1::uuid, 'Billing Bar', 'merchant', 'active', 'bar', ST_SetSRID(ST_MakePoint(114.17, 22.30), 4326)::geography)`, [VENUE]);
  merchantId = crypto.randomUUID();
  await pool.query(`insert into merchant_accounts (id, owner_user_id, venue_id, claim_status, tier, business_reg_cert_key, price_band)
    values ($1::uuid, $2::uuid, $3::uuid, 'approved', 'growth', 'test/br.pdf', 2)`, [merchantId, ownerId, VENUE]);
  await mkUser('guestA', 30); await mkUser('guestB', 2); await mkUser('guestC', 30); await mkUser('guestD', 30);
});

afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

const tok = (n: string) => ({ authorization: `Bearer ${users[n].tok}` });
const freshQr = (n: string) => signQrToken(users[n].id, qrWindow(), SECRET);

/** full scan flow helper: guest pings at venue, owner scans → returns checkinId */
async function scan(user: string): Promise<{ status: number; body: Record<string, unknown> }> {
  await app.inject({ method: 'POST', url: '/v1/me/location-ping', headers: tok(user),
    payload: { lat: 22.30, lng: 114.17, accuracyM: 20, purpose: 'qr' } });
  const r = await app.inject({ method: 'POST', url: '/v1/merchant/scan', headers: tok('mowner'),
    payload: { qrPayload: freshQr(user) } });
  return { status: r.statusCode, body: r.json() as Record<string, unknown> };
}

test('seat charges: drop_seat happy path, account-age gate, idempotency, band fee, invoice rollup', async () => {
  const dropId = crypto.randomUUID();
  await pool.query(`insert into drops (id, venue_id, kind, title, offer_text, capacity, starts_at, ends_at, status)
    values ($1::uuid, $2::uuid, 'individual', 'B1', 'Offer', 50, now() - interval '1 hour', now() + interval '1 hour', 'active')`, [dropId, VENUE]);
  await pool.query(`insert into drop_claims (drop_id, user_id) values ($1::uuid, $2::uuid)`, [dropId, users.guestA.id]);
  await pool.query(`insert into drop_claims (drop_id, user_id) values ($1::uuid, $2::uuid)`, [dropId, users.guestB.id]);

  // guestA: old enough → charged
  const a = await scan('guestA');
  expect(a.status).toBe(200);
  expect(a.body.charge).toMatchObject({ charged: true, shadow: false });
  expect(a.body.charge.amount).toBe(6); // band 120 seats → 6 HKD

  // guestB: account 2 days old → never charged
  const b = await scan('guestB');
  expect(b.body.charge).toMatchObject({ charged: false, amount: null });

  // idempotent: re-running onCheckin for same checkin adds nothing
  const cid = (await pool.query(`select id from merchant_checkins where user_id = $1 order by created_at desc limit 1`, [users.guestA.id])).rows[0].id;
  const again = await onCheckin(db, cid);
  expect(again.charged).toBe(false);
  const n = (await pool.query(`select count(*)::int as n from seat_charges where checkin_id = $1`, [cid])).rows;
  expect(n[0].n).toBe(1);

  // invoice rollup: seat_amount = 6 for current month
  const inv = (await pool.query(`select seat_amount from invoices where merchant_id = $1 and period = to_char(now(), 'YYYY-MM')`, [merchantId])).rows;
  expect(inv[0].seat_amount).toBe(6);

  // sponsored multiplier 1.5×: second drop sponsored
  const sdropId = crypto.randomUUID();
  await pool.query(`insert into drops (id, venue_id, kind, title, offer_text, capacity, sponsored, starts_at, ends_at, status)
    values ($1::uuid, $2::uuid, 'individual', 'S1', 'Sponsored offer', 50, true, now() - interval '1 hour', now() + interval '1 hour', 'active')`, [sdropId, VENUE]);
  await pool.query(`insert into drop_claims (drop_id, user_id) values ($1::uuid, $2::uuid)`, [sdropId, users.guestC.id]);
  const c = await scan('guestC');
  expect(c.body.charge).toMatchObject({ charged: true, amount: 9 }); // 6 × 1.5
});

test('founding clock: first drop activation sets 3-month free window; month-1 seats are shadow', async () => {
  const fownerId = await mkUser('fowner');
  const fvenue = crypto.randomUUID();
  const fmid = crypto.randomUUID();
  await pool.query(`insert into venues (id, display_name, source, status, category, location)
    values ($1::uuid, 'Founding Cafe', 'merchant', 'active', 'cafe', ST_SetSRID(ST_MakePoint(114.18, 22.31), 4326)::geography)`, [fvenue]);
  await pool.query(`insert into merchant_accounts (id, owner_user_id, venue_id, claim_status, tier, founding, business_reg_cert_key, price_band)
    values ($1::uuid, $2::uuid, $3::uuid, 'approved', 'growth', true, 'test/br2.pdf', 1)`, [fmid, fownerId, fvenue]);
  const d1 = crypto.randomUUID();
  await pool.query(`insert into drops (id, venue_id, kind, title, offer_text, capacity, starts_at, ends_at, status)
    values ($1::uuid, $2::uuid, 'individual', 'F1', 'Founding offer', 50, now(), now() + interval '1 hour', 'active')`, [d1, fvenue]);

  await onDropActivated(db, d1);
  const ma = (await pool.query(`select founding_drops_start_at is not null as started, founding_free_until > now() + interval '2 months' as free3mo from merchant_accounts where id = $1`, [fmid])).rows;
  expect(ma[0]).toMatchObject({ started: true, free3mo: true });

  // guestD claims founding drop, scans → shadow charge (shown not charged)
  await pool.query(`insert into drop_claims (drop_id, user_id) values ($1::uuid, $2::uuid)`, [d1, users.guestD.id]);
  await app.inject({ method: 'POST', url: '/v1/me/location-ping', headers: tok('guestD'),
    payload: { lat: 22.31, lng: 114.18, accuracyM: 20, purpose: 'qr' } });
  // guestD scans at founding venue — scanner is bound to mowner's venue; use onCheckin directly via manual checkin row
  await pool.query(`insert into merchant_checkins (venue_id, user_id, scanned_by, context, drop_id, confidence, gps_distance_m)
    values ($1::uuid, $2::uuid, $3::uuid, 'drop', $4::uuid, 'high', 10)`, [fvenue, users.guestD.id, fownerId, d1]);
  const cid = (await pool.query(`select id from merchant_checkins where venue_id = $1 order by created_at desc limit 1`, [fvenue])).rows[0].id;
  const r = await onCheckin(db, cid);
  expect(r).toMatchObject({ charged: false, shadow: true, amount: 0 });
});
