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

async function mkUser(name: string, admin = false): Promise<void> {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, is_admin, admin_roles)
     values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified', $5, $6)`,
    [id, `${name}${id.slice(0, 8)}@t.test`, name, `MP${id.slice(0, 6).toUpperCase()}`, admin, admin ? '{superadmin}' : '{}'],
  );
  const tok = await new SignJWT({ role: 'authenticated', user_role: 'authenticated', admin_roles: admin ? ['superadmin'] : [], aal: 'aal2' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT));
  users[name] = { id, tok };
}

async function mkDoneSpot(host = 'alice', members: string[] = ['bob']): Promise<string> {
  const r = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${users[host].tok}` }, payload: {
    template: 'drinks', name: `Crew spot ${crypto.randomUUID().slice(0, 6)}`, districtId,
    minHeadcount: 2, maxHeadcount: 8, joinMode: 'open',
    dateStart: new Date(Date.now() + 86400000).toISOString(), dateEnd: new Date(Date.now() + 7 * 86400000).toISOString(),
  }});
  const spotId = r.json().spotId;
  for (const m of members) {
    await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/join`, headers: { authorization: `Bearer ${users[m].tok}` }, payload: {} });
  }
  await pool.query(`update spots set state = 'done', starts_at = now() where id = $1`, [spotId]);
  await pool.query(`insert into attendance (spot_id, user_id, status)
    select $1, u.id, 'attended' from users u where u.id = any($2::uuid[])`,
    [spotId, [users[host].id, ...members.map((m) => users[m].id)]]);
  return spotId;
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
  await mkUser('alice'); await mkUser('bob'); await mkUser('carol'); await mkUser('admin', true);
});

afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

const tok = (n: string) => ({ authorization: `Bearer ${users[n].tok}` });

test('crew: first keeper creates crew + room; second joins; list; whatsapp; leave', async () => {
  const spotId = await mkDoneSpot('alice', ['bob']);

  // non-attendee 403
  const out = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/crew`, headers: tok('carol'), payload: { keep: true } });
  expect(out.statusCode).toBe(403);

  // not done yet → 422 (already done here, but state check sanity via wrong spot kind is covered elsewhere)
  const first = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/crew`, headers: tok('alice'), payload: { keep: true } });
  expect(first.statusCode).toBe(201);
  expect(first.json().created).toBe(true);
  const crewId = first.json().crewId;

  // second member joins existing crew
  const second = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/crew`, headers: tok('bob'), payload: { keep: true } });
  expect(second.statusCode).toBe(200);
  expect(second.json().created).toBe(false);

  // crew list shows 2 members
  const list = await app.inject({ method: 'GET', url: '/v1/crews', headers: tok('alice') });
  expect(list.statusCode).toBe(200);
  const mine = list.json().crews as { id: string; members: number }[];
  expect(mine.find((c) => c.id === crewId)?.members).toBe(2);

  // whatsapp url patch by member
  const patch = await app.inject({ method: 'PATCH', url: `/v1/crews/${crewId}`, headers: tok('bob'), payload: { whatsappUrl: 'https://chat.whatsapp.com/abc' } });
  expect(patch.statusCode).toBe(200);

  // leave
  const leave = await app.inject({ method: 'POST', url: `/v1/crews/${crewId}/leave`, headers: tok('bob') });
  expect(leave.statusCode).toBe(200);
  const after = await app.inject({ method: 'GET', url: '/v1/crews', headers: tok('alice') });
  expect((after.json().crews as { id: string; members: number }[]).find((c) => c.id === crewId)?.members).toBe(1);
});

test('crew cap: free tier activeCrews cap 3 counts only non-dormant crews', async () => {
  // alice already has 1 active crew from previous test; free cap 3 → two more fit, third hits cap
  const ids: string[] = [];
  for (let n = 0; n < 3; n++) ids.push(await mkDoneSpot('alice', ['bob']));
  expect((await app.inject({ method: 'POST', url: `/v1/spots/${ids[0]}/crew`, headers: tok('alice'), payload: { keep: true } })).statusCode).toBe(201);
  expect((await app.inject({ method: 'POST', url: `/v1/spots/${ids[1]}/crew`, headers: tok('alice'), payload: { keep: true } })).statusCode).toBe(201);
  const capped = await app.inject({ method: 'POST', url: `/v1/spots/${ids[2]}/crew`, headers: tok('alice'), payload: { keep: true } });
  expect(capped.statusCode).toBe(402);
  expect(capped.json().problem.capType).toBe('activeCrews');

  // dormancy sweep: age one crew past 60d → freed from cap
  await pool.query(`update crews set created_at = now() - interval '70 days' where id in (
    select c.id from crews c join crew_members m on m.crew_id = c.id
     where m.user_id = $1 order by c.created_at limit 1)`, [users.alice.id]);
  const sweep = await app.inject({ method: 'POST', url: '/v1/internal/crew-sweep', headers: tok('admin') });
  expect(sweep.statusCode).toBe(200);

  expect(sweep.json().dormanted).toBeGreaterThanOrEqual(1);

  const retry = await app.inject({ method: 'POST', url: `/v1/spots/${ids[2]}/crew`, headers: tok('alice'), payload: { keep: true } });
  expect(retry.statusCode).toBe(201);
});
