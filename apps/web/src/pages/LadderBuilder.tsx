import { useEffect, useState } from 'react';
import { getAccessToken } from '../auth/supabase';

type Level = { position: number; name: string; minVisits: number; minMonths: number; discountPct: number | null; perkText: string | null };
type Ladder = { template: string; inactivityDays: number; levels: Level[] };

const TEMPLATES = ['cafe', 'bar', 'restaurant', 'fine_dining', 'custom'];

export function LadderBuilder() {
  const [ladder, setLadder] = useState<Ladder | null>(null);
  const [initial, setInitial] = useState<Level[]>([]);
  const [saved, setSaved] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const load = () => {
    fetch('/v1/merchant/ladder', { headers: { authorization: `Bearer ${getAccessToken()}` } })
      .then((r) => r.json())
      .then((d) => {
        const levels: Level[] = (d.levels ?? []).map((l: Record<string, unknown>) => ({
          position: Number(l.position), name: String(l.name ?? ''),
          minVisits: Number(l.min_visits ?? l.minVisits ?? 0), minMonths: Number(l.min_months ?? l.minMonths ?? 0),
          discountPct: l.discount_pct === undefined ? (l.discountPct ?? null) : (l.discount_pct as number | null),
          perkText: (l.perk_text ?? l.perkText ?? null) as string | null,
        }));
        setLadder({ template: d.template ?? 'custom', inactivityDays: d.inactivityDays ?? 60, levels });
        setInitial(levels);
      })
      .catch(() => setLadder({ template: 'custom', inactivityDays: 60, levels: [] }));
  };
  useEffect(load, []);

  if (!ladder) return <section className="mb-8"><h2 className="font-semibold mb-2">Loyalty ladder</h2><p className="text-sm opacity-60">Loading…</p></section>;

  const update = (fn: (l: Ladder) => Ladder) => setLadder((l) => (l ? fn(l) : l));

  const setLevel = (i: number, patch: Partial<Level>) =>
    update((l) => ({ ...l, levels: l.levels.map((lv, j) => (j === i ? { ...lv, ...patch } : lv)) }));

  const addLevel = () =>
    update((l) => {
      if (l.levels.length >= 8) return l;
      const next = l.levels.length + 1;
      return { ...l, template: 'custom', levels: [...l.levels, { position: next, name: `Level ${next}`, minVisits: l.levels.length ? l.levels[l.levels.length - 1].minVisits + 5 : 3, minMonths: 0, discountPct: null, perkText: null }] };
    });

  const removeLevel = (i: number) =>
    update((l) => ({ ...l, template: 'custom', levels: l.levels.filter((_, j) => j !== i).map((lv, j) => ({ ...lv, position: j + 1 })) }));

  const isReduction = ladder.levels.some((nl) => {
    const old = initial.find((o) => o.position === nl.position);
    if (!old) return false;
    return old.minVisits > nl.minVisits || old.minMonths > nl.minMonths
      || ((old.discountPct ?? 0) > (nl.discountPct ?? 0) && (old.discountPct ?? 0) > 0);
  });

  const save = async () => {
    if (isReduction && !warning) {
      setWarning('You are reducing benefits. Existing members keep their current level for 30 days and will be notified. Save anyway?');
      return;
    }
    const res = await fetch('/v1/merchant/ladder', {
      method: 'PUT',
      headers: { authorization: `Bearer ${getAccessToken()}`, 'content-type': 'application/json' },
      body: JSON.stringify({ template: ladder.template, inactivityDays: ladder.inactivityDays, levels: ladder.levels }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setSaved(d.reductionProtection ? 'Saved with 30-day member notice.' : 'Saved.'); setWarning(null); load(); }
    else { setWarning(d?.problem?.title ?? `Save failed (${res.status})`); }
  };

  const bigDiscount = ladder.levels.some((l) => (l.discountPct ?? 0) > 20);

  return (
    <section className="mb-8">
      <h2 className="font-semibold mb-2">Loyalty ladder</h2>
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <select className="border rounded px-2 py-1 text-sm" value={ladder.template} onChange={(e) => update((l) => ({ ...l, template: e.target.value }))}>
          {TEMPLATES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
        <label className="text-sm flex items-center gap-1">
          inactivity release
          <input type="number" min={14} max={180} value={ladder.inactivityDays} onChange={(e) => update((l) => ({ ...l, inactivityDays: Number(e.target.value) }))} className="border rounded w-16 px-2 py-1" />
          days
        </label>
      </div>

      <div className="space-y-2 mb-3">
        {ladder.levels.map((lv, i) => (
          <div key={i} className="border rounded-lg p-3 grid grid-cols-[auto_1fr_auto] gap-2 items-center">
            <span className="text-sm font-bold w-6 text-center">{i + 1}</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input className="border rounded px-2 py-1 text-sm" value={lv.name} onChange={(e) => setLevel(i, { name: e.target.value })} placeholder="name" />
              <label className="text-xs flex flex-col">visits
                <input type="number" min={1} className="border rounded px-2 py-1 text-sm" value={lv.minVisits} onChange={(e) => setLevel(i, { minVisits: Number(e.target.value) })} />
              </label>
              <label className="text-xs flex flex-col">months
                <input type="number" min={0} className="border rounded px-2 py-1 text-sm" value={lv.minMonths} onChange={(e) => setLevel(i, { minMonths: Number(e.target.value) })} />
              </label>
              <label className="text-xs flex flex-col">discount %
                <input type="number" min={0} max={100} className="border rounded px-2 py-1 text-sm" value={lv.discountPct ?? ''} onChange={(e) => setLevel(i, { discountPct: e.target.value === '' ? null : Number(e.target.value) })} />
              </label>
            </div>
            <div className="flex gap-1">
              {ladder.levels.length > 1 && <button className="border rounded px-2 py-1 text-xs" onClick={() => removeLevel(i)}>✕</button>}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <button className="border rounded px-3 py-1 text-sm" onClick={addLevel}>+ Level</button>
        <button className="bg-neutral-900 text-white rounded px-4 py-1 text-sm" onClick={save}>Save</button>
        {saved && <span className="text-xs text-green-700">{saved}</span>}
      </div>

      {bigDiscount && <p className="text-xs text-amber-600 mt-2">Discounts above 20% are your cost — shown as info only, MeshPoke takes no cut and cannot verify honouring.</p>}

      {warning && (
        <div className="mt-3 border border-amber-500 rounded-lg p-3 text-sm bg-amber-50">
          <p className="mb-2">{warning}</p>
          <div className="flex gap-2">
            <button className="bg-amber-600 text-white rounded px-3 py-1 text-xs" onClick={save}>Save with notice</button>
            <button className="border rounded px-3 py-1 text-xs" onClick={() => setWarning(null)}>Cancel</button>
          </div>
        </div>
      )}

      <details className="mt-3">
        <summary className="text-sm cursor-pointer opacity-70">Member view preview</summary>
        <ul className="mt-2 border rounded-lg divide-y text-sm">
          {ladder.levels.map((lv) => (
            <li key={lv.position} className="px-3 py-2 flex justify-between">
              <span className="font-medium">{lv.name}</span>
              <span className="opacity-60">{lv.minVisits} visits{lv.minMonths ? ` · ${lv.minMonths} mo` : ''}{lv.discountPct ? ` · −${lv.discountPct}%` : ''}{lv.perkText ? ` · ${lv.perkText}` : ''}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
