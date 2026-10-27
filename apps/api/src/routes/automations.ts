import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { notify } from '../notify.js';

/**
 * T21.7 Pro-merchant automations:
 * - Birthday treat: current-month birthdays of ACTIVE members who opted into
 *   share_birth_month (default off) at PRO merchants → coupon once per year.
 * - Win-back: members inactive ≥30 days → coupon once per 90 days.
 * - Members-only event invite: POST /merchant/event-invite (members only, 1/day/venue).
 */
export function registerAutomations(app: FastifyInstance, dbUrl: string): void {
  const db = getDb(dbUrl);

  /** issue a coupon idempotently — dup guard on offer->>'kind' */
  const issueCoupon = async (venueId: string, userId: string, offer: Record<string, unknown>): Promise<boolean> => {
    const kind = String(offer.kind);
    const r = (await db.execute(sql`
      insert into coupons (venue_id, user_id, offer, expires_at)
      select ${venueId}::uuid, ${userId}::uuid, ${JSON.stringify(offer)}::jsonb, now() + interval '30 days'
       where not exists (select 1 from coupons c
                          where c.user_id = ${userId}::uuid and c.venue_id = ${venueId}::uuid
                            and c.offer->>'kind' = ${kind})
      returning id`)) as unknown as { rows: { id: string }[] };
    return r.rows.length > 0;
  };

  app.post('/internal/automation-birthday', { preHandler: [app.authenticate, app.requireAdminRole('superadmin')] }, async () => {
    const res_r = await db.execute(sql`
      select m.venue_id, m.user_id, u.display_name
        from memberships m
        join users u on u.id = m.user_id and u.date_of_birth is not null
        join profiles p on p.user_id = m.user_id and p.share_birth_month = true
        join merchant_accounts ma on ma.venue_id = m.venue_id and ma.claim_status = 'approved' and ma.tier = 'pro'
       where m.status = 'active' and extract(month from u.date_of_birth) = extract(month from current_date)`);
    const r = res_r as unknown as { rows: { venue_id: string; user_id: string; display_name: string }[] };
    let issued = 0;
    for (const row of r.rows) {
      const ok = await issueCoupon(row.venue_id, row.user_id, { kind: `birthday-${new Date().getFullYear()}`, text: 'Birthday treat 🎂 — show this at the counter' });
      if (ok) {
        issued += 1;
        await notify(dbUrl, row.user_id, 'spots', 'birthday_treat', { venueId: row.venue_id }).catch(() => {});
      }
    }
    return { candidates: r.rows.length, issued };
  });

  app.post('/internal/automation-winback', { preHandler: [app.authenticate, app.requireAdminRole('superadmin')] }, async () => {
    const res_r = await db.execute(sql`
      select m.venue_id, m.user_id
        from memberships m
        join merchant_accounts ma on ma.venue_id = m.venue_id and ma.claim_status = 'approved' and ma.tier = 'pro'
       where m.status = 'active'
         and coalesce(m.last_visit_at, m.joined_at) < now() - interval '30 days'`);
    const r = res_r as unknown as { rows: { venue_id: string; user_id: string }[] };
    let issued = 0;
    for (const row of r.rows) {
      const ok = await issueCoupon(row.venue_id, row.user_id, { kind: 'winback-90d', text: 'We miss you — a little something on your next visit' });
      if (ok) {
        issued += 1;
        await notify(dbUrl, row.user_id, 'promo', 'winback', { venueId: row.venue_id }).catch(() => {});
      }
    }
    return { candidates: r.rows.length, issued };
  });

  /** members-only event invite: 1/day per venue (Redis), consent-gated by notify() */
  app.post('/merchant/event-invite', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.user) return reply.code(401).send({ title: 'Unauthorized' });
    const { title, text } = req.body as { title?: string; text?: string };
    if (!title || !text) return reply.code(422).send({ title: 'title and text required' });
    const res_m = await db.execute(sql`
      select ma.venue_id, ma.tier from merchant_accounts ma
       where ma.owner_user_id = ${req.user.id}::uuid and ma.claim_status = 'approved' limit 1`);
    const m = res_m as unknown as { rows: { venue_id: string; tier: string }[] };
    if (!m.rows[0]) return reply.code(404).send({ title: 'No claimed venue' });
    if (m.rows[0].tier !== 'pro') return reply.code(402).send({ title: 'Pro plan required', plan: m.rows[0].tier });

    const dayKey = `event-invite:${m.rows[0].venue_id}:${new Date().toISOString().slice(0, 10)}`;
    if (app.redis) {
      const ok = await app.redis.set(dayKey, '1', 'EX', 86400, 'NX');
      if (ok === null) return reply.code(429).send({ title: 'One event invite per venue per day' });
    }
    const res_members = await db.execute(sql`
      select user_id from memberships where venue_id = ${m.rows[0].venue_id}::uuid and status = 'active'`);
    const members = res_members as unknown as { rows: { user_id: string }[] };
    for (const row of members.rows) {
      await notify(dbUrl, row.user_id, 'promo', 'venue_event', { venueId: m.rows[0].venue_id, title, text }).catch(() => {});
    }
    return { queued: members.rows.length };
  });
}
