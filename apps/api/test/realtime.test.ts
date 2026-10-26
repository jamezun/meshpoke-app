import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';
import { io, type Socket } from 'socket.io-client';
import { buildApp } from '../src/app.js';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../src/db/schema/index.js';
import { join } from 'node:path';
import pg from 'pg';
import type { FastifyInstance } from 'fastify';

const JWT_SECRET = 'test-secret-test-secret-test-secret-1234';
let infra: TestInfra;
let app: FastifyInstance;
let pool: pg.Pool;
let wsUrl: string;
let u1: string, u2: string, roomId: string;

async function mkToken(sub: string) {
  return new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' }).setSubject(sub)
    .setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(JWT_SECRET));
}

function client(token: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = io(wsUrl, { path: '/ws', auth: { token }, reconnection: false, timeout: 2000 });
    s.once('connect', () => resolve(s));
    s.once('connect_error', (e) => reject(e));
  });
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
  const addr = mock.server.address();
  const port = typeof addr === 'object' && addr !== null ? addr.port : 0;

  app = await buildApp({
    config: {
      NODE_ENV: 'test', PORT: '0', LOG_LEVEL: 'silent', DATABASE_URL: infra.dbUrl, REDIS_URL: infra.redisUrl,
      GOTRUE_URL: `http://127.0.0.1:${port}`, GOTRUE_JWT_SECRET: JWT_SECRET,
      CORS_ORIGINS: 'http://localhost:5173', RATE_LIMIT_MAX: '1000', SENTRY_DSN: '',
      PII_ENCRYPTION_KEY: 'a'.repeat(64), QR_HMAC_SECRET: 'b'.repeat(32),
      ADMIN_BOOTSTRAP_PASSWORD: 'adminpw', ENABLE_SWAGGER: false,
    } as never,
  });
  // real listener for WS upgrade
  await app.listen({ port: 0, host: '127.0.0.1' });
  const a2 = app.server.address();
  const apiPort = typeof a2 === 'object' && a2 !== null ? a2.port : 0;
  wsUrl = `http://127.0.0.1:${apiPort}`;

  // two users (one verified, one not), a room, memberships
  u1 = crypto.randomUUID(); u2 = crypto.randomUUID();
  roomId = crypto.randomUUID();
  await pool.query(`insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state)
             values ($1::uuid, $1::text||'@t.test','email','T1','1995-01-01', left($1::text,8), 'verified'),
                    ($2::uuid, $2::text||'@t.test','email','T2','1995-01-01', left($2::text,8), 'none')`, [u1, u2]);
  await pool.query(`insert into rooms (id, kind) values ($1,'chat')`, [roomId]);
  await pool.query(`insert into room_members (room_id, user_id, role) values ($1,$2,'member')`, [roomId, u1]);
  await pool.query(`insert into room_members (room_id, user_id, role) values ($1,$2,'member')`, [roomId, u2]);
}, 200_000);

afterAll(async () => {
  await app.close();
  await pool.end();
  await stopInfra();
});

function send(s: Socket, ev: string, payload: unknown): Promise<unknown> {
  return new Promise((resolve) => s.emit(ev, payload, resolve));
}

describe('realtime gateway (T7.1)', () => {
  it('rejects unauthenticated handshake', async () => {
    await expect(client('garbage')).rejects.toThrow();
  });

  it('two clients exchange messages; unauthorised join rejected', async () => {
    const s1 = await client(await mkToken(u1));
    const s2 = await client(await mkToken(u2));

    const join1 = await send(s1, 'room:join', roomId);
    expect(join1).toMatchObject({ ok: true, verified: true });
    const join2a = await send(s2, 'room:join', roomId);
    expect(join2a).toMatchObject({ ok: true });

    const outsider = await client(await mkToken(crypto.randomUUID()));
    const denied = await send(outsider, 'room:join', roomId);
    expect(denied).toMatchObject({ ok: false, error: 'not_a_member' });

    const got = new Promise<unknown>((r) => s2.once('message:new', r));
    const ack = await send(s1, 'message:send', { roomId, body: 'hello mesh' });
    expect(ack).toMatchObject({ ok: true });
    const msg = (await got) as { body: string; senderId: string };
    expect(msg.body).toBe('hello mesh');
    expect(msg.senderId).toBe(u1);

    // unverified member: can join, cannot post (server-enforced)
    const join2 = await send(s2, 'room:join', roomId);
    expect(join2).toMatchObject({ ok: true, verified: false });
    const ack2 = await send(s2, 'message:send', { roomId, body: 'should fail' });
    expect(ack2).toMatchObject({ ok: false, error: 'phone_not_verified' });

    s1.disconnect(); s2.disconnect(); outsider.disconnect();
  });

  it('persists messages (offline catch-up via REST)', async () => {
    const s1 = await client(await mkToken(u1));
    await send(s1, 'room:join', roomId);
    await send(s1, 'message:send', { roomId, body: 'persisted one' });
    const res = await pool.query(`select body from messages where room_id = $1 order by created_at`, [roomId]);
    expect(res.rows.map((r) => r.body)).toContain('persisted one');
    s1.disconnect();
  });
});
