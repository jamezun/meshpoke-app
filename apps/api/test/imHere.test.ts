import { afterAll, beforeAll, expect, test } from 'vitest';
import { SignJWT } from 'jose';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { join } from 'node:path';
import * as schema from '../src/db/schema/index.js';
import { seedDistricts } from '../src/db/seed.js';
import { buildApp } from '../src/app.js';
import { useInfra } from './db.js';

const JWT = 'test-jwt-secret-at-least-32-characters-long';
const infra = useInfra();

let app: Awaited<ReturnType<typeof buildApp>>;
let pool: Pool;
let dbUrl = '';

async function mkUser(admin = false): Promise<{ id: string; tok: string }> {
  const id = crypto.randomUUID();
  const email = `u${id.slice(0, 8)}@t.test`;
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, is_admin, admin_roles, phone_verified_at)
     values ($1, $2, 'email', 'T', '1990-01-01', $3, 'verified', $4, $5, now())`,
    [id, email, `MP${id.slice(0, 6).toUpperCase()}`, admin, admin ? '{superadmin}' : '{}'],
  );
  const tok = await new SignJWT({ role: admin ? 'admin' : 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('1h')
    .sign(new TextEncoder().encode(JWT));
  return { id, tok };
}

async function mkVenue(): Promise<string> {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into venues (source, display_name, category, location, status, created_by)
     values ('user', 'Check-in Test Cafe', 'cafe', ST_SetSRID(ST_MakePoint(114.1600, 22.2800), 4326), 'active', null)`,
  ).catch(() => {});
  const r = await pool.query(`select id from venues where display_name = 'Check-in Test Cafe' order by created_at desc limit 1`);
  if (r.rows.length > 0) return r.rows[0].id as string;
  // retry with unique name if the static name collided
  const name = `Cafe ${id.slice(0, 6)}`;
  await pool.query(
    `insert into venues (source, display_name, category, location, status, created_by)
     values ('user', $1, 'cafe', ST_SetSRID(ST_MakePoint(114.1600, 22.2800), 4326), 'active', null)`,
    [name],
  );
  const r2 = await pool.query(`select id from venues where display_name = $1`, [name]);
  return r2.rows[0].id as string;
}

beforeAll(async () => {
  const i = await infra;
  dbUrl = i.dbUrl;
  app = await buildApp({
    config: {
      NODE_ENV: 'test', PORT: 0, LOG_LEVEL: 'fatal',
      DATABASE_URL: dbUrl, REDIS_URL: i.redisUrl,
      GOTRUE_URL: 'http://localhost:9999', GOTRUE_JWT_SECRET: JWT,
      CORS_ORIGINS: 'http://localhost:5173', RATE_LIMIT_MAX: 1000,
      PII_ENCRYPTION_KEY: '0'.repeat(64),
      QR_HMAC_SECRET: 'test-qr-hmac-secret-32-chars-minimum!!!',
      ADMIN_BOOTSTRAP_PASSWORD: 'test-admin-bootstrap-pw',
      SENTRY_DSN: undefined, ENABLE_JOBS: false, ENABLE_SWAGGER: false,
    },
  });
  pool = new Pool({ connectionString: dbUrl });
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  await seedDistricts(pool);
});

afterAll(async () => {
  await pool.end();
});

test('im-here: inside → verified_gps; outside → 422; non-live → 422; non-member → 403', async () => {
  const host = await mkUser();
  const member = await mkUser();
  const outsider = await mkUser();
  const district = (await pool.query(`select id from districts where name_en = 'Central and Western'`)).rows[0].id;
  const venueId = await mkVenue();

  const spotRes = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: { authorization: `Bearer ${host.tok}` }, payload: {
    template: 'drinks', name: 'GPS test spot', districtId: district,
    minHeadcount: 2, maxHeadcount: 5, dateStart: new Date(Date.now() + 86400000).toISOString(), dateEnd: new Date(Date.now() + 7 * 86400000).toISOString(),
  }});
  if (spotRes.statusCode !== 200) throw new Error(`spot create failed: ${spotRes.statusCode} ${JSON.stringify(spotRes.json())}`);
  const spotId = spotRes.json().spotId as string;

  // join as member (open join default? T9.1 default application → use apply+accept)
  const applyRes = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/apply`, headers: { authorization: `Bearer ${member.tok}` }, payload: {} });
  if (applyRes.statusCode !== 200) throw new Error(`apply failed: ${applyRes.statusCode} ${JSON.stringify(applyRes.json())}`);
  const apps0 = await pool.query(`select id from applications where spot_id = $1`, [spotId]);
  await app.inject({ method: 'POST', url: `/v1/applications/${apps0.rows[0].id}/decision`, headers: { authorization: `Bearer ${host.tok}` }, payload: { decision: 'accept' } });

  // attach venue while still forming
  await pool.query(`update spots set starts_at = now() - interval '1 hour', venue_id = $1 where id = $2`, [venueId, spotId]);

  // not live yet → 422
  const early = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/im-here`, headers: { authorization: `Bearer ${member.tok}` }, payload: { lat: 22.2800, lng: 114.1600 } });
  expect(early.statusCode).toBe(422);

  // force state live
  await pool.query(`update spots set state = 'live' where id = $1`, [spotId]);

  // outsider 403
  const out = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/im-here`, headers: { authorization: `Bearer ${outsider.tok}` }, payload: { lat: 22.2800, lng: 114.1600 } });
  expect(out.statusCode).toBe(403);

  // inside (venue at 114.16, 22.28 — same point)
  const inside = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/im-here`, headers: { authorization: `Bearer ${member.tok}` }, payload: { lat: 22.28005, lng: 114.16005, accuracy_m: 10 } });
  expect(inside.statusCode).toBe(200);
  expect(inside.json().verifiedGps).toBe(true);

  // outside (~500m east)
  const far = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/im-here`, headers: { authorization: `Bearer ${member.tok}` }, payload: { lat: 22.2800, lng: 114.1655 } });
  expect(far.statusCode).toBe(422);

  // accuracy edge: 150m away with accuracy 60 → radius 100+60=160 ≥ 150 → passes
  const mid = await pool.query(`select ST_Distance(ST_SetSRID(ST_MakePoint(114.1600,22.2800),4326)::geography, ST_SetSRID(ST_MakePoint(114.1617,22.2800),4326)::geography) as d`);
  const dist = Number(mid.rows[0].d);
  const edgeLng = 114.1600 + (0.0017 * (150 / dist)); // ~150m east
  const edge = await app.inject({ method: 'POST', url: `/v1/spots/${spotId}/im-here`, headers: { authorization: `Bearer ${member.tok}` }, payload: { lat: 22.2800, lng: edgeLng, accuracy_m: 60 } });
  expect(edge.statusCode).toBe(200);

  // coords never stored: no location columns on attendance
  const cols = await pool.query(`select column_name from information_schema.columns where table_name = 'attendance'`);
  expect(cols.rows.map((c) => c.column_name).join(',')).not.toMatch(/lat|lng|location/);
});
