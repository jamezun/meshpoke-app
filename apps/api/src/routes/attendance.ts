import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { SPOT_RULES } from '@meshpoke/shared';

/**
 * T10.2 attendance lifecycle: roll-call, peer absent reports, forgiveness,
 * finalisation (freeze + score events). Runs inside 24h/48h windows.
 */
export function registerAttendance(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);
  const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

  const getSpot = async (id: string) =>
    rows(await db.execute(sql`select id, host_user_id, state, starts_at from spots where id = ${id}::uuid`));

  /** host roll-call — GET list (all attended by default), POST mark absences */
  app.get<{ Params: { id: string } }>('/spots/:id/roll-call', { preHandler: [app.authenticate] }, async (req, reply) => {
    const spot = await getSpot(req.params.id);
    if (spot.length === 0) return reply.code(404).send({ problem: { title: 'Spot not found', status: 404 } });
    const s = spot[0];
    if (s.host_user_id !== req.user!.id) return reply.code(403).send({ problem: { title: 'Host only', status: 403 } });
    if (s.state !== 'done' && s.state !== 'live') return reply.code(422).send({ problem: { title: 'Roll-call opens when the spot is done', status: 422 } });
    if (new Date(String(s.starts_at)).getTime() < Date.now() - SPOT_RULES.rollCallWindowHours * 3600_000) {
      return reply.code(422).send({ problem: { title: 'Roll-call window has closed', status: 422 } });
    }
    const members = rows(await db.execute(sql`
      select m.user_id, u.display_name, coalesce(a.status, 'attended') as status, a.verified_gps, a.im_here_at
        from spot_members m
        join users u on u.id = m.user_id
        left join attendance a on a.spot_id = m.spot_id and a.user_id = m.user_id
       where m.spot_id = ${req.params.id}::uuid and m.state = 'active' and m.role in ('host','member')`));
    return { members, closesAt: new Date(new Date(String(s.starts_at)).getTime() + SPOT_RULES.rollCallWindowHours * 3600_000).toISOString() };
  });

  app.post<{ Params: { id: string }; Body: unknown }>(
    '/spots/:id/roll-call',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const spot = await getSpot(req.params.id);
      if (spot.length === 0) return reply.code(404).send({ problem: { title: 'Spot not found', status: 404 } });
      const s = spot[0];
      if (s.host_user_id !== req.user!.id) return reply.code(403).send({ problem: { title: 'Host only', status: 403 } });
      if (s.state !== 'done' && s.state !== 'live') return reply.code(422).send({ problem: { title: 'Roll-call opens when the spot is done', status: 422 } });
      const absentIds = Array.isArray((req.body as { absent?: unknown })?.absent) ? (req.body as { absent: string[] }).absent : null;
      if (!absentIds) return reply.code(422).send({ problem: { title: 'absent[] required', status: 422 } });

      // seed attendance rows for everyone, then flip host-marked ones to absent
      await db.execute(sql`
        insert into attendance (spot_id, user_id, status)
        select m.spot_id, m.user_id, 'attended'
          from spot_members m
         where m.spot_id = ${req.params.id}::uuid and m.state = 'active' and m.role in ('host','member')
        on conflict (spot_id, user_id) do nothing`);
      for (const uid of absentIds) {
        if (uid === s.host_user_id) continue; // host marks others; host absence is peer-reported
        await db.execute(sql`
          update attendance set status = 'absent_host'
           where spot_id = ${req.params.id}::uuid and user_id = ${uid}::uuid`);
      }
      return { marked: absentIds.length };
    },
  );

  /** peer report — attendees only, within 24h */
  app.post<{ Params: { id: string }; Body: unknown }>(
    '/spots/:id/report-absent',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const b = req.body as { userId?: string };
      if (!b?.userId) return reply.code(422).send({ problem: { title: 'userId required', status: 422 } });
      const spot = await getSpot(req.params.id);
      if (spot.length === 0) return reply.code(404).send({ problem: { title: 'Spot not found', status: 404 } });
      const s = spot[0];
      if (s.state !== 'done' && s.state !== 'live') return reply.code(422).send({ problem: { title: 'Not open', status: 422 } });
      if (new Date(String(s.starts_at)).getTime() < Date.now() - SPOT_RULES.rollCallWindowHours * 3600_000) {
        return reply.code(422).send({ problem: { title: 'Report window has closed', status: 422 } });
      }
      const me = rows(await db.execute(sql`
        select 1 from spot_members where spot_id = ${req.params.id}::uuid and user_id = ${req.user!.id}
           and state = 'active' and role in ('host','member')`));
      if (me.length === 0) return reply.code(403).send({ problem: { title: 'Attendees only', status: 403 } });
      if (b.userId === req.user!.id) return reply.code(422).send({ problem: { title: 'Cannot report yourself', status: 422 } });

      await db.execute(sql`
        insert into absence_reports (spot_id, reporter_id, subject_id)
        values (${req.params.id}::uuid, ${req.user!.id}::uuid, ${b.userId}::uuid)
        on conflict do nothing`);
      const count = rows(await db.execute(sql`
        select count(distinct reporter_id)::int as n from absence_reports
         where spot_id = ${req.params.id}::uuid and subject_id = ${b.userId}::uuid`))[0].n as number;
      if (count >= SPOT_RULES.peerReportThreshold) {
        await db.execute(sql`
          insert into attendance (spot_id, user_id, status)
          values (${req.params.id}::uuid, ${b.userId}::uuid, 'absent_reported')
          on conflict (spot_id, user_id) do update set status = 'absent_reported'`);
      }
      return { reports: count, threshold: SPOT_RULES.peerReportThreshold, flipped: count >= SPOT_RULES.peerReportThreshold };
    },
  );

  /** forgiveness — member explains within 48h; host accepts → forgiven */
  app.post<{ Params: { id: string }; Body: unknown }>(
    '/spots/:id/forgiveness',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const b = req.body as { note?: string; accept?: boolean; userId?: string };
      const spot = await getSpot(req.params.id);
      if (spot.length === 0) return reply.code(404).send({ problem: { title: 'Spot not found', status: 404 } });
      const s = spot[0];
      if (new Date(String(s.starts_at)).getTime() < Date.now() - (SPOT_RULES.rollCallWindowHours + SPOT_RULES.forgivenessWindowHours) * 3600_000) {
        return reply.code(422).send({ problem: { title: 'Forgiveness window has closed', status: 422 } });
      }

      if (b?.accept) {
        // host accepts someone's request
        if (s.host_user_id !== req.user!.id) return reply.code(403).send({ problem: { title: 'Host only', status: 403 } });
        if (!b.userId) return reply.code(422).send({ problem: { title: 'userId required', status: 422 } });
        const res = rows(await db.execute(sql`
          update attendance set status = 'forgiven', finalized_at = now()
           where spot_id = ${req.params.id}::uuid and user_id = ${b.userId}::uuid and status in ('absent_host','absent_reported')
           returning user_id`));
        if (res.length > 0) {
          await db.execute(sql`
            insert into score_events (user_id, spot_id, type, weight)
            values (${b.userId}::uuid, ${req.params.id}::uuid, 'forgiven', 0)`);
        }
        return { forgiven: res.length > 0 };
      }

      // member submits explanation
      if (!b?.note || String(b.note).trim().length < 3) {
        return reply.code(422).send({ problem: { title: 'Explanation note required', status: 422 } });
      }
      const mine = rows(await db.execute(sql`
        select 1 from attendance
         where spot_id = ${req.params.id}::uuid and user_id = ${req.user!.id} and status in ('absent_host','absent_reported')`));
      if (mine.length === 0) return reply.code(422).send({ problem: { title: 'No absence to explain', status: 422 } });
      await db.execute(sql`
        update attendance set forgiveness_note = ${String(b.note).slice(0, 500)}
         where spot_id = ${req.params.id}::uuid and user_id = ${req.user!.id}`);
      return { submitted: true };
    },
  );

  /** finalisation — freeze statuses, emit score events. Idempotent per spot. */
  app.post<{ Params: { id: string } }>(
    '/spots/:id/finalise',
    { preHandler: [app.authenticate, app.requireAdminRole('superadmin')] },
    async (req, reply) => {
      const spot = await getSpot(req.params.id);
      if (spot.length === 0) return reply.code(404).send({ problem: { title: 'Spot not found', status: 404 } });
      const s = spot[0];
      if (s.state !== 'done') return reply.code(422).send({ problem: { title: 'Spot not done', status: 422 } });

      // seed any missing attendance rows (default attended)
      await db.execute(sql`
        insert into attendance (spot_id, user_id, status)
        select m.spot_id, m.user_id, 'attended'
          from spot_members m
         where m.spot_id = ${req.params.id}::uuid and m.state = 'active' and m.role in ('host','member')
        on conflict (spot_id, user_id) do nothing`);

      const unfinalised = rows(await db.execute(sql`
        select user_id, status from attendance
         where spot_id = ${req.params.id}::uuid and finalized_at is null`));

      for (const a of unfinalised) {
        await db.execute(sql`
          insert into score_events (user_id, spot_id, type, weight)
          values (${a.user_id}::uuid, ${req.params.id}::uuid,
                  ${a.status === 'attended' || a.status === 'forgiven' ? 'attended' : 'no_show'}::score_event_type,
                  ${a.status === 'attended' ? 0.1 : a.status === 'forgiven' ? 0 : -0.25})`);
        if (a.status === 'attended') {
          await db.execute(sql`
            insert into score_events (user_id, spot_id, type, weight)
            select ${a.user_id}::uuid, ${req.params.id}::uuid, 'verified_gps', 0.05
             where exists (select 1 from attendance
                            where spot_id = ${req.params.id}::uuid and user_id = ${a.user_id}::uuid and verified_gps)`);
        }
      }
      await db.execute(sql`
        update attendance set finalized_at = now()
         where spot_id = ${req.params.id}::uuid and finalized_at is null`);
      return { finalised: unfinalised.length };
    },
  );
}
