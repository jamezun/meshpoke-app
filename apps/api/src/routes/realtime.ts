/**
 * Realtime gateway (T7.1): Socket.io on /ws with JWT handshake auth,
 * Redis adapter, room join authz (DB membership), presence counts,
 * message persistence + delivery ack, typing.
 */
import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { jwtVerify } from 'jose';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';

export async function registerRealtime(app: FastifyInstance, dbUrl: string, redisUrl: string, goTrueSecret: string) {
  const db = getDb(dbUrl);
  const io = new Server(app.server, { path: '/ws', cors: { origin: true, credentials: true } });
  const { Redis } = await import('ioredis');
  const sub = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
  const pub = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
  io.adapter(createAdapter(pub, sub));
  app.decorate('io', io);

  const secret = new TextEncoder().encode(goTrueSecret);

  // membership + posting gates — one query per join
  async function roomAccess(userId: string, roomId: string) {
    const res = await db.execute(sql`
      select rm.room_id is not null as member,
             exists (select 1 from users u where u.id = ${userId} and u.deleted_at is null) as alive,
             (select liveness_state::text from users u where u.id = ${userId}) as liveness,
             r.kind::text as room_kind
        from rooms r
        left join room_members rm on rm.room_id = r.id and rm.user_id = ${userId}
       where r.id = ${roomId}`);
    const row = (res as unknown as { rows: Record<string, unknown>[] }).rows[0];
    if (!row) return { exists: false } as const;
    const verified = row.liveness === 'verified';
    return { exists: true, member: row.member === true, verified } as const;
  }

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('unauthorized'));
    try {
      const { payload } = await jwtVerify(token, secret);
      socket.data.userId = payload.sub as string;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;

    socket.on('room:join', async (roomId: string, ack?: (r: unknown) => void) => {
      const a = await roomAccess(userId, roomId);
      if (!a.exists || !a.member) return ack?.({ ok: false, error: 'not_a_member' });
      await socket.join(roomId);
      ack?.({ ok: true, verified: a.verified, presence: io.sockets.adapter.rooms.get(roomId)?.size ?? 1 });
      socket.to(roomId).emit('presence', { roomId, count: io.sockets.adapter.rooms.get(roomId)?.size ?? 1 });
    });

    socket.on('room:leave', async (roomId: string) => {
      await socket.leave(roomId);
      const n = io.sockets.adapter.rooms.get(roomId)?.size ?? 0;
      socket.to(roomId).emit('presence', { roomId, count: n });
    });

    socket.on('typing', (roomId: string, isTyping: boolean) => {
      socket.to(roomId).emit('typing', { roomId, userId, isTyping });
    });

    socket.on('message:send', async (p: { roomId: string; body: string; clientMsgId?: string }, ack?: (r: unknown) => void) => {
      const fail = (error: string) => ack?.({ ok: false, error });
      try {
        if (typeof p?.body !== 'string' || p.body.length === 0 || p.body.length > 2000) return fail('bad_body');
        const a = await roomAccess(userId, p.roomId);
        if (!a.exists || !a.member) return fail('not_a_member');
        if (!a.verified) return fail('phone_not_verified'); // server-enforced posting gate (T7.2)
        const res = await db.execute(sql`
          insert into messages (room_id, user_id, body)
          values (${p.roomId}, ${userId}, ${p.body})
          returning id, created_at`);
        const row = (res as unknown as { rows: Record<string, unknown>[] }).rows[0];
        const msg = { id: row.id, roomId: p.roomId, senderId: userId, body: p.body, createdAt: row.created_at };
        io.to(p.roomId).emit('message:new', msg);
        ack?.({ ok: true, id: row.id, createdAt: row.created_at });
      } catch (e) {
        app.log.error(e, 'message:send failed');
        fail('server_error');
      }
    });
  });

  app.addHook('onClose', async () => {
    io.close();
    sub.disconnect();
    pub.disconnect();
  });

  return io;
}
