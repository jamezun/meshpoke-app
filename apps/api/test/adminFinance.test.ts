import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { SignJWT } from 'jose';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'node:path';
import { buildApp } from '../src/app.js';
import { startInfra, stopInfra } from './db.js';
import type { Db } from '../src/db/client.js';


let infra: Awaited<ReturnType<typeof startInfra>>;
let app: Awaited<ReturnType<typeof buildApp>>;
let pool: pg.Pool;
let db: Db; // eslint-disable-line @typescript-eslint/no-unused-vars -- kept for fixture parity with other suites
let adminId = '';
let merchantUserId = '';
let venueId = '';
let merchantId = '';
let chargeId = '';
let invoiceId = '';

const JWT = process.env.GOTRUE_JWT_SECRET ?? 'e2e-secret-e2e-secret-e2e-secret-e2e-secret';
const token = (uid: string) => new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' }).setSubject(uid)
  .setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(JWT));
const H = async (uid: string) => ({ authorization: `Bearer ${await token(uid)}`, 'content-type': 'application/json' });

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  db = drizzle(pool) as unknown as Db;
  await migrate(drizzle(pool), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  app = await buildApp({ config: {
    NODE_ENV: 'test', PORT: '0', LOG_LEVEL: 'error', DATABASE_URL: infra.dbUrl, REDIS_URL: infra.redisUrl,
    GOTRUE_URL: 'http://127.0.0.1:9', GOTRUE_JWT_SECRET: JWT,
    CORS_ORIGINS: 'http://localhost:5173', RATE_LIMIT_MAX: '1000', SENTRY_DSN: '',
    PII_ENCRYPTION_KEY: 'a'.repeat(64), QR_HMAC_SECRET: 'b'.repeat(32),
    ADMIN_BOOTSTRAP_PASSWORD: 'adminpw', ENABLE_SWAGGER: false,
  } as never });
  await app.ready();

  async function mkUser(opts?: { admin?: boolean; email?: string }) {
    const id = crypto.randomUUID();
    await pool.query(
      `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state${opts?.admin ? ', is_admin, admin_roles' : ''})
       values ($1::uuid, $2, 'email', $3, '1996-05-05', $4, 'verified'${opts?.admin ? ", true, '{finance,superadmin}'" : ''})`,
      [id, opts?.email ?? `${id}@f.test`, `U${id.slice(0, 6)}`, `MP${id.slice(0, 6).toUpperCase()}`],
    );
    return id;
  }

  adminId = await mkUser({ admin: true, email: 'finance-admin@test' });
  merchantUserId = await mkUser({ email: 'fin-merchant@test' });

  venueId = crypto.randomUUID();
  await pool.query(
    `insert into venues (id, display_name, category, location, geocode_status, source)
     values ($1::uuid, 'Finance Test Bar', 'bar', ST_SetSRID(ST_MakePoint(114.15, 22.28), 4326)::geography, 'ok', 'merchant')`,
    [venueId],
  );
  merchantId = crypto.randomUUID();
  await pool.query(
    `insert into merchant_accounts (id, owner_user_id, venue_id, business_reg_cert_key, claim_status, tier, founding, founding_drops_start_at, founding_free_until)
     values ($1::uuid, $2::uuid, $3::uuid, 'br/x.pdf', 'approved', 'growth', true, now() - interval '10 days', now() + interval '80 days')`,
    [merchantId, merchantUserId, venueId],
  );
  // a billed charge + invoice rollup + open dispute
  const chk = await pool.query(
    `insert into merchant_checkins (venue_id, user_id, scanned_by, context, confidence)
     values ($1::uuid, $2::uuid, $2::uuid, 'drop', 'high') returning id`,
    [venueId, merchantUserId],
  );
  const charge = await pool.query(
    `insert into seat_charges (merchant_id, venue_id, checkin_id, event_type, band, base_fee, amount, disputed_at, dispute_status)
     values ($1::uuid, $2::uuid, $3::uuid, 'drop_seat', 2, 6, 6, now(), 'open') returning id`,
    [merchantId, venueId, chk.rows[0].id],
  );
  chargeId = charge.rows[0].id;
  const inv = await pool.query(
    `insert into invoices (merchant_id, period, saas_amount, seat_amount, total, status)
     values ($1::uuid, to_char(now(),'YYYY-MM'), 388, 6, 394, 'draft') returning id`,
    [merchantId],
  );
  invoiceId = inv.rows[0].id;
  await pool.query(`update seat_charges set invoice_id = $1::uuid where id = $2::uuid`, [invoiceId, chargeId]);
}, 300_000);

