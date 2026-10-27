/**
 * T17.6 referral pokes: +5 referee credits on phone verify, +5 referrer credits
 * when the referee's first attendance finalises; 10 rewarded referrals/month cap.
 * Anti-abuse: unique referee row, one reward per milestone, same phone never re-rewarded.
 */
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { getDb, type Db } from '../db/client.js';

const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

/** Referee bonus at phone-verification time (call after phoneVerifiedAt set). */
export async function referralOnPhoneVerified(db: Db, userId: string): Promise<void> {
  await db.execute(sql`
    with r as (
      update referrals set verified_reward_at = now()
       where referee_id = ${userId}::uuid and verified_reward_at is null
         and exists (select 1 from users where id = ${userId}::uuid and phone_verified_at is not null)
      returning referee_id
    )
    insert into poke_balances (user_id, credits)
    select referee_id, 5 from r
    on conflict (user_id) do update set credits = poke_balances.credits + 5`);
}

/**
 * Referrer bonus when a referee's FIRST finalised attendance lands.
 * Guarded by verified_reward_at? No — independent milestones; capped 10/month by referrer.
 */
export async function referralOnFirstAttendance(db: Db, attendeeId: string): Promise<void> {
  await db.execute(sql`
    with r as (
      update referrals set attended_reward_at = now()
       where referee_id = ${attendeeId}::uuid and attended_reward_at is null
         and exists (select 1 from attendance a where a.user_id = ${attendeeId}::uuid
                      and a.status in ('attended', 'forgiven'))
      returning referrer_id
    ), capped as (
      select r.referrer_id from r
       where (select count(*) from referrals r2
               where r2.referrer_id = r.referrer_id and r2.attended_reward_at > date_trunc('month', now()))
             < 10
    )
    insert into poke_balances (user_id, credits)
    select referrer_id, 5 from capped
    on conflict (user_id) do update set credits = poke_balances.credits + 5`);
}


export function registerReferrals(app: FastifyInstance, dbUrl: string): void {
  const db = getDb(dbUrl);

  app.get('/me/referrals', { preHandler: [app.authenticate] }, async (req) => {
    const mine = rows(await db.execute(sql`
      select r.referee_id, u.display_name, r.verified_reward_at, r.attended_reward_at, r.created_at
        from referrals r join users u on u.id = r.referee_id
       where r.referrer_id = ${req.user!.id}::uuid
       order by r.created_at desc limit 100`));
    const me = rows(await db.execute(sql`
      select referral_code, referred_by from users where id = ${req.user!.id}::uuid`));
    const credited = rows(await db.execute(sql`
      select count(*)::int as month_count from referrals
       where referrer_id = ${req.user!.id}::uuid and attended_reward_at > date_trunc('month', now())`));
    return {
      code: me[0]?.referral_code ?? null,
      referredBy: me[0]?.referred_by ?? null,
      refereeCredits: 5,
      referrerCredits: 5,
      monthRewarded: credited[0]?.month_count ?? 0,
      monthCap: 10,
      referrals: mine.map((r) => ({
        userId: r.referee_id,
        displayName: r.display_name,
        verified: r.verified_reward_at !== null,
        firstAttended: r.attended_reward_at !== null,
        createdAt: r.created_at,
      })),
    };
  });
}
