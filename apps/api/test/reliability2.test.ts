/// Reliability 2.0 (BM §4.4): bail ladder, apology loop, reschedule consent,
/// handover, enforcement gates, hearts cap, streak/conduct.
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import pg from 'pg';
import { join } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../src/db/schema/index.js';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import { buildApp } from '../src/app.js';
import { seedDistricts } from '../src/db/seed.js';
import type { FastifyInstance } from 'fastify';

const JWT = 'test-secret-test-secret-test-secret-1234';
let infra: TestInfra, app: FastifyInstance, pool: pg.Pool;
let districtId: string;
const hdr = (t: string) => ({ authorization: `Bearer ${t}` });

async function mkUser(admin = false) {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, is_admin, admin_roles)
     values ($1, $2, 'email', 'T', '1990-01-01', $3, 'verified', $4, $5)`,
    [id, `${id}@t.co`, id.slice(0, 8), admin, admin ? '{superadmin}' : '{}'],
  );
  await pool.query(`insert into hosting_capacity (user_id, max_active) values ($1, 5) on conflict (user_id) do update set max_active = 5`, [id]);
  const tok = await new SignJWT({ role: admin ? 'admin' : 'authenticated', admin_roles: admin ? ['superadmin'] : [], aal: 'aal2' })
    .setProtectedHeader({ alg: 'HS256' }).setSubject(id).setIssuedAt().setExpirationTime('2h')
    .sign(new TextEncoder().encode(JWT));
  return { id, tok };
}
async function mkVenue() {
  const r = await pool.query(`insert into venues (display_name, category, location, district_id, source) values ($1, 'restaurant', st_setsrid(st_makepoint(114.15, 22.28), 4326), $2, 'user') returning id`, ['R2 Cafe', districtId]);
  return r.rows[0].id as string;
}
async function mkSpot(hostTok: string) {
  const res = await app.inject({
    method: 'POST', url: '/v1/spots/events', headers: hdr(hostTok),
    payload: { template: 'dinner', name: 'R2 ' + crypto.randomUUID().slice(0, 6), joinMode: 'open', districtId, minHeadcount: 2, maxHeadcount: 5, dateStart: '2026-12-20T12:00:00Z', dateEnd: '2026-12-20T15:00:00Z' },
  });
  expect(res.statusCode).toBe(200);
  return res.json().spotId as string;
}
/** directly set a member + confirmed spot with starts_at offset from now */
async function forceConfirmed(spotId: string, userIds: string[], startsInH: number) {
  for (const uid of userIds.slice(1)) {
    await pool.query(`insert into spot_members (spot_id, user_id, role, state) values ($1, $2, 'member', 'active') on conflict do nothing`, [spotId, uid]);
  }
  await pool.query(`update spots set state='confirmed', venue_id=$2, starts_at = now() + ($3 || ' hours')::interval, confirm_deadline = now() + interval '48 hours' where id = $1`, [spotId, await mkVenue(), String(startsInH)]);
  await pool.query(`update spot_members set confirm_state='confirmed' where spot_id = $1 and state='active'`, [spotId]);
}

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  await seedDistricts(pool);
  app = await buildApp({
    config: {
      NODE_ENV: 'test', PORT: 0, LOG_LEVEL: 'fatal',
      DATABASE_URL: infra.dbUrl, REDIS_URL: infra.redisUrl,
      GOTRUE_URL: 'http://localhost:9999', GOTRUE_JWT_SECRET: JWT,
      CORS_ORIGINS: 'http://localhost:5173', RATE_LIMIT_MAX: 1000,
      PII_ENCRYPTION_KEY: '0'.repeat(64),
      QR_HMAC_SECRET: 'test-qr-hmac-secret-32-chars-minimum!!!',
      ADMIN_BOOTSTRAP_PASSWORD: 'test-admin-bootstrap-pw',
      SENTRY_DSN: undefined, ENABLE_JOBS: false, ENABLE_SWAGGER: false,
    },
  });
  districtId = (await pool.query(`select id from districts limit 1`)).rows[0].id;
});
afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

describe('reliability 2.0', () => {
  it('bail ladder: >48h free · 30h out = 0.75 · 10h out = 0.5', async () => {
    const host = await mkUser(); const g = await mkUser();
    // 72h out → free
    let s = await mkSpot(host.tok); await forceConfirmed(s, [host.id, g.id], 72);
    let r = await app.inject({ method: 'POST', url: `/v1/spots/${s}/bail`, headers: hdr(g.tok) });
    expect(r.json().penalty).toBe('free');
    // 30h out → 0.75
    s = await mkSpot(host.tok); await forceConfirmed(s, [host.id, g.id], 30);
    r = await app.inject({ method: 'POST', url: `/v1/spots/${s}/bail`, headers: hdr(g.tok) });
    expect(r.json().penalty).toBe('bail48to24');
    let e = await pool.query(`select weight from score_events where spot_id=$1 and user_id=$2 and type='late_cancel'`, [s, g.id]);
    expect(Number(e.rows[0].weight)).toBe(0.75);
    // 10h out → 0.5
    s = await mkSpot(host.tok); await forceConfirmed(s, [host.id, g.id], 10);
    r = await app.inject({ method: 'POST', url: `/v1/spots/${s}/bail`, headers: hdr(g.tok) });
    expect(r.json().penalty).toBe('bailUnder24');
    e = await pool.query(`select weight from score_events where spot_id=$1 and user_id=$2 and type='late_cancel'`, [s, g.id]);
    expect(Number(e.rows[0].weight)).toBe(0.5);
  });

  it('host cancel → apology accept/decline; sweep finalises weight 0.2+0.6·rate; silence stays 0.5', async () => {
    const host = await mkUser(); const members = [await mkUser(), await mkUser(), await mkUser()];
    const s = await mkSpot(host.tok); await forceConfirmed(s, [host.id, ...members.map((m) => m.id)], 20);
    const r = await app.inject({ method: 'POST', url: `/v1/spots/${s}/cancel`, headers: hdr(host.tok) });
    expect(r.statusCode).toBe(200);
    // all 3 got apology requests
    const ap = await pool.query(`select count(*)::int as n from apology_requests where spot_id=$1`, [s]);
    expect(ap.rows[0].n).toBe(3);
    // 2 accept, 1 declines → 0.2 + 0.6·(2/3) = 0.6
    await app.inject({ method: 'POST', url: `/v1/spots/${s}/apology`, headers: hdr(members[0].tok), payload: { response: 'accept' } });
    await app.inject({ method: 'POST', url: `/v1/spots/${s}/apology`, headers: hdr(members[1].tok), payload: { response: 'accept' } });
    await app.inject({ method: 'POST', url: `/v1/spots/${s}/apology`, headers: hdr(members[2].tok), payload: { response: 'decline' } });
    // age the event past the 72h window, run sweep
    await pool.query(`update score_events set created_at = created_at - interval '73 hours' where spot_id = $1`, [s]);
    await app.inject({ method: 'POST', url: '/v1/internal/spot-sweep', headers: hdr((await mkUser(true)).tok) });
    const e = await pool.query(`select weight from score_events where spot_id=$1 and type='host_cancel'`, [s]);
    expect(Number(e.rows[0].weight)).toBeCloseTo(0.6, 3);
    // silence case: fresh cancel with no responses stays 0.5
    const s2 = await mkSpot(host.tok); await forceConfirmed(s2, [host.id, members[0].id], 20);
    await app.inject({ method: 'POST', url: `/v1/spots/${s2}/cancel`, headers: hdr(host.tok) });
    await pool.query(`update score_events set created_at = created_at - interval '73 hours' where spot_id = $1`, [s2]);
    await app.inject({ method: 'POST', url: '/v1/internal/spot-sweep', headers: hdr((await mkUser(true)).tok) });
    const e2 = await pool.query(`select weight from score_events where spot_id=$1 and type='host_cancel'`, [s2]);
    expect(Number(e2.rows[0].weight)).toBeCloseTo(0.5, 3);
  });

  it('reschedule: >48h free change; ≤48h consent — all accept applies, one decline rejects + host tap', async () => {
    const host = await mkUser(); const members = [await mkUser(), await mkUser()];
    // free path (72h out)
    let s = await mkSpot(host.tok); await forceConfirmed(s, [host.id, ...members.map((m) => m.id)], 72);
    let r = await app.inject({ method: 'POST', url: `/v1/spots/${s}/reschedule`, headers: hdr(host.tok), payload: { newStartsAt: new Date(Date.now() + 96 * 3600_000).toISOString() } });
    expect(r.json().rescheduled).toBe('free');
    // consent path (30h out, deadline = start-4h = 26h from now)
    s = await mkSpot(host.tok); await forceConfirmed(s, [host.id, ...members.map((m) => m.id)], 30);
    const newT = new Date(Date.now() + 40 * 3600_000).toISOString();
    r = await app.inject({ method: 'POST', url: `/v1/spots/${s}/reschedule`, headers: hdr(host.tok), payload: { newStartsAt: newT } });
    expect(r.json().proposal).toBe('pending');
    // second proposal blocked
    r = await app.inject({ method: 'POST', url: `/v1/spots/${s}/reschedule`, headers: hdr(host.tok), payload: { newStartsAt: newT } });
    expect(r.statusCode).toBe(409);
    // member 1 accepts → waiting on 1
    r = await app.inject({ method: 'POST', url: `/v1/spots/${s}/reschedule/respond`, headers: hdr(members[0].tok), payload: { accept: true } });
    expect(r.json().waitingOn).toBe(1);
    // member 2 accepts → applied
    r = await app.inject({ method: 'POST', url: `/v1/spots/${s}/reschedule/respond`, headers: hdr(members[1].tok), payload: { accept: true } });
    expect(r.json().applied).toBe(true);
    let sp = await pool.query(`select starts_at from spots where id=$1`, [s]);
    expect(new Date(sp.rows[0].starts_at).toISOString()).toBe(newT);
    // reject path: new spot, decline → rejected + host tap event
    const s2 = await mkSpot(host.tok); await forceConfirmed(s2, [host.id, ...members.map((m) => m.id)], 30);
    await app.inject({ method: 'POST', url: `/v1/spots/${s2}/reschedule`, headers: hdr(host.tok), payload: { newStartsAt: new Date(Date.now() + 40 * 3600_000).toISOString() } });
    r = await app.inject({ method: 'POST', url: `/v1/spots/${s2}/reschedule/respond`, headers: hdr(members[0].tok), payload: { accept: false } });
    expect(r.json().rejected).toBe(true);
    const tap = await pool.query(`select weight from score_events where spot_id=$1 and type='reschedule_reject'`, [s2]);
    expect(Number(tap.rows[0].weight)).toBe(0.75);
    // original time kept
    sp = await pool.query(`select starts_at from spots where id=$1`, [s2]);
    expect(new Date(sp.rows[0].starts_at).getTime()).toBeLessThan(Date.now() + 31 * 3600_000);
  });

  it('reschedule majority: 1 of 3 rejects → still applies on 2 accepts; outvoted member leaves free', async () => {
    const host = await mkUser(); const m = [await mkUser(), await mkUser(), await mkUser()];
    const s = await mkSpot(host.tok); await forceConfirmed(s, [host.id, ...m.map((x) => x.id)], 30);
    await app.inject({ method: 'POST', url: `/v1/spots/${s}/reschedule`, headers: hdr(host.tok), payload: { newStartsAt: new Date(Date.now() + 40 * 3600_000).toISOString() } });
    let r = await app.inject({ method: 'POST', url: `/v1/spots/${s}/reschedule/respond`, headers: hdr(m[0].tok), payload: { accept: false } });
    expect(r.json().rejected).toBeUndefined(); // one voice can't veto
    await app.inject({ method: 'POST', url: `/v1/spots/${s}/reschedule/respond`, headers: hdr(m[1].tok), payload: { accept: true } });
    r = await app.inject({ method: 'POST', url: `/v1/spots/${s}/reschedule/respond`, headers: hdr(m[2].tok), payload: { accept: true } });
    expect(r.json().applied).toBe(true);
    r = await app.inject({ method: 'POST', url: `/v1/spots/${s}/bail`, headers: hdr(m[0].tok) });
    expect(r.statusCode).toBe(200);
    const ev = await pool.query(`select 1 from score_events where spot_id=$1 and user_id=$2`, [s, m[0].id]);
    expect(ev.rowCount).toBe(0); // free exit
  });

  it('handover: broadcast, first member accepts and inherits; expired → dissolved + host_cancel', async () => {
    const host = await mkUser(); const members = [await mkUser(), await mkUser()];
    const s = await mkSpot(host.tok); await forceConfirmed(s, [host.id, ...members.map((m) => m.id)], 30);
    let r = await app.inject({ method: 'POST', url: `/v1/spots/${s}/handover`, headers: hdr(host.tok), payload: {} });
    expect(r.json().handover).toBe('pending');
    // non-member cannot accept
    const stranger = await mkUser();
    r = await app.inject({ method: 'POST', url: `/v1/spots/${s}/handover/accept`, headers: hdr(stranger.tok) });
    expect(r.statusCode).toBe(403); // not a member
    // member accepts → swap
    r = await app.inject({ method: 'POST', url: `/v1/spots/${s}/handover/accept`, headers: hdr(members[0].tok) });
    expect(r.json().handover).toBe('accepted');
    const sp = await pool.query(`select host_user_id from spots where id=$1`, [s]);
    expect(sp.rows[0].host_user_id).toBe(members[0].id);
    const roles = await pool.query(`select role from spot_members where spot_id=$1 and user_id=$2`, [s, host.id]);
    expect(roles.rows[0].role).toBe('member');
    // expiry path
    const s2 = await mkSpot(host.tok); await forceConfirmed(s2, [host.id, members[0].id], 30);
    await app.inject({ method: 'POST', url: `/v1/spots/${s2}/handover`, headers: hdr(host.tok), payload: {} });
    await pool.query(`update handovers set expires_at = now() - interval '1 hour' where spot_id=$1`, [s2]);
    await app.inject({ method: 'POST', url: '/v1/internal/spot-sweep', headers: hdr((await mkUser(true)).tok) });
    const sp2 = await pool.query(`select state from spots where id=$1`, [s2]);
    expect(sp2.rows[0].state).toBe('dissolved');
    const hc = await pool.query(`select 1 from score_events where spot_id=$1 and type='host_cancel'`, [s2]);
    expect(hc.rows.length).toBe(1);
  });

  it('enforcement gates: 2 no-shows → apply blocked 403, open join OK; paused blocks join too', async () => {
    const host = await mkUser(); const flake = await mkUser(); const ok = await mkUser();
    // application spot
    const s = await mkSpot(host.tok);
    await pool.query(`update spots set join_mode='application' where id=$1`, [s]);
    // give flake 2 no_shows in 30d
    for (let i = 0; i < 2; i++) await pool.query(`insert into score_events (user_id, type, weight) values ($1, 'no_show', 0)`, [flake.id]);
    let r = await app.inject({ method: 'POST', url: `/v1/spots/${s}/apply`, headers: hdr(flake.tok), payload: {} });
    expect(r.statusCode).toBe(403); // cooldown
    expect(r.json().problem.title).toContain('cooling');
    // open join still allowed during cooldown
    const s2 = await mkSpot(host.tok); // open mode
    r = await app.inject({ method: 'POST', url: `/v1/spots/${s2}/join`, headers: hdr(flake.tok) });
    expect(r.statusCode).toBe(200);
    // 3rd no-show → paused → join blocked
    await pool.query(`insert into score_events (user_id, type, weight) values ($1, 'no_show', 0)`, [flake.id]);
    const s3 = await mkSpot(host.tok);
    r = await app.inject({ method: 'POST', url: `/v1/spots/${s3}/join`, headers: hdr(flake.tok) });
    expect(r.statusCode).toBe(403);
    // clean user unaffected
    r = await app.inject({ method: 'POST', url: `/v1/spots/${s3}/join`, headers: hdr(ok.tok) });
    expect(r.statusCode).toBe(200);
    // hosting paused blocks spot creation
    r = await app.inject({ method: 'POST', url: '/v1/spots/events', headers: hdr(flake.tok), payload: { template: 'dinner', name: 'nope spot', joinMode: 'open', districtId, minHeadcount: 2, maxHeadcount: 5, dateStart: '2026-12-20T12:00:00Z', dateEnd: '2026-12-20T15:00:00Z' } });
    expect(r.statusCode).toBe(403);
  });

  it('hearts: 5/day cap, hearts received tally + flair', async () => {
    const u = [await mkUser(), await mkUser()];
    // chat room via direct insert
    const room = (await pool.query(`insert into rooms (kind) values ('chat') returning id`)).rows[0].id;
    for (const x of u) await pool.query(`insert into room_members (room_id, user_id) values ($1, $2)`, [room, x.id]);
    const msgs = [];
    for (let i = 0; i < 6; i++) {
      const m = (await pool.query(`insert into messages (room_id, user_id, body) values ($1, $2, $3) returning id`, [room, u[1].id, 'msg ' + i])).rows[0].id;
      msgs.push(m);
    }
    let r: { statusCode: number; json(): { hearted?: boolean; hearts?: number } };
    for (let i = 0; i < 5; i++) {
      r = await app.inject({ method: 'POST', url: `/v1/rooms/${room}/messages/${msgs[i]}/react`, headers: hdr(u[0].tok) });
      expect(r.statusCode).toBe(200);
    }
    r = await app.inject({ method: 'POST', url: `/v1/rooms/${room}/messages/${msgs[5]}/react`, headers: hdr(u[0].tok) });
    expect(r.statusCode).toBe(429); // cap
    const h = await app.inject({ method: 'GET', url: '/v1/me/hearts', headers: hdr(u[1].tok) });
    expect(h.json().hearts).toBe(5);
    expect(h.json().flair).toBeNull(); // flair starts at 10
  });

  it('streak counts consecutive attended weeks; conduct chip from moderation actions', async () => {
    const u = await mkUser();
    // 3 straight weeks of attended events (weeks relative to most recent Monday HKT)
    const base = Date.now();
    for (let w = 0; w < 3; w++) {
      await pool.query(`insert into score_events (user_id, type, weight, created_at) values ($1, 'attended', 1, to_timestamp($2))`, [u.id, ((base - w * 7 * 86400_000 - 2 * 86400_000) / 1000)]);
    }
    const st = await app.inject({ method: 'GET', url: '/v1/me/streak', headers: hdr(u.tok) });
    expect(st.json().streakWeeks).toBeGreaterThanOrEqual(2);
    // conduct: clean by default
    const c = await app.inject({ method: 'GET', url: '/v1/me/conduct', headers: hdr(u.tok) });
    expect(c.json().chip).toBe('clean');
    // appeal 1/30d
    const ap = await app.inject({ method: 'POST', url: '/v1/me/appeal', headers: hdr(u.tok), payload: { reason: 'I believe this mute was a mistake, please review' } });
    expect(ap.statusCode).toBe(201);
    const ap2 = await app.inject({ method: 'POST', url: '/v1/me/appeal', headers: hdr(u.tok), payload: { reason: 'Another appeal immediately should be blocked' } });
    expect(ap2.statusCode).toBe(429);
  });
});
