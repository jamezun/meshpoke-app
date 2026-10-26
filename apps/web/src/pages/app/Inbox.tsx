import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../auth/supabase.js';

type IncomingPoke = {
  id: string; fromUserId: string; note: string | null; source: string;
  displayName: string; plan: string; score: number;
  trust: { spotsAttended?: number; provenState?: string } | null;
};
type Connection = { id: string; active: boolean; userId: string; displayName: string; roomId: string | null };
type Pym = { userId: string; displayName: string; trust: { spotsAttended?: number; provenState?: string } | null };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  const res = await fetch(`/v1${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`);
  return res.json() as Promise<T>;
}

/** T11.5 web inbox: pokes (poke back), connections (DM link, disconnect). */
export default function InboxPage() {
  const [tab, setTab] = useState<'pokes' | 'connections'>('pokes');
  const [sort, setSort] = useState<'recommended' | 'fifo'>('recommended');
  const [pokes, setPokes] = useState<IncomingPoke[]>([]);
  const [conns, setConns] = useState<Connection[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([
        api<{ pokes: IncomingPoke[] }>(`/pokes/incoming?sort=${sort}`),
        api<{ connections: Connection[] }>('/connections'),
      ]);
      setPokes(p.pokes ?? []);
      setConns(c.connections ?? []);
    } catch (e) {
      setMsg(`${e}`);
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => { void load(); }, [load]);

  const pokeBack = async (fromUserId: string) => {
    try {
      const r = await api<{ pokeBack: boolean }>('/pokes', { method: 'POST', body: JSON.stringify({ to: fromUserId, source: 'inbox' }) });
      setMsg(r.pokeBack ? 'Connected — chat is open.' : 'Poked back.');
      void load();
    } catch (e) { setMsg(`${e}`); }
  };

  const disconnect = async (id: string) => {
    if (!confirm('Disconnect? The chat closes for both of you. No notification is sent.')) return;
    try { await api(`/connections/${id}/disconnect`, { method: 'POST' }); void load(); } catch (e) { setMsg(`${e}`); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Inbox</h1>
      {msg && <p className="text-sm mb-2 rounded bg-neutral-100 px-3 py-2">{msg}</p>}
      <div className="flex gap-2 mb-3">
        <button className={`px-3 py-1 rounded-full text-sm ${tab === 'pokes' ? 'bg-neutral-900 text-white' : 'bg-neutral-100'}`} onClick={() => setTab('pokes')}>Pokes ({pokes.length})</button>
        <button className={`px-3 py-1 rounded-full text-sm ${tab === 'connections' ? 'bg-neutral-900 text-white' : 'bg-neutral-100'}`} onClick={() => setTab('connections')}>Connections ({conns.length})</button>
      </div>

      {loading && <p className="text-sm opacity-60">Loading…</p>}

      {tab === 'pokes' && (
        <>
          <div className="mb-2">
            <label className="text-xs opacity-60 mr-2">Sort</label>
            <select className="text-sm border rounded px-2 py-1" value={sort} onChange={(e) => setSort(e.target.value as 'recommended' | 'fifo')}>
              <option value="recommended">Recommended</option>
              <option value="fifo">Newest</option>
            </select>
          </div>
          <ul className="divide-y divide-neutral-200">
            {pokes.map((p) => (
              <li key={p.id} className="py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{p.displayName}{p.plan !== 'free' && <span className="ml-1 text-xs">⚡</span>}</div>
                  {p.note && <div className="text-sm opacity-70 truncate">“{p.note}”</div>}
                  <div className="text-xs opacity-50">
                    {p.trust?.spotsAttended ?? 0} spots · {p.trust?.provenState ?? 'unproven'} · match {Math.round(p.score * 100)}%
                  </div>
                </div>
                <button className="text-sm px-3 py-1 rounded-full bg-neutral-900 text-white" onClick={() => pokeBack(p.fromUserId)}>Poke back · Free</button>
              </li>
            ))}
          </ul>
          {pokes.length === 0 && !loading && <p className="text-sm opacity-60">No pokes yet — they land here.</p>}
        </>
      )}

      {tab === 'connections' && (
        <ul className="divide-y divide-neutral-200">
          {conns.map((c) => (
            <li key={c.id} className="py-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="font-medium">{c.displayName}</div>
                <div className="text-xs opacity-50">{c.active ? 'Connected' : 'Disconnected'}</div>
              </div>
              {c.active && c.roomId && (
                <a className="text-sm px-3 py-1 rounded-full bg-neutral-900 text-white" href={`/app/rooms/${c.roomId}`}>Message</a>
              )}
              {c.active && (
                <button className="text-sm px-3 py-1 rounded-full bg-neutral-100" onClick={() => disconnect(c.id)}>Disconnect</button>
              )}
            </li>
          ))}
          {conns.length === 0 && !loading && <p className="text-sm opacity-60">Mutual pokes become connections.</p>}
        </ul>
      )}
    </div>
  );
}

/** People-you-met page for a done spot (48h free-poke window). */
export function PeopleYouMetPage() {
  const { spotId = '' } = useParams();
  const [data, setData] = useState<{ windowOpen: boolean; people: Pym[] } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api<{ windowOpen: boolean; people: Pym[] }>(`/people-you-met/${spotId}`).then(setData).catch((e) => setMsg(`${e}`));
  }, [spotId]);

  const poke = async (userId: string) => {
    try {
      const r = await api<{ pokeBack: boolean }>('/pokes', { method: 'POST', body: JSON.stringify({ to: userId, source: 'people_you_met', spotId }) });
      setMsg(r.pokeBack ? 'Connected!' : 'Poked (free — you met)');
    } catch (e) { setMsg(`${e}`); }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">People you met</h1>
      {msg && <p className="text-sm mb-2">{msg}</p>}
      {!data && <p className="text-sm opacity-60">Loading…</p>}
      {data && !data.windowOpen && <p className="text-sm mb-2 opacity-60">The 48h free-poke window has closed — a regular poke applies.</p>}
      {data?.people.map((p) => (
        <div key={p.userId} className="py-3 flex items-center gap-3 border-b border-neutral-200">
          <div className="flex-1">
            <div className="font-medium">{p.displayName}</div>
            <div className="text-xs opacity-50">{p.trust?.spotsAttended ?? 0} spots · {p.trust?.provenState ?? 'unproven'}</div>
          </div>
          <button className="text-sm px-3 py-1 rounded-full bg-neutral-900 text-white" onClick={() => poke(p.userId)}>Poke · Free</button>
        </div>
      ))}
    </div>
  );
}
