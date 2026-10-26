import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client.js';
import { getPlan } from '../entitlements.js';
import { TIER_CAPS } from '@meshpoke/shared/constants';
import { SPOT_RULES } from '@meshpoke/shared';

const rowsOf = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

/** T12.1 crews: keep-the-crew after a done spot, crew room, dormancy. */
export function registerCrews(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);

  const activeCrewCount = async (userId: string) =>
    rowsOf(await db.execute(sql`
      select count(*)::int as n from crew_members cm
       join crews c on c.id = cm.crew_id
       where cm.user_id = ${userId}::uuid
         and (c.dormant_at is null or c.dormant_at > now())`))[0].n as number;

  app.post<{ Params: { id: string }; Body: unknown }>('/spots/:id/crew', { preHandler: [app.authenticate] }, async (req, reply) => {
    const me = req.user!.id;
    const body = z.object({ keep: z.boolean() }).safeParse(req.body);
    if (!body.success || !body.data.keep) return reply.code(422).send({ problem: { title: '{keep:true} required', status: 422 } });

    const spot = rowsOf(await db.execute(sql`
      select id, state, name from spots where id = ${req.params.id}::uuid and kind = 'event'`));
    if (spot.length === 0) return reply.code(404).send({ problem: { title: 'Spot not found', status: 404 } });
    if (spot[0].state !== 'done') return reply.code(422).send({ problem: { title: 'Crews form after the spot is done', status: 422 } });
    const isAttendee = rowsOf(await db.execute(sql`
      select 1 from attendance
       where spot_id = ${req.params.id}::uuid and user_id = ${me}::uuid
         and status in ('attended','forgiven')`));
    if (isAttendee.length === 0) {
      return reply.code(403).send({ problem: { title: 'Attendees only', status: 403 } });
    }

    // find or create the crew for this spot
    let crew = rowsOf(await db.execute(sql`select id from crews where origin_spot_id = ${req.params.id}::uuid`));
    if (crew.length === 0) {
      const plan = await getPlan(dbUrl, me);
      const cap = TIER_CAPS[plan].activeCrews;
      if (await activeCrewCount(me) >= cap) {
        return reply.code(402).send({ problem: { title: 'Crew cap reached', status: 402, type: 'cap', capType: 'activeCrews' } });
      }
      crew = rowsOf(await db.execute(sql`
        insert into crews (origin_spot_id, name)
        select ${req.params.id}::uuid, left(s.name || ' crew', 60) from spots s where s.id = ${req.params.id}::uuid
        returning id`));
      // crew room + first member
      const room = rowsOf(await db.execute(sql`insert into rooms (kind, crew_id) values ('crew', ${crew[0].id}::uuid) returning id`));
      await db.execute(sql`insert into crew_members (crew_id, user_id) values (${crew[0].id}::uuid, ${me}::uuid) on conflict do nothing`);
      await db.execute(sql`insert into room_members (room_id, user_id) values (${room[0].id}::uuid, ${me}::uuid) on conflict do nothing`);
      return reply.code(201).send({ crewId: crew[0].id, roomId: room[0].id, created: true });
    }

    await db.execute(sql`insert into crew_members (crew_id, user_id) values (${crew[0].id}::uuid, ${me}::uuid) on conflict do nothing`);
    const room = rowsOf(await db.execute(sql`select id from rooms where kind = 'crew' and crew_id = ${crew[0].id}::uuid limit 1`));
    if (room.length > 0) await db.execute(sql`insert into room_members (room_id, user_id) values (${room[0].id}::uuid, ${me}::uuid) on conflict do nothing`);
    return { crewId: crew[0].id, roomId: room[0]?.id ?? null, created: false };
  });

  app.get('/crews', { preHandler: [app.authenticate] }, async (req) => {
    const me = req.user!.id;
    const list = rowsOf(await db.execute(sql`
      select c.id, c.origin_spot_id as "originSpotId", c.whatsapp_url as "whatsappUrl", c.dormant_at as "dormantAt",
             s.name as "spotName", (select count(*)::int from crew_members m where m.crew_id = c.id) as members,
             (select r.id from rooms r where r.kind = 'crew' and r.crew_id = c.id limit 1) as "roomId"
        from crew_members cm
        join crews c on c.id = cm.crew_id
        left join spots s on s.id = c.origin_spot_id
       where cm.user_id = ${me}::uuid
       order by c.created_at desc`));
    return { crews: list };
  });

  app.patch<{ Params: { id: string }; Body: unknown }>('/crews/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const me = req.user!.id;
    const body = z.object({ whatsappUrl: z.string().url().max(300).nullable() }).safeParse(req.body);
    if (!body.success) return reply.code(422).send({ problem: { title: 'Invalid URL', status: 422 } });
    const member = rowsOf(await db.execute(sql`
      update crews set whatsapp_url = ${body.data.whatsappUrl}
       where id = ${req.params.id}::uuid
         and exists (select 1 from crew_members where crew_id = ${req.params.id}::uuid and user_id = ${me}::uuid)
       returning id`));
    if (member.length === 0) return reply.code(404).send({ problem: { title: 'Crew not found', status: 404 } });
    return { updated: true };
  });

  app.post<{ Params: { id: string } }>('/crews/:id/leave', { preHandler: [app.authenticate] }, async (req, reply) => {
    const me = req.user!.id;
    const left = rowsOf(await db.execute(sql`
      delete from crew_members where crew_id = ${req.params.id}::uuid and user_id = ${me}::uuid returning crew_id`));
    if (left.length === 0) return reply.code(404).send({ problem: { title: 'Not a member', status: 404 } });
    await db.execute(sql`
      delete from room_members rm using rooms r
       where rm.room_id = r.id and r.kind = 'crew' and r.crew_id = ${req.params.id}::uuid and rm.user_id = ${me}::uuid`);
    return { left: true };
  });

  /** Dormancy sweep: crews with no rebook for 60d go dormant (freed from caps);
   *  a rebook reactivates (dormant_at = null) at finalize time in T12.2. */
  app.post('/internal/crew-sweep', { preHandler: [app.authenticate, app.requireAdminRole('superadmin')] }, async () => {
    const r = rowsOf(await db.execute(sql`
      update crews set dormant_at = now()
       where dormant_at is null
         and created_at < now() - interval '${sql.raw(String(SPOT_RULES.crewDormancyDays))} days'
         and not exists (
           select 1 from rebooks rb
            where rb.crew_id = crews.id
              and rb.created_at > now() - interval '${sql.raw(String(SPOT_RULES.crewDormancyDays))} days')
       returning id`));
    return { dormanted: r.length };
  });
}
