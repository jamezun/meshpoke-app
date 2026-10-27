/**
 * T17.1 recomputeEntitlement: subscriptions + grants → highest plan → entitlements.
 * Downgrade NEVER removes room/spot memberships — caps are only checked at new joins.
 */
import { sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import type { Plan } from '../entitlements.js';

const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;
const RANK: Record<Plan, number> = { free: 0, plus: 1, pro: 2 };

export async function recomputeEntitlement(db: Db, userId: string): Promise<Plan> {
  // active subscriptions: not expired, not refunded/cancelled-past-end
  const subs = rows(await db.execute(sql`
    select product, current_period_end from subscriptions
     where user_id = ${userId}::uuid and status = 'active' and (current_period_end is null or current_period_end > now())`));
  // grants: host_reward_pro → pro, pass7 → plus; filter_pass is feature-only (no plan)
  const grants = rows(await db.execute(sql`
    select kind, ends_at from grants
     where user_id = ${userId}::uuid and (ends_at is null or ends_at > now()) and kind in ('host_reward_pro', 'pass7')`));

  type Cand = { plan: Plan; end: Date | null }; // null end = lifetime (founding locked)
  const cands: Cand[] = [];
  for (const s of subs) {
    const p = String(s.product);
    const end = s.current_period_end == null ? null : new Date(s.current_period_end as string);
    if (p.startsWith('pro')) cands.push({ plan: 'pro', end });
    else if (p.startsWith('plus')) cands.push({ plan: 'plus', end });
  }
  for (const g of grants) {
    const end = g.ends_at == null ? null : new Date(g.ends_at as string);
    if (g.kind === 'host_reward_pro') cands.push({ plan: 'pro', end });
    else if (g.kind === 'pass7') cands.push({ plan: 'plus', end });
  }

  // highest plan; furthest end among rows of that plan (expiry of the winning entitlement)
  let plan: Plan = 'free';
  let end: Date | null = null;
  for (const c of cands) {
    if (RANK[c.plan] > RANK[plan] || (c.plan === plan && (c.end == null || !end || c.end > end))) {
      plan = c.plan;
      end = c.end; // null (lifetime) sticks — nothing outranks forever
    }
  }

  await db.execute(sql`
    insert into entitlements (user_id, plan, source, expires_at, updated_at)
    values (${userId}::uuid, ${plan}, ${plan === 'free' ? 'recompute' : 'subscription'},
            ${end ? end.toISOString() : null}, now())
    on conflict (user_id) do update set plan = excluded.plan, source = excluded.source,
      expires_at = excluded.expires_at, updated_at = now()`);
  return plan;
}
