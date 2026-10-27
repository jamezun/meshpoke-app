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
let adminTok: string;
const tok: Record<string, string> = {};

async function mkUser(name: string): Promise<string> {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, phone_verified_at)
     values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified', now())`,
    [id, `${name}${id.slice(0, 8)}@t.test`, name, `MP${id.slice(0, 6).toUpperCase()}`],
  );
  tok[name] = await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT));
  return id;
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
  const adminId = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, is_admin, admin_roles)
     values ($1, 'admin@t.test', 'email', 'Admin', '1990-01-01', 'MPADMIN1', 'verified', true, '{superadmin}')`, [adminId]);
  adminTok = await new SignJWT({ role: 'admin', admin_roles: ['superadmin'], aal: 'aal2' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(adminId).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT));
});

afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

const credits = async (id: string) =>
  (await pool.query('select credits from poke_balances where user_id = $1', [id])).rows[0]?.credits ?? 0;

test('referral flow: referee credits on verify, referrer on first finalised attendance, monthly cap 10', async () => {
  const referrer = await mkUser('refA');
  const referee = await mkUser('refB');
  await pool.query('update users set referred_by = $1 where id = $2', [referrer, referee]);
  await pool.query('insert into referrals (referrer_id, referee_id) values ($1, $2)', [referrer, referee]);

  // milestone 1: phone verified hook → both sides get 5 (referee directly, referrer via CTE)
  const { referralOnPhoneVerified, referralOnFirstAttendance } = await import('../src/routes/referrals.js');
  await referralOnPhoneVerified(drizzle(pool, { schema }) as never, referee);
  expect(await credits(referee)).toBe(5);
  expect(await credits(referrer)).toBe(0); // referrer only paid at referee's first attendance

  // milestone 2: first finalised attendance → referrer +5 more
  // build a done spot with referee attended
  const host = await mkUser('refhost');
  const spot = crypto.randomUUID();
  await pool.query(`insert into spots (id, kind, template, name, host_user_id, state, min_headcount, max_headcount, join_mode)
    values ($1::uuid, 'event', 'dinner', 'Ref dinner', $2, 'done', 2, 4, 'open')`, [spot, host]);
  await pool.query(`insert into spot_members (spot_id, user_id, role) values ($1::uuid, $2, 'member')`, [spot, referee]);
  await pool.query(`insert into attendance (spot_id, user_id, status, finalized_at) values ($1::uuid, $2, 'attended', now())`, [spot, referee]);
  await referralOnFirstAttendance(drizzle(pool, { schema }) as never, referee);
  expect(await credits(referrer)).toBe(5);

  // idempotent: second finalise does nothing for this referee
  await referralOnFirstAttendance(drizzle(pool, { schema }) as never, referee);
  expect(await credits(referrer)).toBe(5);

  // monthly cap: 10 attended-reward referrals max — fill 10 more this month
  for (let k = 0; k < 12; k++) {
    const ref2 = await mkUser(`capref${k}`);
    await pool.query('insert into referrals (referrer_id, referee_id, attended_reward_at) values ($1, $2, now())', [referrer, ref2]);
  }
  const extra = await mkUser('capextra');
  await pool.query('insert into referrals (referrer_id, referee_id) values ($1, $2)', [referrer, extra]);
  await referralOnFirstAttendance(drizzle(pool, { schema }) as never, extra);
  expect(await credits(referrer)).toBe(5); // capped — no more rewards this month

  // GET /me/referrals
  const r = await app.inject({ method: 'GET', url: '/v1/me/referrals', headers: { authorization: `Bearer ${tok.refA}` } });
  expect(r.statusCode).toBe(200);
  const body = r.json() as { code: string; monthRewarded: number; monthCap: number; referrals: unknown[] };
  expect(body.monthCap).toBe(10);
  expect(body.monthRewarded).toBeGreaterThanOrEqual(10);
  expect(body.referrals.length).toBeGreaterThanOrEqual(13);
});

test('same phone re-registering gets nothing (unique referee row)', async () => {
  const referrer = await mkUser('refC');
  const dup = await mkUser('refD');
  await pool.query('insert into referrals (referrer_id, referee_id) values ($1, $2)', [referrer, dup]);
  const { referralOnPhoneVerified } = await import('../src/routes/referrals.js');
  await referralOnPhoneVerified(drizzle(pool, { schema }) as never, dup);
  const before = await credits(referrer);
  // re-verify → no second row exists (unique referee), no double reward
  await referralOnPhoneVerified(drizzle(pool, { schema }) as never, dup);
  expect(await credits(referrer)).toBe(before);
});
