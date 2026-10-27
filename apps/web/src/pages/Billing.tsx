import { useEffect, useState } from 'react';
import { supabase } from '../auth/supabase';

async function api(path: string, init?: RequestInit) {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in first.');
  const res = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { title?: string }).title ?? `HTTP ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

type Invoice = {
  id: string; period: string; seatAmount: number; shadowAmount: number; total: number;
};
type SeatCharge = {
  id: string; eventType: string; amount: number; shadow: boolean; createdAt: string;
  invoiceId: string | null; disputedAt: string | null;
};

/** T16.4 merchant invoices + disputes + founding status card. */
export function BillingSection() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [charges, setCharges] = useState<SeatCharge[]>([]);
  const [found, setFound] = useState<{ founding: boolean; founding_free_until: string | null; tier: string } | null>(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => {
    api('/merchant/billing/invoices').then((d) => setInvoices((d.invoices ?? []) as Invoice[])).catch((e) => setErr(String(e.message)));
    api('/merchant/billing/seat-charges').then((d) => setCharges((d.charges ?? []) as SeatCharge[])).catch(() => {});
    api('/merchant/me').then((d) => setFound((((d as { accounts?: { founding: boolean; founding_free_until: string | null; tier: string }[] }).accounts ?? [])[0] ?? null))).catch(() => {});
  };
  useEffect(load, []);

  const dispute = async (id: string) => {
    setMsg('');
    try {
      await api(`/merchant/seat-charges/${id}/dispute`, { method: 'POST' });
      setMsg('Dispute filed — we review within 3 days.');
      load();
    } catch (e) { setErr(String((e as Error).message)); }
  };

  return (
    <section className="border-t border-zinc-200 pt-6 mt-6">
      <h3 className="font-semibold mb-2">Billing</h3>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {msg && <p className="text-sm text-emerald-600">{msg}</p>}

      {found?.founding && found.founding_free_until && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm mb-4">
          🎉 Founding merchant — seat fees waived until{' '}
          <b>{new Date(found.founding_free_until).toLocaleDateString('en-HK')}</b> (shown below as “waived”).
        </div>
      )}

      <h4 className="text-sm font-medium text-zinc-500 mb-1">Invoices</h4>
      <table className="w-full text-sm mb-4">
        <thead><tr className="text-left text-zinc-500"><th>Period</th><th>Seats</th><th>Waived (shadow)</th><th>Total</th></tr></thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.id} className="border-t border-zinc-100">
              <td className="py-1">{i.period}</td>
              <td>${i.seatAmount}</td>
              <td className="text-zinc-400">${i.shadowAmount}</td>
              <td className="font-medium">${i.total}</td>
            </tr>
          ))}
          {invoices.length === 0 && <tr><td colSpan={4} className="py-2 text-zinc-400">No invoices yet</td></tr>}
        </tbody>
      </table>

      <h4 className="text-sm font-medium text-zinc-500 mb-1">Verified-seat charges (dispute within 7 days)</h4>
      <ul className="text-sm">
        {charges.map((c) => (
          <li key={c.id} className="flex items-center justify-between border-t border-zinc-100 py-1">
            <span>
              {c.eventType.replace(/_/g, ' ')} · {new Date(c.createdAt).toLocaleDateString('en-HK')} ·{' '}
              {c.shadow ? <span className="text-amber-600">waived</span> : `$${c.amount}`}
              {c.disputedAt && <span className="ml-2 text-red-500">disputed</span>}
            </span>
            {!c.disputedAt && !c.invoiceId && (
              <button className="text-xs underline text-zinc-500" onClick={() => dispute(c.id)}>dispute</button>
            )}
          </li>
        ))}
        {charges.length === 0 && <li className="py-2 text-zinc-400">No seat charges yet</li>}
      </ul>
    </section>
  );
}
