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
  await mkUser('host'); await mkUser('witness'); await mkUser('flake'); await mkUser('stranger');
});

afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

test('detail members carry trust; spotsAttended counts only attended|forgiven; FoF flag via shared connection', async () => {
  // spot by host, witness + flake join (open)
  const r = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${users.host.tok}` }, payload: {
    template: 'coffee', name: `Trust spot ${crypto.randomUUID().slice(0, 6)}`, districtId,
    minHeadcount: 2, maxHeadcount: 6, joinMode: 'open',
    dateStart: new Date(Date.now() + 86400000).toISOString(), dateEnd: new Date(Date.now() + 7 * 86400000).toISOString(),
  }});
  const spotId = r.json().spotId;
  await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/join`, headers: { authorization: `Bearer ${users.witness.tok}` }, payload: {} });
  await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/join`, headers: { authorization: `Bearer ${users.flake.tok}` }, payload: {} });

  // seed attendance: witness attended (finalised), flake no_show (finalised), plus flake has an unfinalised attended row elsewhere
  await pool.query(`update spots set state='done', starts_at = now() - interval '2 hours' where id = $1`, [spotId]);
  await pool.query(`insert into attendance (spot_id, user_id, status, finalized_at) values ($1, $2, 'attended', now())`, [spotId, users.witness.id]);
  await pool.query(`insert into attendance (spot_id, user_id, status, finalized_at) values ($1, $2, 'absent_reported', now())`, [spotId, users.flake.id]);
  // second real spot for cross-spot attendance rows
  const r2 = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${users.host.tok}` }, payload: {
    template: 'coffee', name: `Trust spot2 ${crypto.randomUUID().slice(0, 6)}`, districtId,
    minHeadcount: 2, maxHeadcount: 6, joinMode: 'open',
    dateStart: new Date(Date.now() + 86400000).toISOString(), dateEnd: new Date(Date.now() + 7 * 86400000).toISOString(),
  }});
  const spot2 = r2.json().spotId as string;
  // unfinalised attended should NOT count
  await pool.query(`insert into attendance (spot_id, user_id, status) values ($1, $2, 'attended')`, [spot2, users.flake.id]);
  // forgiven counts: witness gets one
  await pool.query(`insert into attendance (spot_id, user_id, status, finalized_at) values ($1, $2, 'forgiven', now())`, [spot2, users.witness.id]);

  // connections: witness–host active (so host viewing flake? no) — make host–witness and witness–flake for FoF via witness
  const pair = (a: string, b: string) => pool.query(
    `insert into connections (user_a, user_b, active) values (least($1::uuid,$2::uuid), greatest($1::uuid,$2::uuid), true) on conflict do nothing`, [a, b]);
  await pair(users.witness.id, users.flake.id);
  await pair(users.witness.id, users.host.id);

  // host views detail — host connected to witness; flake connected to witness → flake is FoF
  const d = await app.inject({ method: 'GET', url: `/v1/spots/${spotId}`, headers: { authorization: `Bearer ${users.host.tok}` } });
  expect(d.statusCode).toBe(200);
  const members = d.json().members as { userId: string; trust: { spotsAttended: number; provenState: string; friendOfFriend: boolean; memberSince: string } }[];
  if (!d.json().members) throw new Error(`no members: ${JSON.stringify(d.json()).slice(0, 300)}`);
  const wit = members.find((m) => m.userId === users.witness.id)!;
  const flk = members.find((m) => m.userId === users.flake.id)!;
  expect(wit.trust.spotsAttended).toBe(2); // attended(finalised) + forgiven(finalised)
  expect(flk.trust.spotsAttended).toBe(0); // no_show excluded, unfinalised excluded
  expect(flk.trust.friendOfFriend).toBe(true); // via shared witness
  expect(wit.trust.friendOfFriend).toBe(true); // host–witness is degree 1 → shared endpoint exists (host–witness direct also flags; degree 1 ⊂ flag)
  expect(new Date(wit.trust.memberSince).getTime()).toBeGreaterThan(0);

  // stranger (no connections, not member) sees FoF false
  const d2 = await app.inject({ method: 'GET', url: `/v1/spots/${spotId}`, headers: { authorization: `Bearer ${users.stranger.tok}` } });
  const strangers_view = d2.json().members as { trust: { friendOfFriend: boolean } }[];
  expect(strangers_view.every((m) => m.trust.friendOfFriend === false)).toBe(true);
});
