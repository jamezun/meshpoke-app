/// T9.2: join & apply for event spots (PRD §3.5/§3.10).
/// open mode → direct join (capacity, waitlist when full); application mode →
/// apply with hard filters (min score, required keywords) evaluated at apply time.
/// Joining caps: activeEventSpots free 3 / plus 5 / pro 10 (TIER_CAPS).
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client.js';

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
    return { status: 'pending' };
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
}
