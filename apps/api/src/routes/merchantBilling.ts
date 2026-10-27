import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import Stripe from 'stripe';
import { MERCHANT_PRICES } from '@meshpoke/shared/constants';
import type { Config } from '../config.js';
import { getDb } from '../db/client.js';

const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

/**
 * T16.3 Merchant Stripe billing.
 * No STRIPE_SECRET_KEY → SaaS routes run in stub mode (create mocks for tests / dev),
 * seat invoices still aggregate locally so the dashboard is real from day 1.
 */
export function registerMerchantBilling(app: FastifyInstance, dbUrl: string, config: Config): void {
  const db = getDb(dbUrl);
  const stripe = config.STRIPE_SECRET_KEY ? new Stripe(config.STRIPE_SECRET_KEY) : null;

  const findMerchant = async (userId: string) => rows(await db.execute(sql`
    select id, venue_id, tier, founding, founding_free_until, monthly_budget_cap, stripe_customer_id, billing_state
      from merchant_accounts where owner_user_id = ${userId}::uuid and claim_status = 'approved' limit 1`))[0];

  // card on file
  app.post('/merchant/billing/setup-intent', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.user) return reply.code(401).send({ title: 'Unauthorized' });
    const m = await findMerchant(req.user.id);
    if (!m) return reply.code(404).send({ title: 'No approved merchant account' });
    if (!stripe) return { clientSecret: 'stub_setup_intent_secret', stub: true };
    const customerId = await ensureCustomer(m);
    const si = await stripe.setupIntents.create({ customer: customerId, usage: 'off_session' });
    return { clientSecret: si.client_secret };
  });

  const ensureCustomer = async (m: Record<string, unknown>): Promise<string> => {
    if (m.stripe_customer_id) return m.stripe_customer_id as string;
    const c = await (stripe ?? stubStripe()).customers.create({ metadata: { merchant_id: m.id as string } });
    await db.execute(sql`update merchant_accounts set stripe_customer_id = ${c.id} where id = ${m.id}::uuid`);
    return c.id;
  };

  // subscription switch (Growth/Pro, monthly; founding price auto-applied while founding)
  app.post('/merchant/billing/subscribe', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { tier } = req.body as { tier?: 'growth' | 'pro' };
    if (tier !== 'growth' && tier !== 'pro') return reply.code(422).send({ title: 'tier must be growth|pro' });
    if (!req.user) return reply.code(401).send({ title: 'Unauthorized' });
    const m = await findMerchant(req.user.id);
    if (!m) return reply.code(404).send({ title: 'No approved merchant account' });

    const price = m.founding
      ? (tier === 'growth' ? MERCHANT_PRICES.growth.founding.monthly : MERCHANT_PRICES.pro.founding.monthly)
      : (tier === 'growth' ? MERCHANT_PRICES.growth.web.monthly : MERCHANT_PRICES.pro.web.monthly);

    // local record always
    await db.execute(sql`
      update merchant_subscriptions set status = 'cancelled' where merchant_id = ${m.id}::uuid and status = 'active'`);
    await db.execute(sql`
      insert into merchant_subscriptions (merchant_id, product, price, status, stripe_ref, current_period_end)
      values (${m.id}::uuid, ${tier}, ${price}, 'active', 'pending', now() + interval '1 month')`);
    await db.execute(sql`update merchant_accounts set tier = ${tier} where id = ${m.id}::uuid`);

    if (!stripe) return { ok: true, tier, priceHkd: price, stub: true };
    const customerId = await ensureCustomer(m);
    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price_data: { currency: 'hkd', unit_amount: price * 100, recurring: { interval: 'month' }, product_data: { name: `MeshPoke ${tier}` } } } as never],
      metadata: { merchant_id: m.id as string },
    });
    await db.execute(sql`update merchant_subscriptions set stripe_ref = ${sub.id} where merchant_id = ${m.id}::uuid`);
    return { ok: true, tier, priceHkd: price };
  });

  app.post('/merchant/billing/cancel', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.user) return reply.code(401).send({ title: 'Unauthorized' });
    const m = await findMerchant(req.user.id);
    if (!m) return { ok: false };
    await db.execute(sql`update merchant_subscriptions set status = 'cancelled' where merchant_id = ${m.id}::uuid`);
    await db.execute(sql`update merchant_accounts set tier = 'starter' where id = ${m.id}::uuid`);
    if (stripe) {
      const sub = rows(await db.execute(sql`select stripe_ref from merchant_subscriptions where merchant_id = ${m.id}::uuid`))[0];
      if (sub?.stripe_ref) await stripe.subscriptions.cancel(sub.stripe_ref as string).catch(() => {});
    }
    return { ok: true };
  });

  // monthly seat invoice finalize: aggregate unbilled non-shadow charges → invoice + mark billed
  app.post('/internal/merchant-invoice-run', { preHandler: [app.authenticate, app.requireAdminRole('superadmin')] }, async (req) => {
    const { merchantId } = (req.body ?? {}) as { merchantId?: string };
    const targets = merchantId
      ? rows(await db.execute(sql`select id from merchant_accounts where id = ${merchantId}::uuid`))
      : rows(await db.execute(sql`select id from merchant_accounts where stripe_customer_id is not null`));
    let invoiced = 0;
    for (const t of targets) {
      const unbilled = rows(await db.execute(sql`
        select coalesce(sum(amount), 0)::int as due, coalesce(sum(case when shadow then amount else 0 end), 0)::int as waived
          from seat_charges where merchant_id = ${t.id}::uuid and invoice_id is null`));
      const due = Number(unbilled[0]?.due ?? 0);
      const waived = Number(unbilled[0]?.waived ?? 0);
      const period = new Date().toISOString().slice(0, 7);
      const inv = rows(await db.execute(sql`
        insert into invoices (merchant_id, period, seat_amount, shadow_amount, total)
        values (${t.id}::uuid, ${period}, ${due}, ${waived}, ${due})
        on conflict (merchant_id, period) do update set
          seat_amount = invoices.seat_amount + ${due}, shadow_amount = invoices.shadow_amount + ${waived}, total = invoices.total + ${due}
        returning id`))[0];
      await db.execute(sql`update seat_charges set invoice_id = ${inv.id}::uuid where merchant_id = ${t.id}::uuid and invoice_id is null`);
      if (stripe && due > 0) {
        const m = rows(await db.execute(sql`select stripe_customer_id from merchant_accounts where id = ${t.id}::uuid`))[0];
        if (m?.stripe_customer_id) {
          await stripe.invoiceItems.create({ customer: m.stripe_customer_id as string, currency: 'hkd', unit_amount: due * 100, quantity: 1, description: 'MeshPoke verified seats' } as never);
          await stripe.invoices.create({ customer: m.stripe_customer_id as string, auto_advance: true }).then((i) => stripe.invoices.finalizeInvoice(i.id)).catch(() => {});
        }
      }
      invoiced++;
    }
    return { invoiced, stub: !stripe };
  });

  // T16.4 dispute a seat charge (7 days from charge)
  app.post('/merchant/seat-charges/:id/dispute', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!req.user) return reply.code(401).send({ title: 'Unauthorized' });
    const m = await findMerchant(req.user.id);
    if (!m) return reply.code(404).send({ title: 'No approved merchant account' });
    const r = await db.execute(sql`
      update seat_charges set disputed_at = now(), dispute_status = 'open'
       where id = ${id}::uuid and merchant_id = ${m.id}::uuid
         and disputed_at is null and created_at > now() - interval '7 days'
       returning id`);
    if (!rows(r)[0]) return reply.code(422).send({ title: 'Not disputable (outside 7-day window or already disputed)' });
    return { ok: true };
  });

  // webhook (signature verified in prod)
  app.post('/webhooks/stripe', async (req, reply) => {
    if (config.STRIPE_WEBHOOK_SECRET && stripe) {
      const sig = req.headers['stripe-signature'] as string | undefined;
      if (!sig) return reply.code(400).send({ title: 'Missing stripe-signature' });
      try {
        stripe.webhooks.constructEvent(JSON.stringify(req.body), sig, config.STRIPE_WEBHOOK_SECRET);
      } catch {
        return reply.code(400).send({ title: 'Invalid signature' });
      }
    } else {
      const ev = req.body as { type?: string };
      if (ev?.type !== 'test') return reply.code(400).send({ title: 'Signature not configured' });
    }
    reply.code(200).send({ received: true });
  });
}

// ponytail: stubbed Stripe surface for dev/test — just enough shape for the two create() calls
function stubStripe(): Pick<Stripe, 'customers' | 'subscriptions' | 'invoiceItems' | 'invoices'> {
  const fake = (ret: unknown) => ({ create: async () => ret, cancel: async () => ret });
  return {
    customers: fake({ id: `cus_stub_${Date.now()}` }),
    subscriptions: { ...fake({ id: `sub_stub_${Date.now()}` }), cancel: async () => ({ id: 'cancelled' }) },
    invoiceItems: fake({ id: `ii_stub_${Date.now()}` }),
    invoices: { ...fake({ id: `in_stub_${Date.now()}` }), finalizeInvoice: async () => ({ id: 'finalized' }) },
  } as unknown as Pick<Stripe, 'customers' | 'subscriptions' | 'invoiceItems' | 'invoices'>;
}
