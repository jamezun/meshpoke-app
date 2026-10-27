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
let owner: string, other: string, adminTok: string, venueId: string, merchantId: string;

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

  owner = crypto.randomUUID(); other = crypto.randomUUID(); const adminId = crypto.randomUUID();
  for (const [id, admin] of [[owner, false], [other, false], [adminId, true]] as const) {
    await pool.query(
      `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, is_admin, admin_roles)
       values ($1::uuid, $2, 'email', $3, '1990-01-01', left($1::text,8), 'verified', $4, $5)`,
      [id, `${id}@t.test`, admin ? 'A' : 'M', admin, admin ? '{superadmin}' : '{}']);
  }
  adminTok = await token(adminId, true);
  const v = await pool.query(`
    insert into districts (name_en, name_zh, boundary) values ('ClaimT8','測', st_geomfromgeojson('{"type":"MultiPolygon","coordinates":[[[[114.1,22.2],[114.3,22.2],[114.3,22.4],[114.1,22.4],[114.1,22.2]]]]}')) returning id`);
  const res = await pool.query(
    `insert into venues (display_name, category, location, district_id, source) values ('Claim Cafe', 'cafe', st_setsrid(st_makepoint(114.15,22.3),4326), $1, 'user') returning id`,
    [v.rows[0].id]);
  venueId = res.rows[0].id;
}, 200_000);

afterAll(async () => {
  await app.close();
  await pool.end();
  await stopInfra();
});

describe('T8.1 merchant claim', () => {
  it('claim → pending, staff owner row, one active claim per venue', async () => {
    const tok = await token(owner);
    const r1 = await app.inject({ method: 'POST', url: '/v1/merchant/claim', headers: { authorization: `Bearer ${tok}` },
      payload: { venueId, certKey: `br/${owner}/cert-1.pdf`, priceBand: 3, contactName: 'Boss', contactPhone: '+85212345678' } });
    expect(r1.statusCode).toBe(200);
    merchantId = r1.json().merchantId;

    const r2 = await app.inject({ method: 'POST', url: '/v1/merchant/claim', headers: { authorization: `Bearer ${await token(other)}` },
      payload: { venueId, certKey: `br/${other}/cert-2.pdf`, priceBand: 2 } });
    expect(r2.statusCode).toBe(409);

    const staff = await pool.query(`select role from merchant_staff where merchant_id = $1`, [merchantId]);
    expect(staff.rows[0].role).toBe('owner');
  });

  it('reject then resubmit works; approve claims venue', async () => {
    const tok = await token(owner);
    const reject = await app.inject({ method: 'POST', url: `/v1/admin/merchant-claims/${merchantId}`, headers: { authorization: `Bearer ${adminTok}` },
      payload: { action: 'reject', reason: 'certificate illegible' } });
    expect(reject.statusCode).toBe(200);

    const resubmit = await app.inject({ method: 'POST', url: '/v1/merchant/claim', headers: { authorization: `Bearer ${tok}` },
      payload: { venueId, certKey: `br/${owner}/cert-1-clear.pdf`, priceBand: 3 } });
    expect(resubmit.statusCode).toBe(200);
    expect(resubmit.json().merchantId).toBe(merchantId); // updated, not duplicated

    const approve = await app.inject({ method: 'POST', url: `/v1/admin/merchant-claims/${merchantId}`, headers: { authorization: `Bearer ${adminTok}` },
      payload: { action: 'approve' } });
    expect(approve.statusCode).toBe(200);

    const venue = await pool.query(`select claimed_by_merchant_id from venues where id = $1`, [venueId]);
    expect(venue.rows[0].claimed_by_merchant_id).toBe(merchantId);
  });

  it('non-admin gets 403 on admin claim routes', async () => {
    const tok = await token(other);
    const r = await app.inject({ method: 'POST', url: `/v1/admin/merchant-claims/${crypto.randomUUID()}`, headers: { authorization: `Bearer ${tok}` }, payload: { action: 'approve' } });
    expect(r.statusCode).toBe(403);
  });
});
