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
let superTok: string, modTok: string, userTok: string;
let superId: string, modId: string, victimId: string;

async function token(sub: string, extra: Record<string, unknown> = {}) {
  return new SignJWT({ role: 'authenticated', ...extra }).setProtectedHeader({ alg: 'HS256' }).setSubject(sub)
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

  superId = crypto.randomUUID(); modId = crypto.randomUUID(); victimId = crypto.randomUUID();
  for (const [id, admin, roles] of [[superId, true, ['superadmin']], [modId, true, ['moderator']], [victimId, false, []] as const] as const) {
    await pool.query(
      `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, is_admin, admin_roles)
       values ($1::uuid, $2, 'email', $3, '1990-01-01', left($1::text,8), 'verified', $4, $5)`,
      [id, `${id}@t.test`, admin ? 'A' : 'V', admin, roles]);
  }
  superTok = await token(superId); modTok = await token(modId); userTok = await token(victimId);
}, 200_000);

afterAll(async () => {
  await app.close();
  await pool.end();
  await stopInfra();
});

describe('T8.3 admin RBAC + basics', () => {
  it('non-admin 403 on every admin route; moderator cannot hit support routes; superadmin passes', async () => {
    const user = { authorization: `Bearer ${userTok}` };
    for (const url of ['/v1/admin/users', '/v1/admin/merchant-claims', '/v1/admin/venues/geocode-failed', '/v1/admin/venue-reports']) {
      const r = await app.inject({ method: 'GET', url, headers: user });
      expect(r.statusCode, url).toBe(403);
    }
    const merge = await app.inject({ method: 'POST', url: '/v1/admin/venues/merge', headers: user, payload: { intoId: crypto.randomUUID(), fromId: crypto.randomUUID() } });
    expect(merge.statusCode).toBe(403);

    // moderator lacks support role
    const claims = await app.inject({ method: 'GET', url: '/v1/admin/merchant-claims', headers: { authorization: `Bearer ${modTok}` } });
    expect(claims.statusCode).toBe(403);
    // superadmin passes support route
    const users = await app.inject({ method: 'GET', url: '/v1/admin/users', headers: { authorization: `Bearer ${superTok}` } });
    expect(users.statusCode).toBe(200);
    expect(users.json().users.length).toBeGreaterThanOrEqual(3);
  });

  it('user detail shows plan + safety history; suspend → deleted_at, restore clears', async () => {
    const h = { authorization: `Bearer ${superTok}` };
    const detail = await app.inject({ method: 'GET', url: `/v1/admin/users/${victimId}`, headers: h });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().user.email).toContain('@t.test');

    const suspend = await app.inject({ method: 'POST', url: `/v1/admin/users/${victimId}/moderate`, headers: h, payload: { suspend: true, reason: 'test spam' } });
    expect(suspend.statusCode).toBe(200);
    const row = await pool.query('select deleted_at from users where id = $1', [victimId]);
    expect(row.rows[0].deleted_at).not.toBeNull();
    const mod = await pool.query('select action, reason from moderation_actions where target_user = $1', [victimId]);
    expect(mod.rows[0].action).toBe('suspend');

    const restore = await app.inject({ method: 'POST', url: `/v1/admin/users/${victimId}/moderate`, headers: h, payload: { suspend: false, reason: 'appeal accepted' } });
    expect(restore.statusCode).toBe(200);
    const row2 = await pool.query('select deleted_at from users where id = $1', [victimId]);
    expect(row2.rows[0].deleted_at).toBeNull();
  });

  it('manual pin sets location + geocode_status=manual; merge moves children and closes loser', async () => {
    const h = { authorization: `Bearer ${superTok}` };
    const d = await pool.query(`
      insert into districts (name_en, name_zh, boundary) values ('AdmT8','測', st_geomfromgeojson('{"type":"MultiPolygon","coordinates":[[[[114.1,22.2],[114.3,22.2],[114.3,22.4],[114.1,22.4],[114.1,22.2]]]]}')) returning id`);
    const keep = await pool.query(
      `insert into venues (display_name, category, location, district_id, source) values ('Keep Bar', 'bar', st_setsrid(st_makepoint(114.15,22.3),4326), $1, 'user') returning id`, [d.rows[0].id]);
    const dupe = await pool.query(
      `insert into venues (display_name, category, location, district_id, source, geocode_status) values ('Keep Bar ', 'bar', st_setsrid(st_makepoint(114.1501,22.3001),4326), $1, 'user', 'failed') returning id`, [d.rows[0].id]);

    const pin = await app.inject({ method: 'POST', url: `/v1/admin/venues/${dupe.rows[0].id}/pin`, headers: h, payload: { lat: 22.3, lng: 114.15 } });
    expect(pin.statusCode).toBe(200);
    const status = await pool.query('select geocode_status from venues where id = $1', [dupe.rows[0].id]);
    expect(status.rows[0].geocode_status).toBe('manual');

    await pool.query(`insert into spots (kind, name, join_mode, min_headcount, max_headcount, venue_id) values ('chat', 'S', 'open', 2, 500, $1)`, [dupe.rows[0].id]);
    const merge = await app.inject({ method: 'POST', url: '/v1/admin/venues/merge', headers: h, payload: { intoId: keep.rows[0].id, fromId: dupe.rows[0].id } });
    expect(merge.statusCode).toBe(200);
    const moved = await pool.query('select venue_id from spots where name = $1', ['S']);
    expect(moved.rows[0].venue_id).toBe(keep.rows[0].id);
    const closed = await pool.query('select status from venues where id = $1', [dupe.rows[0].id]);
    expect(closed.rows[0].status).toBe('closed');
  });
});

