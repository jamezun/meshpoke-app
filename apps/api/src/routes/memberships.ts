/**
 * T20.2: memberships API + T20.3: level engine.
 * Caps 25/100/∞; founding circle 2–25 excluded from caps; waitlist 24h claim
 * window for free, auto-join Plus/Pro at 2×/3× weight; 60d attribution window;
 * nightly decay/release; member visit → level recompute + notify.
 */
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb, type Db } from '../db/client.js';
import { MERCHANT_RULES } from '@meshpoke/shared/constants';
import { notify } from '../notify.js';
import { capture } from '../analytics.js';

export function registerMemberships(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);
  const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

  const venueCap = (tier: string) => {
    const caps = MERCHANT_RULES.venueMemberCaps as Record<string, number>;
    return caps[tier] ?? 25;
  };

  // ── POST /venues/:id/membership — join ──
  app.post<{ Params: { id: string } }>('/venues/:id/membership', { preHandler: [app.authenticate] }, async (req, reply) => {
    const uid = req.user!.id;
    const phone = (req.user as { phoneVerified?: boolean }).phoneVerified;
    if (!phone) return reply.code(403).send({ problem: { title: 'Phone verification required', status: 403 } });

    const v = rows(await db.execute(sql`
      select v.id, m.tier from venues v left join merchant_accounts m on m.venue_id = v.id and m.claim_status = 'approved'
       where v.id = ${req.params.id}::uuid limit 1`));
    if (!v[0]) return reply.code(404).send({ problem: { title: 'Venue not found', status: 404 } });
    const tier = (v[0].tier as string) ?? 'starter';

    const existing = rows(await db.execute(sql`
      select id, status, kind from memberships where venue_id = ${req.params.id}::uuid and user_id = ${uid}::uuid limit 1`));
    if (existing[0]?.status === 'active' || existing[0]?.status === 'waitlisted') {
      return reply.code(409).send({ problem: { title: 'Already a member', status: 409 } });
    }

    // user-side cap: merchant spots joined per user — per PRD free 10/plus 30/pro ∞ via TIER_CAPS.merchantSpots
    const { getCaps, getPlan } = await import('../entitlements.js');
    const plan = await getPlan(dbUrl, uid);
    const caps = getCaps(plan);
    const joined = rows(await db.execute(sql`
      select count(*)::int as n from memberships where user_id = ${uid}::uuid and status = 'active'`));
    if (Number(joined[0].n) >= caps.merchantSpots) {
      return reply.code(402).send({ problem: { title: `Merchant spots cap (${caps.merchantSpots})`, status: 402, type: 'cap', capType: 'merchantSpots' } });
    }

    // venue cap (founding circle excluded)
    const activeCount = rows(await db.execute(sql`
      select count(*)::int as n from memberships where venue_id = ${req.params.id}::uuid and status = 'active' and kind = 'member'`));
    const cap = venueCap(tier);
    const full = Number(activeCount[0].n) >= cap;

    if (existing[0]) {
      await db.execute(sql`delete from memberships where id = ${existing[0].id}::uuid`);
    }
    const attributionUntil = new Date(Date.now() + MERCHANT_RULES.attributionWindowDays * 86400_000);
    const status = full ? 'waitlisted' : 'active';
    const ins = rows(await db.execute(sql`
      insert into memberships (venue_id, user_id, kind, status, level_position, joined_via_meshpoke, attribution_until)
      values (${req.params.id}::uuid, ${uid}::uuid, 'member', ${status}, 0, true, ${attributionUntil})
      returning id, status`));
    capture('membership_joined', uid, { venueId: req.params.id, status });
    return reply.code(201).send({ id: ins[0].id, status, position: full ? cap + 1 : null });
  });

  // ── DELETE /venues/:id/membership — leave ──
  app.delete<{ Params: { id: string } }>('/venues/:id/membership', { preHandler: [app.authenticate] }, async (req, reply) => {
    const r = rows(await db.execute(sql`
      update memberships set status = 'released', released_at = now()
       where venue_id = ${req.params.id}::uuid and user_id = ${req.user!.id}::uuid and status in ('active','waitlisted')
       returning id`));
    if (r.length === 0) return reply.code(404).send({ problem: { title: 'Not a member', status: 404 } });
    // backfill: waitlist release runs in nightly job (T20.3 sweep); immediate auto-join for Plus/Pro here
    await backfillWaitlist(db, dbUrl, req.params.id);
    return { ok: true };
  });

  // ── merchant: founding circle assignment (2–25, excluded from caps) ──
  app.post('/merchant/founding-circle', {
    preHandler: [app.authenticate],
    schema: { body: z.object({ userId: z.string().uuid() }) },
  }, async (req, reply) => {
    const b = req.body as { userId: string };
    const me = rows(await db.execute(sql`
      select m.venue_id from merchant_accounts m
       where m.owner_user_id = ${req.user!.id}::uuid and m.claim_status = 'approved' limit 1`));
    if (!me[0]) return reply.code(404).send({ problem: { title: 'No claimed venue', status: 404 } });
    const venueId = String(me[0].venue_id);

    const circle = rows(await db.execute(sql`
      select count(*)::int as n from memberships where venue_id = ${venueId}::uuid and kind = 'founding_circle'`));
    if (Number(circle[0].n) >= 25) {
      return reply.code(409).send({ problem: { title: 'Founding circle full (25)', status: 409 } });
    }
    const dup = rows(await db.execute(sql`
      select 1 from memberships where venue_id = ${venueId}::uuid and user_id = ${b.userId}::uuid and status = 'active' limit 1`));
    if (dup.length) return reply.code(409).send({ problem: { title: 'Already a member', status: 409 } });
    await db.execute(sql`
      insert into memberships (venue_id, user_id, kind, status, level_position, joined_via_meshpoke, attribution_until)
      values (${venueId}::uuid, ${b.userId}::uuid, 'founding_circle', 'active', 0, true, now() + interval '60 days')
      on conflict do nothing`);
    return reply.code(201).send({ ok: true });
  });

  // ── GET /me/memberships — wallet view ──
  app.get('/me/memberships', { preHandler: [app.authenticate] }, async (req) => {
    const r = rows(await db.execute(sql`
      select m.id, m.kind, m.status, m.level_position, m.visits_count, m.last_visit_at, m.joined_at,
             v.display_name, v.id as venue_id
        from memberships m join venues v on v.id = m.venue_id
       where m.user_id = ${req.user!.id}::uuid and m.status in ('active','waitlisted')
       order by m.joined_at desc`));
    return { memberships: r };
  });

  // ── waitlist backfill: Plus/Pro auto-join (2×/3× weight = drawn first), free 24h window ──
  async function backfillWaitlist(db: Db, dbUrl: string, venueId: string) {
    const active = rows(await db.execute(sql`
      select count(*)::int as n from memberships where venue_id = ${venueId}::uuid and status = 'active' and kind = 'member'`));
    const v = rows(await db.execute(sql`select m.tier from merchant_accounts m where m.venue_id = ${venueId}::uuid and m.claim_status='approved' limit 1`));
    const cap = venueCap((v[0]?.tier as string) ?? 'starter');
    let free = cap - Number(active[0].n);
    if (free <= 0) return;
    // weighted draw: pro 3, plus 2, free 1 — within each weight, joined_at asc
    const waiting = rows(await db.execute(sql`
      select w.id, w.user_id,
             case coalesce(e.plan, 'free') when 'pro' then 3 when 'plus' then 2 else 1 end as weight
        from memberships w
        left join entitlements e on e.user_id = w.user_id
       where w.venue_id = ${venueId}::uuid and w.status = 'waitlisted'
       order by 3 desc, w.joined_at asc`));
    for (const w of waiting) {
      if (free <= 0) break;
      // free users wait 24h on the list before claiming (fairness); plus/pro auto-join
      const plan = rows(await db.execute(sql`select plan from entitlements where user_id = ${w.user_id}::uuid`));
      const isPaid = ['plus', 'pro'].includes(String(plan[0]?.plan));
      if (!isPaid) {
        const age = rows(await db.execute(sql`
          select extract(epoch from now() - joined_at)/3600 >= 24 as ready from memberships where id = ${w.id}::uuid`));
        if (!age[0]?.ready) continue;
      }
      await db.execute(sql`update memberships set status = 'active', joined_at = now() where id = ${w.id}::uuid`);
      free--;
      await notify(dbUrl, String(w.user_id), 'spots', 'membership_active', { venueId });
    }
  }

  // ── T20.3: internal sweep — decay/release/level recompute (nightly) ──
  app.post('/internal/membership-sweep', { preHandler: [app.authenticate, app.requireAdminRole('superadmin')] }, async () => {
    // 1) release: active member, no visit for 60 days
    const released = rows(await db.execute(sql`
      update memberships m set status = 'released', released_at = now()
       where m.status = 'active' and m.kind = 'member'
         and coalesce(m.last_visit_at, m.joined_at) < now() - interval '60 days'
       returning id, venue_id, user_id`));
    // 2) decay: drop one level if no visit within the venue's inactivity window
    const decayed = rows(await db.execute(sql`
      with cfg as (select venue_id, inactivity_days from ladder_configs)
      update memberships m set level_position = greatest(coalesce(m.level_position,1) - 1, 1)
       from cfg c
       where c.venue_id = m.venue_id and m.status = 'active' and m.level_position > 1
         and m.last_visit_at < now() - (c.inactivity_days || ' days')::interval
       returning m.id`));
    // 3) recompute levels up: visits + months thresholds
    const ups = rows(await db.execute(sql`
      with best as (
        select m.id as membership_id, max(l.position) as pos
          from memberships m
          join ladder_levels l on l.venue_id = m.venue_id and l.effective_from <= now()
         where m.status = 'active'
           and m.visits_count >= l.min_visits
           and extract(epoch from (now() - m.joined_at))/2592000 >= l.min_months
         group by m.id)
      update memberships m set level_position = best.pos
        from best where best.membership_id = m.id and coalesce(m.level_position,0) < best.pos
       returning m.id, m.user_id, m.level_position, m.venue_id`));
    for (const u of ups) {
      await notify(dbUrl, String(u.user_id), 'spots', 'membership_level_up', { venueId: String(u.venue_id), level: Number(u.level_position) });
    }
    // 4) waitlist backfill for venues with freed seats or open waitlists
    const venueSet = new Set<string>(released.map((r) => String(r.venue_id)));
    const waiting = rows(await db.execute(sql`select distinct venue_id from memberships where status = 'waitlisted'`));
    for (const w of waiting) venueSet.add(String(w.venue_id));
    for (const v of venueSet) await backfillWaitlist(db, dbUrl, v);
    return { released: released.length, decayed: decayed.length, leveledUp: ups.length };
  });
}
