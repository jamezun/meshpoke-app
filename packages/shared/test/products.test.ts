import { describe, expect, test } from 'vitest';
import { PRODUCTS, productById, monthlyEquivalent } from '../src/products.js';

test('catalogue: 17 SKUs, web+IAP prices wired from constants', () => {
  expect(PRODUCTS).toHaveLength(17);
  expect(productById('plus_annual')).toMatchObject({ termDays: 365, priceWebHkd: 788, priceIapHkd: 888 });
  expect(productById('pro_annual')).toMatchObject({ termDays: 365, priceWebHkd: 1288, priceIapHkd: 1388 });
  expect(productById('plus_monthly')).toMatchObject({ kind: 'subscription', plan: 'plus', priceWebHkd: 128, priceIapHkd: 148 });
  expect(productById('pro_6mo')).toMatchObject({ termDays: 180, priceWebHkd: 788, priceIapHkd: 898 });
  expect(productById('plus_founding_annual')?.priceIapHkd).toBeNull(); // web-only
  expect(productById('filter_pass_7d')).toMatchObject({ kind: 'pass', priceWebHkd: 18 });
  expect(productById('poke_pack_5')).toMatchObject({ kind: 'pack', termDays: 0 });
});

test('monthlyEquivalent: founding annual cheaper per month than monthly', () => {
  expect(monthlyEquivalent(productById('plus_founding_annual')!)).toBeLessThan(productById('plus_monthly')!.priceWebHkd!);
});
