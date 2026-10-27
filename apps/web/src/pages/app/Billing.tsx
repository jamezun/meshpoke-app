// T17.5 web billing page: web prices (cheaper than IAP — the whole point of web checkout),
// founding banner, current plan, portal link. Mobile NEVER shows these numbers (App Store rule).
import { useEffect, useState } from 'react';
import { PRICES, FOUNDING_SLOTS } from '@meshpoke/shared/constants';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const { supabase } = await import('../../auth/supabase.js');
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  const res = await fetch(`/v1${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`);
  return res.json() as Promise<T>;
}

const PLAN_LABEL: Record<string, string> = { free: 'Free', plus: 'Plus', pro: 'Pro' };

export function BillingPage() {
  const [plan, setPlan] = useState<string>('…');
  useEffect(() => { api<{ plan: string }>('/me/caps').then((c) => setPlan(c.plan)).catch(() => setPlan('free')); }, []);

  const buy = async (product: string) => {
    const r = await api<{ url?: string }>('/billing/checkout', { method: 'POST', body: JSON.stringify({ product }) });
    if (r.url) window.location.href = r.url;
  };

  const p = PRICES.plus.web;
  const pr = PRICES.pro.web;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Billing</h1>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <p className="font-semibold">開台價 — Founding member prices for the first {FOUNDING_SLOTS}</p>
        <p className="text-sm">
          Plus HK${p.foundingMonthly}/mo · Pro HK${pr.foundingMonthly}/mo — locked forever while subscribed.
        </p>
      </div>

      <div className="rounded-xl border p-4">
        <p className="text-sm text-gray-500">Current plan</p>
        <p className="text-lg font-semibold">{PLAN_LABEL[plan] ?? plan}</p>
        <a className="text-sm text-blue-600 underline" href="#/app/billing" onClick={async (e) => {
          e.preventDefault();
          const r = await api<{ url?: string }>('/billing/portal', { method: 'POST' });
          if (r.url) window.location.href = r.url;
        }}>Manage payment method / receipts</a>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border p-4 space-y-2">
          <h2 className="font-semibold">Plus</h2>
          <p className="text-sm">10 rooms · 5 RSVPs · 20 pokes/wk · express badge</p>
          <ul className="text-sm space-y-1">
            <li>Monthly <b>HK${p.monthly}</b></li>
            <li>3 months <b>HK${p.term3mo}</b> (HK${Math.round(p.term3mo / 3)}/mo)</li>
            <li>6 months <b>HK${p.term6mo}</b> (HK${Math.round(p.term6mo / 6)}/mo)</li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-2">
            <button className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm" onClick={() => buy('plus_monthly')}>Monthly</button>
            <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => buy('plus_3mo')}>3 mo</button>
            <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => buy('plus_6mo')}>6 mo</button>
            <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => buy('plus_founding_monthly')}>Founding {p.foundingMonthly}</button>
          </div>
        </div>

        <div className="rounded-xl border p-4 space-y-2">
          <h2 className="font-semibold">Pro</h2>
          <p className="text-sm">20 rooms · 10 RSVPs · 50 pokes/wk · 500-char notes · express-top</p>
          <ul className="text-sm space-y-1">
            <li>Monthly <b>HK${pr.monthly}</b></li>
            <li>3 months <b>HK${pr.term3mo}</b> (HK${Math.round(pr.term3mo / 3)}/mo)</li>
            <li>6 months <b>HK${pr.term6mo}</b> (HK${Math.round(pr.term6mo / 6)}/mo)</li>
          </ul>
          <div className="flex flex-wrap gap-2 pt-2">
            <button className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm" onClick={() => buy('pro_monthly')}>Monthly</button>
            <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => buy('pro_3mo')}>3 mo</button>
            <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => buy('pro_6mo')}>6 mo</button>
            <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => buy('pro_founding_monthly')}>Founding {pr.foundingMonthly}</button>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400">Flat prices, no personalized offers, cancel anytime (keeps benefits until period end).</p>
    </div>
  );
}
