import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../auth/supabase';

type Drop = {
  id: string; kind: 'individual' | 'group'; title: string; offer_text: string;
  capacity: number; claimed_count: number; sponsored: boolean; status: string;
  perk_cost_estimate?: string | null; starts_at: string; ends_at: string;
};

async function api(path: string, init?: RequestInit) {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  const res = await fetch(`/v1${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.title ?? `Error ${res.status}`);
  return body;
}

/** T15.5 merchant drops builder: create individual/group drops w/ cost estimate + pause/resume. */
export function DropsBuilder() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    kind: 'individual' as 'individual' | 'group', title: '', offerText: '',
    capacity: 20, perkCostEstimate: 0, minGroupSize: 4, sponsored: false,
    discountPct: 0, days: 7,
  });

  const load = useCallback(async () => {
    try {
      const me = await api('/merchant/me');
      const list = me.venues?.length
        ? (await Promise.all(me.venues.map(async (v: { id: string }) => {
            const d = await api(`/venues/${v.id}/drops`); return d.drops ?? [];
          }))).flat()
        : [];
      setDrops(list as Drop[]);
    } catch (e) { setError(String((e as Error).message)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const estimate = form.perkCostEstimate > 0 ? <span title="seat fee at your band + offer value">{form.perkCostEstimate + 6}+</span> : null;

  const create = async () => {
    setError(null); setMsg(null);
    try {
      const startsAt = new Date(Date.now() - 60_000).toISOString();
      const endsAt = new Date(Date.now() + form.days * 86_400_000).toISOString();
      await api('/merchant/drops', { method: 'POST', body: JSON.stringify({
        kind: form.kind, title: form.title, offerText: form.offerText,
        capacity: form.capacity, sponsored: form.sponsored,
        perkCostEstimate: form.perkCostEstimate || undefined,
        minGroupSize: form.kind === 'group' ? form.minGroupSize : undefined,
        discountPct: form.discountPct || undefined,
        startsAt, endsAt,
      }) });
      setMsg(`Drop live: ${form.title}`);
      setForm({ ...form, title: '', offerText: '' });
      await load();
    } catch (e) { setError(String((e as Error).message)); }
  };

  const toggle = async (d: Drop) => {
    try {
      await api(`/merchant/drops/${d.id}`, { method: 'PATCH', body: JSON.stringify({ status: d.status === 'active' ? 'paused' : 'active' }) });
      await load();
    } catch (e) { setError(String((e as Error).message)); }
  };

  return (
    <div>
      <ul className="divide-y divide-neutral-200 border rounded-lg overflow-hidden mb-4">
        {drops.map((d) => (
          <li key={d.id} className="px-4 py-2 text-sm flex items-center justify-between">
            <span>
              <span className="font-medium">{d.title}</span>{' '}
              <span className="text-xs opacity-60">{d.kind === 'group' ? 'group' : 'drop'} · {d.claimed_count}/{d.capacity} claimed{d.sponsored ? ' · sponsored' : ''}</span>
            </span>
            <button className="text-xs underline" onClick={() => void toggle(d)}>{d.status === 'active' ? 'Pause' : 'Resume'}</button>
          </li>
        ))}
        {drops.length === 0 && <li className="px-4 py-3 text-sm opacity-60">No drops yet — perks bring regulars back.</li>}
      </ul>

      <div className="border rounded-lg p-4 space-y-2">
        <div className="flex gap-2">
          {(['individual', 'group'] as const).map((k) => (
            <button key={k} className={`rounded px-3 py-1 text-sm ${form.kind === k ? 'bg-neutral-900 text-white' : 'border'}`}
              onClick={() => setForm({ ...form, kind: k })}>{k === 'individual' ? 'Individual drop' : 'Group drop'}</button>
          ))}
        </div>
        <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Title (e.g. Free coffee with cake)"
          value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} placeholder="Offer text — what the guest gets"
          value={form.offerText} onChange={(e) => setForm({ ...form, offerText: e.target.value })} />
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs">Capacity
            <input type="number" min={1} className="mt-1 w-full border rounded px-2 py-1 text-sm" value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
          </label>
          <label className="text-xs">Perk cost est. (HK$)
            <input type="number" min={0} className="mt-1 w-full border rounded px-2 py-1 text-sm" value={form.perkCostEstimate}
              onChange={(e) => setForm({ ...form, perkCostEstimate: Number(e.target.value) })} />
          </label>
          <label className="text-xs">Discount %
            <input type="number" min={0} max={100} className="mt-1 w-full border rounded px-2 py-1 text-sm" value={form.discountPct}
              onChange={(e) => setForm({ ...form, discountPct: Number(e.target.value) })} />
          </label>
        </div>
        {form.kind === 'group' && (
          <label className="text-xs">Min group size
            <input type="number" min={2} max={20} className="mt-1 w-24 border rounded px-2 py-1 text-sm" value={form.minGroupSize}
              onChange={(e) => setForm({ ...form, minGroupSize: Number(e.target.value) })} />
          </label>
        )}
        {form.discountPct > 20 && (
          <p className="text-xs text-yellow-700">Discounts above 20%: MeshPoke flags these for the member (info only) and needs a cost estimate.</p>
        )}
        <p className="text-xs opacity-60">Runs for {form.days} days · est. cost per guest {estimate ?? 'seat fee at your band'}</p>
        <button className="bg-neutral-900 text-white rounded px-4 py-2 text-sm font-medium"
          disabled={form.title.trim().length < 3 || form.offerText.trim().length < 3} onClick={() => void create()}>
          Publish drop
        </button>
      </div>

      {msg && <p className="text-sm text-green-700 mt-2">{msg}</p>}
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
