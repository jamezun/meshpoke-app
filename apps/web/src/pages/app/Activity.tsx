import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAccessToken } from '../../auth/supabase.js';

type Item = {
  id: string; category: string; type: string;
  payload: Record<string, unknown> | null; read_at: string | null; created_at: string;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`/v1${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`);
  return res.json() as Promise<T>;
}

const ICON: Record<string, string> = { social: '👋', spots: '📍', venue: '🏪', promo: '📣', proximity: '📡' };
const TEXT: Record<string, string> = {
  poke_received: 'New poke', connection: 'You connected!',
  application_accepted: 'Application accepted', application_declined: 'Application declined',
  date_pinned: 'Date pinned — confirm within 48h', crew_poll: 'Crew poll — vote!',
};

/** T14.4 web activity feed + notification settings. */
export default function ActivityPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  const load = useCallback(async () => {
    try {
      const r = await api<{ items: Item[]; unread: number }>('/me/activity');
      setItems(r.items); setUnread(r.unread);
      if (r.items.length) {
        await api('/me/activity/read', { method: 'POST', body: JSON.stringify({ ids: r.items.map((i) => i.id) }) });
        setUnread(0);
      }
    } catch (e) { setErr(String(e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (err) return <p className="mt-8 text-sm text-red-400">{err}</p>;
  return (
    <div>
      <h1 className="text-2xl font-bold">Activity {unread > 0 && <span className="ml-1 rounded-full bg-red-500 px-2 text-sm text-white">{unread}</span>}</h1>
      <ul className="mt-4 space-y-2">
        {items.map((i) => {
          const to = i.type === 'poke_received' ? '/app/inbox'
            : i.type === 'connection' ? '/app/connections'
            : i.type === 'crew_poll' ? '/app/crews'
            : i.type === 'date_pinned' ? '/app/spots' : null;
          const row = (
            <span className="flex items-center gap-2 text-sm">
              <span>{ICON[i.category] ?? '🔔'}</span>
              <span>{TEXT[i.type] ?? i.type}</span>
              <span className="text-xs text-muted">{new Date(i.created_at).toLocaleString('en-HK')}</span>
            </span>
          );
          return <li key={i.id} className={`rounded border border-line px-3 py-2 ${i.read_at ? 'opacity-60' : 'bg-surface'}`}>
            {to ? <button className="text-left underline-offset-2 hover:underline" onClick={() => nav(to)}>{row}</button> : row}
          </li>;
        })}
        {items.length === 0 && <li className="text-sm text-muted">Nothing yet</li>}
      </ul>
      <p className="mt-4 text-sm text-muted"><Link className="underline" to="/app/settings">Notification settings</Link></p>
    </div>
  );
}

type Prefs = { promoOptIn: boolean; proximityOptIn: boolean; quietHours: boolean; consentTextVersion: string };

export function NotificationPrefs() {
  const [p, setP] = useState<Prefs | null>(null);
  useEffect(() => {
    void api<Prefs>('/me/notification-prefs').then(setP).catch(() => {});
  }, []);
  if (!p) return null;
  const patch = (changes: Partial<Prefs>) => {
    void api('/me/notification-prefs', { method: 'PATCH', body: JSON.stringify(changes) });
    setP({ ...p, ...changes });
  };
  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold">Notifications</h2>
      <label className="mt-2 block text-sm">
        <input type="checkbox" checked={p.promoOptIn} onChange={(e) => patch({ promoOptIn: e.target.checked })} />
        <span className="ml-2">Promo & product updates (off by default — explicit consent)</span>
      </label>
      <label className="mt-2 block text-sm">
        <input type="checkbox" checked={p.proximityOptIn} onChange={(e) => patch({ proximityOptIn: e.target.checked })} />
        <span className="ml-2">Nearby spots (max 1/day)</span>
      </label>
      <label className="mt-2 block text-sm">
        <input type="checkbox" checked={p.quietHours} onChange={(e) => patch({ quietHours: e.target.checked })} />
        <span className="ml-2">Quiet hours 23:00–08:00</span>
      </label>
    </div>
  );
}
