import { describe, it, expect } from 'vitest';
import { mostRecentMondayMidnightHKT, hktParts, hktDayStart, isQuietHoursHKT, plusDays } from '../src/time.js';

const utc = (s: string) => +new Date(s);

describe('mostRecentMondayMidnightHKT', () => {
  // 2026-10-26 (UTC) is a Monday; Monday 00:00 HKT = Sunday 16:00 UTC.

  it('Monday 10:00 HKT → same day midnight', () => {
    const now = new Date('2026-10-26T02:00:00Z'); // Mon 10:00 HKT
    expect(+mostRecentMondayMidnightHKT(now)).toBe(utc('2026-10-25T16:00:00Z'));
  });

  it('Sunday 23:59 HKT → previous Monday midnight', () => {
    const now = new Date('2026-11-01T15:59:00Z'); // Sun 23:59 HKT
    expect(+mostRecentMondayMidnightHKT(now)).toBe(utc('2026-10-25T16:00:00Z'));
  });

  it('Monday 00:00 HKT exact boundary → that instant', () => {
    const now = new Date('2026-10-25T16:00:00Z'); // Mon 00:00 HKT exactly
    expect(+mostRecentMondayMidnightHKT(now)).toBe(utc('2026-10-25T16:00:00Z'));
  });

  it('Monday 00:00 HKT minus 1s → previous Monday', () => {
    const now = new Date('2026-10-25T15:59:59Z'); // Sun 23:59:59 HKT
    expect(+mostRecentMondayMidnightHKT(now)).toBe(utc('2026-10-18T16:00:00Z'));
  });

  it('Wednesday 11:00 HKT → that week Monday', () => {
    const now = new Date('2026-10-28T03:00:00Z'); // Wed 11:00 HKT
    expect(+mostRecentMondayMidnightHKT(now)).toBe(utc('2026-10-25T16:00:00Z'));
  });
});

describe('hkt helpers', () => {
  it('hktParts converts UTC to HKT (+8)', () => {
    const p = hktParts(new Date('2026-10-26T16:00:00Z')); // Tue 00:00 HKT
    expect(p).toMatchObject({ y: 2026, m: 9, d: 27, h: 0, weekday: 2 });
  });

  it('hktDayStart returns midnight HKT', () => {
    expect(+hktDayStart(new Date('2026-10-27T10:30:00Z'))).toBe(utc('2026-10-26T16:00:00Z')); // 18:30 HKT Tue → Tue 00:00
  });

  it('isQuietHoursHKT: 23:30 quiet, 12:00 not, 07:59 quiet, 08:00 not', () => {
    expect(isQuietHoursHKT(new Date('2026-10-26T15:30:00Z'))).toBe(true); // 23:30 HKT
    expect(isQuietHoursHKT(new Date('2026-10-26T04:00:00Z'))).toBe(false); // 12:00 HKT
    expect(isQuietHoursHKT(new Date('2026-10-26T23:59:00Z'))).toBe(true); // 07:59 HKT
    expect(isQuietHoursHKT(new Date('2026-10-27T00:00:00Z'))).toBe(false); // 08:00 HKT
  });

  it('plusDays adds fixed ms (no DST in HKT)', () => {
    expect(plusDays(new Date('2026-10-26T16:00:00Z'), 7).toISOString()).toBe('2026-11-02T16:00:00.000Z');
  });
});
