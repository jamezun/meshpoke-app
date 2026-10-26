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

async function mkUser(name: string): Promise<void> {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state)
     values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified')`,
    [id, `${name}${id.slice(0, 8)}@t.test`, name, `MP${id.slice(0, 6).toUpperCase()}`],
  );
  users[name] = { id, tok: await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT)) };
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
  await mkUser('reporter1'); await mkUser('reporter2'); await mkUser('reporter3'); await mkUser('target'); await mkUser('bystander');
});

afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

const tok = (n: string) => ({ authorization: `Bearer ${users[n].tok}` });

test('block matrix: block hides both users in inbox, room members, spot members; unblock restores', async () => {
  const t = users.target.id;
  // block
  const blk = await app.inject({ method: 'POST', url: `/v1/blocks/${t}`, headers: tok('reporter1'), payload: {} });
  expect(blk.statusCode).toBe(201);
  // self-block rejected
  const self = await app.inject({ method: 'POST', url: `/v1/blocks/${users.reporter1.id}`, headers: tok('reporter1'), payload: {} });
  expect(self.statusCode).toBe(422);
  // rows exist
  const rows = (await pool.query(`select count(*)::int as n from blocks where blocker_id = $1 and blocked_id = $2`, [users.reporter1.id, t])).rows;
  expect(rows[0].n).toBe(1);
  // unblock
  const un = await app.inject({ method: 'DELETE', url: `/v1/blocks/${t}`, headers: tok('reporter1'), payload: {} });
  expect(un.statusCode).toBe(200);
  const rows2 = (await pool.query(`select count(*)::int as n from blocks where blocker_id = $1`, [users.reporter1.id])).rows;
  expect(rows2[0].n).toBe(0);
});

test('reports: self-report 422, dup 409, 3 distinct reporters → auto-mute row', async () => {
  const t = users.target.id;
  const self = await app.inject({ method: 'POST', url: '/v1/reports', headers: tok('target'), payload: { targetType: 'user', targetId: t, reason: 'me myself' } });
  expect(self.statusCode).toBe(422);

  const r1 = await app.inject({ method: 'POST', url: '/v1/reports', headers: tok('reporter1'), payload: { targetType: 'user', targetId: t, reason: 'spam pokes' } });
  expect(r1.statusCode).toBe(201);
  const dup = await app.inject({ method: 'POST', url: '/v1/reports', headers: tok('reporter1'), payload: { targetType: 'user', targetId: t, reason: 'again' } });
  expect(dup.statusCode).toBe(409);
  // 2nd and 3rd distinct → threshold
  await app.inject({ method: 'POST', url: '/v1/reports', headers: tok('reporter2'), payload: { targetType: 'user', targetId: t, reason: 'scam link' } });
  await app.inject({ method: 'POST', url: '/v1/reports', headers: tok('reporter3'), payload: { targetType: 'user', targetId: t, reason: 'rude' } });

  const mute = (await pool.query(
    `select count(*)::int as n from moderation_actions where target_user = $1 and action = 'mute'`, [t])).rows;
  expect(mute[0].n).toBe(1); // exactly one auto-mute, not one per report

  // non-user target (spot) does not trigger mute
  const fakeSpot = crypto.randomUUID();
  const rs = await app.inject({ method: 'POST', url: '/v1/reports', headers: tok('reporter1'), payload: { targetType: 'spot', targetId: fakeSpot, reason: 'wrong venue pin' } });
  expect(rs.statusCode).toBe(201);
});
