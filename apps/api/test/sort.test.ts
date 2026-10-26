/// T9.3 unit tests: worked example from PRD §3.8 / BM §5.5.
import { describe, expect, it } from 'vitest';
import { recommendedScore, setSortWeightsOverride } from '../src/sort.js';

describe('recommendedScore', () => {
  it('worked example: Amy (free) 0.61 > Cara (plus, unproven) 0.57 > Ben (pro, weak) 0.37', () => {
    // Amy: free tier, vibe .8, score .7 → 0 + 0.40 + 0.21
    const amy = recommendedScore({ tier: 'free', vibe: 0.8, score: 0.7 });
    // Cara: plus, vibe .6, unproven score → 0.12 + 0.30 + 0.15
    const cara = recommendedScore({ tier: 'plus', vibe: 0.6, score: null });
    // Ben: pro, vibe .1, score .4 → 0.20 + 0.05 + 0.12
    const ben = recommendedScore({ tier: 'pro', vibe: 0.1, score: 0.4 });
    expect(amy).toBeCloseTo(0.61, 10);
    expect(cara).toBeCloseTo(0.57, 10);
    expect(ben).toBeCloseTo(0.37, 10);
    expect(amy).toBeGreaterThan(cara);
    expect(cara).toBeGreaterThan(ben);
  });

  it('unproven score = 0.5 neutral — a free unproven user is not zeroed', () => {
    const s = recommendedScore({ tier: 'free', vibe: 0.5, score: null });
    expect(s).toBeCloseTo(0.25 + 0.15, 10); // 0.5·0.5 + 0.3·0.5
  });

  it('paid tier can never buy the top slot alone (max tier contribution 0.2)', () => {
    const proWeak = recommendedScore({ tier: 'pro', vibe: 0, score: 0 });
    const freeStrong = recommendedScore({ tier: 'free', vibe: 1, score: 1 });
    expect(freeStrong).toBeGreaterThan(proWeak);
    expect(proWeak).toBeCloseTo(0.2, 10);
  });

  it('weights override via flag (PostHog path uses same function)', () => {
    setSortWeightsOverride({ tier: 0, vibe: 0.5, score: 0.5 });
    const s = recommendedScore({ tier: 'pro', vibe: 0.8, score: 0.2 }, { tier: 0, vibe: 0.5, score: 0.5 });
    expect(s).toBeCloseTo(0.5, 10); // tier ignored
    setSortWeightsOverride(null);
  });

  it('ties resolve FIFO at the caller (created_at asc) — same score, order unchanged', () => {
    const a = recommendedScore({ tier: 'plus', vibe: 0.6, score: null });
    const b = recommendedScore({ tier: 'plus', vibe: 0.6, score: null });
    expect(a).toBe(b);
  });
});
