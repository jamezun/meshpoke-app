import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { join } from 'node:path';
import { SignJWT } from 'jose';
import { buildApp } from '../src/app.js';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import * as schema from '../src/db/schema/index.js';
import { resolveProfileView, type ViewContext } from '../src/photoAccess.js';

const JWT_SECRET = 'test-secret-test-secret-test-secret!';

let infra: TestInfra | null = null;
let pool: pg.Pool | null = null;
let app: Awaited<ReturnType<typeof buildApp>> | null = null;
let viewer: { id: string; headers: Record<string, string> };
let subject: { id: string; headers: Record<string, string> };
let spotId = '';
let roomId = '';

const fakeStorage = {
  async presignPut(key: string) { return `https://fake-r2/${key}?sig=put`; },
  async presignGet(key: string) { return `https://fake-r2/${key}?sig=get`; },
  async get() { return null; },
  async put() {},
  async del() {},
};

async function mkToken(sub: string) {
  return new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' }).setSubject(sub)
    .setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(JWT_SECRET));
}

async function onboard() {
  const id = crypto.randomUUID();
  const headers = { authorization: `Bearer ${await mkToken(id)}` };
  await app!.inject({ method: 'POST', url: '/v1/me/onboard', headers, payload: { date_of_birth: '1995-01-01' } });
  return { id, headers };
}

type Rel = 'strangers' | 'connected' | 'blocked' | 'event_both_attended' | 'event_only_viewer';

async function setupRelation(rel: Rel) {
  // reset edges between viewer/subject
  await pool!.query(`DELETE FROM connections WHERE (user_a = $1 AND user_b = $2) OR (user_a = $2 AND user_b = $1)`, [viewer.id, subject.id]);
  await pool!.query(`DELETE FROM blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`, [viewer.id, subject.id]);
  await pool!.query(`DELETE FROM attendance WHERE spot_id = $1`, [spotId]);
  if (rel === 'connected') {
    await pool!.query(
      `INSERT INTO connections (user_a, user_b, active) VALUES (least($1::uuid,$2::uuid), greatest($1::uuid,$2::uuid), true)
       ON CONFLICT DO NOTHING`,
      [viewer.id, subject.id],
    );
  }
  if (rel === 'blocked') {
    await pool!.query(`INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)`, [subject.id, viewer.id]);
  }
  if (rel === 'event_both_attended') {
    await pool!.query(
      `INSERT INTO attendance (spot_id, user_id, status) VALUES ($1,$2,'attended'),($1,$3,'attended')`,
      [spotId, viewer.id, subject.id],
    );
  }
  if (rel === 'event_only_viewer') {
    await pool!.query(`INSERT INTO attendance (spot_id, user_id, status) VALUES ($1,$2,'attended')`, [spotId, viewer.id]);
  }
}

// ── THE MATRIX (PRD §3.1) — launch gate ─────────────────────────
// rows: context; cols: relationship → expected level
const MATRIX: Record<ViewContext, Partial<Record<Rel, string>>> = {
  map:          { strangers: 'none', connected: 'none', event_both_attended: 'none', event_only_viewer: 'none' },
  spot_card:    { strangers: 'sketch', connected: 'sketch', event_both_attended: 'sketch' },
  queue:        { strangers: 'sketch', connected: 'sketch' },
  inbox:        { strangers: 'sketch', connected: 'sketch' },
  chat_room:    { strangers: 'primary', connected: 'full' },
  event_room:   { strangers: 'primary', connected: 'full' },
  event_done:   { strangers: 'primary', event_only_viewer: 'primary', event_both_attended: 'full' },
  profile:      { strangers: 'sketch', connected: 'full', event_both_attended: 'sketch' },
};
// blocked overrides everything → 'none' in all contexts

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
  const port = (mock.server.address() as { port: number }).port;

  app = await buildApp({
    config: {
      NODE_ENV: 'test', PORT: '0', LOG_LEVEL: 'silent', DATABASE_URL: infra.dbUrl, REDIS_URL: infra.redisUrl,
      GOTRUE_URL: `http://127.0.0.1:${port}`, GOTRUE_JWT_SECRET: JWT_SECRET, CORS_ORIGINS: 'http://localhost:5173',
      RATE_LIMIT_MAX: '1000', SENTRY_DSN: '', PII_ENCRYPTION_KEY: 'a'.repeat(64), QR_HMAC_SECRET: 'b'.repeat(32),
      ADMIN_BOOTSTRAP_PASSWORD: 'adminpw', ENABLE_SWAGGER: false,
    } as never,
  });
  const { registerUsers } = await import('../src/routes/users.js');
  await app.register((instance) => registerUsers(instance as never, infra!.dbUrl, fakeStorage), { prefix: '/v1' });

  viewer = await onboard();
  subject = await onboard();
  // subject has photos + hide flag off
  await pool!.query(
    `UPDATE profiles SET photos = '[{"n":1,"key":"users/x/photos/1.jpg","thumbKey":"users/x/photos/1_t.jpg"},{"n":2,"key":"users/x/photos/2.jpg","thumbKey":"users/x/photos/2_t.jpg"}]'::jsonb WHERE user_id = $1`,
    [subject.id],
  );
  // a spot for event contexts
  const r = await pool!.query(
    `INSERT INTO spots (kind, name, template, join_mode, state, min_headcount, max_headcount, host_user_id)
     VALUES ('event','Test dinner','dinner','application','done',2,6,$1) RETURNING id`,
    [viewer.id],
  );
  spotId = r.rows[0].id;
  // subject is a co-member of the spot; a shared chat room exists for chat_room context
  await pool!.query(
    `INSERT INTO spot_members (spot_id, user_id, role, state) VALUES ($1,$2,'host','active'),($1,$3,'member','active')`,
    [spotId, viewer.id, subject.id],
  );
  const room = await pool!.query(
    `INSERT INTO rooms (kind) VALUES ('chat') RETURNING id`);
  roomId = room.rows[0].id;
  await pool!.query(
    `INSERT INTO room_members (room_id, user_id, role) VALUES ($1,$2,'member'),($1,$3,'member')`,
    [roomId, viewer.id, subject.id],
  );
});

