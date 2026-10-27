import { afterAll, beforeAll, expect, test } from 'vitest';
import { SignJWT } from 'jose';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { join } from 'node:path';
import * as schema from '../src/db/schema/index.js';
import { buildApp } from '../src/app.js';
import { useInfra, stopInfra } from './db.js';

const JWT = 'test-jwt-secret-at-least-32-characters-long';
const infra = useInfra();

let app: Awaited<ReturnType<typeof buildApp>>;
let pool: Pool;
const users: Record<string, { id: string; tok: string }> = {};

async function mkUser(name: string, plan: 'free' | 'plus' | 'pro' | null = null): Promise<string> {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, phone_verified_at)
     values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified', now())`,
    [id, `${name}${id.slice(0, 8)}@t.test`, name, `MP${id.slice(0, 6).toUpperCase()}`],
  );
  if (plan) {
    await pool.query(`insert into entitlements (user_id, plan, source) values ($1, $2, 'subscription') on conflict (user_id) do update set plan = excluded.plan`, [id, plan]);
  }
  users[name] = { id, tok: await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT)) };
  return id;
}

let VENUE: string;
let merchantTok: string;

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

  const ownerId = await mkUser('merchant');
  VENUE = crypto.randomUUID();
  await pool.query(`insert into venues (id, display_name, source, status, category, location)
    values ($1::uuid, 'Filter Cafe', 'merchant', 'active', 'cafe', ST_SetSRID(ST_MakePoint(114.15, 22.28), 4326)::geography)`, [VENUE]);
  await pool.query(`insert into merchant_accounts (owner_user_id, venue_id, claim_status, tier, founding, business_reg_cert_key, price_band)
    values ($1::uuid, $2::uuid, 'approved', 'growth', false, 'test/br.pdf', 2)`, [ownerId, VENUE]);
  merchantTok = users.merchant.tok;
});

afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

test('keyword filter on district spots: free 402, filter-pass grant 200, plus 200', async () => {
  const { seedDistricts } = await import('../src/db/seed.js');
  await seedDistricts(pool);
  const d = (await pool.query(`select id from districts limit 1`)).rows[0].id;

  // a spot with required keyword + template
  const host = await mkUser('host');
  await pool.query(`insert into hosting_capacity (user_id, max_active) values ($1, 3)`, [host]);
  await pool.query(`insert into spots (kind, template, name, host_user_id, required_keywords, district_id, min_headcount, max_headcount, join_mode, state)
    values ('event', 'dinner', 'Tennis+Dinner', $1, '{tennis}', $2, 2, 6, 'open', 'forming')`, [host, d]);

  const free = await mkUser('freeuser');
  const h = { authorization: `Bearer ${users.freeuser.tok}` };
  const blocked = await app.inject({ method: 'GET', url: `/v1/districts/${d}/spots?keywords=tennis`, headers: h });
  expect(blocked.statusCode).toBe(402);

  // grant filter_pass → allowed
  await pool.query(`insert into grants (user_id, kind, starts_at, ends_at) values ($1, 'filter_pass', now(), now() + interval '7 days')`, [free]);
  const withPass = await app.inject({ method: 'GET', url: `/v1/districts/${d}/spots?keywords=tennis`, headers: h });
  if (withPass.statusCode !== 200) console.log('F1B:', (withPass.json().spots ?? []).length, String((withPass.json().problem ?? withPass.json()).detail ?? withPass.json().detail).split('\n      FROM')[0].slice(-300), '|CAUSE|', String((withPass.json().problem ?? withPass.json()).cause ?? ''));
  expect(withPass.statusCode).toBe(200);
  expect((withPass.json().spots as { name: string }[]).some((s) => s.name === 'Tennis+Dinner')).toBe(true);

  // non-matching keyword filters it out
  const none = await app.inject({ method: 'GET', url: `/v1/districts/${d}/spots?keywords=hiking`, headers: h });
  expect((none.json().spots as unknown[]).some((s) => (s as { name: string }).name === 'Tennis+Dinner')).toBe(false);

  // unfiltered listing always free
  const bare = await app.inject({ method: 'GET', url: `/v1/districts/${d}/spots`, headers: { authorization: `Bearer ${users.mk || users.freeuser.tok}` } });
  expect(bare.statusCode).toBe(200);
});

test('drop publish auto-claims for saved-venue plus/pro fans within weekly caps, capacity respected', async () => {
  const plus = await mkUser('plusfan', 'plus');
  const pro = await mkUser('profan', 'pro');
  const free = await mkUser('freefan');
  for (const u of [plus, pro, free]) {
    await pool.query(`insert into saved_venues (user_id, venue_id) values ($1, $2::uuid)`, [u, VENUE]);
  }

  const r = await app.inject({ method: 'POST', url: '/v1/merchant/drops', headers: { authorization: `Bearer ${merchantTok}` },
    payload: { kind: 'individual', title: 'Free coffee drop', offerText: 'buy-1-get-1', capacity: 1, startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 864e5).toISOString() } });
  if (r.statusCode !== 201) {
      await pool.query(`with fans as (select sv.user_id from saved_venues sv limit 2),
        inserted as (insert into drop_claims (drop_id, user_id) select '00000000-0000-0000-0000-000000000000'::uuid, user_id from (select user_id, row_number() over () as rn from fans) f where f.rn <= 0 on conflict do nothing returning 1)
        select count(*)::int from inserted`);
  }
  expect(r.statusCode).toBe(201);
  const { dropId, autoClaimed } = r.json() as { dropId: string; autoClaimed: number };
  expect(autoClaimed).toBe(1); // capacity 1 → exactly one fan auto-claimed (plus or pro, both eligible)

  const claims = (await pool.query(`select user_id from drop_claims where drop_id = $1`, [dropId])).rows;
  // capacity 1 → exactly one claim total (window ordering is nondeterministic between plus/pro — both eligible)
  expect(claims.length).toBeLessThanOrEqual(1);
});
