/**
 * Entitlements read model. Plan lives in entitlements/entitlements table (T-billing writes it);
 * everything reads through here. Default: free.
 */
import { and, eq, sql } from 'drizzle-orm';
import { getDb } from './db/client.js';
import { entitlements } from './db/schema/merchant.js';
import { TIER_CAPS } from '@meshpoke/shared/constants';

export type Plan = 'free' | 'plus' | 'pro';
export type CapType =
  | 'activeEventSpots' | 'chatRooms' | 'merchantSpots' | 'activeCrews'
  | 'weeklyPokes' | 'pokeNoteChars' | 'waitlistAutoJoinVenues' | 'dropAutoClaimsPerWeek';

export async function getPlan(dbUrl: string, userId: string): Promise<Plan> {
  const db = getDb(dbUrl);
  // active paid row with unexpired window (or no expiry = lifetime grant)
  const rows = await db
    .select({ plan: entitlements.plan })
    .from(entitlements)
    .where(and(
      eq(entitlements.userId, userId),
      // lifetime grants (NULL expires_at) stay active; expired rows don't count
      sql`(${entitlements.expiresAt} IS NULL OR ${entitlements.expiresAt} > now())`,
    ))
    .limit(1);
  const p = rows[0]?.plan as Plan | undefined;
  return p === 'plus' || p === 'pro' ? p : 'free';
}

export function getCaps(plan: Plan): Record<CapType, number> {
  return TIER_CAPS[plan];
}

export class CapError extends Error {
  constructor(public capType: CapType, public limit: number) {
    super(`cap reached: ${capType}`);
  }
}

/** Throws CapError (caller maps to 402 problem+json) when usage >= cap. */
export async function assertCap(dbUrl: string, userId: string, capType: CapType, currentUsage: number): Promise<void> {
  const plan = await getPlan(dbUrl, userId);
  const cap = getCaps(plan)[capType];
  if (currentUsage >= cap) throw new CapError(capType, cap);
}