afterAll(async () => {
  await app.close();
  await pool.end();
  await stopInfra();
});

describe('T16.5 admin merchant finance', () => {
  it('founding roster lists the founding merchant', async () => {
    const r = await app.inject({ method: 'GET', url: '/v1/admin/merchant-finance/founding', headers: await H(adminId) });
    expect(r.statusCode).toBe(200);
    expect(r.json().founding.some((f: { id: string }) => f.id === merchantId)).toBe(true);
    // plain user 403
    const no = await app.inject({ method: 'GET', url: '/v1/admin/merchant-finance/founding', headers: await H(merchantUserId) });
    expect(no.statusCode).toBe(403);
  });

  it('billing health + ledger + band audit workspace', async () => {
    const health = await app.inject({ method: 'GET', url: '/v1/admin/merchant-finance/health', headers: await H(adminId) });
    expect(health.statusCode).toBe(200);
    expect(health.json().foundingMerchants).toBeGreaterThanOrEqual(1);
    expect(health.json().openDisputes).toBe(1);

    const ledger = await app.inject({ method: 'GET', url: `/v1/admin/merchant-finance/venues/${venueId}/ledger`, headers: await H(adminId) });
    expect(ledger.statusCode).toBe(200);
    expect(ledger.json().ledger.some((l: { id: string }) => l.id === chargeId)).toBe(true);
    expect(ledger.json().invoices[0].period).toMatch(/^\d{4}-\d{2}$/);

    // band audit: never audited → due; then change band → audited
    const due = await app.inject({ method: 'GET', url: '/v1/admin/merchant-finance/band-audit', headers: await H(adminId) });
    expect(due.statusCode).toBe(200);
    expect(due.json().due.some((d: { id: string }) => d.id === venueId)).toBe(true);
    const change = await app.inject({ method: 'POST', url: `/v1/admin/merchant-finance/band-audit/${venueId}`,
      headers: await H(adminId), payload: JSON.stringify({ newBand: 3, note: 'menu prices up' }) });
    expect(change.statusCode).toBe(200);
    expect(change.json().newBand).toBe(3);
    const after = await app.inject({ method: 'GET', url: '/v1/admin/merchant-finance/band-audit', headers: await H(adminId) });
    expect(after.json().due.some((d: { id: string }) => d.id === venueId)).toBe(false);
  });

  it('dispute end-to-end: accept → credit note adjusts invoice; reject path on second dispute', async () => {
    const list = await app.inject({ method: 'GET', url: '/v1/admin/merchant-finance/disputes', headers: await H(adminId) });
    expect(list.statusCode).toBe(200);
    expect(list.json().disputes[0].id).toBe(chargeId);

    const resolve = await app.inject({ method: 'POST', url: `/v1/admin/merchant-finance/disputes/${chargeId}/resolve`,
      headers: await H(adminId), payload: JSON.stringify({ resolution: 'credit_note', note: 'double scan' }) });
    expect(resolve.statusCode).toBe(200);
    expect(resolve.json().resolved).toBe('credit_note');

    const inv = await pool.query(`select seat_amount, total from invoices where id = $1::uuid`, [invoiceId]);
    expect(inv.rows[0].seat_amount).toBe(0);
    expect(inv.rows[0].total).toBe(388);

    // re-resolve blocked
    const again = await app.inject({ method: 'POST', url: `/v1/admin/merchant-finance/disputes/${chargeId}/resolve`,
      headers: await H(adminId), payload: JSON.stringify({ resolution: 'rejected' }) });
    expect(again.statusCode).toBe(409);
  });
});