afterAll(async () => {
  await app?.close();
  await pool?.end();
  await stopInfra();
});

describe('T3.3 photo ladder — FULL MATRIX (launch gate)', () => {
  const rels: Rel[] = ['strangers', 'connected', 'event_both_attended', 'event_only_viewer'];

  for (const [ctx, expectations] of Object.entries(MATRIX) as [ViewContext, Partial<Record<Rel, string>>][]) {
    for (const rel of rels) {
      const expected = expectations[rel];
      if (!expected) continue;
      it(`${ctx} × ${rel} → ${expected}`, async () => {
        await setupRelation(rel);
        const ctxId = ctx === 'chat_room' ? roomId : ctx === 'event_done' || ctx === 'event_room' ? spotId : undefined;
        const access = await resolveProfileView(infra!.dbUrl, viewer.id, subject.id, ctx, ctxId);
        expect(access.level).toBe(expected);
      });
    }
  }

  it('blocked overrides EVERY context → none (404 via API)', async () => {
    await setupRelation('connected'); // even connected
    await pool!.query(`INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)`, [subject.id, viewer.id]);
    for (const ctx of Object.keys(MATRIX) as ViewContext[]) {
      const access = await resolveProfileView(infra!.dbUrl, viewer.id, subject.id, ctx, ctx === 'event_done' ? spotId : undefined);
      expect(access.level, ctx).toBe('none');
    }
    const res = await app!.inject({ method: 'GET', url: `/v1/users/${subject.id}?context=profile`, headers: viewer.headers });
    expect(res.statusCode).toBe(404);
  });

  it('hide_photo_in_rooms: chat_room strangers → sketch instead of primary', async () => {
    await setupRelation('strangers');
    await pool!.query(`UPDATE profiles SET hide_photo_in_rooms = true WHERE user_id = $1`, [subject.id]);
    const access = await resolveProfileView(infra!.dbUrl, viewer.id, subject.id, 'chat_room', roomId);
    expect(access.level).toBe('sketch');
    await pool!.query(`UPDATE profiles SET hide_photo_in_rooms = false WHERE user_id = $1`, [subject.id]);
  });

  it('stranger NOT in the room/spot → sketch even with contextId (server-side membership check)', async () => {
    await setupRelation('strangers');
    await pool!.query(`DELETE FROM room_members WHERE room_id = $1 AND user_id = $2`, [roomId, subject.id]);
    const notInRoom = await resolveProfileView(infra!.dbUrl, viewer.id, subject.id, 'chat_room', roomId);
    expect(notInRoom.level).toBe('sketch');
    await pool!.query(`DELETE FROM spot_members WHERE spot_id = $1 AND user_id = $2`, [spotId, subject.id]);
    const notInSpot = await resolveProfileView(infra!.dbUrl, viewer.id, subject.id, 'event_room', spotId);
    expect(notInSpot.level).toBe('sketch');
    const noCtx = await resolveProfileView(infra!.dbUrl, viewer.id, subject.id, 'event_room');
    expect(noCtx.level).toBe('sketch');
    await pool!.query(`INSERT INTO room_members (room_id, user_id, role) VALUES ($1,$2,'member') ON CONFLICT DO NOTHING`, [roomId, subject.id]);
    await pool!.query(`INSERT INTO spot_members (spot_id, user_id, role, state) VALUES ($1,$2,'member','active') ON CONFLICT DO NOTHING`, [spotId, subject.id]);
  });

  it('API shape: sketch (no photos key), primary (1 photo), full (all photos + prompts + socials)', async () => {
    await setupRelation('connected');
    const sketch = await app!.inject({ method: 'GET', url: `/v1/users/${subject.id}?context=spot_card`, headers: viewer.headers });
    expect(sketch.json().level).toBe('sketch');
    expect(sketch.json().user.photos).toBeUndefined();
    expect(sketch.json().user.socials).toBeUndefined();

    // connected in chat_room → full actually; use event_done w/o attendance for primary:
    await setupRelation('event_only_viewer');
    const prim = await app!.inject({ method: 'GET', url: `/v1/users/${subject.id}?context=event_done&contextId=${spotId}`, headers: viewer.headers });
    expect(prim.json().level).toBe('primary');
    expect(prim.json().user.primary_photo.url).toContain('sig=get');
    expect(prim.json().user.photos).toBeUndefined();

    await setupRelation('connected');
    const full = await app!.inject({ method: 'GET', url: `/v1/users/${subject.id}?context=profile`, headers: viewer.headers });
    expect(full.json().level).toBe('full');
    expect(full.json().user.photos).toHaveLength(2);
    expect('socials' in full.json().user).toBe(true);
  });
});
