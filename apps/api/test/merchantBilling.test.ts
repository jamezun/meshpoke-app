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
import type { Db } from '../src/db/client.js';

const JWT = 'test-jwt-secret-at-least-32-characters-long';
const infra = useInfra();

let app: Awaited<ReturnType<typeof buildApp>>;
let pool: Pool;
let db: Db;
const users: Record<string, { id: string; tok: string }> = {};

async function mkUser(name: string, admin = false): Promise<string> {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, phone_verified_at, is_admin, admin_roles)
     values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified', now(), $5, $6)`,
    [id, `${name}${id.slice(0, 8)}@t.test`, name, `MP${id.slice(0, 6).toUpperCase()}`, admin, admin ? '{superadmin}' : '{}'],
  );
  users[name] = { id, tok: await new SignJWT({ role: admin ? 'admin' : 'authenticated', admin_roles: admin ? ['superadmin'] : [], aal: 'aal2' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT)) };
  return id;
}

let VENUE: string; let merchantId: string; let seatChargeId: string;

beforeAll(async () => {
  const i = await infra;
  app = await buildApp({ config: {
    NODE_ENV: 'test', PORT: 0, LOG_LEVEL: 'fatal',
    DATABASE_URL: i.dbUrl, REDIS_URL: i.redisUrl,
    GOTRUE_URL: 'http://localhost:9999', GOTRUE_JWT_SECRET: JWT,
    CORS_ORIGINS: 'http://localhost:5173', RATE_LIMIT_MAX: 1000,
    PII_ENCRYPTION_KEY: '0'.repeat(64),
    QR_HMAC_SECRET: 'test-qr-hmac-secret-32-chars-minimum!!!',
    ADMIN_BOOTSTRAP_PASSWORD: 'test-admin-bootstrap-pw',
    SENTRY_DSN: undefined, ENABLE_JOBS: false, ENABLE_SWAGGER: false,
  } });
  pool = new Pool({ connectionString: i.dbUrl });
  db = drizzle(pool, { schema }) as Db;
  await migrate(db, { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  await seedDistricts(pool);

  await mkUser('admin', true);
  const ownerId = await mkUser('owner');
  VENUE = crypto.randomUUID();
  await pool.query(`insert into venues (id, display_name, source, status, category, location)
    values ($1::uuid, 'SaaS Bar', 'merchant', 'active', 'bar', ST_SetSRID(ST_MakePoint(114.17, 22.30), 4326)::geography)`, [VENUE]);
  merchantId = crypto.randomUUID();
  await pool.query(`insert into merchant_accounts (id, owner_user_id, venue_id, claim_status, tier, founding, business_reg_cert_key, price_band)
    values ($1::uuid, $2::uuid, $3::uuid, 'approved', 'starter', true, 'test/br.pdf', 1)`, [merchantId, ownerId, VENUE]);
  await mkUser('other');

  // a real seat charge to dispute later
  const guestId = users.other.id;
  const chk = await pool.query(`insert into merchant_checkins (venue_id, user_id, scanned_by, context, confidence, gps_distance_m)
    values ($1::uuid, $2::uuid, $3::uuid, 'member_visit', 'high', 5) returning id`, [VENUE, guestId, ownerId]);
  await pool.query(`insert into seat_charges (merchant_id, venue_id, checkin_id, event_type, band, base_fee, multiplier, amount, shadow)
    values ($1::uuid, $2::uuid, $3::uuid, 'new_member_visit', 1, 3, 1, 3, false)`, [merchantId, VENUE, chk.rows[0].id]);
  seatChargeId = (await pool.query(`select id from seat_charges limit 1`)).rows[0].id;
});

afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

const tok = (n: string) => ({ authorization: `Bearer ${users[n].tok}` });

test('setup-intent stub + subscribe founding price + invoice run aggregates unbilled', async () => {
  const si = await app.inject({ method: 'POST', url: '/v1/merchant/billing/setup-intent', headers: tok('owner') });
  expect(si.statusCode).toBe(200);
  expect(si.json()).toMatchObject({ stub: true });

  // founding merchant subscribes growth → 288 founding price
  const sub = await app.inject({ method: 'POST', url: '/v1/merchant/billing/subscribe', headers: tok('owner'), payload: { tier: 'growth' } });
  expect(sub.statusCode).toBe(200);
  expect(sub.json()).toMatchObject({ ok: true, tier: 'growth', priceHkd: 288 });
  const tierRow = (await pool.query(`select tier from merchant_accounts where id = $1`, [merchantId])).rows;
  expect(tierRow[0].tier).toBe('growth');

  // invoice run: aggregates the 3-HKD unbilled charge into current-month invoice
  const run = await app.inject({ method: 'POST', url: '/v1/internal/merchant-invoice-run', headers: tok('admin'), payload: { merchantId } });
  expect(run.statusCode).toBe(200);
  expect(run.json().invoiced).toBe(1);
  const inv = (await pool.query(`select seat_amount, total from invoices where merchant_id = $1 and period = to_char(now(), 'YYYY-MM')`, [merchantId])).rows;
  expect(inv[0]).toMatchObject({ seat_amount: 3, total: 3 });
  // unbilled set cleared
  const left = (await pool.query(`select count(*)::int as n from seat_charges where merchant_id = $1 and invoice_id is null`, [merchantId])).rows;
  expect(left[0].n).toBe(0);

  // cancel → tier back to starter
  const cancel = await app.inject({ method: 'POST', url: '/v1/merchant/billing/cancel', headers: tok('owner') });
  expect(cancel.statusCode).toBe(200);
  const t2 = (await pool.query(`select tier from merchant_accounts where id = $1`, [merchantId])).rows;
  expect(t2[0].tier).toBe('starter');
});

test('dispute seat within 7d works; re-dispute blocked', async () => {
  const d = await app.inject({ method: 'POST', url: `/v1/merchant/seat-charges/${seatChargeId}/dispute`, headers: tok('owner') });
  expect(d.statusCode).toBe(200);
  const again = await app.inject({ method: 'POST', url: `/v1/merchant/seat-charges/${seatChargeId}/dispute`, headers: tok('owner') });
  expect(again.statusCode).toBe(422);
  const outsider = await app.inject({ method: 'POST', url: `/v1/merchant/seat-charges/${seatChargeId}/dispute`, headers: tok('other') });
  expect(outsider.statusCode).toBe(404);
});

test('stripe webhook: rejects unsigned/unknown in stub mode, accepts test event', async () => {
  const bad = await app.inject({ method: 'POST', url: '/v1/webhooks/stripe', payload: { type: 'invoice.paid' } });
  expect(bad.statusCode).toBe(400);
  const ok = await app.inject({ method: 'POST', url: '/v1/webhooks/stripe', payload: { type: 'test' } });
  expect(ok.statusCode).toBe(200);
});
