/**
 * Single source of truth for every business number.
 * Mirrors Business_Model.md v5 + PRD.md v2 §3/§8. Generated Dart copy: apps/mobile/lib/core/constants.g.dart
 * (via `pnpm shared:dart`). Web + API import from here.
 */

// ── Spot templates (BM §4; enum lives in DB too) ────────────────
export const SPOT_TEMPLATES = {
  dinner: { label: 'Dinner', defaultDurationHours: 2 },
  drinks: { label: 'Drinks', defaultDurationHours: 2 },
  coffee: { label: 'Coffee', defaultDurationHours: 1 },
  hike: { label: 'Hike', defaultDurationHours: 4 },
  run: { label: 'Run', defaultDurationHours: 1 },
  tennis: { label: 'Tennis', defaultDurationHours: 2 },
  pickleball: { label: 'Pickleball', defaultDurationHours: 2 },
  badminton: { label: 'Badminton', defaultDurationHours: 2 },
  board_games: { label: 'Board games', defaultDurationHours: 3 },
  industry_mingle: { label: 'Industry mingle', defaultDurationHours: 2 },
  open_sport: { label: 'Open sport', defaultDurationHours: 2 },
} as const;
export type SpotTemplate = keyof typeof SPOT_TEMPLATES;

// ── Consumer tiers ─────────────────────────────────────────────
export type Tier = 'free' | 'plus' | 'pro';

export const TIER_CAPS: Record<
  Tier,
  {
    activeEventSpots: number; // active RSVPs
    chatRooms: number;
    merchantSpots: number; // standing spots a member may join
    activeCrews: number; // null = unlimited
    weeklyPokes: number;
    pokeNoteChars: number;
    recommendedTierValue: number;
    waitlistAutoJoinVenues: number;
    waitlistWeight: number; // backfill priority multiplier
    dropAutoClaimsPerWeek: number; // null = n/a
  }
> = {
  free: { activeEventSpots: 3, chatRooms: 5, merchantSpots: 10, activeCrews: 3, weeklyPokes: 5, pokeNoteChars: 200, recommendedTierValue: 0, waitlistAutoJoinVenues: 0, waitlistWeight: 1, dropAutoClaimsPerWeek: 0 },
  plus: { activeEventSpots: 5, chatRooms: 10, merchantSpots: 30, activeCrews: 10, weeklyPokes: 20, pokeNoteChars: 200, recommendedTierValue: 0.6, waitlistAutoJoinVenues: 1, waitlistWeight: 2, dropAutoClaimsPerWeek: 1 },
  pro: { activeEventSpots: 10, chatRooms: 20, merchantSpots: Number.POSITIVE_INFINITY, activeCrews: Number.POSITIVE_INFINITY, weeklyPokes: 50, pokeNoteChars: 500, recommendedTierValue: 1, waitlistAutoJoinVenues: 3, waitlistWeight: 3, dropAutoClaimsPerWeek: 3 },
};

// ── Consumer prices (HKD) ───────────────────────────────────────
// web = Stripe checkout price; iap = App/Play (RevenueCat) price. Never show web prices in-app.
export const PRICES = {
  plus: { web: { monthly: 128, pass7d: 58, term3mo: 288, term6mo: 488, foundingMonthly: 88, foundingAnnual: 888 }, iap: { monthly: 148, pass7d: 68, term3mo: 328, term6mo: 558, foundingMonthly: 98 } },
  pro: { web: { monthly: 198, pass7d: 98, term3mo: 488, term6mo: 788, foundingMonthly: 148, foundingAnnual: 1488 }, iap: { monthly: 228, pass7d: 108, term3mo: 558, term6mo: 898, foundingMonthly: 168 } },
  pokePack5: { web: 38, iap: 48 },
  pokePack15: { web: 88, iap: 98 },
  filterPass7d: { web: 18, iap: 28 }, // standalone pass (Free tier); included in Plus/Pro
  foundingSlots: 500,
  foundingAnnualWebOnly: true,
} as const;

