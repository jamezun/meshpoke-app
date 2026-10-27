import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { capture } from '../analytics.js';
import { z } from 'zod';
import { getDb } from '../db/client.js';
import { notify } from '../notify.js';
import { getPlan } from '../entitlements.js';
import { resolvePokeCost, chargePoke, ensureBalanceReset } from './pokeLedger.js';
import { trustExpr } from '../trust.js';
import { recommendedScore, currentSortWeights } from '../sort.js';
import { vibe } from '@meshpoke/shared/vibe';
import { POKE_RULES } from '@meshpoke/shared';

/** T11.2 poke + connection endpoints (PRD §3.4, §12.4). */
export function registerPokes(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);
  const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

  const connected = async (a: string, b: string) =>
    rows(await db.execute(sql`
      select 1 from connections
       where active and least(user_a, user_b) = least(${a}::uuid, ${b}::uuid)
         and greatest(user_a, user_b) = greatest(${a}::uuid, ${b}::uuid)`)).length > 0;

  const openDm = async (a: string, b: string) => {
    const r = rows(await db.execute(sql`
      insert into rooms (kind) values ('dm') returning id`));
    const roomId = r[0].id as string;
    await db.execute(sql`insert into room_members (room_id, user_id) values (${roomId}::uuid, ${a}::uuid), (${roomId}::uuid, ${b}::uuid) on conflict do nothing`);
    return roomId;
  };

  const createConnection = async (a: string, b: string) => {
    const r = rows(await db.execute(sql`
      insert into connections (user_a, user_b, active)
      values (least(${a}::uuid, ${b}::uuid), greatest(${a}::uuid, ${b}::uuid), true)
      on conflict do nothing
      returning id`));
    let connId = r[0]?.id as string | undefined;
    if (!connId) {
      const ex = rows(await db.execute(sql`
        select id from connections
         where least(user_a, user_b) = least(${a}::uuid, ${b}::uuid)
           and greatest(user_a, user_b) = greatest(${a}::uuid, ${b}::uuid)`));
      connId = ex[0].id as string;
      await db.execute(sql`update connections set active = true, disconnected_at = null, disconnected_by = null where id = ${connId}::uuid`);
    }
    const roomId = await openDm(a, b);
    return { connId, roomId };
  };

  app.post<{ Body: unknown }>('/pokes', { config: { rateLimit: { max: 30 } }, preHandler: [app.authenticate] }, async (req, reply) => {
    const from = req.user!.id;
    const body = z.object({
      to: z.string().uuid(),
      note: z.string().max(500).optional(),
      source: z.enum(['map', 'room', 'people_you_met', 'profile', 'inbox']),
      spotId: z.string().uuid().optional(),
    }).safeParse(req.body);
    if (!body.success) return reply.code(422).send({ problem: { title: 'Invalid poke', status: 422 } });
    const { to, note, source, spotId } = body.data;
    if (to === from) return reply.code(422).send({ problem: { title: 'Cannot poke yourself', status: 422 } });

    // phone-verified gate
    const me = rows(await db.execute(sql`select phone_verified_at, deleted_at from users where id = ${from}::uuid`));
    if (me.length === 0 || me[0].phone_verified_at === null) return reply.code(403).send({ problem: { title: 'Phone verification required', status: 403 } });
    const them = rows(await db.execute(sql`select deleted_at from users where id = ${to}::uuid`));
    if (them.length === 0 || them[0].deleted_at) return reply.code(404).send({ problem: { title: 'User not found', status: 404 } });

    // blocks (either direction)
    const blocked = rows(await db.execute(sql`
      select 1 from blocks
       where (blocker_id = ${from}::uuid and blocked_id = ${to}::uuid)
          or (blocker_id = ${to}::uuid and blocked_id = ${from}::uuid)`));
    if (blocked.length > 0) return reply.code(403).send({ problem: { title: 'Not available', status: 403 } });

    // already connected → no need
    if (await connected(from, to)) return reply.code(409).send({ problem: { title: 'Already connected', status: 409 } });

    // one pending poke per direction
    const dup = rows(await db.execute(sql`
      select 1 from pokes where from_user = ${from}::uuid and to_user = ${to}::uuid and status = 'pending' and expires_at > now()`));
    if (dup.length > 0) return reply.code(409).send({ problem: { title: 'Poke already pending', status: 409 } });

    // poke back → instant connection, both pokes returned
    const theirPending = rows(await db.execute(sql`
      select id from pokes where from_user = ${to}::uuid and to_user = ${from}::uuid and status = 'pending' and expires_at > now()`));
    const plan = await getPlan(dbUrl, from);
    const noteLimit = plan === 'pro' ? 500 : 200;
    if (note && note.length > noteLimit) return reply.code(422).send({ problem: { title: `Note max ${noteLimit} chars on ${plan}`, status: 422 } });

    if (theirPending.length > 0) {
      const { connId, roomId } = await createConnection(from, to);
      await db.execute(sql`update pokes set status = 'returned' where id = ${theirPending[0].id}::uuid`);
      await notify(dbUrl, from, 'pokes', 'connection', { with: to, roomId });
      await notify(dbUrl, to, 'pokes', 'connection', { with: from, roomId });
      const mine = rows(await db.execute(sql`
        insert into pokes (from_user, to_user, note, source, spot_id, cost_type, status, expires_at)
        values (${from}::uuid, ${to}::uuid, ${note ?? null}, ${source}::poke_source, ${spotId ?? null}::uuid, 'free_poke_back', 'returned', now() + interval '${sql.raw(String(POKE_RULES.expiryDays))} days')
        returning id`));
      capture('poke_back', from, { to });
      return reply.code(201).send({ pokeBack: true, connectionId: connId, roomId, pokeId: mine[0].id });
    }

    // normal poke: resolve cost, charge, insert
    const allowance = plan === 'pro' ? 50 : plan === 'plus' ? 20 : 5;
    const cost = await resolvePokeCost(db, from, to, allowance);
    if ('error' in cost) return reply.code(402).send({ problem: { title: 'No pokes left this week', status: 402, type: 'cap', capType: 'weeklyPokes' } });
    await chargePoke(db, from, cost.cost);
    await ensureBalanceReset(db, from);
    const ins = rows(await db.execute(sql`
      insert into pokes (from_user, to_user, note, source, spot_id, cost_type, status, expires_at)
      values (${from}::uuid, ${to}::uuid, ${note ?? null}, ${source}::poke_source, ${spotId ?? null}::uuid, ${cost.cost}::poke_cost_type, 'pending', now() + interval '${sql.raw(String(POKE_RULES.expiryDays))} days')
      returning id, expires_at`));
    await notify(dbUrl, to, 'pokes', 'poke_received', { from, pokeId: ins[0].id });
    capture('poke_sent', from, { to, source, costType: cost.cost });
    return reply.code(201).send({ pokeBack: false, cost: cost.cost, pokeId: ins[0].id, expiresAt: ins[0].expires_at });
  });

  /** incoming pokes — Recommended (same weighted sort) or FIFO; trust attached */
  app.get<{ Querystring: { sort?: string } }>('/pokes/incoming', { preHandler: [app.authenticate] }, async (req) => {
    const me = req.user!.id;
    const sort = req.query?.sort === 'fifo' ? 'fifo' : 'recommended';
    const pokes = rows(await db.execute(sql`
      select p.id, p.from_user as "fromUserId", p.note, p.source, p.spot_id as "spotId", p.created_at as "createdAt",
             coalesce(e.plan, 'free') as plan,
             u.display_name as "displayName",
             coalesce(json_agg(json_build_object('keyword', k.keyword, 'level', k.level)) filter (where k.keyword is not null), '[]') as keywords,
             ${trustExpr(me)}
        from pokes p
        join users u on u.id = p.from_user
        left join entitlements e on e.user_id = p.from_user and (e.expires_at is null or e.expires_at > now())
        left join keywords k on k.user_id = p.from_user
       where p.to_user = ${me}::uuid and p.status = 'pending' and p.expires_at > now()
         and not exists (select 1 from blocks b
             where (b.blocker_id = ${me}::uuid and b.blocked_id = p.from_user)
                or (b.blocker_id = p.from_user and b.blocked_id = ${me}::uuid))
       group by p.id, e.plan, u.id`));
    const myKw = rows(await db.execute(sql`select keyword, level from keywords where user_id = ${me}::uuid`))
      .map((k) => ({ keyword: String(k.keyword).toLowerCase(), level: k.level as number }));
    const { fetchFlag } = await import('../analytics.js');
    const weights = await currentSortWeights(() => fetchFlag('admin', 'sort-weights'));
    const scored = pokes.map((p): Record<string, unknown> => {
      const kw = ((p.keywords as { keyword: string; level: number }[]) ?? []).map((k) => ({ keyword: k.keyword.toLowerCase(), level: k.level }));
      const vibeVal = vibe(kw, myKw);
      return { ...p, keywords: kw, score: recommendedScore({ tier: p.plan as 'free' | 'plus' | 'pro', vibe: vibeVal, score: p.trust && (p.trust as { score: string | null }).score ? Number((p.trust as { score: string }).score) : null }, weights) };
    });
    scored.sort((x, y) => (sort === 'fifo' ? String(x.createdAt).localeCompare(String(y.createdAt)) : (y.score as number) - (x.score as number) || String(x.createdAt).localeCompare(String(y.createdAt))));
    return { sort, pokes: scored };
  });

  app.get('/connections', { preHandler: [app.authenticate] }, async (req) => {
    const me = req.user!.id;
    const list = rows(await db.execute(sql`
      select c.id, c.active, c.created_at as "createdAt",
             case when c.user_a = ${me}::uuid then c.user_b else c.user_a end as "userId",
             u.display_name as "displayName"
        from connections c
        join users u on u.id = case when c.user_a = ${me}::uuid then c.user_b else c.user_a end
       where c.user_a = ${me}::uuid or c.user_b = ${me}::uuid
       order by c.active desc, c.created_at desc`));
    // dm room ids for active connections
    for (const c of list) {
      const room = rows(await db.execute(sql`
        select r.id from rooms r
        join room_members m1 on m1.room_id = r.id and m1.user_id = ${me}::uuid
        join room_members m2 on m2.room_id = r.id and m2.user_id = ${c.userId}::uuid
        where r.kind = 'dm' limit 1`));
      c.roomId = room[0]?.id ?? null;
    }
    return { connections: list };
  });

  app.post<{ Params: { id: string } }>('/connections/:id/disconnect', { preHandler: [app.authenticate] }, async (req, reply) => {
    const me = req.user!.id;
    const r = rows(await db.execute(sql`
      update connections set active = false, disconnected_at = now(), disconnected_by = ${me}::uuid
       where id = ${req.params.id}::uuid and (user_a = ${me}::uuid or user_b = ${me}::uuid) and active
       returning id`));
    if (r.length === 0) return reply.code(404).send({ problem: { title: 'Connection not found', status: 404 } });
    // close DM for both (silent)
    await db.execute(sql`
      update room_members rm set left_at = now()
        from rooms r
       where rm.room_id = r.id and r.kind = 'dm'
         and exists (select 1 from room_members x where x.room_id = r.id and x.user_id in (
           (select user_a from connections where id = ${req.params.id}::uuid),
           (select user_b from connections where id = ${req.params.id}::uuid)))
         and rm.left_at is null`);
    return { disconnected: true };
  });

  /** people you met — 48h after a done spot, attendees only */
  app.get<{ Params: { spotId: string } }>('/people-you-met/:spotId', { preHandler: [app.authenticate] }, async (req, reply) => {
    const me = req.user!.id;
    const spot = rows(await db.execute(sql`
      select starts_at, state from spots where id = ${req.params.spotId}::uuid`));
    if (spot.length === 0) return reply.code(404).send({ problem: { title: 'Spot not found', status: 404 } });
    const s = spot[0];
    if (s.state !== 'done') return reply.code(422).send({ problem: { title: 'Spot not finished', status: 422 } });
    const started = new Date(String(s.starts_at)).getTime();
    const within = Date.now() - started <= POKE_RULES.postSpotWindowHours * 3600_000;
    const mine = rows(await db.execute(sql`
      select 1 from attendance where spot_id = ${req.params.spotId}::uuid and user_id = ${me}::uuid and status in ('attended','forgiven')`));
    if (mine.length === 0) return reply.code(403).send({ problem: { title: 'Attendees only', status: 403 } });
    const others = rows(await db.execute(sql`
      select a.user_id as "userId", u.display_name as "displayName", ${trustExpr(me)}
        from attendance a join users u on u.id = a.user_id
       where a.spot_id = ${req.params.spotId}::uuid and a.user_id <> ${me}::uuid
         and a.status in ('attended','forgiven')`));
    return { spotId: req.params.spotId, windowOpen: within, closesAt: new Date(started + POKE_RULES.postSpotWindowHours * 3600_000).toISOString(), people: others };
  });
}
