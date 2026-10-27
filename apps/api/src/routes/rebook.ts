import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client.js';
import { notify } from '../notify.js';
import { getPlan } from '../entitlements.js';
import { TIER_CAPS } from '@meshpoke/shared/constants';

const rowsOf = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

/** T12.2 rebook: date poll → finalize → new event spot with crew pre-attached. */
export function registerRebook(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);

  const crewOf = async (crewId: string, userId: string) =>
    rowsOf(await db.execute(sql`
      select c.id, c.dormant_at, c.origin_spot_id, o.name as "spotName", o.template, o.venue_id, o.district_id,
             o.min_headcount, o.max_headcount, o.overbook_buffer
        from crews c
        join spots o on o.id = c.origin_spot_id
       where c.id = ${crewId}::uuid
         and exists (select 1 from crew_members m where m.crew_id = c.id and m.user_id = ${userId}::uuid)`));

  app.post<{ Params: { id: string }; Body: unknown }>('/crews/:id/rebook', { preHandler: [app.authenticate] }, async (req, reply) => {
    const me = req.user!.id;
    const body = z.object({
      pollOptions: z.array(z.string().datetime()).min(2).max(5),
      venueId: z.string().uuid().optional(), // may move venue
    }).safeParse(req.body);
    if (!body.success) return reply.code(422).send({ problem: { title: 'pollOptions: 2–5 ISO dates', status: 422 } });

    const crew = await crewOf(req.params.id, me);
    if (crew.length === 0) return reply.code(404).send({ problem: { title: 'Crew not found', status: 404 } });

    // hosting rights: capacity ladder (hosting_capacity) + active hosted spots cap
    const cap = rowsOf(await db.execute(sql`select max_active from hosting_capacity where user_id = ${me}::uuid`));
    const maxActive = (cap[0]?.max_active as number | undefined) ?? 1;
    const hosting = rowsOf(await db.execute(sql`
      select count(*)::int as n from spots
       where host_user_id = ${me}::uuid and kind = 'event'
         and (state is null or state in ('forming','confirmed','live'))`))[0].n as number;
    if (hosting >= maxActive) return reply.code(402).send({ problem: { title: 'Hosting capacity reached', status: 402, type: 'cap', capType: 'hosting' } });

    const plan = await getPlan(dbUrl, me);
    const planCap = TIER_CAPS[plan].activeEventSpots;
    if (hosting >= planCap) return reply.code(402).send({ problem: { title: 'Plan event cap reached', status: 402, type: 'cap', capType: 'activeEventSpots' } });

    // open poll
    const r = rowsOf(await db.execute(sql`
      insert into rebooks (crew_id, poll_options, created_by)
      values (${req.params.id}::uuid, ${JSON.stringify(body.data.pollOptions)}::jsonb, ${me}::uuid)
      returning id, created_at as "createdAt"`));
    // rebook activity counts: reset dormancy marker (reactivation)
    await db.execute(sql`update crews set dormant_at = null where id = ${req.params.id}::uuid`);
    // T14.1: crew poll → notify other members
    const crewMates = rowsOf(await db.execute(sql`
      select user_id from crew_members where crew_id = ${req.params.id}::uuid and user_id <> ${me}::uuid`));
    for (const m of crewMates) {
      await notify(dbUrl, String(m.user_id), 'crews', 'crew_poll', { crewId: req.params.id, rebookId: r[0].id });
    }
    return reply.code(201).send({ rebookId: r[0].id, pollOptions: body.data.pollOptions });
  });

  app.get<{ Params: { id: string } }>('/crews/:id/rebooks', { preHandler: [app.authenticate] }, async (req, reply) => {
    const crew = await crewOf(req.params.id, req.user!.id);
    if (crew.length === 0) return reply.code(404).send({ problem: { title: 'Crew not found', status: 404 } });
    const list = rowsOf(await db.execute(sql`
      select id, poll_options as "pollOptions", votes, new_spot_id as "newSpotId", created_at as "createdAt"
        from rebooks where crew_id = ${req.params.id}::uuid order by created_at desc`));
    return { rebooks: list };
  });

  app.post<{ Params: { id: string }; Body: unknown }>('/rebooks/:id/vote', { preHandler: [app.authenticate] }, async (req, reply) => {
    const me = req.user!.id;
    const body = z.object({ option: z.string().datetime() }).safeParse(req.body);
    if (!body.success) return reply.code(422).send({ problem: { title: 'Invalid option', status: 422 } });
    const rb = rowsOf(await db.execute(sql`
      select rb.id, rb.crew_id, rb.poll_options as opts, rb.votes, rb.new_spot_id
        from rebooks rb
        join crew_members m on m.crew_id = rb.crew_id
       where rb.id = ${req.params.id}::uuid and m.user_id = ${me}::uuid`));
    if (rb.length === 0) return reply.code(404).send({ problem: { title: 'Rebook not found', status: 404 } });
    const poll = (rb[0].opts as string[]) ?? [];
    if (!poll.includes(body.data.option)) return reply.code(422).send({ problem: { title: 'Option not in poll', status: 422 } });
    const votes = { ...((rb[0].votes as Record<string, string[]>) ?? {}), [body.data.option]: [
      ...new Set([...(((rb[0].votes as Record<string, string[]>) ?? {})[body.data.option] ?? []), me]),
    ] };
    await db.execute(sql`update rebooks set votes = ${JSON.stringify(votes)}::jsonb where id = ${req.params.id}::uuid`);
    return { votes };
  });

  app.post<{ Params: { id: string }; Body: unknown }>('/rebooks/:id/finalize', { preHandler: [app.authenticate] }, async (req, reply) => {
    const me = req.user!.id;
    const body = z.object({ startsAt: z.string().datetime(), publicSeats: z.number().int().min(0).max(10).default(0) }).safeParse(req.body);
    if (!body.success) return reply.code(422).send({ problem: { title: 'startsAt required', status: 422 } });

    const rb = rowsOf(await db.execute(sql`
      select rb.id, rb.crew_id, rb.created_by, rb.poll_options, rb.new_spot_id, c.origin_spot_id
        from rebooks rb join crews c on c.id = rb.crew_id
       where rb.id = ${req.params.id}::uuid`));
    if (rb.length === 0) return reply.code(404).send({ problem: { title: 'Rebook not found', status: 404 } });
    if (rb[0].created_by !== me) return reply.code(403).send({ problem: { title: 'Poll creator only', status: 403 } });
    if (rb[0].new_spot_id) return reply.code(409).send({ problem: { title: 'Already finalized', status: 409 } });

    const origin = rowsOf(await db.execute(sql`
      select name, template, venue_id, district_id, min_headcount, max_headcount, overbook_buffer
        from spots where id = ${rb[0].origin_spot_id}::uuid`))[0];
    const crewMembers = rowsOf(await db.execute(sql`select user_id from crew_members where crew_id = ${rb[0].crew_id}::uuid`));

    const startsAt = new Date(body.data.startsAt);
    const dateRange = `[${startsAt.toISOString()}, ${(new Date(startsAt.getTime() + 86400000)).toISOString()}]`;
    const maxHead = Math.max(2, crewMembers.length + body.data.publicSeats);

    // create event spot (same template + venue), creator hosts
    const spot = rowsOf(await db.execute(sql`
      insert into spots (kind, host_user_id, template, name, required_keywords, min_score, price_range, join_mode,
                         district_id, venue_id, min_headcount, max_headcount, overbook_buffer, date_range, state, starts_at)
      values ('event', ${me}::uuid, ${origin.template}::spot_template,
              left('Rebook: ' || ${origin.name}::text, 60), '{}', 0, null, 'application',
              ${origin.district_id}::uuid, ${origin.venue_id ?? null}::uuid,
              ${origin.min_headcount}, ${maxHead}, ${origin.overbook_buffer},
              ${dateRange}::text, 'forming', ${startsAt.toISOString()}::timestamptz)
      returning id`));
    const spotId = spot[0].id as string;
    const room = rowsOf(await db.execute(sql`insert into rooms (kind, spot_id) values ('event', ${spotId}::uuid) returning id`));
    await db.execute(sql`insert into spot_members (spot_id, user_id, role) values (${spotId}::uuid, ${me}::uuid, 'host')`);
    await db.execute(sql`insert into room_members (room_id, user_id) values (${room[0].id}::uuid, ${me}::uuid)`);
    // crew members pre-invited as applications they can confirm (host still accepts)
    for (const m of crewMembers) {
      if (m.user_id === me) continue;
      await db.execute(sql`
        insert into applications (spot_id, user_id, note, status)
        values (${spotId}::uuid, ${m.user_id}::uuid, 'crew rebook', 'accepted')`);
      await db.execute(sql`insert into spot_members (spot_id, user_id, role) values (${spotId}::uuid, ${m.user_id}::uuid, 'member')`);
      await db.execute(sql`insert into room_members (room_id, user_id) values (${room[0].id}::uuid, ${m.user_id}::uuid)`);
    }
    await db.execute(sql`update rebooks set new_spot_id = ${spotId}::uuid where id = ${req.params.id}::uuid`);
    await db.execute(sql`update crews set dormant_at = null where id = ${rb[0].crew_id}::uuid`);
    return reply.code(201).send({ spotId, members: crewMembers.length, publicSeats: body.data.publicSeats });
  });
}
