import { describe, it, expect } from 'vitest';
import { TIER_CAPS, PRICES, SORT_WEIGHTS, SORT_TIER_VALUES, MERCHANT_PER_SEAT_BANDS, POKE_RULES, SPOT_RULES, SCORE_RULES } from '../src/constants.js';

describe('constants snapshot (business numbers are load-bearing — changes must be deliberate)', () => {
  it('tier caps match BM §4 matrix', () => {
    expect(TIER_CAPS.free).toMatchObject({ activeEventSpots: 3, chatRooms: 5, merchantSpots: 10, activeCrews: 3, weeklyPokes: 5, pokeNoteChars: 200, recommendedTierValue: 0 });
    expect(TIER_CAPS.plus).toMatchObject({ activeEventSpots: 5, chatRooms: 10, merchantSpots: 30, weeklyPokes: 20, recommendedTierValue: 0.6, waitlistWeight: 2 });
    expect(TIER_CAPS.pro).toMatchObject({ activeEventSpots: 10, chatRooms: 20, weeklyPokes: 50, pokeNoteChars: 500, recommendedTierValue: 1, waitlistWeight: 3 });
    expect(TIER_CAPS.pro.merchantSpots).toBe(Number.POSITIVE_INFINITY);
    expect(TIER_CAPS.pro.activeCrews).toBe(Number.POSITIVE_INFINITY);
  });

  it('prices match PRD §8.1 (web + IAP)', () => {
    expect(PRICES.plus.web).toMatchObject({ monthly: 128, pass7d: 58, term3mo: 288, term6mo: 488, foundingMonthly: 88, foundingAnnual: 888 });
    expect(PRICES.plus.iap).toMatchObject({ monthly: 148, pass7d: 68, term3mo: 328, term6mo: 558, foundingMonthly: 98 });
    expect(PRICES.pro.web).toMatchObject({ monthly: 198, pass7d: 98, term3mo: 488, term6mo: 788, foundingMonthly: 148, foundingAnnual: 1488 });
    expect(PRICES.pokePack5).toEqual({ web: 38, iap: 48 });
    expect(PRICES.pokePack15).toEqual({ web: 88, iap: 98 });
    expect(PRICES.filterPass7d).toEqual({ web: 18, iap: 28 });
    expect(PRICES.foundingSlots).toBe(500);
  });

  it('sort weights are the confirmed additive formula', () => {
    expect(SORT_WEIGHTS.tier + SORT_WEIGHTS.vibe + SORT_WEIGHTS.score).toBeCloseTo(1);
    expect(SORT_TIER_VALUES).toEqual({ free: 0, plus: 0.6, pro: 1 });
  });

  it('merchant per-seat bands ascend with size', () => {
    const fees = MERCHANT_PER_SEAT_BANDS.map((b) => b.feeHkd);
    expect(fees).toEqual([3, 6, 12, 25, 50, 80]);
  });

  it('poke + spot windows from BM §3', () => {
    expect(POKE_RULES.expiryDays).toBe(7);
    expect(POKE_RULES.postSpotWindowHours).toBe(48);
    expect(POKE_RULES.referral).toMatchObject({ rewardPokes: 5, refereePokes: 5, rewardedCapPerMonth: 10 });
    expect(SPOT_RULES.confirmWindowHours).toBe(48);
    expect(SPOT_RULES.bailFreeHours).toBe(48);
    expect(SCORE_RULES).toMatchObject({ decayDays: 365, windowMaxEvents: 20, rockMinEvents: 7, hostReward: { minAttended: 4, minGpsShare: 0.5 } });
    expect(SPOT_RULES.hostingCapacity).toEqual({ unproven: 1, proven: 3, top: 5 });
  });
});
