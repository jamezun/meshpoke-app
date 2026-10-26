/**
 * HKT time helpers. Hong Kong has no DST — fixed UTC+8 year-round.
 */

export const HKT_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Wall-clock HKT parts for a given instant (no DST to worry about). */
export function hktParts(now: Date): { y: number; m: number; d: number; h: number; min: number; s: number; weekday: number } {
  const t = new Date(now.getTime() + HKT_OFFSET_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), h: t.getUTCHours(), min: t.getUTCMinutes(), s: t.getUTCSeconds(), weekday: t.getUTCDay() };
}

/** Most recent Monday 00:00 HKT, as a UTC Date. Weekly poke counters reset here. */
export function mostRecentMondayMidnightHKT(now: Date): Date {
  const { y, m, d, weekday } = hktParts(now);
  const daysSinceMonday = (weekday + 6) % 7; // Mon=0 … Sun=6
  const mondayWall = Date.UTC(y, m, d - daysSinceMonday, 0, 0, 0);
  return new Date(mondayWall - HKT_OFFSET_MS);
}

/** HKT midnight of the calendar day containing `now`, as a UTC Date. */
export function hktDayStart(now: Date): Date {
  const { y, m, d } = hktParts(now);
  return new Date(Date.UTC(y, m, d) - HKT_OFFSET_MS);
}

/** Quiet-hours check for notifications (default 23:00–08:00 HKT). */
export function isQuietHoursHKT(now: Date, startHour = 23, endHour = 8): boolean {
  const h = hktParts(now).h;
  return startHour <= endHour ? h >= startHour && h < endHour : h >= startHour || h < endHour;
}

/** Add N HKT calendar days to an instant (used for expiry windows). */
export function plusDays(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}
