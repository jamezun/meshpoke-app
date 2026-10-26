import { describe, expect, it } from 'vitest';
import { validateKeywords } from './ProfileEditor';

describe('validateKeywords mirrors DB trigger (T1.1)', () => {
  const mk = (n: number, high = 0) => Array.from({ length: n }, (_, i) => ({ keyword: `k${i}`, level: i < high ? 8 : 3 }));
  it('accepts 10 with 3 high, rejects 11 or 4 high', () => {
    expect(validateKeywords(mk(10, 3))).toBeNull();
    expect(validateKeywords(mk(11, 0))).toMatch(/Max 10/);
    expect(validateKeywords(mk(10, 4))).toMatch(/Max 3/);
  });
});
