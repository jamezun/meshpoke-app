/**
 * T17.3 RevenueCat webhooks → subscriptions/grants/credits.
 * purchases_flutter posts raw receipts to RevenueCat; RC calls this endpoint.
 * App user id = our user id (no aliasing).
 */
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { productById } from '@meshpoke/shared/products';
import type { Config } from '../config.js';
import { getDb } from '../db/client.js';
import { recomputeEntitlement } from './consumer.js';


// RevenueCat product identifiers (App Store / Play) → our SKUs
const RC_INTERNAL = ['plus_monthly', 'plus_7d', 'plus_3mo', 'plus_6mo', 'plus_annual', 'plus_founding_monthly',
  'pro_monthly', 'pro_7d', 'pro_3mo', 'pro_6mo', 'pro_annual', 'pro_founding_monthly',
  'poke_pack_5', 'poke_pack_15', 'filter_pass_7d'];
// store SKUs are mp_<internal> (App Store/Play); accept both forms (T21.1)
const RC_PRODUCTS: Record<string, string> = {};
for (const id of RC_INTERNAL) {
  RC_PRODUCTS[id] = id;
  RC_PRODUCTS[`mp_${id}`] = id;
}

export function registerRevenueCat(app: FastifyInstance, dbUrl: string, config: Config): void {
  const db = getDb(dbUrl);

  app.post('/webhooks/revenuecat', async (req, reply) => {
    // Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET> (header set in RC dashboard)
    const auth = req.headers.authorization;
    if (config.REVENUECAT_WEBHOOK_SECRET && auth !== `Bearer ${config.REVENUECAT_WEBHOOK_SECRET}`) {
      return reply.code(401).send({ title: 'Unauthorized webhook' });
    }

    const ev = req.body as {
      event?: {
        type?: string; // INITIAL_PURCHASE|RENEWAL|NON_RENEWING_PURCHASE|CANCELLATION|EXPIRATION|REFUND
        app_user_id?: string;
        product_id?: string;
        period_ends_at?: string | null;
      };
    };
    const e = ev.event;
    if (!e?.app_user_id) return reply.code(422).send({ title: 'Missing app_user_id' });
    const sku = RC_PRODUCTS[e.product_id ?? ''];
    const p = sku ? productById(sku) : undefined;

    if (e.type === 'INITIAL_PURCHASE' || e.type === 'RENEWAL' || e.type === 'NON_RENEWING_PURCHASE') {
      if (!p) return reply.code(422).send({ title: `Unknown product_id ${e.product_id}` });
      const channel = 'revenuecat_apple';
      if (p.kind === 'subscription') {
        // upsert by (user, product): RC is the source of truth for the window
        await db.execute(sql`
          update subscriptions set status = 'active',
              current_period_end = ${e.period_ends_at ?? new Date(Date.now() + p.termDays * 864e5).toISOString()},
              price_paid = ${p.priceIapHkd ?? 0}
           where user_id = ${e.app_user_id}::uuid and product = ${sku} and channel = ${channel}`);
        await db.execute(sql`
          insert into subscriptions (user_id, channel, product, price_paid, status, provider_ref, current_period_end)
          select ${e.app_user_id}::uuid, ${channel}, ${sku}, ${p.priceIapHkd ?? 0}, 'active',
                 ${`rc_${e.app_user_id.slice(0, 8)}_${sku}`}, ${e.period_ends_at ?? new Date(Date.now() + p.termDays * 864e5).toISOString()}
           where not exists (select 1 from subscriptions where user_id = ${e.app_user_id}::uuid and product = ${sku} and channel = ${channel})`);
      } else if (p.id.startsWith('poke_pack')) {
        const credits = p.id === 'poke_pack_5' ? 5 : 15;
        await db.execute(sql`
          insert into poke_balances (user_id, credits) values (${e.app_user_id}::uuid, ${credits})
          on conflict (user_id) do update set credits = poke_balances.credits + ${credits}`);
      } else if (p.id === 'filter_pass_7d') {
        await db.execute(sql`
          insert into grants (user_id, kind, starts_at, ends_at)
          values (${e.app_user_id}::uuid, 'filter_pass', now(), now() + interval '7 days')`);
      }
    } else if (e.type === 'EXPIRATION' || e.type === 'CANCELLATION' || e.type === 'REFUND') {
      await db.execute(sql`
        update subscriptions set status = ${e.type === 'REFUND' ? 'refunded' : 'expired'},
            cancelled_at = now()
         where user_id = ${e.app_user_id}::uuid and channel = 'revenuecat_apple'
           and (${e.product_id ?? ''} = '' or product = ${RC_PRODUCTS[e.product_id ?? ''] ?? e.product_id ?? ''})`);
    }

    await recomputeEntitlement(db, e.app_user_id);
    reply.code(200).send({ received: true });
  });
}
