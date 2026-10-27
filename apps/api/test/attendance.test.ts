import { afterAll, beforeAll, expect, test, it } from 'vitest';
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
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, is_admin, admin_roles, phone_verified_at)
     values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified', $5, $6, now())`,
    [id, `${name}${id.slice(0, 8)}@t.test`, name, `MP${id.slice(0, 6).toUpperCase()}`, admin, admin ? '{superadmin}' : '{}'],
  );
  const tok = await new SignJWT({ role: admin ? 'admin' : 'authenticated', aal: admin ? 'aal2' : null })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT));
  users[name] = { id, tok };
}

async function mkLiveSpot(): Promise<string> {
  const h = users.host!;
  const r = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${h.tok}` }, payload: {
    template: 'drinks', name: `Roll-call spot ${crypto.randomUUID().slice(0, 6)}`, districtId,
    minHeadcount: 2, maxHeadcount: 6, joinMode: 'open',
    dateStart: new Date(Date.now() + 86400000).toISOString(), dateEnd: new Date(Date.now() + 7 * 86400000).toISOString(),
  }});
  const spotId = r.json().spotId as string;
  for (const n of ['a', 'b', 'c']) {
    await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/join`, headers: { authorization: `Bearer ${users[n].tok}` }, payload: {} });
  }
  const vname = `Rollcall venue ${crypto.randomUUID().slice(0, 6)}`;
  await pool.query(
    `insert into venues (source, display_name, category, location, status)
     values ('user', $1, 'bar', ST_SetSRID(ST_MakePoint(114.16, 22.28), 4326), 'active')`, [vname]);
  const vid = (await pool.query(`select id from venues where display_name = $1`, [vname])).rows[0].id;
  await pool.query(`update spots set state = 'done', starts_at = now() - interval '2 hours', venue_id = $1 where id = $2`, [vid, spotId]);
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
  await mkUser('host'); await mkUser('a'); await mkUser('b'); await mkUser('c'); await mkUser('admin', true);
});

afterAll(async () => {
  await app.close();
  await pool.end();
  await stopInfra();
});

