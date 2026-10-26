/// T9.3: recommended sort — additive weighted score (PRD §3.8, BM §5.5):
///   0.2·tier + 0.5·vibe + 0.3·score
/// tier: free 0 / plus 0.6 / pro 1 (max +0.2 — never decisive).
/// unproven score → 0.5 neutral; missing keywords → vibe 0.5; ties FIFO (created_at asc).
/// Weights overridable via PostHog flag `sort-weights` (60 s cache; PostHog optional —
/// falls back to constants when not configured).
import { SORT_WEIGHTS, SORT_TIER_VALUES, SORT_NEUTRAL } from '@meshpoke/shared/constants';
import type { Tier } from '@meshpoke/shared/constants';

export type SortWeights = { tier: number; vibe: number; score: number };

const FALLBACK: SortWeights = { ...SORT_WEIGHTS };
let cached: { weights: SortWeights; at: number } | null = null;
const CACHE_MS = 60_000;

/** Test seam: inject/clear cached flag weights. */
export function setSortWeightsOverride(w: SortWeights | null) {
  cached = w ? { weights: w, at: Date.now() } : null;
}

export function recommendedScore(
  input: { tier: Tier; vibe: number; score: number | null },
  weights: SortWeights = FALLBACK,
): number {
  const tierVal = SORT_TIER_VALUES[input.tier] ?? 0;
  const scoreVal = input.score === null || input.score === undefined ? SORT_NEUTRAL.unprovenScore : input.score;
  const vibeVal = input.vibe === null || input.vibe === undefined ? SORT_NEUTRAL.neutralVibe : input.vibe;
  const raw = weights.tier * tierVal + weights.vibe * vibeVal + weights.score * scoreVal;
  return Math.max(0, Math.min(1, raw));
}

/** PostHog feature-flag weights (json flag `sort-weights`) with 60 s cache. */
export async function currentSortWeights(fetchFlag?: () => Promise<SortWeights | null>): Promise<SortWeights> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.weights;
  const fromFlag = fetchFlag ? await fetchFlag() : null;
  cached = fromFlag ? { weights: fromFlag, at: Date.now() } : { weights: FALLBACK, at: Date.now() };
  return cached.weights;
}
