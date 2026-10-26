/**
 * Merchant claim flow (T8.1): claim a venue with BR certificate (R2),
 * price band declaration, contact details; one active claim per venue;
 * rejected claims resubmittable; admin approve/reject (also used by T8.3).
 * On approval: venue claimed_by_merchant_id set; user edits to that venue locked.
 */
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import type { Storage } from '../storage.js';

export function registerMerchant(app: FastifyInstance, dbUrl: string, storage: Storage | null) {
  const db = getDb(dbUrl);

  const CERT_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
  app.post<{ Body: { contentType?: string } }>('/merchant/claim/presign', { preHandler: [app.authenticate] }, async (req, reply) => {
    const ct = req.body?.contentType;
    if (!ct || !CERT_TYPES.has(ct)) return reply.code(422).send({ problem: { title: 'PDF, JPEG or PNG only', status: 422 } });
    if (!storage) return reply.code(503).send({ problem: { title: 'Uploads not configured', status: 503 } });
    const key = `br/${req.user!.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ct === 'application/pdf' ? 'pdf' : ct === 'image/png' ? 'png' : 'jpg'}`;
    return { key, uploadUrl: await storage.presignPut(key, ct), expiresIn: 900 };
  });

  app.post<{ Body: { venueId: string; certKey: string; priceBand: number; contactName?: string; contactPhone?: string; contactEmail?: string } }>(
    '/merchant/claim',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const userId = req.user!.id;
      const b = req.body;
      if (!b?.venueId || !b?.certKey) return reply.code(422).send({ problem: { title: 'venueId and certKey required', status: 422 } });
      if (!Number.isInteger(b.priceBand) || b.priceBand < 1 || b.priceBand > 6) {
        return reply.code(422).send({ problem: { title: 'priceBand must be 1–6', status: 422 } });
      }
      const alive = await db.execute(sql`select 1 from users where id = ${userId} and deleted_at is null and liveness_state = 'verified'`);
      if ((alive as unknown as { rows: unknown[] }).rows.length === 0) {
        return reply.code(403).send({ problem: { title: 'Phone verification required to claim a venue', status: 403 } });
      }
      const venue = await db.execute(sql`select id, claimed_by_merchant_id from venues where id = ${b.venueId}::uuid`);
      const v = (venue as unknown as { rows: { id: string; claimed_by_merchant_id: string | null }[] }).rows[0];
      if (!v) return reply.code(404).send({ problem: { title: 'Venue not found', status: 404 } });
      if (v.claimed_by_merchant_id) return reply.code(409).send({ problem: { title: 'Venue already claimed', status: 409 } });

      // one ACTIVE claim per venue (pending or approved by someone else)
      const active = await db.execute(sql`
        select 1 from merchant_accounts
         where venue_id = ${b.venueId}::uuid and claim_status in ('pending','approved')`);
      if ((active as unknown as { rows: unknown[] }).rows.length > 0) {
        return reply.code(409).send({ problem: { title: 'A claim for this venue is already under review', status: 409 } });
      }
      // user's own rejected claim → resubmit by updating it
      const mine = await db.execute(sql`
        select id from merchant_accounts
         where venue_id = ${b.venueId}::uuid and owner_user_id = ${userId} and claim_status = 'rejected'`);
      const existing = (mine as unknown as { rows: { id: string }[] }).rows[0];

      const contact = JSON.stringify({ name: b.contactName, phone: b.contactPhone, email: b.contactEmail });
      let merchantId: string;
      if (existing) {
        await db.execute(sql`
          update merchant_accounts set claim_status = 'pending', business_reg_cert_key = ${b.certKey},
                 price_band = ${b.priceBand}, band_audited_at = null
           where id = ${existing.id}::uuid`);
        merchantId = existing.id;
      } else {
        const res = await db.execute(sql`
          insert into merchant_accounts (owner_user_id, venue_id, business_reg_cert_key, price_band)
          values (${userId}, ${b.venueId}::uuid, ${b.certKey}, ${b.priceBand})
          returning id`);
        merchantId = (res as unknown as { rows: { id: string }[] }).rows[0].id;
      }
      await db.execute(sql`
        insert into merchant_staff (merchant_id, user_id, role) values (${merchantId}::uuid, ${userId}, 'owner')
        on conflict (merchant_id, user_id) do nothing`);
      await db.execute(sql`
        insert into audit_log (actor_id, action, target, meta)
        values (${userId}, 'merchant.claim.submitted', 'merchant:' || ${merchantId}::text, ${contact}::jsonb)`);
      return { merchantId, status: 'pending' };
    },
  );

  app.get('/merchant/me', { preHandler: [app.authenticate] }, async (req) => {
    const res = await db.execute(sql`
      select ma.id, ma.venue_id, v.display_name, ma.claim_status::text as claim_status,
             ma.tier::text as tier, ma.founding, ma.price_band
        from merchant_accounts ma
        join venues v on v.id = ma.venue_id
       where ma.owner_user_id = ${req.user!.id}
       order by ma.created_at desc`);
    return { accounts: (res as unknown as { rows: unknown[] }).rows };
  });

  // admin approve/reject (RBAC enforced; also backs T8.3 review queue)
  app.post<{ Params: { id: string }; Body: { action: 'approve' | 'reject'; reason?: string } }>(
    '/admin/merchant-claims/:id',
    { preHandler: [app.authenticate, app.requireRole('admin')] },
    async (req, reply) => {
      const { action, reason } = req.body;
      const ma = await db.execute(sql`select id, venue_id, claim_status from merchant_accounts where id = ${req.params.id}::uuid`);
      const row = (ma as unknown as { rows: { id: string; venue_id: string; claim_status: string }[] }).rows[0];
      if (!row) return reply.code(404).send({ problem: { title: 'Claim not found', status: 404 } });
      if (row.claim_status !== 'pending') {
        return reply.code(409).send({ problem: { title: `Claim already ${row.claim_status}`, status: 409 } });
      }
      if (action === 'approve') {
        await db.execute(sql`update merchant_accounts set claim_status = 'approved' where id = ${row.id}::uuid`);
        await db.execute(sql`update venues set claimed_by_merchant_id = ${row.id}::uuid, source = 'merchant' where id = ${row.venue_id}::uuid`);
      } else {
        await db.execute(sql`update merchant_accounts set claim_status = 'rejected' where id = ${row.id}::uuid`);
      }
      await db.execute(sql`
        insert into audit_log (actor_id, action, target, meta)
        values (${req.user!.id}, ${'merchant.claim.' + action}, 'merchant:' || ${row.id}::text, ${JSON.stringify({ reason: reason ?? null })}::jsonb)`);
      return { ok: true, status: action === 'approve' ? 'approved' : 'rejected' };
    },
  );
}
