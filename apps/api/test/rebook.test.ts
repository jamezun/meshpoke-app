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
let districtId = '';
const users: Record<string, { id: string; tok: string }> = {};

async function mkUser(name: string): Promise<void> {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state)
     values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified')`,
    [id, `${name}${id.slice(0, 8)}@t.test`, name, `MP${id.slice(0, 6).toUpperCase()}`],
  );
  const tok = await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT));
  users[name] = { id, tok };
}

async function mkDoneCrew(host: string, members: string[]): Promise<string> {
  const r = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${users[host].tok}` }, payload: {
    template: 'dinner', name: `Rebook origin ${crypto.randomUUID().slice(0, 6)}`, districtId,
    minHeadcount: 2, maxHeadcount: 8, joinMode: 'open',
    dateStart: new Date(Date.now() + 86400000).toISOString(), dateEnd: new Date(Date.now() + 7 * 86400000).toISOString(),
  }});
  const spotId = r.json().spotId;
  for (const m of members) {
    await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/join`, headers: { authorization: `Bearer ${users[m].tok}` }, payload: {} });
  }
  await pool.query(`update spots set state = 'done', starts_at = now() where id = $1`, [spotId]);
  const all = [users[host].id, ...members.map((m) => users[m].id)];
  await pool.query(`insert into attendance (spot_id, user_id, status)
    select $1, u.id, 'attended' from users u where u.id = any($2::uuid[])`,
    [spotId, all]);
  const crew = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/crew`, headers: { authorization: `Bearer ${users[host].tok}` }, payload: { keep: true } });
  const crewId = crew.json().crewId;
  for (const m of members) {
    await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/crew`, headers: { authorization: `Bearer ${users[m].tok}` }, payload: { keep: true } });
  }
  return crewId;
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
  districtId = (await pool.query(`select id from districts limit 1`)).rows[0].id;
  await mkUser('alice'); await mkUser('bob'); await mkUser('carol');
});

afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

const tok = (n: string) => ({ authorization: `Bearer ${users[n].tok}` });
const iso = (daysAhead: number) => new Date(Date.now() + daysAhead * 86400000).toISOString();

test('rebook: poll → vote → finalize creates spot with crew pre-attached; hosting cap enforced', async () => {
  const crewId = await mkDoneCrew('alice', ['bob', 'carol']);

  const optA = iso(3), optB = iso(5), optC = iso(7);
  // bob (not poll creator path): bob creates poll — any member can; hosting rights required
  const poll = await app.inject({ method: 'POST', url: `/v1/crews/${crewId}/rebook`, headers: tok('bob'), payload: {
    pollOptions: [optA, optB, optC],
  }});
  expect(poll.statusCode).toBe(201);
  const rebookId = poll.json().rebookId;

  // votes
  const v1 = await app.inject({ method: 'POST', url: `/v1/rebooks/${rebookId}/vote`, headers: tok('alice'), payload: { option: optA } });
  expect(v1.statusCode).toBe(200);
  const v2 = await app.inject({ method: 'POST', url: `/v1/rebooks/${rebookId}/vote`, headers: tok('bob'), payload: { option: optA } });
  expect(v2.statusCode).toBe(200);
  const bad = await app.inject({ method: 'POST', url: `/v1/rebooks/${rebookId}/vote`, headers: tok('alice'), payload: { option: iso(9) } });
  expect(bad.statusCode).toBe(422);

  // non-creator cannot finalize
  const nope = await app.inject({ method: 'POST', url: `/v1/rebooks/${rebookId}/finalize`, headers: tok('carol'), payload: { startsAt: optA } });
  expect(nope.statusCode).toBe(403);

  // finalize: winning date, 2 public seats
  const fin = await app.inject({ method: 'POST', url: `/v1/rebooks/${rebookId}/finalize`, headers: tok('bob'), payload: { startsAt: optA, publicSeats: 2 } });
  expect(fin.statusCode).toBe(201);
  const spotId = fin.json().spotId;
  expect(fin.json().members).toBe(3);

  // spot exists, forming, members = host + crew (2) — verify via db
  const spot = (await pool.query(`select kind, state, name, max_headcount from spots where id = $1`, [spotId])).rows[0];
  expect(spot.state).toBe('forming');
  expect(spot.name.startsWith('Rebook:')).toBe(true);
  expect(spot.max_headcount).toBe(5); // 3 crew + 2 public
  const members = (await pool.query(`select count(*)::int as n from spot_members where spot_id = $1`, [spotId])).rows[0].n;
  expect(members).toBe(3);

  // double finalize → 409
  const again = await app.inject({ method: 'POST', url: `/v1/rebooks/${rebookId}/finalize`, headers: tok('bob'), payload: { startsAt: optB } });
  expect(again.statusCode).toBe(409);

  // hosting cap: bob now hosts 1 (default capacity 1) → second rebook blocked
  const poll2 = await app.inject({ method: 'POST', url: `/v1/crews/${crewId}/rebook`, headers: tok('bob'), payload: { pollOptions: [iso(10), iso(11)] } });
  expect(poll2.statusCode).toBe(402);
  expect(poll2.json().problem.capType).toBe('hosting');
});
