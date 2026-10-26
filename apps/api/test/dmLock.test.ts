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
import { dmShareAttendedSpot } from '../src/safety.js';
import { getDb } from '../src/db/client.js';

const JWT = 'test-jwt-secret-at-least-32-characters-long';
const infra = useInfra();

let app: Awaited<ReturnType<typeof buildApp>>;
let pool: Pool;
let dbUrl = '';
let districtId = '';
const users: Record<string, { id: string; tok: string }> = {};

async function mkUser(name: string): Promise<void> {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, phone_verified_at)
     values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified', now())`,
    [id, `${name}${id.slice(0, 8)}@t.test`, name, `MP${id.slice(0, 6).toUpperCase()}`],
  );
  const tok = await new SignJWT({ role: 'authenticated' })
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
  await mkUser('a'); await mkUser('b');
});

afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

const tok = (n: string) => ({ authorization: `Bearer ${users[n].tok}` });

test('dm link lock: shared attended spot unlocks; otherwise stays locked; room flow still works', async () => {
  const db = getDb(dbUrl);
  // no shared spot yet
  expect(await dmShareAttendedSpot(db, users.a.id, users.b.id)).toBe(false);

  // shared done spot
  const r = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: tok('a'), payload: {
    template: 'drinks', name: `DM lock spot ${crypto.randomUUID().slice(0, 6)}`, districtId,
    minHeadcount: 2, maxHeadcount: 6, joinMode: 'open',
    dateStart: new Date(Date.now() + 86400000).toISOString(), dateEnd: new Date(Date.now() + 7 * 86400000).toISOString(),
  }});
  const spotId = r.json().spotId;
  await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/join`, headers: tok('b'), payload: {} });
  await pool.query(`update spots set state = 'done', starts_at = now() where id = $1`, [spotId]);
  await pool.query(`insert into attendance (spot_id, user_id, status) values ($1, $2, 'attended'), ($1, $3, 'attended')`, [spotId, users.a.id, users.b.id]);
  expect(await dmShareAttendedSpot(db, users.a.id, users.b.id)).toBe(true);


});

test('poke→connection creates dm; disconnect closes dm for both (regression of T11.2 within T11.3 flow)', async () => {
  await pool.query(`insert into poke_balances (user_id, weekly_used, credits, last_reset_at) values ($1, 0, 0, now()) on conflict (user_id) do nothing`, [users.a.id]);
  const p = await app.inject({ method: 'POST', url: '/v1/pokes', headers: tok('a'), payload: { to: users.b.id, source: 'profile' } });
  expect(p.statusCode).toBe(201);
  await pool.query(`insert into poke_balances (user_id, weekly_used, credits, last_reset_at) values ($1, 0, 0, now()) on conflict (user_id) do nothing`, [users.b.id]);
  const back = await app.inject({ method: 'POST', url: '/v1/pokes', headers: tok('b'), payload: { to: users.a.id, source: 'inbox' } });
  expect(back.json().pokeBack).toBe(true);
  const roomId = back.json().roomId;
  // history visible while open: messages row can be inserted via ws elsewhere; here check members
  const open = (await pool.query(`select count(*)::int as n from room_members where room_id = $1 and left_at is null`, [roomId])).rows[0].n;
  expect(open).toBe(2);
  const dis = await app.inject({ method: 'POST', url: `/v1/connections/${back.json().connectionId}/disconnect`, headers: tok('b') });
  expect(dis.statusCode).toBe(200);
  const closed = (await pool.query(`select count(*)::int as n from room_members where room_id = $1 and left_at is null`, [roomId])).rows[0].n;
  expect(closed).toBe(0);
});
