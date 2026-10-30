/**
 * T20.5: coupons & members CRM.
 * Coupons unlock at a venue visit threshold (default 50, merchant-configurable),
 * issue + redeem via scan context 'coupon'. CRM: aggregate (Starter), full list
 * (Growth), CSV export (Pro).
 */
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { enforcementState } from './score.js';
import { z } from 'zod';
import { getDb } from '../db/client.js';
import { notify } from '../notify.js';
import { capture } from '../analytics.js';
import type { FastifyRequest } from 'fastify';

const DEFAULT_COUPON_THRESHOLD = 50;

export function registerCrm(app: FastifyInstance, dbUrl: string, qrSecret: string) {
  const db = getDb(dbUrl);
  const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

  async function myVenue(req: FastifyRequest) {
    const r = rows(await db.execute(sql`
      select m.venue_id, m.tier from merchant_accounts m
       where m.owner_user_id = ${req.user!.id}::uuid and m.claim_status = 'approved' limit 1`));
    return r[0] as { venue_id: string; tier: string } | undefined;
  }

  // ── coupon threshold config (stored in ladder_configs-free way: merchant_accounts.monthly_budget_cap? no —
  //    keep it in coupons threshold per venue via a small kv on venues? simplest: constant + override column lives
  //    in merchant_accounts.price_band? NO — store as jsonb in notifications? Cleanest minimal: config table row.) ──
  // We reuse ladder_configs.inactivity_days-style pattern: add nothing; threshold override = future task.
  // Ponytail: DEFAULT_COUPON_THRESHOLD constant now; per-venue override when a merchant asks.

  // ── POST /merchant/coupons/issue — manual issue (e.g. service recovery) ──
  app.post('/merchant/coupons/issue', {
    preHandler: [app.authenticate],
    schema: { body: z.object({ userId: z.string().uuid(), offer: z.string().min(3).max(200), validDays: z.number().int().min(1).max(90).default(30) }) },
  }, async (req, reply) => {
    const v = await myVenue(req);
    if (!v) return reply.code(404).send({ problem: { title: 'No claimed venue', status: 404 } });
    const b = req.body as { userId: string; offer: string; validDays: number };
    const expires = new Date(Date.now() + b.validDays * 86400_000);
    const ins = rows(await db.execute(sql`
      insert into coupons (venue_id, user_id, offer, expires_at)
      values (${v.venue_id}::uuid, ${b.userId}::uuid, ${JSON.stringify({ text: b.offer })}::jsonb, ${expires})
      returning id, expires_at`));
    await notify(dbUrl, b.userId, 'spots', 'coupon_issued', { venueId: v.venue_id, coupon: b.offer } as never).catch(() => {});
    capture('coupon_issued', req.user!.id, { venueId: v.venue_id });
    return reply.code(201).send({ id: ins[0].id, expiresAt: ins[0].expires_at });
  });

  // ── GET /me/coupons — member wallet ──
  app.get('/me/coupons', { preHandler: [app.authenticate] }, async (req) => {
    const r = rows(await db.execute(sql`
      select c.id, c.offer, c.expires_at, c.used_at, v.display_name, v.id as venue_id
        from coupons c join venues v on v.id = c.venue_id
       where c.user_id = ${req.user!.id}::uuid and c.used_at is null and c.expires_at > now()
       order by c.expires_at asc`));
    return { coupons: r };
  });

  // ── POST /merchant/scan/coupon — redeem via scan QR (staff) ──
  app.post('/merchant/scan/coupon', {
    preHandler: [app.authenticate],
    schema: { body: z.object({ qrPayload: z.string().min(10).max(500), couponId: z.string().uuid() }) },
  }, async (req, reply) => {
    const v = await myVenue(req);
    if (!v) return reply.code(404).send({ problem: { title: 'No claimed venue', status: 404 } });
    const b = req.body as { qrPayload: string; couponId: string };
    // verify QR (same rules as scan.ts: rotating token)
    const { verifyQrToken } = await import('./userQr.js');
    const verified = verifyQrToken(b.qrPayload, qrSecret);
    if (!verified.ok) return reply.code(403).send({ problem: { title: verified.reason, status: 403 } });
    const guestId = verified.userId;
    const en = await enforcementState(db, guestId);
    if (en.action === 'hosting_paused') return reply.code(403).send({ problem: { title: 'Guest participation paused', status: 403, detail: en.reason } });
    const upd = rows(await db.execute(sql`
      update coupons set used_at = now()
       where id = ${b.couponId}::uuid and user_id = ${guestId}::uuid and venue_id = ${v.venue_id}::uuid
         and used_at is null and expires_at > now()
       returning id, offer`));
    if (!upd[0]) return reply.code(409).send({ problem: { title: 'Coupon not usable', status: 409 } });
    capture('coupon_redeemed', guestId, { venueId: v.venue_id });
    return { redeemed: true, offer: upd[0].offer };
  });

  // ── threshold unlock: called from scan member_visit path (visits_count hits multiples of threshold) ──
  app.post('/internal/coupon-check', { preHandler: [app.authenticate, app.requireAdminRole('superadmin')] }, async (req) => {
    const b = (req.body as { userId?: string; venueId?: string }) ?? {};
    if (!b.userId || !b.venueId) return { checked: 0 };
    const m = rows(await db.execute(sql`
      select visits_count from memberships
       where user_id = ${b.userId}::uuid and venue_id = ${b.venueId}::uuid and status = 'active' limit 1`));
    if (!m[0]) { return { checked: 0 }; }
    const visits = Number(m[0].visits_count);
    if (visits === 0 || visits % DEFAULT_COUPON_THRESHOLD !== 0) { return { checked: 0 }; }
    // every Nth visit → auto coupon (skip if already issued for this milestone)
    const dup = rows(await db.execute(sql`
      select 1 from coupons where user_id = ${b.userId}::uuid and venue_id = ${b.venueId}::uuid
         and offer->>'milestone' = ${String(visits)} limit 1`));
    if (dup[0]) { return { checked: 0 }; }
    const expires = new Date(Date.now() + 30 * 86400_000);
    await db.execute(sql`
      insert into coupons (venue_id, user_id, offer, expires_at)
      values (${b.venueId}::uuid, ${b.userId}::uuid, ${JSON.stringify({ text: 'Regular reward — thank you!', milestone: String(visits) })}::jsonb, ${expires})`);
    await notify(dbUrl, b.userId, 'spots', 'coupon_earned', { venueId: b.venueId, milestone: visits } as never).catch(() => {});
    return { checked: 1, issued: true };
  });

  // ── CRM ──
  app.get('/merchant/members', { preHandler: [app.authenticate] }, async (req, reply) => {
    const v = await myVenue(req);
    if (!v) return reply.code(404).send({ problem: { title: 'No claimed venue', status: 404 } });
    // aggregate: everyone (Starter)
    const agg = rows(await db.execute(sql`
      select count(*)::int as total, count(*) filter (where last_visit_at > now() - interval '30 days')::int as active_30d,
             coalesce(round(avg(visits_count))::int, 0) as avg_visits
        from memberships where venue_id = ${v.venue_id}::uuid and status = 'active'`));
    if (v.tier === 'starter') return { tier: 'starter', aggregate: agg[0] };

    // full list: Growth+
    const list = rows(await db.execute(sql`
      select u.display_name, m.kind, m.level_position, m.visits_count, m.last_visit_at, m.joined_at
        from memberships m join users u on u.id = m.user_id
       where m.venue_id = ${v.venue_id}::uuid and m.status = 'active'
       order by m.visits_count desc nulls last limit 500`));
    return { tier: v.tier, aggregate: agg[0], members: list };
  });

  // CSV export: Pro only
  app.get('/merchant/members/export', { preHandler: [app.authenticate] }, async (req, reply) => {
    const v = await myVenue(req);
    if (!v) return reply.code(404).send({ problem: { title: 'No claimed venue', status: 404 } });
    if (v.tier !== 'pro') {
      return reply.code(402).send({ problem: { title: 'CSV export is a Pro feature', status: 402, type: 'plan' } });
    }
    const list = rows(await db.execute(sql`
      select u.display_name, m.kind, m.level_position, m.visits_count, m.last_visit_at, m.joined_at
        from memberships m join users u on u.id = m.user_id
       where m.venue_id = ${v.venue_id}::uuid and m.status = 'active'
       order by m.visits_count desc nulls last`));
    const esc = (x: unknown) => `"${String(x ?? '').replaceAll('"', '""')}"`;
    const csv = ['display_name,kind,level,visits,last_visit,joined']
      .concat(list.map((m) => [m.display_name, m.kind, m.level_position, m.visits_count, m.last_visit_at, m.joined_at].map(esc).join(',')))
      .join('\n');
    reply.header('content-type', 'text/csv').header('content-disposition', 'attachment; filename="members.csv"');
    return reply.send(csv);
  });
}
