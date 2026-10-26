/**
 * Vibe match (PRD §3.2): overlap between two keyword sets.
 * v1: sum over shared keywords of min(levelA, levelB) / 10, divided by max(1, |reference|), clamp [0,1].
 * Either side empty → 0.5 (neutral, never punishing new users).
 */

export type KeywordLevel = { keyword: string; level: number };

export function vibe(userKeywords: KeywordLevel[], referenceKeywords: KeywordLevel[]): number {
  if (userKeywords.length === 0 || referenceKeywords.length === 0) return 0.5;

  const ref = new Map(referenceKeywords.map((k) => [k.keyword, k.level]));
  let overlap = 0;
  for (const k of userKeywords) {
    const rl = ref.get(k.keyword);
    if (rl !== undefined) overlap += Math.min(k.level, rl) / 10;
  }
  const denom = Math.max(1, referenceKeywords.length);
  return Math.min(1, overlap / denom);
}

/** Display: integer % capped at 99 (never 100 — no one is a perfect match). */
export function vibePercent(v: number): number {
  return Math.min(99, Math.round(v * 100));
}
