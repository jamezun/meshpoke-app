import { useEffect, useState } from 'react';
import { AppPage } from './Placeholder';

const INDUSTRIES = ['Finance', 'Tech', 'Design', 'Media', 'Medical', 'Legal', 'Education', 'Hospitality', 'Student', 'Other'];

/// Mirrors the DB trigger (T1.1) and the mobile editor: max 10, max 3 at level 8+.
export function validateKeywords(kws: { keyword: string; level: number }[]): string | null {
  if (kws.length > 10) return `Max 10 keywords (you have ${kws.length}).`;
  if (kws.filter((k) => k.level >= 8).length > 3) return 'Max 3 keywords at level 8+.';
  return null;
}

export function ProfileEditorPage() {
  const [industry, setIndustry] = useState('');
  const [oneliner, setOneliner] = useState('');
  const [keywords, setKeywords] = useState<{ keyword: string; level: number }[]>([]);
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);
  const err = validateKeywords(keywords);

  useEffect(() => {
    fetch('/v1/me').then(async (r) => { if (r.ok) { const me = await r.json(); setIndustry(me.industry ?? ''); setOneliner(me.roleOneliner ?? ''); setKeywords(me.keywords ?? []); } }).catch(() => {});
  }, []);

  async function save() {
    await fetch('/v1/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ industry, roleOneliner: oneliner }) });
    await fetch('/v1/me/keywords', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(keywords) });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  function add() {
    const kw = draft.trim().toLowerCase();
    if (!kw || keywords.some((k) => k.keyword === kw)) return;
    setKeywords([...keywords, { keyword: kw, level: 1 }]);
    setDraft('');
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold">Your sketch</h1>
      <div className="mt-6 space-y-4">
        <label className="block text-sm">Industry
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-transparent px-3 py-2">
            <option value="">Choose…</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </label>
        <label className="block text-sm">One-liner <span className="text-zinc-500">({oneliner.length}/40)</span>
          <input value={oneliner} maxLength={40} onChange={(e) => setOneliner(e.target.value)} placeholder="what do you actually do?" className="mt-1 w-full rounded-lg border border-zinc-700 bg-transparent px-3 py-2" />
        </label>
        <div className="text-sm">Keywords <span className="text-zinc-500">({keywords.length}/10, {keywords.filter((k) => k.level >= 8).length}/3 at 8+)</span>
          <div className="mt-2 flex gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder="tennis, coffee, fintech…" className="flex-1 rounded-lg border border-zinc-700 bg-transparent px-3 py-2" />
            <button onClick={add} className="rounded-lg border border-zinc-700 px-4">Add</button>
          </div>
          <ul className="mt-3 space-y-2">
            {keywords.map((k) => (
              <li key={k.keyword} className="flex items-center gap-3 rounded-lg border border-zinc-800 px-3 py-2">
                <span className="flex-1 text-sm">{k.keyword}</span>
                <input type="range" min={1} max={10} value={k.level} onChange={(e) => setKeywords(keywords.map((x) => x.keyword === k.keyword ? { ...x, level: Number(e.target.value) } : x))} className={k.level >= 8 ? 'accent-amber-500' : ''} />
                <span className={`w-8 text-right text-xs ${k.level >= 8 ? 'text-amber-400' : 'text-zinc-500'}`}>L{k.level}</span>
                <button onClick={() => setKeywords(keywords.filter((x) => x.keyword !== k.keyword))} className="text-zinc-500 hover:text-red-400">×</button>
              </li>
            ))}
          </ul>
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button disabled={!!err} onClick={save} className="rounded-lg px-5 py-2 font-medium disabled:opacity-40" style={{ background: 'var(--accent)', color: '#08110c' }}>{saved ? 'Saved ✓' : 'Save'}</button>
        <p className="text-xs text-zinc-500">Photos and hide-photo settings live in the mobile app (R2 uploads).</p>
      </div>
    </main>
  );
}
