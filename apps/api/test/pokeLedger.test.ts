import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { SignJWT } from 'jose';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { join } from 'node:path';
import * as schema from '../src/db/schema/index.js';
import { buildApp } from '../src/app.js';
import { seedDistricts } from '../src/db/seed.js';
import { useInfra, stopInfra } from './db.js';
import { ensureBalanceReset, resolvePokeCost } from '../src/routes/pokeLedger.js';
import { getDb } from '../src/db/client.js';

const JWT = 'test-jwt-secret-at-least-32-characters-long';
const infra = useInfra();

let app: Awaited<ReturnType<typeof buildApp>>;
let pool: Pool;
let dbUrl = '';
let districtId = '';
const users: Record<string, { id: string; tok: string }> = {};

async function mkUser(name: string, admin = false): Promise<void> {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, is_admin, admin_roles, phone_verified_at)
     values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified', $5, $6, now())`,
    [id, `${name}${id.slice(0, 8)}@t.test`, name, `MP${id.slice(0, 6).toUpperCase()}`, admin, admin ? '{superadmin}' : '{}'],
  );
  const tok = await new SignJWT({ role: admin ? 'admin' : 'authenticated', aal: admin ? 'aal2' : null })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT));
  users[name] = { id, tok };
}

beforeAll(async () => {
  const i = await infra;
  dbUrl = i.dbUrl;
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
  districtId = (await pool.query(`select id from districts limit 1`)).rows[0].id;
  await mkUser('me'); await mkUser('them'); await mkUser('third'); await mkUser('admin', true);
});

afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

describe('lazy Monday reset', () => {
  test('stale last_reset_at resets to 0; fresh does not (Monday boundary)', async () => {
    const db = getDb(dbUrl);
    // stale: last Sunday 23:59 HKT (= Saturday 15:59 UTC)
    const sundayNight = new Date(mostRecentMonday() - 60_000); // 1 min before Monday 00:00 HKT
    await pool.query(`insert into poke_balances (user_id, weekly_used, credits, last_reset_at)
                      values ($1, 3, 2, $2) on conflict (user_id) do update set weekly_used = 3, credits = 2, last_reset_at = $2`,
      [users.me.id, sundayNight.toISOString()]);
    const after = await ensureBalanceReset(db, users.me.id);
    expect(after.weeklyUsed).toBe(0); // reset because stale
    expect(after.credits).toBe(2); // credits survive

    // fresh: right at Monday boundary → no reset
    await pool.query(`update poke_balances set weekly_used = 4, last_reset_at = $2 where user_id = $1`,
      [users.me.id, mostRecentMonday().toISOString()]);
    const after2 = await ensureBalanceReset(db, users.me.id);
    expect(after2.weeklyUsed).toBe(4); // fresh → kept
  });
});

describe('resolvePokeCost order', () => {
  test('1. pending poke from target → free_poke_back', async () => {
    const db = getDb(dbUrl);
    await pool.query(`insert into pokes (from_user, to_user, note, source, cost_type, status, expires_at)
                      values ($1, $2, null, 'profile', 'weekly', 'pending', now() + interval '3 days')`,
      [users.them.id, users.me.id]);
    const r = await resolvePokeCost(db, users.me.id, users.them.id, 5);
    expect(r).toEqual({ cost: 'free_poke_back' });
    await pool.query(`update pokes set status = 'expired' where from_user = $1 and to_user = $2`, [users.them.id, users.me.id]);
  });

  test('2. shared done spot within 48h → free_post_spot', async () => {
    const db = getDb(dbUrl);
    const r1 = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${users.me.tok}` }, payload: {
      template: 'drinks', name: `Poke spot ${crypto.randomUUID().slice(0, 6)}`, districtId,
      minHeadcount: 2, maxHeadcount: 6, joinMode: 'open',
      dateStart: new Date(Date.now() + 86400000).toISOString(), dateEnd: new Date(Date.now() + 7 * 86400000).toISOString(),
    }});
    const spotId = r1.json().spotId;
    await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/join`, headers: { authorization: `Bearer ${users.them.tok}` }, payload: {} });
    await pool.query(`update spots set state = 'done', starts_at = now() - interval '10 hours' where id = $1`, [spotId]);
    await pool.query(`insert into attendance (spot_id, user_id, status) values ($1, $2, 'attended'), ($1, $3, 'attended')`,
      [spotId, users.me.id, users.them.id]);
    const r = await resolvePokeCost(db, users.me.id, users.them.id, 5);
    expect(r).toEqual({ cost: 'free_post_spot' });
  });

  test('3. weekly allowance then 4. credits then 402-shaped error', async () => {
    const db = getDb(dbUrl);
    // fresh balance with 5 allowance, 0 used
    await pool.query(`update poke_balances set weekly_used = 0, credits = 0 where user_id = $1`, [users.me.id]);
    const r = await resolvePokeCost(db, users.me.id, users.third.id, 5);
    expect(r).toEqual({ cost: 'weekly' });
    // allowance exhausted, credits available
    await pool.query(`update poke_balances set weekly_used = 5, credits = 3 where user_id = $1`, [users.me.id]);
    const r2 = await resolvePokeCost(db, users.me.id, users.third.id, 5);
    expect(r2).toEqual({ cost: 'credit' });
    // nothing left
    await pool.query(`update poke_balances set weekly_used = 5, credits = 0 where user_id = $1`, [users.me.id]);
    const r3 = await resolvePokeCost(db, users.me.id, users.third.id, 5);
    expect(r3).toEqual({ error: 'no_allowance' });
  });
});

describe('expiry sweep', () => {
  test('pending past expiry → expired, no refund (charged rows untouched)', async () => {
    // spent credit last week; poke expired → credit stays spent
    await pool.query(`update poke_balances set weekly_used = 0, credits = 5 where user_id = $1`, [users.me.id]);
    await pool.query(`insert into pokes (from_user, to_user, note, source, cost_type, status, expires_at)
                      values ($1, $2, 'hi', 'profile', 'credit', 'pending', now() - interval '1 minute')`,
      [users.me.id, users.third.id]);
    const res = await app.inject({ method: 'POST', url: '/v1/internal/poke-expiry', headers: { authorization: `Bearer ${users.admin.tok}` }, payload: {} });
    expect(res.statusCode).toBe(200);
    expect(res.json().expired).toBeGreaterThanOrEqual(1);
    const credits = (await pool.query(`select credits from poke_balances where user_id = $1`, [users.me.id])).rows[0].credits;
    expect(credits).toBe(5); // expired poke doesn't refund
    const status = (await pool.query(`select status from pokes where from_user = $1 and to_user = $2 and note = 'hi'`, [users.me.id, users.third.id])).rows[0].status;
    expect(status).toBe('expired');
  });
});

function mostRecentMonday(): Date {
  // mirror: most recent Monday 00:00 HKT expressed in UTC
  const now = new Date();
  const hkt = new Date(now.getTime() + 8 * 3600_000);
  const daysSinceMonday = (hkt.getUTCDay() + 6) % 7;
  const mondayHktWall = Date.UTC(hkt.getUTCFullYear(), hkt.getUTCMonth(), hkt.getUTCDate() - daysSinceMonday);
  return new Date(mondayHktWall - 8 * 3600_000);
}
