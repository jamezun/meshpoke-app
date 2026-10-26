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
import { messageGuard, checkMsgRate, dmShareAttendedSpot } from '../safety.js';


export async function registerRealtime(app: FastifyInstance, dbUrl: string, redisUrl: string, goTrueSecret: string) {
  // reuse app-level redis for rate limiting
  const db = getDb(dbUrl);
  const io = new Server(app.server, { path: '/ws', cors: { origin: true, credentials: true } });
  const { Redis } = await import('ioredis');
  const sub = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
  const pub = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
  const redis = pub; // rate-limit client
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
    return { exists: true, member: row.member === true, verified, room_kind: String(row.room_kind ?? '') } as const;
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
        // T13.1: latest moderation action mute/suspend → posting disabled pending review
        const mod = (await db.execute(sql`
          select action from moderation_actions where target_user = ${userId}::uuid
           order by created_at desc limit 1`)) as unknown as { rows: { action: string }[] };
        if (mod.rows[0] && (mod.rows[0].action === 'mute' || mod.rows[0].action === 'suspend')) {
          return fail('muted_pending_review');
        }
        if (!(await checkMsgRate(redis, userId))) return fail('rate_limited'); // T7.3: 20/min
        const guard = messageGuard(a.verified, p.body); // T7.3: link/handle flags
        if (!guard.ok) return fail(guard.error);
        // T11.3 DM link lock: links/handles only between users who shared a spot
        if (a.room_kind === 'dm' && (guard.flags['link-detected'] || guard.flags['handle-detected'])) {
          const other = (await db.execute(sql`
            select rm.user_id from room_members rm
             where rm.room_id = ${p.roomId}::uuid and rm.user_id <> ${userId}::uuid and rm.left_at is null
             limit 1`)) as unknown as { rows: { user_id: string }[] };
          if (other.rows.length === 0 || !(await dmShareAttendedSpot(db, userId, other.rows[0].user_id))) {
            return fail('dm_link_locked');
          }
        }
        const res = await db.execute(sql`
          insert into messages (room_id, user_id, body, flags)
          values (${p.roomId}, ${userId}, ${p.body}, ${JSON.stringify(guard.flags)}::jsonb)
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
