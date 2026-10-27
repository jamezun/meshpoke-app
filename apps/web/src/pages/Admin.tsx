import { useEffect, useState } from 'react';
import { getAccessToken } from '../auth/supabase';

async function api(path: string) {
  const token = getAccessToken();
  const res = await fetch(`/v1${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (res.status === 403) throw new Error('Not an admin.');
  return res.json();
}


type Metrics = {
  funnel: Record<string, number>;
  attendanceRate: number | null;
  rebookRate: number | null;
  fairness: { freeAccepted: number; paidAccepted: number; freeShare: number | null };
  topVenues: { name: string; checkins: number }[];
  conversion: { paying: number; total: number; rate: number | null };
  pokes: { sent: number; returned: number };
};

function MetricsSection() {
  const [m, setM] = useState<Metrics | null>(null);
  useEffect(() => { api('/admin/metrics').then(setM).catch(() => {}); }, []);
  if (!m) return <p className="text-sm text-gray-400">Metrics…</p>;
  const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">Metrics</h2>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div className="rounded-xl border p-3"><p className="text-gray-500">Attendance rate</p><p className="text-xl font-bold">{pct(m.attendanceRate)}</p></div>
        <div className="rounded-xl border p-3"><p className="text-gray-500">Rebook rate</p><p className="text-xl font-bold">{pct(m.rebookRate)}</p></div>
        <div className="rounded-xl border p-3"><p className="text-gray-500">Free share of accepts</p><p className="text-xl font-bold">{pct(m.fairness.freeShare)}</p><p className="text-xs text-gray-400">fairness gate: keep free visible</p></div>
        <div className="rounded-xl border p-3"><p className="text-gray-500">Payer conversion</p><p className="text-xl font-bold">{pct(m.conversion.rate)}</p><p className="text-xs text-gray-400">{m.conversion.paying}/{m.conversion.total} users</p></div>
      </div>
      <p className="mt-3 text-sm text-gray-600">
        Funnel: {m.funnel.created} created → {m.funnel.forming} forming → {m.funnel.confirmed} confirmed → {m.funnel.live} live → {m.funnel.done} done
        ({m.funnel.cancelled} cancelled, {m.funnel.dissolved} dissolved)
      </p>
      <p className="mt-1 text-sm text-gray-600">Pokes: {m.pokes.sent} sent, {m.pokes.returned} mutual ({pct(m.pokes.sent ? m.pokes.returned / m.pokes.sent : null)} poke-back)</p>
      {m.topVenues.length > 0 && (
        <>
          <h3 className="mt-4 font-semibold">Top venues by check-ins</h3>
          <ul className="mt-1 text-sm text-gray-600">{m.topVenues.map((v) => <li key={v.name}>{v.name} — {v.checkins}</li>)}</ul>
        </>
      )}
    </section>
  );
}

function FinanceSection() {
  const [health, setHealth] = useState<{ merchantMrrHkd: number; seatRevenueMtdHkd: number; openDisputes: number; foundingMerchants: number } | null>(null);
  const [disputes, setDisputes] = useState<{ id: string; venue_name: string; event_type: string; amount: number; disputed_at: string }[]>([]);
  const [due, setDue] = useState<{ id: string; display_name: string; price_band: number; checkins_90d: number }[]>([]);

  const load = () => {
    api('/admin/merchant-finance/health').then(setHealth).catch(() => {});
    api('/admin/merchant-finance/disputes').then((d) => setDisputes(d.disputes ?? [])).catch(() => {});
    api('/admin/merchant-finance/band-audit').then((d) => setDue(d.due ?? [])).catch(() => {});
  };
  useEffect(load, []);

  const resolve = async (id: string, resolution: 'credit_note' | 'rejected') => {
    await fetch(`/v1/admin/merchant-finance/disputes/${id}/resolve`, {
      method: 'POST',
      headers: { authorization: `Bearer ${getAccessToken()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ resolution }),
    });
    load();
  };

  const setBand = async (venueId: string, newBand: number) => {
    await fetch(`/v1/admin/merchant-finance/band-audit/${venueId}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${getAccessToken()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ newBand }),
    });
    load();
  };

  return (
    <section className="mb-8">
      <h2 className="font-semibold mb-2">Merchant finance</h2>
      {health && (
        <div className="grid grid-cols-4 gap-2 text-center mb-4">
          <div className="border rounded-lg p-2"><div className="text-lg font-bold">${health.merchantMrrHkd}</div><div className="text-xs opacity-60">SaaS MRR</div></div>
          <div className="border rounded-lg p-2"><div className="text-lg font-bold">${health.seatRevenueMtdHkd}</div><div className="text-xs opacity-60">Seats MTD</div></div>
          <div className="border rounded-lg p-2"><div className="text-lg font-bold">{health.openDisputes}</div><div className="text-xs opacity-60">Open disputes</div></div>
          <div className="border rounded-lg p-2"><div className="text-lg font-bold">{health.foundingMerchants}</div><div className="text-xs opacity-60">Founding</div></div>
        </div>
      )}
      <h3 className="text-sm font-medium mb-1">Disputes</h3>
      <ul className="divide-y divide-neutral-200 border rounded-lg overflow-hidden mb-4">
        {disputes.map((d) => (
          <li key={d.id} className="px-4 py-2 text-sm flex items-center justify-between">
            <span>{d.venue_name} <span className="opacity-50">${d.amount} · {d.event_type}</span></span>
            <span className="flex gap-2">
              <button className="border rounded px-2 py-1 text-xs" onClick={() => resolve(d.id, 'rejected')}>Reject</button>
              <button className="bg-neutral-900 text-white rounded px-2 py-1 text-xs" onClick={() => resolve(d.id, 'credit_note')}>Credit note</button>
            </span>
          </li>
        ))}
        {disputes.length === 0 && <li className="px-4 py-2 text-sm opacity-60">No open disputes.</li>}
      </ul>
      <h3 className="text-sm font-medium mb-1">Band audits due (&gt;90d)</h3>
      <ul className="divide-y divide-neutral-200 border rounded-lg overflow-hidden">
        {due.map((d) => (
          <li key={d.id} className="px-4 py-2 text-sm flex items-center justify-between">
            <span>{d.display_name} <span className="opacity-50">band {d.price_band} · {d.checkins_90d} check-ins</span></span>
            <select className="border rounded text-xs px-2 py-1" defaultValue="" onChange={(e) => e.target.value && setBand(d.id, Number(e.target.value))}>
              <option value="" disabled>Set band…</option>
              {[1, 2, 3, 4, 5, 6].map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </li>
        ))}
        {due.length === 0 && <li className="px-4 py-2 text-sm opacity-60">Nothing due.</li>}
      </ul>
    </section>
  );
}

export function AdminPage() {
  const [claims, setClaims] = useState<{ id: string; venue: string; owner: string; price_band: number; certUrl: string | null }[]>([]);
  const [users, setUsers] = useState<{ id: string; email: string; display_name: string; liveness_state: string }[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api('/admin/merchant-claims').then((d) => setClaims(d.claims ?? [])).catch((e) => setError(String(e.message)));
  }, []);

  useEffect(() => {
    if (q.length < 2) { setUsers([]); return; }
    const t = setTimeout(() => { api(`/admin/users?q=${encodeURIComponent(q)}`).then((d) => setUsers(d.users ?? [])); }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const decide = async (id: string, action: 'approve' | 'reject') => {
    await fetch(`/v1/admin/merchant-claims/${id}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${getAccessToken()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setClaims((c) => c.filter((x) => x.id !== id));
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold mb-6">Admin</h1>
      <MetricsSection />
      <FinanceSection />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <h2 className="font-semibold mb-2">Merchant claims ({claims.length})</h2>
      <ul className="divide-y divide-neutral-200 border rounded-lg overflow-hidden mb-8">
        {claims.map((c) => (
          <li key={c.id} className="px-4 py-3 text-sm flex items-center justify-between gap-2">
            <div>
              <div className="font-medium">{c.venue} <span className="opacity-50 font-normal">band {c.price_band}</span></div>
              <div className="text-xs opacity-60">{c.owner} {c.certUrl && <a className="underline" href={c.certUrl} target="_blank" rel="noreferrer">BR cert ↗</a>}</div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button className="border rounded px-3 py-1" onClick={() => decide(c.id, 'reject')}>Reject</button>
              <button className="bg-neutral-900 text-white rounded px-3 py-1" onClick={() => decide(c.id, 'approve')}>Approve</button>
            </div>
          </li>
        ))}
        {claims.length === 0 && <li className="px-4 py-3 text-sm opacity-60">Queue empty.</li>}
      </ul>

      <h2 className="font-semibold mb-2">Users</h2>
      <input className="w-full border rounded px-3 py-2 text-sm mb-2" placeholder="Search email or name…" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="divide-y divide-neutral-200 border rounded-lg overflow-hidden">
        {users.map((u) => (
          <li key={u.id} className="px-4 py-2 text-sm flex justify-between"><span>{u.display_name} <span className="opacity-50">{u.email}</span></span><span className="opacity-50">{u.liveness_state}</span></li>
        ))}
      </ul>
      <p className="text-xs opacity-50 mt-4">Suspension, venue pins, reports and merges: API-only in Phase 0 (RBAC-enforced).</p>
    </main>
  );
}
