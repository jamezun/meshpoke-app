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
const QR = 'test-qr-hmac-secret-32-chars-minimum!!!';
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
    QR_HMAC_SECRET: QR,
    ADMIN_BOOTSTRAP_PASSWORD: 'test-admin-bootstrap-pw',
    SENTRY_DSN: undefined, ENABLE_JOBS: false, ENABLE_SWAGGER: false,
  } });
  pool = new Pool({ connectionString: i.dbUrl });
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  await seedDistricts(pool);
  districtId = (await pool.query(`select id from districts limit 1`)).rows[0].id;
  await mkUser('host'); await mkUser('guest'); await mkUser('outsider');
});

afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

const tok = (n: string) => ({ authorization: `Bearer ${users[n].tok}` });

async function doneSpot(startsAt: Date): Promise<string> {
  const r = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: tok('host'), payload: {
    template: 'drinks', name: `share spot ${crypto.randomUUID().slice(0, 6)}`, districtId,
    minHeadcount: 2, maxHeadcount: 6, joinMode: 'open',
    dateStart: new Date(Date.now() + 86400000).toISOString(), dateEnd: new Date(Date.now() + 7 * 86400000).toISOString(),
  }});
  const spotId = r.json().spotId;
  await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/join`, headers: tok('guest'), payload: {} });
  await pool.query(`update spots set state = 'done', starts_at = $2 where id = $1`, [spotId, startsAt.toISOString()]);
  await pool.query(`insert into attendance (spot_id, user_id, status) values ($1, $2, 'attended'), ($1, $3, 'attended')`, [spotId, users.host.id, users.guest.id]);
  return spotId;
}

test('share-my-spot: member link works publicly until 2h after end; outsider cannot mint; expired 410; bad sig 403', async () => {
  const spotId = await doneSpot(new Date(Date.now() - 30 * 60_000)); // drinks 2h → end 1.5h ago, +2h window → live

  const outsider = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/share-my-spot`, headers: tok('outsider'), payload: {} });
  expect(outsider.statusCode).toBe(404);

  const share = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/share-my-spot`, headers: tok('host'), payload: {} });
  expect(share.statusCode).toBe(200);
  const url = share.json().url as string;
  const sig = new URL(`http://x${url}`).searchParams.get('sig')!;

  // public fetch, no auth — venue/time/count only
  const pub = await app.inject({ method: 'GET', url: `/v1/public/spot-share?spot=${spotId}&sig=${sig}` });
  expect(pub.statusCode).toBe(200);
  expect(pub.json().attendeeCount).toBe(2);
  expect(pub.json().startsAt).toBeTruthy();
  expect(pub.json().venue).toBe(null); // no venue pinned on this fixture

  // tampered sig
  const bad = await app.inject({ method: 'GET', url: `/v1/public/spot-share?spot=${spotId}&sig=aaaaaaaaaaaaaaaaaaaaaa` });
  expect(bad.statusCode).toBe(403);

  // expired: started 5h ago (drinks 2h + 2h grace = 4h) → 410
  const oldSpot = await doneSpot(new Date(Date.now() - 5 * 3600_000));
  const oldShare = await app.inject({ method: 'POST', url: `/v1/spots/${oldSpot}/share-my-spot`, headers: tok('host'), payload: {} });
  const oldSig = new URL(`http://x${oldShare.json().url}`).searchParams.get('sig')!;
  const old = await app.inject({ method: 'GET', url: `/v1/public/spot-share?spot=${oldSpot}&sig=${oldSig}` });
  expect(old.statusCode).toBe(410);
});

test('safety ratings: attendees only, no self, once per pair, flag auto-files a report', async () => {
  const spotId = await doneSpot(new Date());
  const self = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/safety-rating`, headers: tok('host'), payload: { ratedUserId: users.host.id, rating: 5 } });
  expect(self.statusCode).toBe(422);
  const outsider = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/safety-rating`, headers: tok('outsider'), payload: { ratedUserId: users.host.id, rating: 5 } });
  expect(outsider.statusCode).toBe(403);

  const r1 = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/safety-rating`, headers: tok('guest'), payload: { ratedUserId: users.host.id, rating: 1, flag: true } });
  expect(r1.statusCode).toBe(201);
  const dup = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/safety-rating`, headers: tok('guest'), payload: { ratedUserId: users.host.id, rating: 2 } });
  expect(dup.statusCode).toBe(409);

  // flag created a linked report; rating row is private (never on public endpoints)
  const rep = (await pool.query(`select count(*)::int as n from reports where reporter_id = $1 and target_id = $2`, [users.guest.id, users.host.id])).rows;
  expect(rep[0].n).toBe(1);
  const rat = (await pool.query(`select rating, flag from safety_ratings where spot_id = $1`, [spotId])).rows;
  expect(rat[0]).toEqual({ rating: 1, flag: true });
});
