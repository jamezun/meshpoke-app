/**
 * T16.5: Admin merchant finance workspace.
 * Founding roster, dispute resolution (credit note / reject), per-seat ledger,
 * billing health, quarterly band audit.
 */
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client.js';
import { notify } from '../notify.js';

const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

export function registerAdminFinance(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);
  const finance = app.requireAdminRole('finance');
  const pre = [app.authenticate, finance];

  // ── founding roster ──
  app.get('/admin/merchant-finance/founding', { preHandler: pre }, async () => {
    const r = rows(await db.execute(sql`
      select m.id, m.tier, m.founding_free_until, m.founding_drops_start_at,
             v.display_name, u.display_name as owner_name, u.email,
             (select count(*)::int from subscriptions s
               where s.user_id = m.owner_user_id and s.status = 'active') as active_subs
        from merchant_accounts m
        join venues v on v.id = m.venue_id
        join users u on u.id = m.owner_user_id
       where m.founding = true
       order by m.founding_free_until nulls last`));
    return { founding: r };
  });

  // ── open disputes ──
  app.get('/admin/merchant-finance/disputes', { preHandler: pre }, async () => {
    const r = rows(await db.execute(sql`
      select c.id, c.merchant_id, c.event_type, c.amount, c.disputed_at,
             v.display_name as venue_name
        from seat_charges c
        join merchant_accounts m on m.id = c.merchant_id
        join venues v on v.id = m.venue_id
       where c.dispute_status = 'open'
       order by c.disputed_at asc`));
    return { disputes: r };
  });

  // ── resolve dispute: accept → credit note, reject ──
  app.post('/admin/merchant-finance/disputes/:id/resolve', {
    preHandler: pre,
    schema: { body: z.object({ resolution: z.enum(['credit_note', 'rejected']), note: z.string().max(500).optional() }) },
  }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const b = req.body as { resolution: 'credit_note' | 'rejected'; note?: string };

    const charge = rows(await db.execute(sql`
      select c.id, c.merchant_id, c.amount, c.invoice_id, c.dispute_status
        from seat_charges c where c.id = ${id}::uuid for update`));
    if (!charge[0]) return reply.code(404).send({ problem: { title: 'Charge not found', status: 404 } });
    if (charge[0].dispute_status !== 'open') {
      return reply.code(409).send({ problem: { title: 'Dispute not open', status: 409 } });
    }

    if (b.resolution === 'credit_note') {
      // reverse the charge and adjust the invoice rollup
      await db.execute(sql`update seat_charges set amount = 0, dispute_status = 'credited' where id = ${id}::uuid`);
      if (charge[0].invoice_id) {
        await db.execute(sql`
          update invoices i set
            seat_amount = greatest(0, i.seat_amount - ${Number(charge[0].amount)}),
            total = greatest(0, i.total - ${Number(charge[0].amount)})
           where i.id = ${String(charge[0].invoice_id)}::uuid`);
      }
    } else {
      await db.execute(sql`update seat_charges set dispute_status = 'rejected' where id = ${id}::uuid`);
    }
    await db.execute(sql`
      insert into audit_log (actor_id, action, target, meta)
      values (${req.user!.id}::uuid, 'merchant.dispute_resolve',
              ${id}::uuid, ${JSON.stringify({ resolution: b.resolution, note: b.note ?? null })}::jsonb)`);
    // notify the merchant owner
    const owner = rows(await db.execute(sql`
      select m.owner_user_id from merchant_accounts m where m.id = ${String(charge[0].merchant_id)}::uuid`));
    if (owner[0]) {
      await notify(dbUrl, String(owner[0].owner_user_id), 'moderation', 'moderation', {
        dispute: b.resolution,
      } as never).catch(() => {});
    }
    return { resolved: b.resolution };
  });

  // ── per-seat ledger browser ──
  app.get('/admin/merchant-finance/venues/:id/ledger', { preHandler: pre }, async (req) => {
    const venueId = (req.params as { id: string }).id;
    const r = rows(await db.execute(sql`
      select c.id, c.event_type, c.band, c.amount, c.multiplier, c.shadow, c.created_at,
             c.dispute_status, c.invoice_id, u.display_name as guest_name
        from seat_charges c
        join merchant_accounts m on m.id = c.merchant_id and m.venue_id = ${venueId}::uuid
        left join users u on u.id = (
          select mc.user_id from merchant_checkins mc where mc.id = c.checkin_id)
       order by c.created_at desc limit 200`));
    const inv = rows(await db.execute(sql`
      select i.period, i.seat_amount, i.shadow_amount, i.total, i.status
        from invoices i join merchant_accounts m on m.id = i.merchant_id and m.venue_id = ${venueId}::uuid
       order by i.period desc limit 12`));
    return { ledger: r, invoices: inv };
  });

  // ── billing health ──
  app.get('/admin/merchant-finance/health', { preHandler: pre }, async () => {
    const subs = rows(await db.execute(sql`
      select tier, count(*)::int as merchants from merchant_accounts
       where claim_status = 'approved' group by tier order by tier`));
    const mrr = rows(await db.execute(sql`
      select coalesce(sum(price), 0)::int as merchant_mrr from merchant_subscriptions where status = 'active'`));
    const seatMtd = rows(await db.execute(sql`
      select coalesce(sum(amount), 0)::int as seat_mtd from seat_charges
       where created_at >= date_trunc('month', now()) and amount > 0`));
    const openDisputes = rows(await db.execute(sql`
      select count(*)::int as n from seat_charges where dispute_status = 'open'`));
    const founding = rows(await db.execute(sql`
      select count(*)::int as n from merchant_accounts where founding = true`));
    return {
      subscriptions: subs,
      merchantMrrHkd: Number(mrr[0]?.merchant_mrr ?? 0),
      seatRevenueMtdHkd: Number(seatMtd[0]?.seat_mtd ?? 0),
      openDisputes: Number(openDisputes[0]?.n ?? 0),
      foundingMerchants: Number(founding[0]?.n ?? 0),
    };
  });

  // ── band audit workspace: quarterly checklist ──
  app.get('/admin/merchant-finance/band-audit', { preHandler: pre }, async () => {
    // venues whose last audit is >90d old (or never) with recent activity
    const r = rows(await db.execute(sql`
      select v.id, v.display_name, m.price_band, m.band_audited_at,
             (select count(*)::int from merchant_checkins mc
               where mc.venue_id = v.id and mc.created_at > now() - interval '90 days') as checkins_90d,
             (select count(*)::int from seat_charges c
               where c.merchant_id = m.id and c.created_at > now() - interval '90 days' and c.amount > 0) as charges_90d
        from merchant_accounts m join venues v on v.id = m.venue_id
       where m.claim_status = 'approved'
         and (m.band_audited_at is null or m.band_audited_at < now() - interval '90 days')
       order by checkins_90d desc nulls last limit 100`));
    return { due: r };
  });

  app.post('/admin/merchant-finance/band-audit/:venueId', {
    preHandler: pre,
    schema: { body: z.object({ newBand: z.number().int().min(1).max(6), note: z.string().max(500).optional() }) },
  }, async (req, reply) => {
    const venueId = (req.params as { venueId: string }).venueId;
    const b = req.body as { newBand: number; note?: string };
    const upd = rows(await db.execute(sql`
      update merchant_accounts set price_band = ${b.newBand}, band_audited_at = now()
       where venue_id = ${venueId}::uuid and claim_status = 'approved'
       returning id, owner_user_id, price_band`));
    if (!upd[0]) return reply.code(404).send({ problem: { title: 'Merchant not found', status: 404 } });
    await db.execute(sql`
      insert into audit_log (actor_id, action, target, meta)
      values (${req.user!.id}::uuid, 'merchant.band_audit', ${venueId}::uuid,
              ${JSON.stringify({ newBand: b.newBand, note: b.note ?? null })}::jsonb)`);
    await notify(dbUrl, String(upd[0].owner_user_id), 'moderation', 'moderation', { bandAudit: b.newBand } as never).catch(() => {});
    return { venueId, newBand: b.newBand };
  });

  /** T21.8 finance overview: MRR by lane, seat revenue by event type, invoice reconciliation */
  app.get('/admin/finance/overview', { preHandler: pre }, async () => {
    const consumerMrr = rows(await db.execute(sql`
      select coalesce(sum(price_paid), 0)::int as mrr, count(*)::int as n
        from subscriptions where status = 'active'`));
    const merchantMrr = rows(await db.execute(sql`
      select coalesce(sum(price), 0)::int as mrr, count(*)::int as n
        from merchant_subscriptions where status = 'active'`));
    const seatByType = rows(await db.execute(sql`
      select event_type, coalesce(sum(amount), 0)::int as hkd, count(*)::int as n
        from seat_charges where shadow = false group by event_type order by 2 desc`));
    const packs = rows(await db.execute(sql`
      select product, coalesce(sum(price_paid), 0)::int as hkd, count(*)::int as n
        from subscriptions where status = 'paid' group by product order by 2 desc`));
    // reconciliation: invoices.seat_amount vs sum of charged seat_charges linked by invoice_id
    const recon = rows(await db.execute(sql`
      select count(*)::int as mismatched
        from invoices i
        left join (select invoice_id, coalesce(sum(amount), 0)::int as charged
                    from seat_charges where invoice_id is not null group by invoice_id) c
          on c.invoice_id = i.id
       where i.seat_amount <> coalesce(c.charged, 0)`));
    return {
      consumerMrrHkd: consumerMrr[0]?.mrr ?? 0,
      consumerActive: consumerMrr[0]?.n ?? 0,
      merchantMrrHkd: merchantMrr[0]?.mrr ?? 0,
      merchantActive: merchantMrr[0]?.n ?? 0,
      seatRevenueByType: seatByType,
      oneOffPurchases: packs,
      invoiceSeatMismatches: recon[0]?.mismatched ?? 0,
    };
  });
}
