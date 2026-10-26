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

async function mkUser(name: string, verified = true): Promise<void> {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, phone_verified_at)
     values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified', $5)`,
    [id, `${name}${id.slice(0, 8)}@t.test`, name, `MP${id.slice(0, 6).toUpperCase()}`, verified ? new Date() : null],
  );
  const tok = await new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT));
  users[name] = { id, tok };
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
  await mkUser('alice'); await mkUser('bob'); await mkUser('unverifiedPhone', false);
});

afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

const tok = (n: string) => ({ authorization: `Bearer ${users[n].tok}` });

test('poke flow: unverified 403 → poke → pending → poke back → connection + DM → disconnect closes DM → re-poke allowed', async () => {
  // phone gate
  const unv = await app.inject({ method: 'POST', url: '/v1/pokes', headers: tok('unverifiedPhone'), payload: { to: users.alice.id, source: 'profile' } });
  expect(unv.statusCode).toBe(403);

  // alice pokes bob (fresh balance → weekly)
  await pool.query(`insert into poke_balances (user_id, weekly_used, credits, last_reset_at) values ($1, 0, 0, now()) on conflict (user_id) do nothing`, [users.alice.id]);
  const p1 = await app.inject({ method: 'POST', url: '/v1/pokes', headers: tok('alice'), payload: { to: users.bob.id, note: 'coffee sometime?', source: 'profile' } });
  expect(p1.statusCode).toBe(201);
  expect(p1.json().cost).toBe('weekly');
  const pokeId = p1.json().pokeId;

  // duplicate pending → 409
  const dup = await app.inject({ method: 'POST', url: '/v1/pokes', headers: tok('alice'), payload: { to: users.bob.id, source: 'profile' } });
  expect(dup.statusCode).toBe(409);

  // bob sees it in incoming
  const inbox = await app.inject({ method: 'GET', url: '/v1/pokes/incoming', headers: tok('bob') });
  expect(inbox.statusCode).toBe(200);
  expect(inbox.json().pokes).toHaveLength(1);
  expect(inbox.json().pokes[0].note).toBe('coffee sometime?');
  expect(inbox.json().pokes[0].trust).toBeTruthy();

  // bob pokes back → instant connection + DM room, both returned
  await pool.query(`insert into poke_balances (user_id, weekly_used, credits, last_reset_at) values ($1, 0, 0, now()) on conflict (user_id) do nothing`, [users.bob.id]);
  const back = await app.inject({ method: 'POST', url: '/v1/pokes', headers: tok('bob'), payload: { to: users.alice.id, note: 'let\'s do it', source: 'inbox' } });
  expect(back.statusCode).toBe(201);
  expect(back.json().pokeBack).toBe(true);
  const connId = back.json().connectionId;
  const roomId = back.json().roomId;
  expect(connId).toBeTruthy();
  expect(roomId).toBeTruthy();

  // pokes marked returned
  const statuses = (await pool.query(`select status from pokes where id = any($1::uuid[])`, [[pokeId, back.json().pokeId]])).rows;
  expect(statuses.every((s) => s.status === 'returned')).toBe(true);

  // now connected → further poke 409
  const again = await app.inject({ method: 'POST', url: '/v1/pokes', headers: tok('alice'), payload: { to: users.bob.id, source: 'profile' } });
  expect(again.statusCode).toBe(409);

  // connections list both sides
  const connsA = await app.inject({ method: 'GET', url: '/v1/connections', headers: tok('alice') });
  expect(connsA.json().connections).toHaveLength(1);
  expect(connsA.json().connections[0].roomId).toBe(roomId);

  // disconnect closes DM for both
  const dis = await app.inject({ method: 'POST', url: `/v1/connections/${connId}/disconnect`, headers: tok('alice') });
  expect(dis.statusCode).toBe(200);
  const dmMembers = (await pool.query(`select left_at from room_members where room_id = $1`, [roomId])).rows;
  expect(dmMembers.every((m) => m.left_at !== null)).toBe(true);

  // re-poke allowed after disconnect (not connected anymore)
  const repoke = await app.inject({ method: 'POST', url: '/v1/pokes', headers: tok('alice'), payload: { to: users.bob.id, source: 'profile' } });
  expect(repoke.statusCode).toBe(201);
});

test('people-you-met: attendees only, window closed past 48h', async () => {
  const r = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: tok('alice'), payload: {
    template: 'drinks', name: `PYM spot ${crypto.randomUUID().slice(0, 6)}`, districtId,
    minHeadcount: 2, maxHeadcount: 6, joinMode: 'open',
    dateStart: new Date(Date.now() + 86400000).toISOString(), dateEnd: new Date(Date.now() + 7 * 86400000).toISOString(),
  }});
  const spotId = r.json().spotId;
  await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/join`, headers: tok('bob'), payload: {} });
  await pool.query(`update spots set state = 'done', starts_at = now() - interval '3 hours' where id = $1`, [spotId]);
  await pool.query(`insert into attendance (spot_id, user_id, status) values ($1, $2, 'attended'), ($1, $3, 'attended')`, [spotId, users.alice.id, users.bob.id]);

  // attendee sees list
  const pym = await app.inject({ method: 'GET', url: `/v1/people-you-met/${spotId}`, headers: tok('alice') });
  expect(pym.statusCode).toBe(200);
  expect(pym.json().windowOpen).toBe(true);
  expect(pym.json().people).toHaveLength(1); // bob

  // outside 48h → window closed but list still viewable
  await pool.query(`update spots set starts_at = now() - interval '50 hours' where id = $1`, [spotId]);
  const pym2 = await app.inject({ method: 'GET', url: `/v1/people-you-met/${spotId}`, headers: tok('alice') });
  expect(pym2.json().windowOpen).toBe(false);

  // non-attendee 403
  await mkUser('outsider');
  const out = await app.inject({ method: 'GET', url: `/v1/people-you-met/${spotId}`, headers: tok('outsider') });
  expect(out.statusCode).toBe(403);
});