// ── Pokes ───────────────────────────────────────────────────────
export const POKE_RULES = {
  expiryDays: 7, // unaccepted pokes expire
  weeklyResetDay: 'monday',
  weeklyResetHourHKT: 0,
  postSpotWindowHours: 48, // free pokes among attendees after a spot
  referral: { rewardPokes: 5, refereePokes: 5, rewardedCapPerMonth: 10, oncePerPhone: true },
  receivingAlwaysFree: true,
  acceptingAlwaysFree: true,
} as const;

// ── Recommended sort (BM §5.5 — CONFIRMED) ─────────────────────
export const SORT_WEIGHTS = { tier: 0.2, vibe: 0.5, score: 0.3 } as const;
export const SORT_TIER_VALUES: Record<Tier, number> = { free: 0, plus: 0.6, pro: 1 };
export const SORT_NEUTRAL = { unprovenScore: 0.5, neutralVibe: 0.5 } as const;
export const TIE_BREAK = 'fifo' as const;

// ── Spots & trust ───────────────────────────────────────────────
export const SPOT_RULES = {
  confirmWindowHours: 48, // members confirm after date pin, else auto-dissolve
  bailGraceHours: 24, // free bail before event start
  rollCallWindowHours: 24,
  peerReportThreshold: 2, // peer cross-reports trigger no-show record
  forgivenessWindowHours: 48, // member explains; creator accepts → voided
  hostingCapacity: { unproven: 1, proven: 3, top: 5 }, // earned, never by tier
  crewDormancyDays: 60,
  roomDecayDays: 14,
  maxRequiredKeywords: 3,
} as const;

export const SCORE_RULES = {
  unprovenThresholdEvents: 3, // below → "unproven"
  decayDays: 90,
} as const;

// ── Merchants ───────────────────────────────────────────────────
export const MERCHANT_PER_SEAT_BANDS = [
  { maxSeats: 50, feeHkd: 3 },
  { maxSeats: 100, feeHkd: 6 },
  { maxSeats: 200, feeHkd: 12 },
  { maxSeats: 500, feeHkd: 25 },
  { maxSeats: 1000, feeHkd: 50 },
  { maxSeats: null, feeHkd: 80 }, // 1000+
] as const;

export const MERCHANT_PRICES = {
  growth: { web: { monthly: 388, annual: 3880 }, founding: { monthly: 288, annual: 2880 } },
  pro: { web: { monthly: 888, annual: 8880 }, founding: { monthly: 688, annual: 6880 } },
  foundingSlots: 50,
  foundingMonthsYear1: 12,
} as const;

export const MERCHANT_RULES = {
  sponsoredMultiplier: 1.5, // amplification price vs organic band
  attributionVisits: 3,
  attributionWindowDays: 60,
  membershipReleaseDays: 60, // inactivity auto-release
  inactivityOptionsDays: [30, 60, 90],
  venueMemberCaps: { starter: 25, growth: 100, pro: Number.POSITIVE_INFINITY },
  standingRooms: { starter: 3, growth: 10, pro: Number.POSITIVE_INFINITY },
  ladderMaxLevels: { starter: 3, growth: 5, pro: 5 },
  discountInfoThresholdPct: 20, // below → "info-only" not "deal"
  foundingFreeMonths: 3,
  guaranteeSeats: 30, // founding guarantee: 30 verified members or extend free
  shadowInvoiceMonths: 1, // first month shows shadow invoice, charges nothing
} as const;

// ── Notifications ───────────────────────────────────────────────
export const NOTIFICATION_RULES = {
  proximityMaxPerDay: 1,
  quietHoursStartHKT: 23,
  quietHoursEndHKT: 8,
} as const;

// ── Geo / check-in ─────────────────────────────────────────────
export const GEO_RULES = {
  gpsOverlapRadiusM: 100, // check-in GPS match vs venue
  duplicateVenueRadiusM: 50, // POI dedup
} as const;

export const QR_RULES = {
  rotationSeconds: 30,
  clockToleranceSeconds: 1,
  replayTtlSeconds: 120,
} as const;
