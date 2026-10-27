import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { Pool, type PoolClient } from 'pg';
import { z } from 'zod';
import { MERCHANT_PER_SEAT_BANDS } from '@meshpoke/shared/constants';
import { getDb } from '../db/client.js';

const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;
const TIER_DROPS = { starter: { active: 1, perWeek: 1 }, growth: { active: 3, perWeek: 3 }, pro: { active: Infinity, perWeek: Infinity } } as const;

/**
 * T15.3 drops (individual + group): merchant CRUD w/ tier limits, cost estimate w/ >20% info flag,
 * user claim w/ row-lock capacity, budget-cap auto-pause.
 */
export function registerDrops(app: FastifyInstance, dbUrl: string): void {
  const db = getDb(dbUrl);

  // ── merchant CRUD ──
  app.post('/merchant/drops', {
    preHandler: app.authenticate,
    schema: { body: z.object({
      kind: z.enum(['individual', 'group']),
      title: z.string().min(3).max(80),
      offerText: z.string().min(3).max(300),
      perkCostEstimate: z.number().min(0).max(100000).optional(),
      capacity: z.number().int().min(1).max(1000),
      minGroupSize: z.number().int().min(2).max(20).optional(),
      sponsored: z.boolean().default(false),
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
      discountPct: z.number().min(0).max(100).optional(),
    }) },
  }, async (req, reply) => {
    const me = req.user!.id;
    type DropBody = {
      kind: 'individual' | 'group'; title: string; offerText: string;
      perkCostEstimate?: number; capacity: number; minGroupSize?: number;
      sponsored: boolean; startsAt: string; endsAt: string; discountPct?: number;
    };
    const b = req.body as unknown as DropBody;
    if (b.kind === 'group' && !b.minGroupSize) return reply.code(422).send({ title: 'group drops need minGroupSize' });
    if (b.discountPct !== undefined && b.discountPct > 20 && !b.perkCostEstimate) {
      return reply.code(422).send({ title: 'Discounts above 20% need a perkCostEstimate (info flag)' });
    }

    const m = rows(await db.execute(sql`
      select ma.id, ma.tier, ma.monthly_budget_cap, ma.price_band,
             coalesce((select i.seat_amount from invoices i
                        where i.merchant_id = ma.id and i.period = to_char(now(), 'YYYY-MM')), 0) as mtd
        from merchant_accounts ma
       where ma.owner_user_id = ${me}::uuid and ma.claim_status = 'approved' limit 1`));
    if (!m[0]) return reply.code(403).send({ title: 'No approved merchant account' });
    const tier = (m[0].tier ?? 'starter') as 'starter' | 'growth' | 'pro';

    // tier limit: active drops
    const active = rows(await db.execute(sql`
      select count(*)::int as n from drops where venue_id = (select venue_id from merchant_accounts where id = ${m[0].id}::uuid) and status = 'active'`));
    const lim: number = TIER_DROPS[tier].active;
    if ((active[0].n as number) >= lim) {
      return reply.code(402).send({ title: `Plan limit: ${lim} active drop${lim === 1 ? '' : 's'} on ${tier}`, plan: tier });
    }

    // budget cap: month-to-date billable ≥ cap → drops auto-paused (refuse new)
    const cap = Number(m[0].monthly_budget_cap ?? 0);
    if (cap > 0 && Number(m[0].mtd) >= cap) {
      return reply.code(402).send({ title: 'Monthly budget cap reached — drops paused' });
    }

    const ins = rows(await db.execute(sql`
      insert into drops (venue_id, kind, title, offer_text, perk_cost_estimate, capacity, min_group_size, sponsored, starts_at, ends_at, status)
      select venue_id, ${b.kind}, ${b.title}, ${b.offerText}, ${b.perkCostEstimate ?? null}, ${b.capacity},
             ${b.minGroupSize ?? null}, ${b.sponsored === true}, ${b.startsAt}, ${b.endsAt}, 'active'
        from merchant_accounts where id = ${m[0].id}::uuid
      returning id`));
    const dropId = ins[0].id as string;
    const autoClaimed = await autoClaimForSavedVenues(db, dropId, m[0].id as string, b.capacity);
    return reply.code(201).send({ dropId, autoClaimed, infoFlag: b.discountPct !== undefined && b.discountPct > 20 });
  });

  app.patch<{ Params: { id: string } }>('/merchant/drops/:id', {
    preHandler: app.authenticate,
    schema: { params: z.object({ id: z.string().uuid() }), body: z.object({
      status: z.enum(['paused', 'active', 'ended']).optional(),
      title: z.string().min(3).max(80).optional(),
      offerText: z.string().min(3).max(300).optional(),
    }) },
  }, async (req, reply) => {
    const b = req.body as { status?: string; title?: string; offerText?: string };
    const owned = rows(await db.execute(sql`
      select 1 from drops d join merchant_accounts ma on ma.venue_id = d.venue_id
       where d.id = ${req.params.id}::uuid and ma.owner_user_id = ${req.user!.id}::uuid`));
    if (!owned[0]) return reply.code(404).send({ title: 'Not found' });
    await db.execute(sql`
      update drops set
        status = coalesce(${b.status ?? null}, status),
        title = coalesce(${b.title ?? null}, title),
        offer_text = coalesce(${b.offerText ?? null}, offer_text)
      where id = ${req.params.id}::uuid`);
    return { ok: true };
  });

  // estimated cost per guest (offer value estimate + band fee; info flag >20%)
  app.get<{ Params: { id: string } }>('/merchant/drops/:id/cost-estimate', {
    preHandler: app.authenticate,
    schema: { params: z.object({ id: z.string().uuid() }) },
  }, async (req, reply) => {
    const d = rows(await db.execute(sql`
      select d.*, ma.price_band, ma.tier from drops d
        join merchant_accounts ma on ma.venue_id = d.venue_id
       where d.id = ${req.params.id}::uuid and ma.owner_user_id = ${req.user!.id}::uuid`));
    if (!d[0]) return reply.code(404).send({ title: 'Not found' });
    const seats = Number(d[0].price_band ?? 50);
    const band = MERCHANT_PER_SEAT_BANDS.find((x: { maxSeats: number | null }) => x.maxSeats === null || x.maxSeats >= seats)
      ?? MERCHANT_PER_SEAT_BANDS[MERCHANT_PER_SEAT_BANDS.length - 1];
    const bandFee = band.feeHkd;
    const multiplier = d[0].sponsored ? 1.5 : 1;
    return {
      perkCostEstimate: Number(d[0].perk_cost_estimate ?? 0),
      seatFee: bandFee * multiplier,
      totalPerGuest: Number(d[0].perk_cost_estimate ?? 0) + bandFee * multiplier,
      sponsored: d[0].sponsored, multiplier,
      infoFlag: Number(d[0].perk_cost_estimate ?? 0) > 0 && d[0].kind === 'individual',
    };
  });

  // ── user side ──
  app.get<{ Params: { id: string } }>('/venues/:id/drops', {
    schema: { params: z.object({ id: z.string().uuid() }) },
  }, async (req) => {
    const list = rows(await db.execute(sql`
      select id, kind, title, offer_text, capacity, claimed_count, min_group_size, sponsored, starts_at, ends_at
        from drops
       where venue_id = ${req.params.id}::uuid and status = 'active'
         and now() between starts_at and ends_at
       order by sponsored desc, starts_at`));
    return { drops: list };
  });

  app.post<{ Params: { id: string } }>('/drops/:id/claim', {
    preHandler: app.authenticate,
  }, async (req, reply) => {
    const me = req.user!.id;
    // phone-verified gate
    const u = rows(await db.execute(sql`select phone_verified_at is not null as ok from users where id = ${me}::uuid`));
    if (!u[0]?.ok) return reply.code(403).send({ title: 'Phone verification required' });

    // row-lock capacity + exactly-once claim (unique index + FOR UPDATE)
    const pool = new Pool({ connectionString: dbUrl });
    const client: PoolClient = await pool.connect();
    try {
      await client.query('begin');
      const d = (await client.query(`select id, venue_id, capacity, claimed_count, kind, status from drops where id = $1::uuid for update`, [req.params.id])).rows;
      if (!d[0] || d[0].status !== 'active') { await client.query('rollback'); return reply.code(404).send({ title: 'Drop not active' }); }
      if (Number(d[0].claimed_count) >= Number(d[0].capacity)) { await client.query('rollback'); return reply.code(409).send({ title: 'Drop full' }); }
      const upd = await client.query(
        `update drops set claimed_count = claimed_count + 1 where id = $1::uuid returning claimed_count`, [req.params.id]);
      const ins = await client.query(
        `insert into drop_claims (drop_id, user_id) values ($1::uuid, $2::uuid) returning id`, [req.params.id, me]);
      await client.query('commit');
      return reply.code(201).send({ claimId: ins.rows[0].id, claimedCount: upd.rows[0].claimed_count });
    } catch (e) {
      await client.query('rollback');
      if (String(e).includes('drop_claims_unique_idx')) return reply.code(409).send({ title: 'Already claimed' });
      throw e;
    } finally {
      client.release();
      await pool.end();
    }
  });

  // attach group drop at schedule time (host)
  app.post<{ Params: { id: string } }>('/spots/:id/group-drop', {
    preHandler: app.authenticate,
    schema: { params: z.object({ id: z.string().uuid() }), body: z.object({ dropId: z.string().uuid() }) },
  }, async (req, reply) => {
    const { dropId } = req.body as { dropId: string };
    // host check + venue match + drop active group
    const r = rows(await db.execute(sql`
      select s.host_user_id, s.venue_id, d.kind, d.status, d.capacity, d.claimed_count, now() < d.ends_at as live
        from spots s left join drops d on d.id = ${dropId}::uuid
       where s.id = ${req.params.id}::uuid`));
    if (!r[0]) return reply.code(404).send({ title: 'Spot not found' });
    if (r[0].host_user_id !== req.user!.id) return reply.code(403).send({ title: 'Host only' });
    if (!r[0].live || r[0].kind !== 'group' || r[0].status !== 'active') {
      return reply.code(422).send({ title: 'Drop not an active group drop' });
    }
    const spotVenue = rows(await db.execute(sql`select venue_id from spots where id = ${req.params.id}::uuid`));
    const dropVenue = rows(await db.execute(sql`select venue_id from drops where id = ${dropId}::uuid`));
    if (spotVenue[0].venue_id !== dropVenue[0].venue_id) {
      return reply.code(422).send({ title: 'Drop belongs to a different venue' });
    }
    await db.execute(sql`
      insert into drop_claims (drop_id, user_id, spot_id)
      select ${dropId}::uuid, sm.user_id, ${req.params.id}::uuid
        from spot_members sm
       where sm.spot_id = ${req.params.id}::uuid and sm.state = 'active' and sm.role in ('host','member')
      on conflict do nothing`);
    const n = rows(await db.execute(sql`
      select count(*)::int as n from drop_claims where drop_id = ${dropId}::uuid and spot_id = ${req.params.id}::uuid`));
    if ((n[0].n as number) > Number(r[0].capacity) - Number(r[0].claimed_count)) {
      // roll back (over capacity)
      await db.execute(sql`delete from drop_claims where drop_id = ${dropId}::uuid and spot_id = ${req.params.id}::uuid`);
      return reply.code(409).send({ title: 'Group exceeds drop capacity' });
    }
    await db.execute(sql`
      update drops set claimed_count = claimed_count + ${n[0].n} where id = ${dropId}::uuid`);
    return reply.code(201).send({ attached: n[0].n });
  });
}


