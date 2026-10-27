/**
 * T17.1 Consumer product catalogue — single source of truth derived from PRICES.
 * Web prices only appear on web; IAP prices only in the apps (store rules).
 */
import { PRICES } from './constants.js';

export type ProductKind = 'subscription' | 'pass' | 'pack';
export type ProductPlan = 'plus' | 'pro' | 'none';

export type Product = {
  id: string; // sku: e.g. plus_monthly_web, plus_monthly_iap
  kind: ProductKind;
  plan: ProductPlan;
  termDays: number; // subscription/pass length; 0 for packs
  priceWebHkd: number | null; // null = not sold on web (IAP-only or web-only inverse)
  priceIapHkd: number | null;
};

function sub(id: string, plan: 'plus' | 'pro', termDays: number, w: number | null, i: number | null): Product {
  return { id, kind: 'subscription', plan, termDays, priceWebHkd: w, priceIapHkd: i };
}

export const PRODUCTS: readonly Product[] = [
  // Plus
  sub('plus_monthly', 'plus', 30, PRICES.plus.web.monthly, PRICES.plus.iap.monthly),
  sub('plus_7d', 'plus', 7, PRICES.plus.web.pass7d, PRICES.plus.iap.pass7d),
  sub('plus_3mo', 'plus', 90, PRICES.plus.web.term3mo, PRICES.plus.iap.term3mo),
  sub('plus_6mo', 'plus', 180, PRICES.plus.web.term6mo, PRICES.plus.iap.term6mo),
  sub('plus_founding_monthly', 'plus', 30, PRICES.plus.web.foundingMonthly, PRICES.plus.iap.foundingMonthly),
  sub('plus_founding_annual', 'plus', 365, PRICES.plus.web.foundingAnnual, null), // web-only
  // Pro
  sub('pro_monthly', 'pro', 30, PRICES.pro.web.monthly, PRICES.pro.iap.monthly),
  sub('pro_7d', 'pro', 7, PRICES.pro.web.pass7d, PRICES.pro.iap.pass7d),
  sub('pro_3mo', 'pro', 90, PRICES.pro.web.term3mo, PRICES.pro.iap.term3mo),
  sub('pro_6mo', 'pro', 180, PRICES.pro.web.term6mo, PRICES.pro.iap.term6mo),
  sub('pro_founding_monthly', 'pro', 30, PRICES.pro.web.foundingMonthly, PRICES.pro.iap.foundingMonthly),
  sub('pro_founding_annual', 'pro', 365, PRICES.pro.web.foundingAnnual, null), // web-only
  // Packs / standalone pass
  { id: 'poke_pack_5', kind: 'pack', plan: 'none', termDays: 0, priceWebHkd: PRICES.pokePack5.web, priceIapHkd: PRICES.pokePack5.iap },
  { id: 'poke_pack_15', kind: 'pack', plan: 'none', termDays: 0, priceWebHkd: PRICES.pokePack15.web, priceIapHkd: PRICES.pokePack15.iap },
  { id: 'filter_pass_7d', kind: 'pass', plan: 'none', termDays: 7, priceWebHkd: PRICES.filterPass7d.web, priceIapHkd: PRICES.filterPass7d.iap },
] as const;

export function productById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

/** Monthly-equivalent price for display ordering (cheapest-term comparisons). */
export function monthlyEquivalent(p: Product): number {
  const price = p.priceWebHkd ?? p.priceIapHkd ?? 0;
  return p.termDays > 0 ? Math.round((price / p.termDays) * 30) : price;
}
