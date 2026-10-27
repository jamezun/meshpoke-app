// T18.2: host console — my spots, queue review, schedule, roll-call, member removal.
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

type Hosted = {
  id: string; name: string; state: string | null; join_mode: string; starts_at: string | null;
  confirm_deadline: string | null; member_count: number; pending_count: number;
  venue_name: string | null; district: string | null; min_headcount: number; max_headcount: number;
};
type QueueApp = {
  applicationId: string; userId: string; status: string; note: string | null; createdAt: string;
  displayName: string; plan: string; score: number | null; provenState: string; express: boolean;
  trust: { spotsAttended?: number; provenState?: string } | null;
};
type Member = { userId: string; displayName: string; role: string };
type VenueHit = { id: string; display_name: string };

const DECLINE_REASONS = ['Venue mismatch', 'Headcount balance', 'Keywords don\'t fit', 'Other'];

export function HostConsole() {
  const [hosted, setHosted] = useState<Hosted[]>([]);
  const [sel, setSel] = useState<Hosted | null>(null);
  const [queue, setQueue] = useState<QueueApp[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [sort, setSort] = useState('recommended');
  const [msg, setMsg] = useState('');
  const [venues, setVenues] = useState<VenueHit[]>([]);
  const [venueQ, setVenueQ] = useState('');
  const [venueId, setVenueId] = useState('');
  const [when, setWhen] = useState('');

  const loadHosted = async () => setHosted((await api<{ spots: Hosted[] }>('/me/hosted')).spots);
  useEffect(() => { loadHosted().catch((e) => setMsg(String(e))); }, []);

  const open = async (s: Hosted) => {
    setSel(s); setMsg('');
    try {
      const q = await api<{ queue: QueueApp[] }>(`/spots/${s.id}/queue?sort=${sort}`);
      setQueue(q.queue);
      const d = await api<{ members: Member[] }>(`/spots/${s.id}`);
      setMembers(d.members);
    } catch (e) { setMsg(String(e)); }
  };
  useEffect(() => { if (sel) open(sel); }, [sort]);

  const decide = async (appId: string, decision: 'accept' | 'decline', reason?: string) => {
    try {
      await api(`/applications/${appId}/decision`, { method: 'POST', body: JSON.stringify({ decision, reason }) });
      if (sel) await open(sel);
    } catch (e) { setMsg(String(e)); }
  };
  const searchVenues = async () => {
    if (venueQ.length < 2) return;
    try { setVenues((await api<{ venues: VenueHit[] }>(`/venues/search?q=${encodeURIComponent(venueQ)}&limit=8`)).venues); } catch { setVenues([]); }
  };
  const schedule = async () => {
    if (!sel) return;
    try {
      await api(`/spots/${sel.id}/schedule`, { method: 'POST', body: JSON.stringify({ startsAt: new Date(when).toISOString(), venueId: venueId || undefined }) });
      setMsg('Date pinned — members have 48h to confirm');
      await loadHosted();
      const fresh = hosted.find((h) => h.id === sel.id);
      if (fresh) await open({ ...fresh, state: 'confirmed' });
    } catch (e) { setMsg(String(e)); }
  };
  const rollCall = async (absent: string[]) => {
    if (!sel) return;
    try {
      await api(`/spots/${sel.id}/roll-call`, { method: 'POST', body: JSON.stringify({ absent }) });
      setMsg('Roll call saved');
    } catch (e) { setMsg(String(e)); }
  };
  const removeMember = async (userId: string) => {
    if (!sel) return;
    const reason = window.prompt('Reason (logged & visible to mods)') ?? '';
    try {
      await api(`/spots/${sel.id}/remove-member`, { method: 'POST', body: JSON.stringify({ userId, reason }) });
      const d = await api<{ members: Member[] }>(`/spots/${sel.id}`);
      setMembers(d.members);
    } catch (e) { setMsg(String(e)); }
  };

  const [absentSel, setAbsentSel] = useState<string[]>([]);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Host console</h1>
      {msg && <p className="text-sm text-blue-700">{msg}</p>}

      {!sel && hosted.map((h) => (
        <button key={h.id} className="w-full text-left rounded-xl border p-4 hover:border-blue-400" onClick={() => open(h)}>
          <div className="flex justify-between">
            <div>
              <p className="font-semibold">{h.name}</p>
              <p className="text-sm text-gray-500">
                {h.venue_name ?? h.district} · {h.member_count}/{h.max_headcount}
                {h.pending_count > 0 && <b className="text-amber-700"> · {h.pending_count} pending</b>}
              </p>
            </div>
            <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5">{h.state ?? 'forming'}</span>
          </div>
        </button>
      ))}

      {sel && (
        <div className="space-y-4">
          <button className="text-sm text-blue-600 underline" onClick={() => { setSel(null); loadHosted().catch(() => {}); }}>← All my spots</button>
          <h2 className="text-lg font-bold">{sel.name}</h2>

          <div className="rounded-xl border p-4 space-y-2">
            <p className="font-semibold text-sm">Pin the date</p>
            <input type="datetime-local" className="rounded-lg border px-2 py-1.5 text-sm" value={when} onChange={(e) => setWhen(e.target.value)} />
            <div className="flex gap-2">
              <input className="rounded-lg border px-2 py-1.5 text-sm flex-1" placeholder="Venue search…"
                value={venueQ} onChange={(e) => setVenueQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchVenues()} />
              <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={searchVenues}>Search</button>
            </div>
            {venues.length > 0 && (
              <select className="rounded-lg border px-2 py-1.5 text-sm" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                <option value="">Pick venue (required on confirm)…</option>
                {venues.map((v) => <option key={v.id} value={v.id}>{v.display_name}</option>)}
              </select>
            )}
            <button className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-40"
              disabled={!when} onClick={schedule}>Pin date ({sel.member_count}/{sel.min_headcount} min reached)</button>
          </div>

          <div className="rounded-xl border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">Applications</p>
              <select className="rounded-lg border px-2 py-1 text-xs" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recommended">Recommended</option><option value="fifo">First in</option>
              </select>
            </div>
            {queue.map((a) => (
              <div key={a.applicationId} className="rounded-lg border p-3 text-sm space-y-1">
                <p className="font-medium">
                  {a.displayName || 'Applicant'} {a.express && <span title="express">⚡</span>}
                  <span className="text-gray-400"> · {a.plan} · {a.provenState} {a.score !== null ? `(${a.score.toFixed(2)})` : ''}</span>
                  {a.trust?.spotsAttended ? <span className="text-gray-400"> · {a.trust.spotsAttended} spots</span> : null}
                </p>
                {a.note && <p className="text-gray-600 italic">“{a.note}”</p>}
                <div className="flex gap-2">
                  <button className="rounded bg-green-600 text-white px-3 py-1 text-xs" onClick={() => decide(a.applicationId, 'accept')}>Accept</button>
                  <select className="rounded border text-xs px-2" defaultValue=""
                    onChange={(e) => e.target.value && decide(a.applicationId, 'decline', e.target.value)}>
                    <option value="">Decline…</option>
                    {DECLINE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            ))}
            {queue.length === 0 && <p className="text-gray-400 text-sm">No applications.</p>}
          </div>

          <div className="rounded-xl border p-4 space-y-2">
            <p className="font-semibold text-sm">Members</p>
            {members.map((m) => (
              <div key={m.userId} className="flex justify-between items-center text-sm">
                <span>{m.displayName} · {m.role}</span>
                {m.role !== 'host' && (
                  <div className="flex gap-2">
                    <label className="text-xs flex items-center gap-1">
                      <input type="checkbox" checked={absentSel.includes(m.userId)}
                        onChange={(e) => setAbsentSel((s) => e.target.checked ? [...s, m.userId] : s.filter((x) => x !== m.userId))} />
                      absent
                    </label>
                    <button className="text-xs text-red-600 underline" onClick={() => removeMember(m.userId)}>remove</button>
                  </div>
                )}
              </div>
            ))}
            {sel.state === 'live' || sel.state === 'done' ? (
              <button className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm" onClick={() => rollCall(absentSel)}>Save roll call</button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
