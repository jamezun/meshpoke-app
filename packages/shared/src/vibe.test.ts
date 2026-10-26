import { describe, it, expect } from 'vitest';
import { vibe, vibePercent, type KeywordLevel } from './vibe.js';

const k = (keyword: string, level: number): KeywordLevel => ({ keyword, level });

describe('vibe()', () => {
  it('either side empty → 0.5', () => {
    expect(vibe([], [k('tennis', 8)])).toBe(0.5);
    expect(vibe([k('tennis', 8)], [])).toBe(0.5);
    expect(vibe([], [])).toBe(0.5);
  });

  it('PRD worked example: overlap / reference size', () => {
    // user: tennis 8, hiking 5; spot requires tennis, drinks
    // shared: tennis → min(8,8)/10 = 0.8; denom 2 → 0.4
    const u = [k('tennis', 8), k('hiking', 5)];
    const ref = [k('tennis', 8), k('drinks', 4)];
    expect(vibe(u, ref)).toBeCloseTo(0.4, 10);
  });

  it('min of levels: user low caps the credit', () => {
    // user tennis 3, ref tennis 9 → min 3/10 = 0.3, denom 1 → 0.3
    expect(vibe([k('tennis', 3)], [k('tennis', 9)])).toBe(0.3);
  });

  it('clamps to 1.0 max (10 shared ≥ level 10 vs small ref impossible, but clamp holds)', () => {
    // ref has 1 keyword, user has same at 10 → 1.0
    expect(vibe([k('tennis', 10)], [k('tennis', 10)])).toBe(1);
  });

  it('disjoint sets → 0', () => {
    expect(vibe([k('tennis', 8)], [k('coffee', 8)])).toBe(0);
  });
});

describe('vibePercent()', () => {
  it('caps at 99 even for perfect 1.0', () => {
    expect(vibePercent(1)).toBe(99);
    expect(vibePercent(0.5)).toBe(50);
    expect(vibePercent(0)).toBe(0);
  });
});
