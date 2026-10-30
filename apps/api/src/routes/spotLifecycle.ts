/// T9.4: application decisions, date-on-fill scheduling, confirm/bail,
/// state transitions + jobs (dissolve, confirmed→live→done), host cancel.
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client.js';
import { notify } from '../notify.js';
import { SPOT_RULES } from '@meshpoke/shared/constants';
import { enforcementState } from './score.js';

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
    if (new Date(parsed.data.startsAt).getTime() <= Date.now()) {
      return reply.code(422).send({ problem: { title: 'startsAt must be in the future', status: 422 } });
    }

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

  // member confirm (within 48h of date pin; spot must still be confirmed and inside the deadline)
  app.post<{ Params: { id: string } }>('/spots/:id/confirm', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user!.id;
    const r = rows(await db.execute(sql`
      update spot_members m set confirm_state = 'confirmed'
       from spots s
       where m.spot_id = ${req.params.id}::uuid and s.id = m.spot_id
         and m.user_id = ${userId} and m.state = 'active' and m.confirm_state = 'pending'
         and s.state = 'confirmed' and s.confirm_deadline > now() returning 1 as ok`));
    if (r.length === 0) return reply.code(409).send({ problem: { title: 'Nothing to confirm (deadline passed or spot state changed)', status: 409 } });
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
    if (member[0].role === 'host') {
      return reply.code(422).send({ problem: { title: 'Hosts must cancel the spot, not bail (cancel applies the host penalty)', status: 422 } });
    }

    const startsAt = s.starts_at ? new Date(String(s.starts_at)).getTime() : null;
    const hoursOut = startsAt !== null ? (startsAt - Date.now()) / 3600_000 : Infinity;
    await db.execute(sql`update spot_members set state = 'left', confirm_state = 'bailed', bailed_at = now() where spot_id = ${s.id}::uuid and user_id = ${userId}`);
    await db.execute(sql`delete from room_members rm using rooms r where r.spot_id = ${s.id}::uuid and rm.room_id = r.id and rm.user_id = ${userId}`);

    // Reliability 2.0 graduated bail ladder: >48h free · 24–48h 0.75 · <24h 0.5 · no-show 0
    let penalty: 'free' | 'bail48to24' | 'bailUnder24' = 'free';
    if ((s.state === 'confirmed' || s.state === 'live') && hoursOut <= SPOT_RULES.bailFreeHours) {
      penalty = hoursOut > 24 ? 'bail48to24' : 'bailUnder24';
      const pts = penalty === 'bail48to24' ? SPOT_RULES.bailPoints48to24 : SPOT_RULES.bailPointsUnder24;
      await db.execute(sql`insert into score_events (user_id, spot_id, type, weight) values (${userId}, ${s.id}::uuid, 'late_cancel', ${pts})`);
    }
    // waitlist backfill: promote first waitlisted member into the freed seat, atomically rechecking capacity
    const next = rows(await db.execute(sql`
      update spot_members m set role = 'member', confirm_state = 'pending'
       where (m.spot_id, m.user_id) = (
         select w.spot_id, w.user_id from spot_members w
          where w.spot_id = ${s.id}::uuid and w.role = 'waitlist' and w.state = 'active'
          order by case coalesce((select e.plan from entitlements e where e.user_id = w.user_id
                                    and (e.expires_at is null or e.expires_at > now())), 'free')
                    when 'pro' then 3 when 'plus' then 2 else 1 end desc, w.joined_at asc
          limit 1 for update skip locked)
        and (select count(*) from spot_members m2
              where m2.spot_id = ${s.id}::uuid and m2.role in ('host','member') and m2.state = 'active')
            < (select max_headcount + overbook_buffer from spots where id = ${s.id}::uuid)
       returning m.user_id`));
    if (next.length > 0) {
      await db.execute(sql`insert into room_members (room_id, user_id) select r.id, ${next[0].user_id} from rooms r where r.spot_id = ${s.id}::uuid on conflict do nothing`);
    }
    return { bailed: true, penalty };
  });

  // member responds to host apology: 'accept' (It's fine) or 'decline' (Not ok). Silence = neutral (excluded).
  app.post<{ Params: { id: string }; Body: unknown }>('/spots/:id/apology', { preHandler: [app.authenticate] }, async (req, reply) => {
    const b = (req.body ?? {}) as { response?: string };
    if (b.response !== 'accept' && b.response !== 'decline') return reply.code(422).send({ problem: { title: 'response must be accept|decline', status: 422 } });
    const r = rows(await db.execute(sql`
      update apology_requests set response = ${b.response}, responded_at = now()
       where spot_id = ${req.params.id}::uuid and member_id = ${req.user!.id} and response is null
       returning id`));
    if (r.length === 0) return reply.code(404).send({ problem: { title: 'No open apology request', status: 404 } });
    return { responded: b.response };
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
    await db.execute(sql`update applications set status = 'closed' where spot_id = ${s.id}::uuid and status = 'pending'`);
    if (wasConfirmed) {
      // provisional 0.5; apology responses finalise it (sweep): 0.2 + 0.6·acc/(acc+dec), no responses stays 0.5
      await db.execute(sql`insert into score_events (user_id, spot_id, type, weight) values (${userId}, ${s.id}::uuid, 'host_cancel', 0.5)`);
      await db.execute(sql`
        insert into apology_requests (spot_id, host_user_id, member_id)
        select ${s.id}::uuid, ${userId}, m.user_id from spot_members m
         where m.spot_id = ${s.id}::uuid and m.state = 'active' and m.role = 'member'
         on conflict do nothing`);
      await db.execute(sql`
        insert into messages (room_id, user_id, body, flags)
        select r.id, ${userId}, ${'Host cancelled this spot — sorry everyone. Members: tap the apology in notifications to respond (It\'s fine / Not ok).'}, '{"system":true}'::jsonb
          from rooms r where r.spot_id = ${s.id}::uuid`);
    }
    return { state: 'cancelled' };
  });

  // ── reschedule: >48h out = free change w/ notify; ≤48h = consent proposal ──
  app.post<{ Params: { id: string }; Body: unknown }>('/spots/:id/reschedule', { preHandler: [app.authenticate] }, async (req, reply) => {
    const b = (req.body ?? {}) as { newStartsAt?: string };
    const newStart = b.newStartsAt ? new Date(b.newStartsAt) : null;
    if (!newStart || Number.isNaN(newStart.getTime())) return reply.code(422).send({ problem: { title: 'newStartsAt required (ISO)', status: 422 } });
    const spot = rows(await db.execute(sql`select id, state, host_user_id, starts_at from spots where id = ${req.params.id}::uuid for update`));
    const s = spot[0];
    if (!s) return reply.code(404).send({ problem: { title: 'Spot not found', status: 404 } });
    if (s.host_user_id !== req.user!.id) return reply.code(403).send({ problem: { title: 'Host only', status: 403 } });
    if (s.state !== 'confirmed' && s.state !== 'live') return reply.code(422).send({ problem: { title: `Cannot reschedule a ${s.state} spot`, status: 422 } });
    const cur = new Date(String(s.starts_at)).getTime();
    const hoursOut = (cur - Date.now()) / 3600_000;
    if (hoursOut > SPOT_RULES.bailFreeHours) {
      await db.execute(sql`update spots set starts_at = ${newStart.toISOString()} where id = ${s.id}::uuid`);
      return { rescheduled: 'free', startsAt: newStart.toISOString() };
    }
    // consent path: everyone accepts by start−4h, else rejected + host tap
    const deadline = new Date(cur - 4 * 3600_000);
    if (deadline <= new Date()) return reply.code(422).send({ problem: { title: 'Too late to propose — within 4h of start', status: 422 } });
    const ins = rows(await db.execute(sql`
      insert into reschedule_proposals (spot_id, proposed_by, new_starts_at, deadline_at)
      values (${s.id}::uuid, ${req.user!.id}, ${newStart.toISOString()}, ${deadline.toISOString()})
      on conflict do nothing returning id`));
    if (ins.length === 0) return reply.code(409).send({ problem: { title: 'A proposal is already pending (one per 24h)', status: 409 } });
    await db.execute(sql`
      insert into messages (room_id, user_id, body, flags)
      select r.id, ${req.user!.id}, ${`Host proposes moving this spot to ${newStart.toISOString()} — accept in the spot page before ${deadline.toISOString()}.`}, '{"system":true}'::jsonb
        from rooms r where r.spot_id = ${s.id}::uuid`);
    return { proposal: 'pending', deadline: deadline.toISOString() };
  });

  app.post<{ Params: { id: string }; Body: unknown }>('/spots/:id/reschedule/respond', { preHandler: [app.authenticate] }, async (req, reply) => {
    const b = (req.body ?? {}) as { accept?: boolean };
    if (typeof b.accept !== 'boolean') return reply.code(422).send({ problem: { title: 'accept (boolean) required', status: 422 } });
    const me = req.user!.id;
    const p = rows(await db.execute(sql`
      select p.id, p.spot_id, p.new_starts_at, p.deadline_at, p.proposed_by, p.status,
             s.host_user_id, s.starts_at
        from reschedule_proposals p join spots s on s.id = p.spot_id
       where p.spot_id = ${req.params.id}::uuid and p.status = 'pending' for update of p`));
    if (p.length === 0) return reply.code(404).send({ problem: { title: 'No pending proposal', status: 404 } });
    const pr = p[0];
    const isMember = rows(await db.execute(sql`select 1 from spot_members where spot_id = ${pr.spot_id}::uuid and user_id = ${me} and state = 'active' and role = 'member'`));
    if (isMember.length === 0) return reply.code(403).send({ problem: { title: 'Active members only', status: 403 } });
    await db.execute(sql`
      insert into reschedule_responses (proposal_id, member_id, accepted)
      values (${pr.id}, ${me}, ${b.accept})
      on conflict (proposal_id, member_id) do update set accepted = ${b.accept}, responded_at = now()`);
    if (!b.accept) return rejectProposal(db, pr);
    // all active members accepted? → apply
    const need = rows(await db.execute(sql`select count(*)::int as n from spot_members where spot_id = ${pr.spot_id}::uuid and state = 'active' and role = 'member'`));
    const got = rows(await db.execute(sql`select count(*)::int as n from reschedule_responses where proposal_id = ${pr.id} and accepted = true`));
    if (Number(got[0].n) >= Number(need[0].n)) {
      await db.execute(sql`update spots set starts_at = ${new Date(String(pr.new_starts_at)).toISOString()} where id = ${pr.spot_id}::uuid`);
      await db.execute(sql`update reschedule_proposals set status = 'applied' where id = ${pr.id}`);
      return { applied: true, startsAt: pr.new_starts_at };
    }
    return { accepted: true, waitingOn: Number(need[0].n) - Number(got[0].n) };
  });

  async function rejectProposal(db: ReturnType<typeof getDb>, pr: Record<string, unknown>) {
    await db.execute(sql`update reschedule_proposals set status = 'rejected' where id = ${pr.id}`);
    // tap (not a crush): a 0.75-point event — the host disrupted a confirmed plan
    await db.execute(sql`insert into score_events (user_id, spot_id, type, weight) values (${pr.proposed_by}, ${pr.spot_id}::uuid, 'reschedule_reject', 0.75)`);
    await db.execute(sql`
      insert into messages (room_id, user_id, body, flags)
      select r.id, ${pr.proposed_by}, 'Proposal declined — spot keeps its original time.', '{"system":true}'::jsonb
        from rooms r where r.spot_id = ${pr.spot_id}::uuid`);
    return { rejected: true };
  }

  // ── host handover: step down, first accepter inherits the spot ──
  app.post<{ Params: { id: string }; Body: unknown }>('/spots/:id/handover', { preHandler: [app.authenticate] }, async (req, reply) => {
    const b = (req.body ?? {}) as { nomineeId?: string };
    const me = req.user!.id;
    const s = rows(await db.execute(sql`select id, state, host_user_id, starts_at from spots where id = ${req.params.id}::uuid`))[0];
    if (!s) return reply.code(404).send({ problem: { title: 'Spot not found', status: 404 } });
    if (s.host_user_id !== me) return reply.code(403).send({ problem: { title: 'Host only', status: 403 } });
    if (!['forming', 'confirmed', 'live'].includes(String(s.state))) return reply.code(422).send({ problem: { title: `Cannot hand over a ${s.state} spot`, status: 422 } });
    if (b.nomineeId) {
      const ok = rows(await db.execute(sql`select 1 from spot_members where spot_id = ${s.id}::uuid and user_id = ${b.nomineeId}::uuid and state = 'active'`));
      if (ok.length === 0) return reply.code(422).send({ problem: { title: 'Nominee is not an active member', status: 422 } });
    }
    const startMs = s.starts_at ? new Date(String(s.starts_at)).getTime() : Date.now() + 48 * 3600_000;
    const expires = new Date(Math.min(startMs, Date.now() + 48 * 3600_000));
    const ins = rows(await db.execute(sql`
      insert into handovers (spot_id, from_user_id, nominee_id, expires_at)
      values (${s.id}::uuid, ${me}, ${b.nomineeId ?? null}, ${expires.toISOString()})
      on conflict do nothing returning id`)); // one pending per spot (partial idx)
    if (ins.length === 0) return reply.code(409).send({ problem: { title: 'Handover already pending', status: 409 } });
    await db.execute(sql`
      insert into messages (room_id, user_id, body, flags)
      select r.id, ${me}, ${b.nomineeId ? 'Host is stepping down — a new host has been nominated.' : 'Host is stepping down — first member to accept becomes host.'}, '{"system":true}'::jsonb
        from rooms r where r.spot_id = ${s.id}::uuid`);
    return { handover: 'pending', expiresAt: expires.toISOString() };
  });

  app.post<{ Params: { id: string } }>('/spots/:id/handover/accept', { preHandler: [app.authenticate] }, async (req, reply) => {
    const me = req.user!.id;
    const h = rows(await db.execute(sql`
      select h.id, h.spot_id, h.from_user_id, h.nominee_id
        from handovers h where h.spot_id = ${req.params.id}::uuid and h.status = 'pending'
         and (h.nominee_id is null or h.nominee_id = ${me}::uuid)
         and h.expires_at > now() for update of h skip locked limit 1`));
    if (h.length === 0) return reply.code(404).send({ problem: { title: 'No open handover for you', status: 404 } });
    const hr = h[0];
    const isMember = rows(await db.execute(sql`select 1 from spot_members where spot_id = ${hr.spot_id}::uuid and user_id = ${me}::uuid and state = 'active'`));
    if (isMember.length === 0) return reply.code(403).send({ problem: { title: 'Active members only', status: 403 } });
    // must not be hosting-paused
    const en = await enforcementState(db, me);
    if (en.action === 'hosting_paused') return reply.code(403).send({ problem: { title: 'Hosting paused', status: 403, detail: en.reason } });
    await db.execute(sql`update handovers set status = 'accepted' where id = ${hr.id}`);
    await db.execute(sql`update spots set host_user_id = ${me} where id = ${hr.spot_id}::uuid`);
    await db.execute(sql`update spot_members set role = 'member' where spot_id = ${hr.spot_id}::uuid and user_id = ${hr.from_user_id} and role = 'host'`);
    await db.execute(sql`
      insert into spot_members (spot_id, user_id, role, state) values (${hr.spot_id}::uuid, ${me}, 'host', 'active')
      on conflict (spot_id, user_id) do update set role = 'host', state = 'active'`);
    await db.execute(sql`
      insert into messages (room_id, user_id, body, flags)
      select r.id, ${me}, 'A new host has taken over this spot.', '{"system":true}'::jsonb
        from rooms r where r.spot_id = ${hr.spot_id}::uuid`);
    return { handover: 'accepted' };
  });

  app.post<{ Params: { id: string } }>('/spots/:id/handover/withdraw', { preHandler: [app.authenticate] }, async (req, reply) => {
    const r = rows(await db.execute(sql`
      update handovers set status = 'withdrawn'
       where spot_id = ${req.params.id}::uuid and status = 'pending' and from_user_id = ${req.user!.id} returning id`));
    if (r.length === 0) return reply.code(404).send({ problem: { title: 'No pending handover', status: 404 } });
    return { withdrawn: true };
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

    // Reliability 2.0 sweeps:
    // (a) expire reschedule proposals past deadline without full consent → tap + keep original time
    const expiredProposals = rows(await db.execute(sql`
      update reschedule_proposals p set status = 'rejected'
       where p.status = 'pending' and p.deadline_at < now() returning id, spot_id, proposed_by`));
    for (const p of expiredProposals) {
      await db.execute(sql`insert into score_events (user_id, spot_id, type, weight) values (${p.proposed_by}, ${p.spot_id}::uuid, 'reschedule_reject', 0.75)`);
    }
    // (b) expired handovers: forming → free cancel; confirmed/live → dissolve as host cancel (0.5, loophole closer)
    const expiredHandovers = rows(await db.execute(sql`
      update handovers h set status = 'expired'
       where h.status = 'pending' and h.expires_at < now()
       returning id, spot_id, from_user_id`));
    for (const h of expiredHandovers) {
      const sp = rows(await db.execute(sql`select state from spots where id = ${h.spot_id}::uuid`));
      if (!sp[0] || !['forming', 'confirmed', 'live'].includes(String(sp[0].state))) continue;
      if (sp[0].state === 'forming') {
        await db.execute(sql`update spots set state = 'cancelled' where id = ${h.spot_id}::uuid`);
      } else {
        await db.execute(sql`update spots set state = 'dissolved' where id = ${h.spot_id}::uuid`);
        await db.execute(sql`insert into score_events (user_id, spot_id, type, weight) values (${h.from_user_id}, ${h.spot_id}::uuid, 'host_cancel', 0.5)`);
      }
    }
    // (c) finalise host_cancel weights from apology responses (72h window)
    const apologies = rows(await db.execute(sql`
      select e.id as event_id, e.spot_id, e.user_id, e.created_at,
             count(*) filter (where a.response = 'accept')::int as acc,
             count(*) filter (where a.response = 'decline')::int as dec
        from score_events e
        join apology_requests a on a.spot_id = e.spot_id
       where e.type = 'host_cancel' and e.created_at < now() - interval '72 hours'
       group by e.id`));
    let finalised = 0;
    for (const ap of apologies) {
      const acc = Number(ap.acc), dec = Number(ap.dec);
      const pts = acc + dec > 0 ? 0.2 + 0.6 * (acc / (acc + dec)) : 0.5;
      await db.execute(sql`update score_events set weight = ${pts} where id = ${ap.event_id}::uuid`);
      finalised++;
    }
    return { dissolved: dissolved.length, live: toLive.length, done: toDone.length, rescheduleRejected: expiredProposals.length, handoverExpired: expiredHandovers.length, apologiesFinalised: finalised };
  });
}
