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

const JWT = 'test-jwt-secret-at-least-32-characters-long';
const infra = useInfra();

let app: Awaited<ReturnType<typeof buildApp>>;
let pool: Pool;
const users: Record<string, { id: string; tok: string }> = {};

async function mkUser(name: string, phone = true): Promise<string> {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, phone_verified_at)
     values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified', ${phone ? 'now()' : 'null'})`,
    [id, `${name}${id.slice(0, 8)}@t.test`, name, `MP${id.slice(0, 6).toUpperCase()}`],
  );
  users[name] = { id, tok: await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT)) };
  return id;
}

const VENUE_ID = '22222222-2222-4222-8222-222222222222';
let merchantId = '';

async function setupMerchant(tier: 'starter' | 'growth' | 'pro', name: string, budgetCap = 0): Promise<void> {
  const ownerId = await mkUser(name);
  const mid = crypto.randomUUID();
  await pool.query(`insert into merchant_accounts (id, owner_user_id, venue_id, claim_status, tier, business_reg_cert_key, monthly_budget_cap)
    values ($1::uuid, $2::uuid, $3::uuid, 'approved', $4, 'test/br.pdf', $5)`, [mid, ownerId, VENUE_ID, tier, budgetCap]);
  if (name === 'owner') merchantId = mid;
}

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
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  await seedDistricts(pool);
  await pool.query(`insert into venues (id, display_name, source, status, category, location)
    values ($1::uuid, 'Drops Test Cafe', 'merchant', 'active', 'cafe', ST_SetSRID(ST_MakePoint(114.17, 22.30), 4326)::geography)`, [VENUE_ID]);
  await setupMerchant('growth', 'owner');
  await mkUser('claimer1'); await mkUser('claimer2'); await mkUser('claimer3'); await mkUser('nofone', false);
});

afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

const tok = (n: string) => ({ authorization: `Bearer ${users[n].tok}` });

let dropId = '';

test('merchant creates drop; >20% discount needs estimate; tier limits; user claims until capacity', async () => {
  // >20% discount without perkCostEstimate → 422
  const bad = await app.inject({ method: 'POST', url: '/v1/merchant/drops', headers: tok('owner'),
    payload: { kind: 'individual', title: '25% off', offerText: '25% off everything', capacity: 10, sponsored: false,
      startsAt: new Date(Date.now() - 3.6e6).toISOString(), endsAt: new Date(Date.now() + 3.6e6).toISOString(), discountPct: 25 } });
  expect(bad.statusCode).toBe(422);

  // good drop, capacity 2
  const okDrop = await app.inject({ method: 'POST', url: '/v1/merchant/drops', headers: tok('owner'),
    payload: { kind: 'individual', title: 'Free coffee', offerText: 'Free coffee with cake', perkCostEstimate: 40, capacity: 2, sponsored: false,
      startsAt: new Date(Date.now() - 3.6e6).toISOString(), endsAt: new Date(Date.now() + 3.6e6).toISOString() } });
  expect(okDrop.statusCode).toBe(201);
  dropId = okDrop.json().dropId;

  // cost estimate endpoint
  const est = await app.inject({ method: 'GET', url: `/v1/merchant/drops/${dropId}/cost-estimate`, headers: tok('owner') });
  expect(est.statusCode).toBe(200);
  expect(est.json().totalPerGuest).toBeGreaterThan(0);

  // public listing
  const list = await app.inject({ method: 'GET', url: `/v1/venues/${VENUE_ID}/drops` });
  expect(list.statusCode).toBe(200);
  expect(list.json().drops.length).toBe(1);

  // unverified phone 403
  const no = await app.inject({ method: 'POST', url: `/v1/drops/${dropId}/claim`, headers: tok('nofone') });
  expect(no.statusCode).toBe(403);

  // claims: 2 OK, 3rd 409 full, dup 409 already claimed
  const c1 = await app.inject({ method: 'POST', url: `/v1/drops/${dropId}/claim`, headers: tok('claimer1') });
  expect(c1.statusCode).toBe(201);
  const dup = await app.inject({ method: 'POST', url: `/v1/drops/${dropId}/claim`, headers: tok('claimer1') });
  expect(dup.statusCode).toBe(409);
  const c2 = await app.inject({ method: 'POST', url: `/v1/drops/${dropId}/claim`, headers: tok('claimer2') });
  expect(c2.statusCode).toBe(201);
  const c3 = await app.inject({ method: 'POST', url: `/v1/drops/${dropId}/claim`, headers: tok('claimer3') });
  expect(c3.statusCode).toBe(409);
  expect(c3.json().title).toBe('Drop full');
  // claimed_count consistent = 2 (exactly-once under row lock)
  const n = (await pool.query(`select claimed_count::int as n from drops where id = $1`, [dropId])).rows;
  expect(n[0].n).toBe(2);
});

test('tier limit: growth = 3 active drops → 4th 402; pause frees a slot; budget cap pauses', async () => {
  const mk = { kind: 'individual', title: 'Drop N', offerText: 'Offer N', capacity: 5, sponsored: false,
    startsAt: new Date(Date.now() - 3.6e6).toISOString(), endsAt: new Date(Date.now() + 3.6e6).toISOString() } as const;
  const d2 = await app.inject({ method: 'POST', url: '/v1/merchant/drops', headers: tok('owner'), payload: mk });
    expect(d2.statusCode).toBe(201);
  const d3 = await app.inject({ method: 'POST', url: '/v1/merchant/drops', headers: tok('owner'), payload: mk });
  expect(d3.statusCode).toBe(201);
  const d4 = await app.inject({ method: 'POST', url: '/v1/merchant/drops', headers: tok('owner'), payload: mk });
  expect(d4.statusCode).toBe(402);
  expect(d4.json().title).toContain('Plan limit');

  // pause frees the slot
  const pause = await app.inject({ method: 'PATCH', url: `/v1/merchant/drops/${d2.json().dropId}`, headers: tok('owner'), payload: { status: 'paused' } });
  expect(pause.statusCode).toBe(200);
  const d5 = await app.inject({ method: 'POST', url: '/v1/merchant/drops', headers: tok('owner'), payload: mk });
  expect(d5.statusCode).toBe(201);

  // budget cap: seed an invoice for the current month pushing mtd >= cap
  const cap = 100;
  await pool.query(`update merchant_accounts set monthly_budget_cap = $2, tier = 'pro' where id = $1`, [merchantId, cap]);
  await pool.query(`insert into invoices (id, merchant_id, period, seat_amount) values ($1, $2, to_char(now(), 'YYYY-MM'), 999)
    on conflict (merchant_id, period) do update set seat_amount = 999`,
    [crypto.randomUUID(), merchantId]);
  const d6 = await app.inject({ method: 'POST', url: '/v1/merchant/drops', headers: tok('owner'), payload: mk });
  expect(d6.statusCode).toBe(402);
  expect(d6.json().title).toContain('budget');
});
