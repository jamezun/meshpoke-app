import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import pg from 'pg';
import { join } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../src/db/schema/index.js';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

const JWT = 'test-secret-test-secret-test-secret-1234';
let infra: TestInfra, app: FastifyInstance, pool: pg.Pool;
let ownerTok: string, adminTok: string, venueId: string, merchantId: string;

async function token(sub: string, admin = false) {
  return new SignJWT(admin ? { role: 'admin' } : { role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' }).setSubject(sub)
    .setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(JWT));
}

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  const { default: Fastify } = await import('fastify');
  const mock = Fastify();
  mock.post('/otp', async () => ({}));
  mock.get('/admin/users/:id', async () => ({}));
  mock.post('/admin/users/:id/logout', async () => ({}));
  await mock.listen({ port: 0, host: '127.0.0.1' });
  const mp = mock.server.address();
  const port = typeof mp === 'object' && mp !== null ? mp.port : 0;
  app = await buildApp({ config: {
    NODE_ENV: 'test', PORT: '0', LOG_LEVEL: 'error', DATABASE_URL: infra.dbUrl, REDIS_URL: infra.redisUrl,
    GOTRUE_URL: `http://127.0.0.1:${port}`, GOTRUE_JWT_SECRET: JWT,
    CORS_ORIGINS: 'http://localhost:5173', RATE_LIMIT_MAX: '1000', SENTRY_DSN: '',
    PII_ENCRYPTION_KEY: 'a'.repeat(64), QR_HMAC_SECRET: 'b'.repeat(32),
    ADMIN_BOOTSTRAP_PASSWORD: 'adminpw', ENABLE_SWAGGER: false,
  } as never });
  await app.ready();

  const owner = crypto.randomUUID(); const adminId = crypto.randomUUID();
  for (const [id, admin] of [[owner, false], [adminId, true]] as const) {
    await pool.query(
      `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, is_admin, admin_roles)
       values ($1::uuid, $2, 'email', $3, '1990-01-01', left($1::text,8), 'verified', $4, $5)`,
      [id, `${id}@t.test`, admin ? 'A' : 'M', admin, admin ? '{superadmin}' : '{}']);
  }
  ownerTok = await token(owner); adminTok = await token(adminId, true);

  const d = await pool.query(`
    insert into districts (name_en, name_zh, boundary) values ('PortalT8','測', st_geomfromgeojson('{"type":"MultiPolygon","coordinates":[[[[114.1,22.2],[114.3,22.2],[114.3,22.4],[114.1,22.4],[114.1,22.2]]]]}')) returning id`);
  const v = await pool.query(
    `insert into venues (display_name, category, location, district_id, source) values ('Portal Bar', 'bar', st_setsrid(st_makepoint(114.15,22.3),4326), $1, 'user') returning id`,
    [d.rows[0].id]);
  venueId = v.rows[0].id;

  const claim = await app.inject({ method: 'POST', url: '/v1/merchant/claim', headers: { authorization: `Bearer ${ownerTok}` },
    payload: { venueId, certKey: 'br/cert.pdf', priceBand: 2 } });
  merchantId = claim.json().merchantId;
  await app.inject({ method: 'POST', url: `/v1/admin/merchant-claims/${merchantId}`, headers: { authorization: `Bearer ${adminTok}` }, payload: { action: 'approve' } });
}, 200_000);

afterAll(async () => {
  await app.close();
  await pool.end();
  await stopInfra();
});

describe('T8.2 merchant portal', () => {
  it('venue editor: hours saved, menu locked on Starter, pin correction ≤200m', async () => {
    const h = { authorization: `Bearer ${ownerTok}` };
    const ok = await app.inject({ method: 'PATCH', url: `/v1/merchant/me/venues/${venueId}`, headers: h, payload: { hours: 'Mon–Sun 08:00–23:00' } });
    expect(ok.statusCode).toBe(200);
    const saved = await pool.query('select profile from venues where id = $1', [venueId]);
    expect(saved.rows[0].profile.hours).toBe('Mon–Sun 08:00–23:00');

    const menu = await app.inject({ method: 'PATCH', url: `/v1/merchant/me/venues/${venueId}`, headers: h, payload: { menu: 'beer $50' } });
    expect(menu.statusCode).toBe(402);

    const near = await app.inject({ method: 'PATCH', url: `/v1/merchant/me/venues/${venueId}`, headers: h, payload: { pinLat: 22.3005, pinLng: 114.15 } });
    expect(near.statusCode).toBe(200);
    const far = await app.inject({ method: 'PATCH', url: `/v1/merchant/me/venues/${venueId}`, headers: h, payload: { pinLat: 22.32, pinLng: 114.15 } });
    expect(far.statusCode).toBe(422);
  });

  it('standing rooms: create up to Starter cap 3, then 402 w/ plan problem', async () => {
    const h = { authorization: `Bearer ${ownerTok}` };
    for (const name of ['Main floor', 'Terrace', 'Sports corner']) {
      const r = await app.inject({ method: 'POST', url: `/v1/merchant/me/venues/${venueId}/standing-rooms`, headers: h, payload: { name } });
      expect(r.statusCode).toBe(200);
    }
    const capped = await app.inject({ method: 'POST', url: `/v1/merchant/me/venues/${venueId}/standing-rooms`, headers: h, payload: { name: 'Fourth' } });
    expect(capped.statusCode).toBe(402);
    expect(capped.json().problem.type).toBe('plan');

    const list = await app.inject({ method: 'GET', url: `/v1/merchant/me/venues/${venueId}/standing-rooms`, headers: h });
    expect(list.json().standingRooms).toHaveLength(3);
    const spot = await pool.query('select host_merchant_id, venue_id from spots where host_merchant_id = $1', [merchantId]);
    expect(spot.rows).toHaveLength(3);
    expect(spot.rows[0].venue_id).toBe(venueId);
  });
});
