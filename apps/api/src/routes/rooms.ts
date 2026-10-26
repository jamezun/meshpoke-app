/**
 * Rooms & chat spots (T7.2): join/leave with cap check, chat spot creation,
 * room lists, message history, member rail with photo ladder (chat_room context).
 * Posting gates verified server-side on WS (T7.1) and here on REST.
 */
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { getPlan } from '../entitlements.js';
import { resolveProfileView } from '../photoAccess.js';

export function registerRooms(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);

  app.get('/rooms', { preHandler: [app.authenticate] }, async (req) => {
    const res = await db.execute(sql`
      select r.id, r.kind::text as kind, r.spot_id, r.district_id, d.name_en as district,
             (select count(*)::int from room_members x where x.room_id = r.id) as member_count,
             (select m2.body from messages m2 where m2.room_id = r.id order by m2.created_at desc limit 1) as last_message,
             (select m2.created_at from messages m2 where m2.room_id = r.id order by m2.created_at desc limit 1) as last_at
        from room_members rm
        join rooms r on r.id = rm.room_id
        left join districts d on d.id = r.district_id
       where rm.user_id = ${req.user!.id} and rm.left_at is null
       order by coalesce(last_at, rm.joined_at) desc limit 100`);
    return { rooms: (res as unknown as { rows: unknown[] }).rows };
  });

  app.post<{ Params: { id: string } }>('/rooms/:id/join', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user!.id;
    // chat-room cap: active chat/event memberships
    const plan = await getPlan(dbUrl, userId);
    const caps = (await import('@meshpoke/shared/constants')).TIER_CAPS[plan];
    const countRes = await db.execute(sql`
      select count(*)::int as n from room_members rm
        join rooms r on r.id = rm.room_id and r.kind in ('chat','event')
       where rm.user_id = ${userId} and rm.left_at is null`);
    const n = (countRes as unknown as { rows: { n: number }[] }).rows[0].n;
    if (n >= caps.chatRooms) {
      return reply.code(402).send({ problem: { title: 'Room cap reached', status: 402, detail: `Your plan allows ${caps.chatRooms} rooms. Upgrade for more.`, type: 'cap' } });
    }
    const roomRes = await db.execute(sql`select id, kind::text as kind from rooms where id = ${req.params.id}`);
    const room = (roomRes as unknown as { rows: { id: string; kind: string }[] }).rows[0];
    if (!room) return reply.code(404).send({ problem: { title: 'Room not found', status: 404 } });
    if (room.kind === 'dm') return reply.code(403).send({ problem: { title: 'Cannot join a DM room', status: 403 } });
    await db.execute(sql`
      insert into room_members (room_id, user_id, role) values (${room.id}, ${userId}, 'member')
      on conflict (room_id, user_id) do update set left_at = null, joined_at = now()`);
    return { ok: true };
  });

  app.post<{ Params: { id: string } }>('/rooms/:id/leave', { preHandler: [app.authenticate] }, async (req) => {
    await db.execute(sql`update room_members set left_at = now() where room_id = ${req.params.id} and user_id = ${req.user!.id}`);
    return { ok: true };
  });

  // offline catch-up cursor pagination (T7.1 contract)
  app.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    '/rooms/:id/messages',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));
      const member = await db.execute(sql`
        select 1 from room_members where room_id = ${req.params.id} and user_id = ${req.user!.id} and left_at is null`);
      if ((member as unknown as { rows: unknown[] }).rows.length === 0) {
        return reply.code(403).send({ problem: { title: 'Not a member', status: 403 } });
      }
      const res = await db.execute(sql`
        select m.id, m.user_id, m.body, m.created_at,
               (m.created_at > coalesce((select joined_at from room_members where room_id = ${req.params.id} and user_id = ${req.user!.id}), m.created_at)) as before_join
          from messages m
         where m.room_id = ${req.params.id}
           and (${req.query.cursor ?? null}::timestamptz is null or m.created_at < ${req.query.cursor ?? null}::timestamptz)
         order by m.created_at desc limit ${limit}`);
      const rows = (res as unknown as { rows: Record<string, unknown>[] }).rows.reverse();
      return { messages: rows, nextCursor: rows.length === limit ? rows[0].created_at : null };
    },
  );

  // member rail with photo ladder (chat_room context)
  app.get<{ Params: { id: string } }>('/rooms/:id/members', { preHandler: [app.authenticate] }, async (req, reply) => {
    const member = await db.execute(sql`
      select 1 from room_members where room_id = ${req.params.id} and user_id = ${req.user!.id} and left_at is null`);
    if ((member as unknown as { rows: unknown[] }).rows.length === 0) {
      return reply.code(403).send({ problem: { title: 'Not a member', status: 403 } });
    }
    const res = await db.execute(sql`
      select u.id, p.display_name, p.industry, p.role_oneliner, p.photos,
             rm.role::text as room_role
        from room_members rm
        join users u on u.id = rm.user_id and u.deleted_at is null
        left join profiles p on p.user_id = u.id
       where rm.room_id = ${req.params.id} and rm.left_at is null
         and not exists (select 1 from blocks b
             where (b.blocker_id = ${req.user!.id}::uuid and b.blocked_id = rm.user_id)
                or (b.blocker_id = rm.user_id and b.blocked_id = ${req.user!.id}::uuid))
       order by rm.joined_at limit 200`);
    const rows = (res as unknown as { rows: Record<string, unknown>[] }).rows;
    const members = await Promise.all(rows.map(async (r) => {
      const view = await resolveProfileView(dbUrl, req.user!.id, r.id as string, 'chat_room', req.params.id);
      return { ...r, photoAccess: view.level, photos: view.level === 'full' ? r.photos : undefined };
    }));
    return { members };
  });

  // chat spot creation (kind:"chat") — hosting rights via T5.2 hostingCapacity
  app.post<{ Body: { name: string; districtId: string } }>('/spots', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user!.id;
    const { name, districtId } = req.body;
    if (!name?.trim() || name.length > 60) return reply.code(422).send({ problem: { title: 'Invalid name', status: 422 } });
    const alive = await db.execute(sql`select 1 from users where id = ${userId} and deleted_at is null and liveness_state = 'verified'`);
    if ((alive as unknown as { rows: unknown[] }).rows.length === 0) {
      return reply.code(403).send({ problem: { title: 'Phone verification required to host', status: 403 } });
    }
    const cap = await db.execute(sql`select max_active from hosting_capacity where user_id = ${userId}`);
    const maxActive = (cap as unknown as { rows: { max_active: number }[] }).rows[0]?.max_active ?? 1;
    const active = await db.execute(sql`
      select count(*)::int as n from spots s join spot_members m on m.spot_id = s.id and m.user_id = ${userId} and m.role = 'host'
       where s.state is null or s.state in ('forming','confirmed','live')`);
    const n = (active as unknown as { rows: { n: number }[] }).rows[0].n;
    if (n >= maxActive) {
      return reply.code(402).send({ problem: { title: 'Hosting cap reached', status: 402, detail: `Earn a higher Show-up Score to host more spots.`, type: 'cap' } });
    }
    const res = await db.execute(sql`
      with s as (insert into spots (kind, name, join_mode, min_headcount, max_headcount, district_id)
                 values ('chat', ${name.trim()}, 'open', 2, 500, ${districtId}::uuid) returning id),
           r as (insert into rooms (kind, spot_id) select 'chat', id from s returning id)
      insert into spot_members (spot_id, user_id, role) select id, ${userId}, 'host' from s returning spot_id`);
    const spotId = (res as unknown as { rows: { spot_id: string }[] }).rows[0].spot_id;
    await db.execute(sql`insert into room_members (room_id, user_id, role) select id, ${userId}, 'host' from rooms where spot_id = ${spotId} on conflict do nothing`);
    return { spotId };
  });
}