/**
 * T17.4 drop auto-claim: Plus/Pro users who saved this venue get the drop
 * auto-claimed (1/wk Plus, 3/wk Pro) — never beyond capacity, never for groups.
 */
async function autoClaimForSavedVenues(db: ReturnType<typeof getDb>, dropId: string, merchantId: string, capacity: number | null): Promise<number> {
  if (capacity !== null && capacity <= 0) return 0;
  const claimed = await db.execute(sql`
    with fans as (
      select sv.user_id, coalesce(e.plan, 'free') as plan
        from saved_venues sv
        join venues v on v.id = sv.venue_id
        join merchant_accounts ma on ma.venue_id = v.id and ma.id = ${merchantId}::uuid
        left join entitlements e on e.user_id = sv.user_id and (e.expires_at is null or e.expires_at > now())
       where coalesce(e.plan, 'free') in ('plus', 'pro')
         and not exists (select 1 from drop_claims c where c.drop_id = ${dropId}::uuid and c.user_id = sv.user_id)
         and (select count(*) from drop_claims c2
               join drops d2 on d2.id = c2.drop_id and d2.venue_id = v.id
              where c2.user_id = sv.user_id and c2.claimed_at > now() - interval '7 days')
             < case coalesce(e.plan, 'free') when 'pro' then 3 when 'plus' then 1 else 0 end
    ),
    inserted as (
      insert into drop_claims (drop_id, user_id)
      select ${dropId}::uuid, user_id from (
        select user_id, row_number() over () as rn from fans
      ) f
       where (select count(*) from drop_claims c3 where c3.drop_id = ${dropId}::uuid)
             + f.rn <= coalesce((select capacity from drops where id = ${dropId}::uuid), 2147483647)
      on conflict do nothing
      returning 1
    )
    select count(*)::int as n from inserted`);
  const n = Number(((claimed as unknown as { rows: { n: number }[] }).rows[0] ?? { n: 0 }).n);
  if (n > 0) {
    await db.execute(sql`update drops set claimed_count = claimed_count + ${n} where id = ${dropId}::uuid`);
  }
  return n;
}
