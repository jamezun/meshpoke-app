/**
 * T17.2 Consumer web checkout (Stripe) + founding-slot reservation + fulfilment.
 * Stub mode without STRIPE_SECRET_KEY: checkout returns a fake URL and fulfilment
 * runs immediately — dev/test can exercise the whole entitlement path.
 */
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import Stripe from 'stripe';

import { productById } from '@meshpoke/shared/products';
import type { Config } from '../config.js';
import { getDb } from '../db/client.js';
import { recomputeEntitlement } from './consumer.js';

const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

async function ensureCustomer(d: ReturnType<typeof getDb>, userId: string, s: Stripe): Promise<string> {
  const c = rows(await d.execute(sql`select stripe_customer_id from users where id = ${userId}::uuid`));
  if (c[0]?.stripe_customer_id) return c[0].stripe_customer_id as string;
  const cu = await s.customers.create({ metadata: { user_id: userId } });
  await d.execute(sql`update users set stripe_customer_id = ${cu.id} where id = ${userId}::uuid`);
  return cu.id;
}

export function registerCheckout(app: FastifyInstance, dbUrl: string, config: Config): void {
  const db = getDb(dbUrl);
  const stripe = config.STRIPE_SECRET_KEY ? new Stripe(config.STRIPE_SECRET_KEY) : null;
  const priceOf = (p: { priceWebHkd: number | null }) => p.priceWebHkd ?? 0;

  /**
   * Atomic founding-slot reservation: increments consumer_500 iff used < max.
   * Returns reservation id (the ledger row) or null when full.
   */
  const reserveFounding = async (): Promise<string | null> => {
    const r = rows(await db.execute(sql`
      update founding_counters set used = used + 1
       where key = 'consumer_500' and used < max
       returning key`));
    return r[0] ? (r[0].key as string) : null;
  };

  app.post('/billing/checkout', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.user) return reply.code(401).send({ title: 'Unauthorized' });
    const { product: productId } = req.body as { product?: string };
    const p = productById(productId ?? '');
    if (!p) return reply.code(422).send({ title: 'Unknown product' });
    if (p.priceWebHkd === null) return reply.code(422).send({ title: 'Not sold on web' });

    // founding annual is web-only; founding monthly available until slots run out
    const founding = productId?.includes('founding');
    let foundingReservation: string | null = null;
    if (founding) {
      foundingReservation = await reserveFounding();
      if (!foundingReservation) return reply.code(409).send({ title: 'Founding slots are full (500)' });
    }

    if (!stripe) {
      // stub mode: fulfil immediately (dev/test path)
      const { url } = await fulfil(db, req.user.id, productId!, null, foundingReservation);
      return { stub: true, url, product: productId };
    }

    const cust = await ensureCustomer(db, req.user.id, stripe);
    const session = await stripe.checkout.sessions.create({
      customer: cust,
      mode: p.kind === 'subscription' ? 'subscription' : 'payment',
      line_items: [{
        price_data: {
          currency: 'hkd',
          unit_amount: priceOf(p) * 100,
          ...(p.kind === 'subscription' ? { recurring: { interval: p.termDays >= 365 ? 'year' : p.termDays >= 180 ? 'month' : 'month' } } : {}),
          product_data: { name: `MeshPoke ${productId}` },
        },
        quantity: 1,
      } as never],
      success_url: `${(config.CORS_ORIGINS.split(',')[0])}/app/billing?ok=1`,
      cancel_url: `${(config.CORS_ORIGINS.split(',')[0])}/app/billing?cancelled=1`,
      metadata: { user_id: req.user.id, product: productId!, ...(foundingReservation ? { founding_reservation: foundingReservation } : {}) },
    });
    return { url: session.url };
  });

  app.post('/billing/portal', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.user) return reply.code(401).send({ title: 'Unauthorized' });
    if (!stripe) return { stub: true, url: '/app/billing' };
    const cust = rows(await db.execute(sql`select stripe_customer_id from users where id = ${req.user.id}::uuid`));
    if (!cust[0]?.stripe_customer_id) return reply.code(404).send({ title: 'No billing profile yet' });
    const s = await stripe.billingPortal.sessions.create({
      customer: cust[0].stripe_customer_id as string,
      return_url: `${config.CORS_ORIGINS.split(',')[0]}/app/billing`,
    });
    return { url: s.url };
  });

  /** shared fulfilment: writes subscription/grant/credits rows; returns redirect target */
  async function fulfil(d: ReturnType<typeof getDb>, userId: string, productId: string, providerRef: string | null, foundingReservation: string | null): Promise<{ url: string }> {
    const p = productById(productId)!;
    if (p.kind === 'subscription') {
      await d.execute(sql`
        insert into subscriptions (user_id, channel, product, price_paid, status, provider_ref, current_period_end)
        values (${userId}::uuid, 'stripe_web', ${productId}, ${priceOf(p)}, 'active', ${providerRef ?? `stub_${crypto.randomUUID().slice(0, 12)}`}, now() + (${String(p.termDays)} || ' days')::interval)`);
    } else if (p.id === 'filter_pass_7d') {
      await d.execute(sql`
        insert into grants (user_id, kind, starts_at, ends_at)
        values (${userId}::uuid, 'filter_pass', now(), now() + interval '7 days')`);
    } else if (p.id === 'poke_pack_5' || p.id === 'poke_pack_15') {
      const credits = p.id === 'poke_pack_5' ? 5 : 15;
      await d.execute(sql`
        insert into poke_balances (user_id, credits) values (${userId}::uuid, ${credits})
        on conflict (user_id) do update set credits = poke_balances.credits + ${credits}`);
    }
    if (foundingReservation) {
      await d.execute(sql`insert into entitlements (user_id, plan, source) values (${userId}::uuid, 'free', 'founding_pending') on conflict (user_id) do nothing`);
    }
    await recomputeEntitlement(d, userId);
    return { url: '/app/billing?ok=1' };
  }

  // Stripe fulfilment webhook (subscriptions renewals, refunds, one-time paid)
  app.post('/webhooks/stripe-consumer', async (req, reply) => {
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
    const ev = req.body as { type: string; data?: { object?: { metadata?: { user_id?: string; product?: string; founding_reservation?: string }; id?: string } } };
    const meta = ev.data?.object?.metadata ?? {};
    if (meta.user_id && meta.product) {
      if (ev.type === 'checkout.session.completed' || ev.type === 'test') {
        await fulfil(db, meta.user_id, meta.product, ev.data?.object?.id ?? null, meta.founding_reservation ?? null);
      } else if (ev.type === 'invoice.paid') {
        await db.execute(sql`update subscriptions set current_period_end = now() + interval '30 days' where user_id = ${meta.user_id}::uuid and channel = 'stripe_web' and status = 'active'`);
      } else if (ev.type === 'charge.refunded') {
        // refund: sub inactive + founding slot released
        await db.execute(sql`update subscriptions set status = 'refunded' where user_id = ${meta.user_id}::uuid and product = ${meta.product}`);
        if (meta.founding_reservation) {
          await db.execute(sql`update founding_counters set used = greatest(used - 1, 0) where key = 'consumer_500'`);
        }
        await recomputeEntitlement(db, meta.user_id);
      }
    }
    reply.code(200).send({ received: true });
  });
}
