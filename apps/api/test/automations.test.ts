import { afterAll, beforeAll, expect, test } from 'vitest';
import { SignJWT } from 'jose';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Redis } from 'ioredis';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'node:path';
import { buildApp } from '../src/app.js';
import { seedDistricts } from '../src/db/seed.js';
import { useInfra, stopInfra } from './db.js';

const JWT = 'test-jwt-secret-at-least-32-characters-long';
const infra = useInfra();

let app: Awaited<ReturnType<typeof buildApp>>;
let pool: Pool;
let redis: Redis;
const users: Record<string, { id: string; tok: string }> = {};

async function mkUser(name: string, dob: string, admin = false): Promise<void> {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, phone_verified_at, is_admin, admin_roles)
     values ($1, $2, 'email', $3, $4, $5, 'verified', now(), $6, $7)`,
    [id, `${name}${id.slice(0, 8)}@t.test`, name, dob, `MP${id.slice(0, 6).toUpperCase()}`, admin, admin ? ['superadmin'] : '{}'],
  );
  users[name] = { id, tok: await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt()
    .sign(new TextEncoder().encode(JWT)) };
}

beforeAll(async () => {
  const i = await infra;
  pool = new Pool({ connectionString: i.dbUrl });
  redis = new Redis(i.redisUrl);
  await migrate(drizzle(pool), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  await seedDistricts(pool);
  app = await buildApp({ config: {
    NODE_ENV: 'test', PORT: 0, LOG_LEVEL: 'fatal',
    DATABASE_URL: i.dbUrl, REDIS_URL: i.redisUrl,
    GOTRUE_URL: 'http://localhost:9999', GOTRUE_JWT_SECRET: JWT,
    CORS_ORIGINS: 'http://localhost:5173', RATE_LIMIT_MAX: 1000,
    PII_ENCRYPTION_KEY: '0'.repeat(64),
    QR_HMAC_SECRET: 'c'.repeat(32),
    ADMIN_BOOTSTRAP_PASSWORD: 'test-admin-bootstrap-pw',
    SENTRY_DSN: undefined, ENABLE_JOBS: false, ENABLE_SWAGGER: false,
  } });
}, 180_000);

afterAll(async () => {
  await app?.close();
  await pool?.end();
  await redis?.quit();
  await stopInfra();
});

test('T21.7 birthday automation: opt-in + current month + pro tier + once/year', async () => {
  const month = `${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const dobThis = `1995-${month}-15`;
  await mkUser('bday', dobThis);
  await mkUser('boss', dobThis, true);
  await mkUser('quiet', '1980-01-10'); // not current month (unless January: then off-month member also has opt-in off)
  const adminTok = await new SignJWT({ role: 'admin', admin_roles: ['superadmin'], aal: 'aal2' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(users.boss.id).setIssuedAt()
    .sign(new TextEncoder().encode(JWT));

  // pro merchant venue
  const vname = `Auto venue ${crypto.randomUUID().slice(0, 6)}`;
  await pool.query(
    `insert into venues (source, display_name, category, location, status)
     values ('merchant', $1, 'cafe', ST_SetSRID(ST_MakePoint(114.17, 22.28), 4326), 'active')`, [vname]);
  const vid = (await pool.query(`select id from venues where display_name=$1`, [vname])).rows[0].id;
  await pool.query(
    `insert into merchant_accounts (owner_user_id, venue_id, business_reg_cert_key, claim_status, tier)
     values ($1, $2, 'k', 'approved', 'pro')`, [users.bday.id, vid]);

  // bday: member, opted in; quiet: member, NOT opted in (default off)
  for (const [name, share] of [['bday', true], ['quiet', false]] as const) {
    await pool.query(`insert into profiles (user_id, industry) values ($1, 'tech')`, [users[name].id]);
    if (share) await pool.query(`update profiles set share_birth_month = true where user_id = $1`, [users[name].id]);
    await pool.query(
      `insert into memberships (venue_id, user_id, kind, status, level_position) values ($1, $2, 'member', 'active', 0)`, [vid, users[name].id]);
  }

  const r1 = await app.inject({ method: 'POST', url: '/v1/internal/automation-birthday', headers: { authorization: `Bearer ${adminTok}` } });
  expect(r1.statusCode).toBe(200);
  // January edge: 'quiet' (1980-01) also matches the month → only opt-in gates it
  expect(r1.json().issued).toBe(month === '01' ? 1 : 1);

  const coupons = (await pool.query(`select user_id, offer from coupons where venue_id=$1`, [vid])).rows;
  expect(coupons.length).toBe(1);
  expect(coupons[0].user_id).toBe(users.bday.id);

  // idempotent: second sweep same year → 0 new
  const r2 = await app.inject({ method: 'POST', url: '/v1/internal/automation-birthday', headers: { authorization: `Bearer ${adminTok}` } });
  expect(r2.json().issued).toBe(0);
});

test('T21.7 winback: inactive member gets coupon once per 90d window', async () => {
  await mkUser('sleepy', '1990-06-06');
  await mkUser('boss2', '1990-06-06', true);
  const adminTok = await new SignJWT({ role: 'admin', admin_roles: ['superadmin'], aal: 'aal2' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(users.boss2.id).setIssuedAt()
    .sign(new TextEncoder().encode(JWT));
  const vname = `WB venue ${crypto.randomUUID().slice(0, 6)}`;
  await pool.query(
    `insert into venues (source, display_name, category, location, status)
     values ('merchant', $1, 'cafe', ST_SetSRID(ST_MakePoint(114.17, 22.29), 4326), 'active')`, [vname]);
  const vid = (await pool.query(`select id from venues where display_name=$1`, [vname])).rows[0].id;
  await pool.query(
    `insert into merchant_accounts (owner_user_id, venue_id, business_reg_cert_key, claim_status, tier)
     values ($1, $2, 'k', 'approved', 'pro')`, [users.sleepy.id, vid]);
  await pool.query(
    `insert into memberships (venue_id, user_id, kind, status, level_position, joined_at)
     values ($1, $2, 'member', 'active', 0, now() - interval '60 days')`, [vid, users.sleepy.id]);

  const r1 = await app.inject({ method: 'POST', url: '/v1/internal/automation-winback', headers: { authorization: `Bearer ${adminTok}` } });
  expect(r1.statusCode).toBe(200);
  expect(r1.json().issued).toBeGreaterThanOrEqual(1);
  const r2 = await app.inject({ method: 'POST', url: '/v1/internal/automation-winback', headers: { authorization: `Bearer ${adminTok}` } });
  expect(r2.json().issued).toBe(0);
});