test('roll-call defaults attended; host absence flips b; 1 peer report no effect, 2 flips c; forgiveness flips back', async () => {
  const spotId = await mkLiveSpot();

  // roll-call GET: all attended by default
  const list = await app.inject({ method: 'GET', url: `/v1/spots/${spotId}/roll-call`, headers: { authorization: `Bearer ${users.host.tok}` } });
  expect(list.statusCode).toBe(200);
  expect(list.json().members).toHaveLength(4);
  expect(list.json().members.every((m: { status: string }) => m.status === 'attended')).toBe(true);

  // host marks b absent
  const rc = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/roll-call`, headers: { authorization: `Bearer ${users.host.tok}` }, payload: { absent: [users.b.id] } });
  expect(rc.statusCode).toBe(200);

  // a reports c absent: 1 report → no flip
  const r1 = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/report-absent`, headers: { authorization: `Bearer ${users.a.tok}` }, payload: { userId: users.c.id } });
  expect(r1.json().flipped).toBe(false);
  let cStatus = (await pool.query(`select status from attendance where spot_id = $1 and user_id = $2`, [spotId, users.c.id])).rows[0]?.status;
  expect(cStatus).toBe('attended'); // seeded by roll-call POST

  // b also reports c: 2 distinct → absent_reported
  const r2 = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/report-absent`, headers: { authorization: `Bearer ${users.b.tok}` }, payload: { userId: users.c.id } });
  expect(r2.json().flipped).toBe(true);
  cStatus = (await pool.query(`select status from attendance where spot_id = $1 and user_id = $2`, [spotId, users.c.id])).rows[0].status;
  expect(cStatus).toBe('absent_reported');

  // self-report rejected
  const self = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/report-absent`, headers: { authorization: `Bearer ${users.a.tok}` }, payload: { userId: users.a.id } });
  expect(self.statusCode).toBe(422);

  // non-attendee outsider cannot report
  await mkUser('outsider');
  const out = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/report-absent`, headers: { authorization: `Bearer ${users.outsider.tok}` }, payload: { userId: users.a.id } });
  expect(out.statusCode).toBe(403);

  // b explains, host accepts → forgiven
  const note = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/forgiveness`, headers: { authorization: `Bearer ${users.b.tok}` }, payload: { note: 'MTR suspension, no way across the harbour' } });
  expect(note.statusCode).toBe(200);
  const acc = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/forgiveness`, headers: { authorization: `Bearer ${users.host.tok}` }, payload: { accept: true, userId: users.b.id } });
  expect(acc.json().forgiven).toBe(true);
  const bStatus = (await pool.query(`select status from attendance where spot_id = $1 and user_id = $2`, [spotId, users.b.id])).rows[0].status;
  expect(bStatus).toBe('forgiven');

  // finalise (admin): emits score events, idempotent
  const f1 = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/finalise`, headers: { authorization: `Bearer ${users.admin.tok}` } });
  expect(f1.statusCode).toBe(200);
  const f2 = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/finalise`, headers: { authorization: `Bearer ${users.admin.tok}` } });
  expect(f2.json().finalised).toBe(0); // idempotent

  const events = (await pool.query(`select user_id, type, weight from score_events where spot_id = $1 order by type, weight desc`, [spotId])).rows;
  const types = events.map((e) => e.type);
  expect(types).toContain('attended');
  expect(types).toContain('no_show'); // c absent_reported
  expect(types).toContain('forgiven'); // b
  const cEvents = events.filter((e) => e.user_id === users.c.id);
  expect(cEvents.every((e) => Number(e.weight) <= 0)).toBe(true);
});

  // T21.3: host-reward Pro days
  it('T21.3 grants 2d pro on qualifying finalise, caps at 7d/30d', async () => {
    const sid = await mkLiveSpot();
    const f = await app.inject({ method: 'POST', url: `/v1/spots/${sid}/finalise`, headers: { authorization: `Bearer ${users.admin.tok}` } });
    expect(f.statusCode).toBe(200);
    expect(f.json().hostReward).toContain('granted 2 pro days');
    const g = await pool.query(`select kind from grants where user_id = $1 and kind = 'host_reward_pro'`, [users.host!.id]);
    expect(g.rowCount).toBe(1);
    const e = await pool.query(`select plan from entitlements where user_id = $1`, [users.host!.id]);
    expect(e.rows[0].plan).toBe('pro');
    const sid2 = await mkLiveSpot();
    const f2 = await app.inject({ method: 'POST', url: `/v1/spots/${sid2}/finalise`, headers: { authorization: `Bearer ${users.admin.tok}` } });
    expect(f2.json().hostReward).toContain('granted 2 pro days');
    for (let k = 0; k < 3; k++) {
      await pool.query(`insert into grants (user_id, kind, starts_at, ends_at) values ($1, 'host_reward_pro', now(), now() + interval '1 day')`, [users.host!.id]);
    }
    const sid3 = await mkLiveSpot();
    const f3 = await app.inject({ method: 'POST', url: `/v1/spots/${sid3}/finalise`, headers: { authorization: `Bearer ${users.admin.tok}` } });
    expect(f3.json().hostReward).toContain('capped');
  });

  it('T21.3 no reward when attendance ratio < 80%', async () => {
    const sid = await mkLiveSpot();
    await app.inject({ method: 'POST', url: `/v1/spots/${sid}/roll-call`, headers: { authorization: `Bearer ${users.host.tok}` }, payload: { absent: [users.a!.id, users.b!.id] } });
    const f = await app.inject({ method: 'POST', url: `/v1/spots/${sid}/finalise`, headers: { authorization: `Bearer ${users.admin.tok}` } });
    expect(f.statusCode).toBe(200);
    expect(f.json().hostReward).toBeNull();
  });
