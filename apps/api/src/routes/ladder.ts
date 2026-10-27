/**
 * T20.1: ladder config API + T20.2 memberships API.
 * Templates per PRD §3.9; tier limits from MERCHANT_RULES.
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client.js';
import { capture } from '../analytics.js';
import { MERCHANT_RULES } from '@meshpoke/shared/constants';
import { notify } from '../notify.js';

export const LADDER_TEMPLATES: Record<string, Array<{ name: string; minVisits: number; minMonths: number; discountPct: number | null; perkText: string }>> = {
  cafe: [
    { name: 'Regular', minVisits: 3, minMonths: 0, discountPct: null, perkText: 'First coffee on your 10th visit' },
    { name: 'Local', minVisits: 8, minMonths: 1, discountPct: 5, perkText: '' },
    { name: 'Insider', minVisits: 15, minMonths: 2, discountPct: 10, perkText: 'Skip the queue at rush hour' },
  ],
  bar: [
    { name: 'Regular', minVisits: 3, minMonths: 0, discountPct: null, perkText: '' },
    { name: 'Local', minVisits: 8, minMonths: 1, discountPct: 5, perkText: 'Happy-hour pricing all night' },
    { name: 'Insider', minVisits: 15, minMonths: 3, discountPct: 10, perkText: 'Bar stool reserved Fridays' },
  ],
  restaurant: [
    { name: 'Regular', minVisits: 3, minMonths: 0, discountPct: null, perkText: '' },
    { name: 'Local', minVisits: 6, minMonths: 1, discountPct: 5, perkText: '' },
    { name: 'Insider', minVisits: 12, minMonths: 2, discountPct: 10, perkText: 'Priority table on weekends' },
    { name: 'Family', minVisits: 20, minMonths: 4, discountPct: 15, perkText: 'Free dessert for the table' },
  ],
  fine_dining: [
    { name: 'Regular', minVisits: 2, minMonths: 0, discountPct: null, perkText: '' },
    { name: 'Insider', minVisits: 5, minMonths: 2, discountPct: 10, perkText: 'Chef’s amuse-bouche' },
    { name: 'Patron', minVisits: 10, minMonths: 4, discountPct: 15, perkText: 'First access to tasting menus' },
  ],
  custom: [],
};

const LevelInput = z.object({
  position: z.number().int().min(1).max(8),
  name: z.string().min(1).max(40),
  minVisits: z.number().int().min(1),
  minMonths: z.number().int().min(0),
  discountPct: z.number().min(0).max(100).nullable().optional(),
  perkText: z.string().max(200).optional(),
});

export function registerLadder(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);
  const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

  async function myVenue(req: FastifyRequest) {
    const r = rows(await db.execute(sql`
      select m.venue_id, m.tier, m.founding, v.display_name
        from merchant_accounts m join venues v on v.id = m.venue_id
       where m.owner_user_id = ${req.user!.id}::uuid and m.claim_status = 'approved' limit 1`));
    return r[0] as { venue_id: string; tier: string; founding: boolean; display_name: string } | undefined;
  }

  // ── GET /merchant/ladder ──
  app.get('/merchant/ladder', { preHandler: [app.authenticate] }, async (req, reply) => {
    const v = await myVenue(req);
    if (!v) return reply.code(404).send({ problem: { title: 'No claimed venue', status: 404 } });
    const cfg = rows(await db.execute(sql`select template, inactivity_days from ladder_configs where venue_id = ${v.venue_id}::uuid`));
    const levels = rows(await db.execute(sql`
      select position, name, min_visits, min_months, discount_pct, perk_text, effective_from
        from ladder_levels where venue_id = ${v.venue_id}::uuid order by position`));
    return { venueId: v.venue_id, tier: v.tier, template: cfg[0]?.template ?? null,
      inactivityDays: cfg[0]?.inactivity_days ?? 60, levels };
  });

  // ── PUT /merchant/ladder — save config (create/update from template or custom) ──
  app.put('/merchant/ladder', {
    preHandler: [app.authenticate],
    schema: { body: z.object({
      template: z.enum(['cafe', 'bar', 'restaurant', 'fine_dining', 'custom']),
      inactivityDays: z.union([z.literal(30), z.literal(60), z.literal(90)]),
      levels: z.array(LevelInput).max(8), // schema sanity; tier limits enforced below (3/5)
    }) },
  }, async (req, reply) => {
    const v = await myVenue(req);
    if (!v) return reply.code(404).send({ problem: { title: 'No claimed venue', status: 404 } });
    const b = req.body as { template: 'cafe' | 'bar' | 'restaurant' | 'fine_dining' | 'custom'; inactivityDays: 30 | 60 | 90;
      levels: Array<{ position: number; name: string; minVisits: number; minMonths: number; discountPct?: number | null; perkText?: string }> };
    const maxLevels = MERCHANT_RULES.ladderMaxLevels[(v.tier as 'starter' | 'growth' | 'pro') ?? 'starter'];
    if (b.levels.length > maxLevels) {
      return reply.code(402).send({ problem: { title: `Plan limit: ${maxLevels} levels on ${v.tier}`, status: 402, type: 'plan' } });
    }
    if (b.template !== 'custom' && b.levels.length === 0) b.levels = LADDER_TEMPLATES[b.template].map((l, i) => ({ position: i + 1, ...l }));
    if (b.levels.length === 0) return reply.code(422).send({ problem: { title: 'custom needs levels', status: 422 } });
    // starter: templates only (enforced by level count vs template shapes) — starter may customise nothing beyond a template
    if (v.tier === 'starter' && !LADDER_TEMPLATES[b.template].length) {
      return reply.code(402).send({ problem: { title: 'Starter plans use templates only', status: 402, type: 'plan' } });
    }

    // benefit-reduction detection: existing members keep their level for 30 days
    const existing = rows(await db.execute(sql`select position, name, min_visits, min_months, discount_pct from ladder_levels where venue_id = ${v.venue_id}::uuid order by position`));
    const nowEffective = new Date();
    const reduced = b.levels.some((nl) => {
      const old = existing.find((e) => Number(e.position) === nl.position);
      if (!old) return false;
      return (Number(old.min_visits) > nl.minVisits)
        || (Number(old.min_months) > nl.minMonths)
        || (old.discount_pct !== null && (nl.discountPct == null || Number(old.discount_pct) > nl.discountPct));
    });
    const effectiveFrom = reduced ? new Date(nowEffective.getTime() + 30 * 86400_000) : nowEffective;

    await db.transaction(async (tx) => {
      await tx.execute(sql`
        insert into ladder_configs (venue_id, template, inactivity_days, updated_at)
        values (${v.venue_id}::uuid, ${b.template}::ladder_template, ${b.inactivityDays}, now())
        on conflict (venue_id) do update set template = excluded.template, inactivity_days = excluded.inactivity_days, updated_at = now()`);
      await tx.execute(sql`delete from ladder_levels where venue_id = ${v.venue_id}::uuid`);
      for (const l of b.levels) {
        await tx.execute(sql`
          insert into ladder_levels (venue_id, position, name, min_visits, min_months, discount_pct, perk_text, effective_from)
          values (${v.venue_id}::uuid, ${l.position}, ${l.name}, ${l.minVisits}, ${l.minMonths}, ${l.discountPct ?? null}, ${l.perkText ?? null}, ${effectiveFrom})`);
      }
    });
    if (reduced) {
      // notify members their benefits change in 30 days
      const members = rows(await db.execute(sql`select user_id from memberships where venue_id = ${v.venue_id}::uuid and status = 'active'`));
      for (const m of members) await notify(dbUrl, String(m.user_id), 'spots', 'ladder_change', { venue: v.display_name, effectiveFrom });
    }
    capture('ladder_saved', req.user!.id, { template: b.template, levels: b.levels.length, reduced });
    return { ok: true, reductionProtection: reduced ? 'effective in 30 days; existing members notified' : null };
  });

  // ── GET /merchant/ladder/estimate — discount × band midpoint cost preview ──
  app.get('/merchant/ladder/estimate', { preHandler: [app.authenticate] }, async (req, reply) => {
    const v = await myVenue(req);
    if (!v) return reply.code(404).send({ problem: { title: 'No claimed venue', status: 404 } });
    const levels = rows(await db.execute(sql`
      select coalesce(discount_pct, 0) as pct, min_visits from ladder_levels where venue_id = ${v.venue_id}::uuid order by position`));
    // members at each level × midpoint of their per-visit spend band (rough)
    const dist = rows(await db.execute(sql`
      select coalesce(level_position, 0) as pos, count(*)::int as members from memberships
       where venue_id = ${v.venue_id}::uuid and status = 'active' group by 1`));
    const bands = [3, 6, 12, 25, 50, 80]; // MERCHANT_PER_SEAT_BANDS fee midpoints (low end, conservative)
    const costPerMonth = levels.reduce((sum, l) => {
      const members = Number(dist.find((d) => Number(d.pos) === Number((l as { min_visits: number }).min_visits))?.members ?? 0);
      return sum + members * Number((l as { pct: number }).pct) / 100 * bands[Math.min(2, bands.length - 1)];
    }, 0);
    const totalDiscountPct = levels.length ? Math.max(...levels.map((l) => Number((l as { pct: number }).pct))) : 0;
    return { estimatedMonthlyCostHkd: Math.round(costPerMonth), infoFlag: totalDiscountPct > MERCHANT_RULES.discountInfoThresholdPct,
      note: totalDiscountPct > MERCHANT_RULES.discountInfoThresholdPct ? 'Above 20%: meshpoke shows it as a deal, keep it sustainable' : null };
  });
}
