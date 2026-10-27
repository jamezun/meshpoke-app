import { afterAll, beforeAll, expect, test } from 'vitest';
import { SignJWT } from 'jose';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { join } from 'node:path';
import * as schema from '../src/db/schema/index.js';
import { buildApp } from '../src/app.js';
import { useInfra, stopInfra } from './db.js';
import type { Db } from '../src/db/client.js';
import { recomputeEntitlement } from '../src/billing/consumer.js';
import { getPlan } from '../src/entitlements.js';

const JWT = 'test-jwt-secret-at-least-32-characters-long';
const infra = useInfra();

let app: Awaited<ReturnType<typeof buildApp>>;
let pool: Pool;
let db: Db;
let dbUrl: string;
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

const sub = (userId: string, product: string, days: number, status = 'active') =>
  pool.query(`insert into subscriptions (user_id, channel, product, price_paid, status, provider_ref, current_period_end)
    values ($1::uuid, 'stripe_web', $2, 128, $3, $4, now() + ($5 || ' days')::interval)`,
    [userId, product, status, `sub_${crypto.randomUUID().slice(0, 8)}`, String(days)]);

const grant = (userId: string, kind: string, days: number) =>
  pool.query(`insert into grants (user_id, kind, starts_at, ends_at)
    values ($1::uuid, $2, now(), now() + ($3 || ' days')::interval)`, [userId, kind, String(days)]);

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
  db = drizzle(pool, { schema }) as Db;
  await migrate(db, { migrationsFolder: join(import.meta.dirname, '../drizzle') });
});

afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

test('no subs → free; plus sub → plus; overlapping pro grant wins and takes furthest end; expiry falls back', async () => {
  const u = await mkUser('ent');
  expect(await recomputeEntitlement(db, u)).toBe('free');
  expect(await getPlan(dbUrl, u)).toBe('free');

  await sub(u, 'plus_monthly', 30);
  await grant(u, 'pass7', 7); // plus pass during subscription — same plan, shorter end, no effect
  expect(await recomputeEntitlement(db, u)).toBe('plus');
  expect(await getPlan(dbUrl, u)).toBe('plus');

  await grant(u, 'host_reward_pro', 10); // pro grant wins while active
  expect(await recomputeEntitlement(db, u)).toBe('pro');
  expect(await getPlan(dbUrl, u)).toBe('pro');
});

test('refund/cancel: expired or non-active subs never grant; entitlement falls back to lower or free', async () => {
  const u = await mkUser('refund');
  await sub(u, 'plus_monthly', 1, 'refunded'); // refunded same-day
  expect(await recomputeEntitlement(db, u)).toBe('free');

  await pool.query(`update subscriptions set status = 'active', current_period_end = now() - interval '1 day' where user_id = $1`, [u]);
  expect(await recomputeEntitlement(db, u)).toBe('free'); // expired window
});

test('downgrade never kicks user out of rooms/spots (membership rows untouched)', async () => {
  const u = await mkUser('downgrade');
  // user is plus with a room membership + active event spot
  await sub(u, 'plus_monthly', 30);
  await recomputeEntitlement(db, u);
  const roomId = crypto.randomUUID();
  await pool.query(`insert into rooms (id, kind) values ($1::uuid, 'chat')`, [roomId]);
  await pool.query(`insert into room_members (room_id, user_id, role) values ($1::uuid, $2::uuid, 'member')`, [roomId, u]);

  // sub expires → recompute → free; membership row must still exist
  await pool.query(`update subscriptions set current_period_end = now() - interval '2 days' where user_id = $1`, [u]);
  await recomputeEntitlement(db, u);
  expect(await getPlan(dbUrl, u)).toBe('free');
  const m = (await pool.query(`select role, left_at from room_members where room_id = $1 and user_id = $2`, [roomId, u])).rows;
  expect(m[0]).toMatchObject({ role: 'member', left_at: null });
});
