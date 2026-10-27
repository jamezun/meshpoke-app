/// T9.4: application decisions, date-on-fill scheduling, confirm/bail,
/// state transitions + jobs (dissolve, confirmed→live→done), host cancel.
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client.js';
import { notify } from '../notify.js';
import { SPOT_RULES } from '@meshpoke/shared/constants';

const Decision = z.object({
  decision: z.enum(['accept', 'waitlist', 'decline']),
  reason: z.enum(['min_score', 'keywords', 'full', 'vibe', 'other']).optional(),
  note: z.string().trim().max(200).optional(),
});
const Schedule = z.object({
  startsAt: z.string().datetime(),
  venueId: z.string().uuid(),
  groupDropId: z.string().uuid().optional(),
});

export function registerSpotLifecycle(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);
  const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

  async function isHost(spotId: string, userId: string): Promise<boolean> {
    const r = rows(await db.execute(sql`select 1 from spot_members where spot_id = ${spotId}::uuid and user_id = ${userId} and role = 'host' and state = 'active'`));
    return r.length > 0;
  }

  // host decision on an application
  app.post<{ Params: { id: string }; Body: unknown }>('/applications/:id/decision', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user!.id;
    const parsed = Decision.safeParse(req.body);
    if (!parsed.success) return reply.code(422).send({ problem: { title: 'Invalid decision', status: 422 } });
    const appRow = rows(await db.execute(sql`select a.id, a.spot_id, a.user_id, a.status, s.state, s.join_mode, s.max_headcount, s.overbook_buffer
        from applications a join spots s on s.id = a.spot_id where a.id = ${req.params.id}::uuid`));
    if (appRow.length === 0) return reply.code(404).send({ problem: { title: 'Application not found', status: 404 } });
    const a = appRow[0];
    if (!(await isHost(String(a.spot_id), userId))) return reply.code(403).send({ problem: { title: 'Host only', status: 403 } });
    if (a.status !== 'pending') return reply.code(409).send({ problem: { title: `Application already ${a.status}`, status: 409 } });
    if (a.state !== 'forming') return reply.code(422).send({ problem: { title: `Spot is ${a.state}`, status: 422 } });

    const status = parsed.data.decision === 'accept' ? 'accepted' : parsed.data.decision === 'decline' ? 'declined' : parsed.data.decision;
    const declineReason = status === 'declined'
      ? (parsed.data.note ? `${parsed.data.reason ?? 'other'}: ${parsed.data.note}` : (parsed.data.reason ?? 'other'))
      : null;
    // capacity check for accept
    if (status === 'accepted') {
      const members = rows(await db.execute(sql`select count(*)::int as n from spot_members where spot_id = ${a.spot_id}::uuid and state = 'active' and role in ('host','member')`));
      const cap = (a.max_headcount as number) + (a.overbook_buffer as number);
      if ((members[0].n as number) >= cap) {
        return reply.code(409).send({ problem: { title: 'Spot full (incl. buffer)', status: 409 } });
      }
    }
    await db.execute(sql`
      update applications set status = ${status}::application_status, decided_at = now(),
             decline_reason = ${declineReason}
       where id = ${req.params.id}::uuid`);
    await notify(dbUrl, String(a.user_id), 'spots', `application_${status}`, { spotId: a.spot_id, reason: declineReason });
    if (status === 'accepted') {
      await db.execute(sql`
        insert into spot_members (spot_id, user_id, role, confirm_state) values (${a.spot_id}::uuid, ${a.user_id}, 'member', 'pending')
        on conflict (spot_id, user_id) do update set state = 'active', role = 'member', confirm_state = 'pending'`);
      await db.execute(sql`insert into room_members (room_id, user_id) select r.id, ${a.user_id} from rooms r where r.spot_id = ${a.spot_id}::uuid on conflict do nothing`);
    }
    return { status };
  });

  // date-on-fill: host pins date + venue once accepted ≥ min headcount
  app.post<{ Params: { id: string }; Body: unknown }>('/spots/:id/schedule', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user!.id;
    const parsed = Schedule.safeParse(req.body);
    if (!parsed.success) return reply.code(422).send({ problem: { title: 'Invalid schedule', status: 422 } });
    const spot = rows(await db.execute(sql`select id, state, min_headcount, district_id from spots where id = ${req.params.id}::uuid`));
    if (spot.length === 0) return reply.code(404).send({ problem: { title: 'Spot not found', status: 404 } });
    const s = spot[0];
    if (!(await isHost(String(s.id), userId))) return reply.code(403).send({ problem: { title: 'Host only', status: 403 } });
    if (s.state !== 'forming') return reply.code(422).send({ problem: { title: `Spot is ${s.state}`, status: 422 } });

    // headcount includes the host (same rule as join capacity)
    const accepted = rows(await db.execute(sql`select count(*)::int as n from spot_members where spot_id = ${s.id}::uuid and state = 'active' and role in ('host','member')`));
    const n = accepted[0].n as number;
    if (n < (s.min_headcount as number)) {
      return reply.code(422).send({ problem: { title: 'Not enough members yet', status: 422, detail: `Need ${s.min_headcount} accepted members; have ${n}.` } });
    }
    const venue = rows(await db.execute(sql`select 1 from venues where id = ${parsed.data.venueId}::uuid`));
    if (venue.length === 0) return reply.code(422).send({ problem: { title: 'Unknown venue', status: 422 } });

    const deadline = new Date(Date.now() + SPOT_RULES.confirmWindowHours * 3600_000);
    await db.execute(sql`
      update spots set state = 'confirmed', starts_at = ${new Date(parsed.data.startsAt)}, venue_id = ${parsed.data.venueId}::uuid,
             group_drop_id = ${parsed.data.groupDropId ?? null}, confirm_deadline = ${deadline}
       where id = ${s.id}::uuid`);
    await db.execute(sql`update applications set status = 'closed' where spot_id = ${s.id}::uuid and status = 'pending'`);
    const membersToPing = rows(await db.execute(sql`
      select user_id from spot_members where spot_id = ${s.id}::uuid and state = 'active' and role <> 'host'`));
    for (const m of membersToPing) {
      await notify(dbUrl, String(m.user_id), 'spots', 'date_pinned', { spotId: s.id, startsAt: parsed.data.startsAt, deadline: deadline.toISOString() });
    }
    return { state: 'confirmed', confirmDeadline: deadline.toISOString() };
  });

  // member confirm (within 48h of date pin)
  app.post<{ Params: { id: string } }>('/spots/:id/confirm', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user!.id;
    const r = rows(await db.execute(sql`
      update spot_members set confirm_state = 'confirmed'
       where spot_id = ${req.params.id}::uuid and user_id = ${userId} and state = 'active'
         and confirm_state = 'pending' returning 1 as ok`));
    if (r.length === 0) return reply.code(409).send({ problem: { title: 'Nothing to confirm', status: 409 } });
    return { confirmed: true };
  });

  // bail: free inside grace window; late → score event + waitlist backfill
  app.post<{ Params: { id: string } }>('/spots/:id/bail', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user!.id;
    const spot = rows(await db.execute(sql`select id, state, starts_at from spots where id = ${req.params.id}::uuid`));
    if (spot.length === 0) return reply.code(404).send({ problem: { title: 'Spot not found', status: 404 } });
    const s = spot[0];
    const member = rows(await db.execute(sql`select role, confirm_state from spot_members where spot_id = ${s.id}::uuid and user_id = ${userId} and state = 'active'`));
    if (member.length === 0) return reply.code(409).send({ problem: { title: 'Not a member', status: 409 } });

    const startsAt = s.starts_at ? new Date(String(s.starts_at)).getTime() : null;
    const withinGrace = startsAt !== null && startsAt - Date.now() > SPOT_RULES.bailGraceHours * 3600_000;
    await db.execute(sql`update spot_members set state = 'left', confirm_state = 'bailed', bailed_at = now() where spot_id = ${s.id}::uuid and user_id = ${userId}`);
    await db.execute(sql`delete from room_members rm using rooms r where r.spot_id = ${s.id}::uuid and rm.room_id = r.id and rm.user_id = ${userId}`);

    if (s.state === 'confirmed' && !withinGrace) {
      await db.execute(sql`insert into score_events (user_id, spot_id, type, weight) values (${userId}, ${s.id}::uuid, 'late_cancel', -0.15)`);
    }
    // waitlist backfill: promote first waitlisted member if a seat freed in a confirmed/forming spot
    const next = rows(await db.execute(sql`
      select m.user_id from spot_members m where m.spot_id = ${s.id}::uuid and m.role = 'waitlist' and m.state = 'active'
       order by m.joined_at asc limit 1`));
    if (next.length > 0) {
      await db.execute(sql`update spot_members set role = 'member', confirm_state = 'pending' where spot_id = ${s.id}::uuid and user_id = ${next[0].user_id}`);
      await db.execute(sql`insert into room_members (room_id, user_id) select r.id, ${next[0].user_id} from rooms r where r.spot_id = ${s.id}::uuid on conflict do nothing`);
    }
    return { bailed: true, penalty: s.state === 'confirmed' && !withinGrace ? 'late_cancel' : null };
  });

  // host cancel → score event + auto-apology system message
  app.post<{ Params: { id: string } }>('/spots/:id/cancel', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user!.id;
    const spot = rows(await db.execute(sql`select id, state, host_user_id from spots where id = ${req.params.id}::uuid`));
    if (spot.length === 0) return reply.code(404).send({ problem: { title: 'Spot not found', status: 404 } });
    const s = spot[0];
    if (s.host_user_id !== userId) return reply.code(403).send({ problem: { title: 'Host only', status: 403 } });
    if (s.state === 'cancelled' || s.state === 'done' || s.state === 'dissolved') {
      return reply.code(422).send({ problem: { title: `Spot already ${s.state}`, status: 422 } });
    }
    const wasConfirmed = s.state === 'confirmed' || s.state === 'live';
    await db.execute(sql`update spots set state = 'cancelled' where id = ${s.id}::uuid`);
    if (wasConfirmed) {
      await db.execute(sql`insert into score_events (user_id, spot_id, type, weight) values (${userId}, ${s.id}::uuid, 'host_cancel', -0.2)`);
      await db.execute(sql`
        insert into messages (room_id, user_id, body, flags)
        select r.id, ${userId}, ${'Host cancelled this spot — sorry everyone. This affects the host\'s Show-up Score.'}, '{"system":true}'::jsonb
          from rooms r where r.spot_id = ${s.id}::uuid`);
    }
    return { state: 'cancelled' };
  });

  // job: sweep — dissolve confirmed spots past deadline with insufficient confirmations;
  // confirmed → live at starts_at; live → done 12h after starts_at.
  // Called by pg-boss schedule (ENABLE_JOBS) and manually by tests.
  app.post('/internal/spot-sweep', { preHandler: [app.authenticate, app.requireAdminRole('superadmin')] }, async () => {
    const dissolved = rows(await db.execute(sql`
      update spots s set state = 'dissolved'
       where s.state = 'confirmed' and s.confirm_deadline < now()
         and (select count(*) from spot_members m where m.spot_id = s.id and m.state = 'active' and m.confirm_state = 'confirmed')
             < s.min_headcount
       returning id`));
    const toLive = rows(await db.execute(sql`
      update spots set state = 'live' where state = 'confirmed' and starts_at <= now() returning id`));
    const toDone = rows(await db.execute(sql`
      update spots set state = 'done' where state = 'live' and starts_at < now() - interval '12 hours' returning id`));
    return { dissolved: dissolved.length, live: toLive.length, done: toDone.length };
  });
}
