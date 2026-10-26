import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { getPlan } from '../entitlements.js';
import { mostRecentMondayMidnightHKT } from '@meshpoke/shared/time';
import { POKE_RULES } from '@meshpoke/shared';

/**
 * T11.1 poke ledger: lazy weekly reset (Monday 00:00 HKT) + cost resolution.
 * Order: poke-back → post-spot (48h) → weekly allowance → credits → 402.
 */
export type PokeCostType = 'free_poke_back' | 'free_post_spot' | 'weekly' | 'credit';

export type LedgerDb = ReturnType<typeof getDb>;
export async function ensureBalanceReset(db: LedgerDb, userId: string): Promise<{ weeklyUsed: number; credits: number }> {
  const monday = mostRecentMondayMidnightHKT(new Date());
  const rows = (await db.execute(sql`
    insert into poke_balances (user_id, weekly_used, credits, last_reset_at)
    values (${userId}::uuid, 0, 0, now())
    on conflict (user_id) do update
      set weekly_used = 0,
          last_reset_at = now()
      where poke_balances.last_reset_at < ${monday.toISOString()}::timestamptz
    returning weekly_used, credits`)) as unknown as { rows: { weekly_used: number; credits: number }[] };
  if (rows.rows.length > 0) return { weeklyUsed: rows.rows[0].weekly_used, credits: rows.rows[0].credits };
  // conflict matched but WHERE false → no returning; read current
  const cur = (await db.execute(sql`select weekly_used, credits from poke_balances where user_id = ${userId}::uuid`)) as unknown as { rows: { weekly_used: number; credits: number }[] };
  return { weeklyUsed: cur.rows[0].weekly_used, credits: cur.rows[0].credits };
}

export async function resolvePokeCost(
  db: LedgerDb,
  from: string,
  to: string,
  weeklyAllowance: number,
): Promise<{ cost: PokeCostType } | { error: 'no_allowance' }> {
  // 1. poke back: pending poke from `to` to `from` → free
  const back = (await db.execute(sql`
    select 1 from pokes where from_user = ${to}::uuid and to_user = ${from}::uuid and status = 'pending'
       and expires_at > now()`)) as unknown as { rows: unknown[] };
  if (back.rows.length > 0) return { cost: 'free_poke_back' };

  // 2. post-spot: both attended same done spot within 48h → free
  const shared = (await db.execute(sql`
    select 1
      from attendance a1
      join attendance a2 on a2.spot_id = a1.spot_id
      join spots s on s.id = a1.spot_id
     where a1.user_id = ${from}::uuid and a2.user_id = ${to}::uuid
       and a1.status in ('attended','forgiven') and a2.status in ('attended','forgiven')
       and s.state = 'done' and s.starts_at > now() - interval '${sql.raw(String(POKE_RULES.postSpotWindowHours))} hours'
     limit 1`)) as unknown as { rows: unknown[] };
  if (shared.rows.length > 0) return { cost: 'free_post_spot' };

  // 3/4. weekly allowance then credits
  const { weeklyUsed, credits } = await ensureBalanceReset(db, from);
  if (weeklyUsed < weeklyAllowance) return { cost: 'weekly' };
  if (credits > 0) return { cost: 'credit' };
  return { error: 'no_allowance' };
}

export async function chargePoke(db: LedgerDb, from: string, cost: PokeCostType): Promise<void> {
  if (cost === 'weekly') {
    await db.execute(sql`update poke_balances set weekly_used = weekly_used + 1 where user_id = ${from}::uuid`);
  } else if (cost === 'credit') {
    await db.execute(sql`update poke_balances set credits = credits - 1 where user_id = ${from}::uuid`);
  } // free types: nothing
}

export function registerPokeLedger(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);

  /** expiry sweep — pending pokes past 7 days → expired, no refund (charged up front) */
  app.post('/internal/poke-expiry', { preHandler: [app.authenticate, app.requireAdminRole('superadmin')] }, async () => {
    const r = (await db.execute(sql`
      update pokes set status = 'expired'
       where status = 'pending' and expires_at <= now()
       returning id`)) as unknown as { rows: unknown[] };
    return { expired: r.rows.length };
  });

  /** dev/self: current balance + allowance for the poke sheet indicator */
  app.get('/me/poke-balance', { preHandler: [app.authenticate] }, async (req) => {
    const plan = await getPlan(dbUrl, req.user!.id);
    const allowance = plan === 'pro' ? 50 : plan === 'plus' ? 20 : 5;
    const { weeklyUsed, credits } = await ensureBalanceReset(db, req.user!.id);
    return { plan, weeklyAllowance: allowance, weeklyUsed, weeklyLeft: Math.max(0, allowance - weeklyUsed), credits };
  });
}
