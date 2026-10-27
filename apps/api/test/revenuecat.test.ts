import { afterAll, beforeAll, expect, test } from 'vitest';
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
let uid: string;

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
  uid = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, phone_verified_at)
     values ($1, 'rcx@t.test', 'email', 'RC Buyer', '1990-01-01', 'MPRC0001', 'verified', now())`, [uid]);

});

afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

const rc = (event: Record<string, unknown>) =>
  app.inject({ method: 'POST', url: '/v1/webhooks/revenuecat', payload: { event } });

const plan = async () => (await pool.query(`select plan from entitlements where user_id = $1`, [uid])).rows[0]?.plan;

test('purchase → renewal → refund lifecycle maps to subscriptions + entitlements', async () => {
  const end = new Date(Date.now() + 30 * 864e5).toISOString();
  const a = await rc({ type: 'INITIAL_PURCHASE', app_user_id: uid, product_id: 'plus_monthly', period_ends_at: end });
  expect(a.statusCode).toBe(200);
  expect(await plan()).toBe('plus');

  // renewal extends
  const end2 = new Date(Date.now() + 60 * 864e5).toISOString();
  await rc({ type: 'RENEWAL', app_user_id: uid, product_id: 'plus_monthly', period_ends_at: end2 });
  const sub = (await pool.query(`select status, current_period_end from subscriptions where user_id = $1`, [uid])).rows[0];
  expect(sub.status).toBe('active');
  expect(new Date(sub.current_period_end).toISOString()).toBe(end2);

  // pack purchase adds credits without touching plan
  await rc({ type: 'NON_RENEWING_PURCHASE', app_user_id: uid, product_id: 'poke_pack_5' });
  const cr = (await pool.query(`select credits from poke_balances where user_id = $1`, [uid])).rows[0];
  expect(cr.credits).toBe(5);

  // refund closes sub → free
  await rc({ type: 'REFUND', app_user_id: uid, product_id: 'plus_monthly' });
  expect(await plan()).toBe('free');
  const sub2 = (await pool.query(`select status from subscriptions where user_id = $1`, [uid])).rows[0];
  expect(sub2.status).toBe('refunded');
});

test('unknown product and missing user rejected', async () => {
  expect((await rc({ type: 'INITIAL_PURCHASE', app_user_id: uid, product_id: 'mystery' })).statusCode).toBe(422);
  expect((await rc({ type: 'INITIAL_PURCHASE', product_id: 'plus_monthly' })).statusCode).toBe(422);
});
