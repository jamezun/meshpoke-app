/// T9.2: join & apply for event spots (PRD §3.5/§3.10).
/// open mode → direct join (capacity, waitlist when full); application mode →
/// apply with hard filters (min score, required keywords) evaluated at apply time.
/// Joining caps: activeEventSpots free 3 / plus 5 / pro 10 (TIER_CAPS).
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { capture } from '../analytics.js';
import { z } from 'zod';
import { getDb } from '../db/client.js';
import { trustExpr } from '../trust.js';

const Apply = z.object({ note: z.string().trim().max(500).optional() });

export function registerSpotJoin(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);
  const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

  async function eventJoinCapHit(userId: string, plan: string): Promise<boolean> {
    const cap = plan === 'pro' ? 10 : plan === 'plus' ? 5 : 3;
    const r = rows(await db.execute(sql`
      select count(*)::int as n from spot_members m
      join spots s on s.id = m.spot_id
      where m.user_id = ${userId} and m.role = 'member' and m.state = 'active'
        and s.kind = 'event' and (s.state is null or s.state in ('forming','confirmed','live'))`));
    return (r[0].n as number) >= cap;
  }

  async function plan(userId: string): Promise<string> {
    const r = rows(await db.execute(sql`select coalesce(plan,'free') as plan from entitlements where user_id = ${userId} and (expires_at is null or expires_at > now())`));
    return (r[0]?.plan as string | undefined) ?? 'free';
  }

  async function eligible(spotId: string, userId: string, reply: { code: (n: number) => { send: (b: unknown) => unknown } }): Promise<boolean> {
    const spot = rows(await db.execute(sql`
      select s.min_score, s.required_keywords, u.liveness_state
        from spots s, users u where s.id = ${spotId}::uuid and u.id = ${userId}`));
    if (spot.length === 0) return false;
    if (spot[0].liveness_state !== 'verified') {
      await reply.code(403).send({ problem: { title: 'Phone verification required', status: 403 } });
      return false;
    }
    const minScore = spot[0].min_score !== null ? Number(spot[0].min_score) : null;
    if (minScore !== null) {
      const score = rows(await db.execute(sql`select score, proven_state from showup_scores where user_id = ${userId}`));
      const proven = score[0]?.proven_state as string | undefined;
      const effective = score[0] ? (proven === 'unproven' ? 0.5 : Number(score[0].score)) : 0.5; // unproven/absent → neutral 0.5
      if (effective < minScore) {
        await reply.code(422).send({ problem: { title: 'Show-up Score below host minimum', status: 422, detail: `Host requires ${minScore}; yours is ${proven === 'unproven' || !score[0] ? 'unproven (0.5)' : effective}.`, type: 'hard_filter' } });
        return false;
      }
    }
    const reqKw = (spot[0].required_keywords as string[] | null) ?? [];
    if (reqKw.length > 0) {
      const userKw = rows(await db.execute(sql`select keyword from keywords where user_id = ${userId}`));
      const have = new Set(userKw.map((r) => String(r.keyword).toLowerCase()));
      const missing = reqKw.filter((k) => !have.has(k.toLowerCase()));
      if (missing.length > 0) {
        await reply.code(422).send({ problem: { title: 'Required keywords missing', status: 422, detail: `Host requires: ${missing.join(', ')}`, type: 'hard_filter' } });
        return false;
      }
    }
    return true;
  }

  // open mode join
  app.post<{ Params: { id: string } }>('/spots/:id/join', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user!.id;
    const spot = rows(await db.execute(sql`select id, kind, join_mode, state, min_score, required_keywords, max_headcount, overbook_buffer from spots where id = ${req.params.id}::uuid`));
    if (spot.length === 0) return reply.code(404).send({ problem: { title: 'Spot not found', status: 404 } });
    const s = spot[0];
    if (s.kind !== 'event') return reply.code(422).send({ problem: { title: 'Not an event spot', status: 422 } });
    if (s.join_mode !== 'open') return reply.code(422).send({ problem: { title: 'Application required', status: 422 } });
    if (s.state !== 'forming' && s.state !== 'confirmed') {
      return reply.code(422).send({ problem: { title: `Spot is ${s.state ?? 'closed'}`, status: 422 } });
    }
    const existing = rows(await db.execute(sql`select role, state from spot_members where spot_id = ${s.id}::uuid and user_id = ${userId}`));
    if (existing.length > 0 && existing[0].state === 'active') return reply.code(409).send({ problem: { title: 'Already a member', status: 409 } });

    if (!(await eligible(String(s.id), userId, reply))) return reply;

    if (await eventJoinCapHit(userId, await plan(userId))) {
      return reply.code(402).send({ problem: { title: 'Active event spots cap reached', status: 402, detail: 'Upgrade or finish an event to join more.', type: 'cap', capType: 'activeEventSpots' } });
    }

    const members = rows(await db.execute(sql`select count(*)::int as n from spot_members where spot_id = ${s.id}::uuid and state = 'active' and role in ('host','member')`));
    const n = members[0].n as number;
    const cap = (s.max_headcount as number) + (s.overbook_buffer as number);
    const role = n < (s.max_headcount as number) ? 'member' : n < cap ? 'member' /* overbook still member */ : 'waitlist';
    const res = await db.execute(sql`
      insert into spot_members (spot_id, user_id, role, confirm_state) values (${s.id}::uuid, ${userId}, ${role}::member_role, 'pending')
      on conflict (spot_id, user_id) do update set state = 'active', role = excluded.role, confirm_state = 'pending' returning role`);
    await db.execute(sql`insert into room_members (room_id, user_id) select r.id, ${userId} from rooms r where r.spot_id = ${s.id}::uuid on conflict do nothing`);
    return { role: rows(res)[0].role };
  });

  // application mode
  app.post<{ Params: { id: string }; Body: unknown }>('/spots/:id/apply', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user!.id;
    const parsed = Apply.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(422).send({ problem: { title: 'Invalid application', status: 422 } });
    const spot = rows(await db.execute(sql`select id, kind, join_mode, state from spots where id = ${req.params.id}::uuid`));
    if (spot.length === 0) return reply.code(404).send({ problem: { title: 'Spot not found', status: 404 } });
    const s = spot[0];
    if (s.kind !== 'event') return reply.code(422).send({ problem: { title: 'Not an event spot', status: 422 } });
    if (s.join_mode !== 'application') return reply.code(422).send({ problem: { title: 'Spot is open-join', status: 422 } });
    if (s.state !== 'forming') return reply.code(422).send({ problem: { title: `Spot is ${s.state ?? 'closed'}`, status: 422 } });
    const existing = rows(await db.execute(sql`select state from spot_members where spot_id = ${s.id}::uuid and user_id = ${userId}`));
    if (existing.length > 0 && existing[0].state === 'active') return reply.code(409).send({ problem: { title: 'Already a member', status: 409 } });
    const openApp = rows(await db.execute(sql`select 1 from applications where spot_id = ${s.id}::uuid and user_id = ${userId} and status = 'pending'`));
    if (openApp.length > 0) return reply.code(409).send({ problem: { title: 'Application already pending', status: 409 } });

    if (!(await eligible(String(s.id), userId, reply))) return reply;
    if (await eventJoinCapHit(userId, await plan(userId))) {
      return reply.code(402).send({ problem: { title: 'Active event spots cap reached', status: 402, type: 'cap', capType: 'activeEventSpots' } });
    }

    await db.execute(sql`
      insert into applications (spot_id, user_id, note) values (${s.id}::uuid, ${userId}, ${parsed.data.note ?? null})
      on conflict (spot_id, user_id) do update set status = 'pending', note = excluded.note, decided_at = null`);
    capture('application_submitted', req.user!.id, { spotId: req.params.id });
    return { status: 'pending' };
  });

  // T9.5 spot detail (auth): all fields + my membership/application state + venue name
  app.get<{ Params: { id: string } }>('/spots/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user!.id;
    const res = await db.execute(sql`
      select s.id, s.kind, s.template, s.name, s.state, s.join_mode, s.required_keywords, s.min_score,
             s.price_range, s.min_headcount, s.max_headcount, s.overbook_buffer, s.starts_at, s.ends_at,
             s.confirm_deadline, s.district_id, d.name_en as district, s.venue_id, v.display_name as venue_name,
             (select count(*)::int from spot_members m where m.spot_id = s.id and m.state = 'active' and m.role in ('host','member')) as member_count,
             (select m2.role from spot_members m2 where m2.spot_id = s.id and m2.user_id = ${userId} and m2.state = 'active') as my_role,
             (select a.status from applications a where a.spot_id = s.id and a.user_id = ${userId} and a.status = 'pending') as my_application
        from spots s
        left join districts d on d.id = s.district_id
        left join venues v on v.id = s.venue_id
       where s.id = ${req.params.id}::uuid`);
    const spot = rows(res);
    if (spot.length === 0) return reply.code(404).send({ problem: { title: 'Spot not found', status: 404 } });
    // members as sketches (name only — photo ladder intact; T10.4 roll-call/report-absent)
    const members = rows(await db.execute(sql`
      select m.user_id as "userId", u.display_name as "displayName", m.role, ${trustExpr(userId)}
        from spot_members m join users u on u.id = m.user_id
       where m.spot_id = ${req.params.id}::uuid and m.state = 'active' and m.role in ('host','member')
         and not exists (select 1 from blocks b
             where (b.blocker_id = ${userId}::uuid and b.blocked_id = m.user_id)
                or (b.blocker_id = m.user_id and b.blocked_id = ${userId}::uuid))`));
    return { ...spot[0], members };
  });

  // T9.3 queue view: sorted-never-hidden (Recommended default), counts per status,
  // express badge for plus/pro; FIFO within ties. Creator sees sketches only (T3.3).
  app.get<{ Params: { id: string }; Querystring: { sort?: string } }>('/spots/:id/queue', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user!.id;
    const host = rows(await db.execute(sql`select 1 from spot_members where spot_id = ${req.params.id}::uuid and user_id = ${userId} and role = 'host'`));
    if (host.length === 0) return reply.code(403).send({ problem: { title: 'Host only', status: 403 } });
    const sort = req.query?.sort === 'fifo' ? 'fifo' : 'recommended';
    const apps = rows(await db.execute(sql`
      select a.id, a.user_id, a.status, a.note, a.created_at, u.display_name,
             coalesce(e.plan, 'free') as plan,
             sc.score as score, coalesce(sc.proven_state, 'unproven') as proven_state,
             ${trustExpr(userId)},
             coalesce(json_agg(json_build_object('keyword', k.keyword, 'level', k.level)) filter (where k.keyword is not null), '[]') as keywords
        from applications a
        left join entitlements e on e.user_id = a.user_id and (e.expires_at is null or e.expires_at > now())
        left join showup_scores sc on sc.user_id = a.user_id
        join users u on u.id = a.user_id
        left join keywords k on k.user_id = a.user_id
       where a.spot_id = ${req.params.id}::uuid and a.status in ('pending','waitlisted','accepted','declined')
       group by a.id, e.plan, sc.score, sc.proven_state, u.created_at, u.id`));
    const { recommendedScore, currentSortWeights } = await import('../sort.js');
    const { vibe } = await import('@meshpoke/shared/vibe');
    const { fetchFlag } = await import('../analytics.js');
    const weights = await currentSortWeights(() => fetchFlag('admin', 'sort-weights'));
    const spot = rows(await db.execute(sql`select required_keywords from spots where id = ${req.params.id}::uuid`));
    const spotKw = ((spot[0]?.required_keywords as string[] | null) ?? []).map((k) => ({ keyword: k.toLowerCase(), level: 10 }));
    const scored = apps.map((a): Record<string, unknown> => {
      const kw = (((a.keywords as { keyword: string; level: number }[]) ?? []).map((k) => ({ keyword: String(k.keyword).toLowerCase(), level: k.level })));
      const vibeVal = vibe(kw, spotKw); // empty on either side → 0.5 neutral
      return { ...a, score: recommendedScore({ tier: a.plan as 'free' | 'plus' | 'pro', vibe: vibeVal, score: a.score === null ? null : Number(a.score) }, weights) };
    });
    scored.sort((x, y) => (sort === 'fifo' ? String(x.created_at).localeCompare(String(y.created_at)) : (y.score as number) - (x.score as number) || String(x.created_at).localeCompare(String(y.created_at))));
    const counts: Record<string, number> = {};
    for (const a of apps) counts[a.status as string] = (counts[a.status as string] ?? 0) + 1;
    return {
      sort,
      counts,
      queue: scored.map((a) => ({
        applicationId: a.id, userId: a.user_id, displayName: a.display_name, status: a.status, note: a.note, createdAt: a.created_at,
        score: a.score, provenState: a.proven_state, plan: a.plan, express: a.plan !== 'free', trust: a.trust,
      })),
    };
  });

  // leave (both modes) — pre-event bail semantics live in T9.4; here = leave forming spot
  app.post<{ Params: { id: string } }>('/spots/:id/leave', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user!.id;
    const res = rows(await db.execute(sql`
      update spot_members set state = 'left'
       where spot_id = ${req.params.id}::uuid and user_id = ${userId} and state = 'active' and role <> 'host' returning 1 as ok`));
    if (res.length === 0) return reply.code(409).send({ problem: { title: 'Not an active member', status: 409 } });
    await db.execute(sql`delete from room_members rm using rooms r where r.spot_id = ${req.params.id}::uuid and rm.room_id = r.id and rm.user_id = ${userId}`);
    await db.execute(sql`update applications set status = 'closed' where spot_id = ${req.params.id}::uuid and user_id = ${userId} and status = 'pending'`);
    return { status: 'left' };
  });

  // T18.2: my hosted spots (host console list)
  app.get('/me/hosted', { preHandler: [app.authenticate] }, async (req) => {
    const mine = rows(await db.execute(sql`
      select s.id, s.kind, s.template, s.name, s.state, s.join_mode, s.starts_at, s.confirm_deadline,
             s.min_headcount, s.max_headcount,
             (select count(*)::int from spot_members m where m.spot_id = s.id and m.state = 'active' and m.role in ('host','member')) as member_count,
             (select count(*)::int from applications a where a.spot_id = s.id and a.status = 'pending') as pending_count,
             v.display_name as venue_name, d.name_en as district
        from spots s
        left join venues v on v.id = s.venue_id
        left join districts d on d.id = s.district_id
       where s.host_user_id = ${req.user!.id}::uuid
         and (s.state is null or s.state in ('forming', 'confirmed', 'live'))
       order by s.created_at desc limit 50`));
    return { spots: mine };
  });

  // T18.3: spots I attended (people-you-met picker)
  app.get('/me/spots/attended', { preHandler: [app.authenticate] }, async (req) => {
    const mine = rows(await db.execute(sql`
      select s.id, s.name, s.starts_at
        from attendance a join spots s on s.id = a.spot_id
       where a.user_id = ${req.user!.id}::uuid and a.status in ('attended','forgiven')
         and s.state = 'done'
       order by s.starts_at desc nulls last limit 20`));
    return { spots: mine };
  });

  // T18.2: host removes a member (logged + reportable)
  app.post<{ Params: { id: string }; Body: unknown }>('/spots/:id/remove-member', { preHandler: [app.authenticate] }, async (req, reply) => {
    const b = req.body as { userId?: string; reason?: string };
    if (!b?.userId) return reply.code(422).send({ problem: { title: 'userId required', status: 422 } });
    const host = rows(await db.execute(sql`
      select 1 from spot_members m join spots s on s.id = m.spot_id
       where s.id = ${req.params.id}::uuid and m.user_id = ${req.user!.id}::uuid and m.role = 'host'`));
    if (host.length === 0) return reply.code(403).send({ problem: { title: 'Host only', status: 403 } });
    const target = rows(await db.execute(sql`
      select m.user_id from spot_members m
       where m.spot_id = ${req.params.id}::uuid and m.user_id = ${b.userId}::uuid and m.state = 'active' and m.role <> 'host'`));
    if (target.length === 0) return reply.code(404).send({ problem: { title: 'Member not found', status: 404 } });
    await db.execute(sql`update spot_members set state = 'removed' where spot_id = ${req.params.id}::uuid and user_id = ${b.userId}::uuid`);
    await db.execute(sql`delete from room_members rm using rooms r
       where r.id = rm.room_id and r.spot_id = ${req.params.id}::uuid and rm.user_id = ${b.userId}::uuid`);
    await db.execute(sql`insert into audit_log (actor_id, action, target, meta)
      values (${req.user!.id}::uuid, 'spot.member_removed', ${req.params.id}::uuid, ${JSON.stringify({ userId: b.userId, reason: b.reason ?? null })}::jsonb)`);
    return { removed: true };
  });
}

