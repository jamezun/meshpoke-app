// T18.1: member flow on web — district picker, spot cards, join/apply, confirm, bail.
import { useEffect, useState } from 'react';
import { getAccessToken } from '../../auth/supabase.js';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`/v1${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`);
  return res.json() as Promise<T>;
}

type District = { id: string; name_en: string; name_zh: string | null };
type Spot = {
  id: string; kind: string; template: string; name: string; state: string | null;
  member_count: number; starts_at: string | null; join_mode: string;
  min_headcount: number; max_headcount: number; required_keywords: string[] | null;
};
type Detail = Spot & {
  my_role: string | null; venue_name: string | null; district: string | null;
  members: { userId: string; displayName: string; role: string }[];
  confirm_deadline: string | null;
};

const STATE_COLOR: Record<string, string> = {
  forming: 'bg-amber-100 text-amber-800', confirmed: 'bg-green-100 text-green-800',
  live: 'bg-red-100 text-red-800', done: 'bg-gray-100 text-gray-600',
};

export function SpotsPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [district, setDistrict] = useState<string>('');
  const [time, setTime] = useState('week');
  const [spots, setSpots] = useState<Spot[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [keyword, setKeyword] = useState('');
  const [keywordDone, setKeywordDone] = useState('');

  const load = async () => {
    if (!district) return;
    const kw = keyword.trim() ? `&keywords=${encodeURIComponent(keyword.trim().toLowerCase().replaceAll(' ', ''))}` : '';
    const r = await api<{ spots: Spot[] }>(`/districts/${district}/spots?time=${time}${kw}`);
    setSpots(r.spots);
  };
  useEffect(() => { api<{ districts: District[] }>('/districts').then((d) => setDistricts(d.districts)).catch(() => {}); }, []);
  useEffect(() => { load().catch((e) => setMsg(String(e))); }, [district, time, keywordDone]);

  const open = async (id: string) => {
    setMsg('');
    try { setDetail(await api<Detail>(`/spots/${id}`)); } catch (e) { setMsg(String(e)); }
  };
  const act = async (path: string, body?: Record<string, unknown>) => {
    if (!detail) return;
    try {
      await api(`/spots/${detail.id}${path}`, body ? { method: 'POST', body: JSON.stringify(body) } : { method: 'POST' });
      setMsg('Done ✓');
      await open(detail.id); await load();
    } catch (e) { setMsg(String(e)); }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Spots</h1>
      <div className="flex gap-2 items-center">
        <select className="rounded-lg border px-3 py-2" value={district} onChange={(e) => setDistrict(e.target.value)}>
          <option value="">Choose district…</option>
          {districts.map((d) => <option key={d.id} value={d.id}>{d.name_en}{d.name_zh ? ` ${d.name_zh}` : ''}</option>)}
        </select>
        <select className="rounded-lg border px-3 py-2" value={time} onChange={(e) => setTime(e.target.value)}>
          <option value="today">Today</option><option value="week">This week</option><option value="all">All</option>
        </select>
        <input className="rounded-lg border px-3 py-2 flex-1" placeholder="Filter: hiking, tennis… (Plus)" value={keyword}
          onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setKeywordDone(keyword)} />
      </div>
      {msg && <p className="text-sm text-red-600 break-all">{msg}</p>}

      <div className="space-y-3">
        {spots.map((s) => (
          <button key={s.id} onClick={() => open(s.id)} className="w-full text-left rounded-xl border p-4 hover:border-blue-400">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-sm text-muted">
                  {s.template} · {s.member_count}/{s.max_headcount} · {s.join_mode === 'open' ? 'open join' : 'apply'}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATE_COLOR[s.state ?? 'forming']}`}>{s.state ?? 'forming'}</span>
            </div>
            {s.required_keywords?.length ? <p className="mt-1 text-xs text-muted">needs: {s.required_keywords.join(', ')}</p> : null}
          </button>
        ))}
        {district && spots.length === 0 && <p className="text-muted">No spots here yet — be the host on mobile.</p>}
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-3 max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{detail.name}</h2>
            <p className="text-sm text-muted">
              {detail.venue_name ?? detail.district ?? ''} · {detail.starts_at ? new Date(detail.starts_at).toLocaleString('en-HK') : 'date on fill'}
            </p>
            {detail.required_keywords?.length ? <p className="text-xs text-muted">needs: {detail.required_keywords.join(', ')}</p> : null}

            {detail.my_role ? (
              <div className="space-y-2">
                <p className="text-sm">You're in as <b>{detail.my_role}</b>.</p>
                {detail.my_role !== 'host' && detail.state === 'confirmed' && (
                  <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => act('/confirm')}>Confirm attendance</button>
                )}
                {detail.my_role !== 'host' && (
                  <button className="rounded-lg border px-3 py-1.5 text-sm text-red-600" onClick={() => act('/leave')}>Leave spot</button>
                )}
                {detail.my_role !== 'host' && detail.state === 'confirmed' && (
                  <button className="rounded-lg border px-3 py-1.5 text-sm text-red-600" onClick={() => act('/bail')}>Bail (late = score hit)</button>
                )}
              </div>
            ) : detail.join_mode === 'open' ? (
              <button className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm" onClick={() => act('/join')}>Join</button>
            ) : (
              <div className="space-y-2">
                <textarea className="w-full rounded-lg border p-2 text-sm" rows={3} maxLength={500}
                  placeholder="Note to host (why you?)" value={note} onChange={(e) => setNote(e.target.value)} />
                <button className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm" onClick={() => act('/apply', { note })}>Apply</button>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-muted uppercase">Members</p>
              {detail.members?.map((m) => (
                <p key={m.userId} className="text-sm">
                  {m.displayName} · {m.role}
                </p>
              ))}
            </div>
            {detail.confirm_deadline && <p className="text-xs text-amber-700">Confirm by {new Date(detail.confirm_deadline).toLocaleString('en-HK')}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