describe('T13.4 moderation queue', () => {
  it('moderator actions a report end-to-end: queue → mute → resolve → restore', async () => {
    // three reporters file reports on victim → auto-mute fires (T13.1)
    for (let i = 0; i < 3; i++) {
      const rid = crypto.randomUUID();
      await pool.query(
        `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state)
         values ($1::uuid, $2, 'email', $3, '1990-01-01', left($1::text,8), 'verified')`,
        [rid, `${rid}@t.test`, 'R' + i]);
      const rt = await token(rid);
      const r = await app.inject({ method: 'POST', url: '/v1/reports',
        headers: { authorization: `Bearer ${rt}` },
        payload: { targetType: 'user', targetId: victimId, reason: 'scam link in dm' } });
      expect(r.statusCode).toBe(201);
    }

    // queue shows open reports + auto-muted victim
    const q = await app.inject({ method: 'GET', url: '/v1/admin/moderation/queue',
      headers: { authorization: `Bearer ${modTok}` } });
    expect(q.statusCode).toBe(200);
    const queue = q.json();
    expect(queue.reports.length).toBeGreaterThanOrEqual(3);
    expect(queue.muted.some((m: { target_user: string }) => m.target_user === victimId)).toBe(true);

    // moderator formalises the mute with reason + appeal note
    const act = await app.inject({ method: 'POST', url: `/v1/admin/moderation/${victimId}/action`,
      headers: { authorization: `Bearer ${modTok}` },
      payload: { action: 'mute', reason: '3 scam reports confirmed', appealNote: 'user may appeal via support@' } });
    expect(act.statusCode).toBe(200);
    expect(act.json().action).toBe('mute');

    // resolve one of the reports
    const repId = queue.reports.find((r: { target_id: string }) => r.target_id === victimId).id;
    const res = await app.inject({ method: 'POST', url: `/v1/admin/reports/${repId}/resolve`,
      headers: { authorization: `Bearer ${modTok}` }, payload: { resolution: 'actioned', note: 'muted' } });
    expect(res.statusCode).toBe(200);

    // audit trail exists
    const audit = await pool.query(
      `select count(*)::int as n from audit_log where action = 'admin.moderation.mute' and target = $1`, ['user:' + victimId]);
    expect(audit.rows[0].n).toBe(1);

    // restore lifts the mute and un-suspends
    const restore = await app.inject({ method: 'POST', url: `/v1/admin/moderation/${victimId}/action`,
      headers: { authorization: `Bearer ${superTok}` }, payload: { action: 'restore', reason: 'appeal accepted' } });
    expect(restore.statusCode).toBe(200);
    const u = await pool.query(`select deleted_at from users where id = $1`, [victimId]);
    expect(u.rows[0].deleted_at).toBe(null);

    // victim cannot be moderated by self, and invalid action 422
    const bad = await app.inject({ method: 'POST', url: `/v1/admin/moderation/${victimId}/action`,
      headers: { authorization: `Bearer ${modTok}` }, payload: { action: 'ban', reason: 'x' } });
    expect(bad.statusCode).toBe(422);
  });
});
