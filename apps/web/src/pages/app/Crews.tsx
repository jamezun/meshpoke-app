import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../auth/supabase.js';

type Crew = { id: string; spotName: string | null; members: number; roomId: string | null; whatsappUrl: string | null; dormantAt: string | null };
type Rebook = { id: string; pollOptions: string[]; votes: Record<string, string[]> | null; newSpotId: string | null; createdAt: string };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  const res = await fetch(`/v1${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`);
  return res.json() as Promise<T>;
}

/** T12.3 web crew view: list crews, rebook polls, vote. */
export default function CrewsPage() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ crews: Crew[] }>('/crews').then((d) => setCrews(d.crews ?? [])).catch((e) => setMsg(`${e}`));
  }, []);

  useEffect(() => { void load(); }, [load]);

  const crew = crews.find((c) => c.id === selected);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Crews</h1>
      {msg && <p className="text-sm mb-2">{msg}</p>}
      {!selected && (
        <ul className="divide-y divide-neutral-200">
          {crews.map((c) => (
            <li key={c.id}>
              <button className="w-full text-left py-3 hover:bg-neutral-50" onClick={() => setSelected(c.id)}>
                <span className="font-medium">{c.spotName ?? 'Crew'}</span>
                <span className="text-xs opacity-60 ml-2">{c.members} members{c.dormantAt ? ' · dormant' : ''}</span>
              </button>
            </li>
          ))}
          {crews.length === 0 && <p className="text-sm opacity-60">After a spot ends, tap “Keep the crew”.</p>}
        </ul>
      )}
      {selected && crew && <CrewDetail crew={crew} onBack={() => { setSelected(null); load(); }} />}
    </div>
  );
}

function CrewDetail({ crew, onBack }: { crew: Crew; onBack: () => void }) {
  const [rebooks, setRebooks] = useState<Rebook[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<{ rebooks: Rebook[] }>(`/crews/${crew.id}/rebooks`).then((d) => setRebooks(d.rebooks ?? [])).catch((e) => setMsg(`${e}`));
  }, [crew.id]);

  const startPoll = async () => {
    // default: next Fri/Sat/Sun 19:30 HKT
    const opts: string[] = [];
    const d = new Date();
    while (opts.length < 3) {
      d.setDate(d.getDate() + 1);
      if ([5, 6, 0].includes(d.getDay())) {
        const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 19, 30);
        opts.push(dt.toISOString());
      }
    }
    try {
      await api(`/crews/${crew.id}/rebook`, { method: 'POST', body: JSON.stringify({ pollOptions: opts }) });
      const rr = await api<{ rebooks: Rebook[] }>(`/crews/${crew.id}/rebooks`);
      setRebooks(rr.rebooks ?? []);
    } catch (e) { setMsg(`${e}`); }
  };

  const vote = async (rb: Rebook, option: string) => {
    try {
      await api(`/rebooks/${rb.id}/vote`, { method: 'POST', body: JSON.stringify({ option }) });
      const rr = await api<{ rebooks: Rebook[] }>(`/crews/${crew.id}/rebooks`);
      setRebooks(rr.rebooks ?? []);
    } catch (e) { setMsg(`${e}`); }
  };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    return `${wd} ${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div>
      <button className="text-sm underline mb-3" onClick={onBack}>← Back</button>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-bold">{crew.spotName ?? 'Crew'}</h2>
        <span className="text-xs opacity-60">{crew.members} members</span>
        {crew.roomId && <a className="text-sm px-3 py-1 rounded-full bg-neutral-900 text-white" href={`/app/rooms/${crew.roomId}`}>Chat</a>}
        <button className="text-sm px-3 py-1 rounded-full bg-neutral-900 text-white" onClick={startPoll}>Rebook</button>
      </div>
      {msg && <p className="text-sm mb-2">{msg}</p>}
      {rebooks.map((rb) => (
        <div key={rb.id} className="border rounded-lg p-3 mb-3">
          <div className="font-medium mb-2">{rb.newSpotId ? 'Rebooked ✓' : 'Pick a date'}</div>
          {rb.pollOptions.map((opt) => (
            <div key={opt} className="flex items-center justify-between py-1">
              <span className="text-sm">{fmt(opt)}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs opacity-60">{(rb.votes?.[opt] ?? []).length} votes</span>
                {!rb.newSpotId && (
                  <button className="text-sm px-2 py-0.5 rounded-full bg-neutral-100" onClick={() => vote(rb, opt)}>Vote</button>
                )}
              </span>
            </div>
          ))}
        </div>
      ))}
      {rebooks.length === 0 && <p className="text-sm opacity-60">No rebooks yet.</p>}
    </div>
  );
}

/** "Do it again?" prompt widget for a done spot (used on web spot pages). */
export function KeepTheCrewButton({ spotId, onKept }: { spotId: string; onKept?: () => void }) {
  const [state, setState] = useState<'idle' | 'kept' | 'error'>('idle');
  const keep = async () => {
    try {
      const r = await api<{ crewId: string; roomId: string | null }>(`/spots/${spotId}/crew`, { method: 'POST', body: JSON.stringify({ keep: true }) });
      setState('kept');
      onKept?.();
      if (r.roomId) window.location.href = `/app/rooms/${r.roomId}`;
    } catch { setState('error'); }
  };
  if (state === 'kept') return <span className="text-sm">Crew kept ✓</span>;
  return (
    <button className="text-sm px-3 py-1 rounded-full bg-neutral-900 text-white" onClick={keep} disabled={state === 'error'}>
      {state === 'error' ? 'Failed' : 'Do it again? Keep the crew'}
    </button>
  );
}
