import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../auth/supabase';
import { DropsBuilder } from './DropsBuilder';
import { BillingSection } from './Billing';

type Venue = { id: string; display_name: string; category: string; profile?: { hours?: string; menu?: string } | null; tier: string; founding: boolean; location?: string };

async function api(path: string, init?: RequestInit) {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in first.');
  const res = await fetch(`/v1${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.problem?.title ?? body?.title ?? `Error ${res.status}`);
  return body;
}

export function MerchantPortalPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [hours, setHours] = useState('');
  const [menu, setMenu] = useState('');
  const [rooms, setRooms] = useState<{ id: string; name: string; members: number }[]>([]);
  const [newRoom, setNewRoom] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api('/merchant/me/venues').then((d) => setVenues(d.venues ?? [])).catch((e) => setError(String(e.message)));
  }, []);

  useEffect(() => {
    if (!venue) return;
    setHours(venue.profile?.hours ?? ''); setMenu(venue.profile?.menu ?? ''); setMsg(null); setError(null);
    api(`/merchant/me/venues/${venue.id}/standing-rooms`).then((d) => setRooms(d.standingRooms ?? [])).catch((e) => setError(String(e.message)));
  }, [venue]);

  const saveVenue = async () => {
    setError(null);
    try {
      await api(`/merchant/me/venues/${venue!.id}`, { method: 'PATCH', body: JSON.stringify({ hours, menu: menu || undefined }) });
      setMsg('Saved.');
    } catch (e) { setError(String((e as Error).message)); }
  };

  const addRoom = async () => {
    setError(null); setMsg(null);
    try {
      await api(`/merchant/me/venues/${venue!.id}/standing-rooms`, { method: 'POST', body: JSON.stringify({ name: newRoom }) });
      setNewRoom('');
      const d = await api(`/merchant/me/venues/${venue!.id}/standing-rooms`);
      setRooms(d.standingRooms ?? []);
    } catch (e) { setError(String((e as Error).message)); }
  };

  if (!venue) {
    return (
      <main className="mx-auto max-w-lg px-6 py-12">
        <h1 className="text-2xl font-bold mb-4">Merchant portal</h1>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        {venues.length === 0 && (
          <p className="text-sm opacity-70">
            No claimed venues yet. <Link to="/venue/claim" className="underline">Claim your venue</Link> (free).
          </p>
        )}
        <ul className="divide-y divide-neutral-200 border rounded-lg overflow-hidden">
          {venues.map((v) => (
            <li key={v.id}>
              <button className="w-full text-left px-4 py-3 hover:bg-neutral-50" onClick={() => setVenue(v)}>
                <span className="font-medium">{v.display_name}</span>{' '}
                <span className="text-xs opacity-60">· {v.tier}{v.founding ? ' · founding' : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <button className="text-sm underline mb-4" onClick={() => setVenue(null)}>← all venues</button>
      <h1 className="text-2xl font-bold">{venue.display_name}</h1>
      <p className="text-xs opacity-60 mb-6">{venue.tier} tier{venue.founding ? ' · founding' : ''} · check-ins dashboard coming with Phase 0 data</p>

      <h2 className="font-semibold mt-6 mb-2">Venue profile</h2>
      <label className="block text-sm mb-2">Opening hours
        <input className="mt-1 w-full border rounded px-3 py-2" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. Mon–Sun 08:00–23:00" />
      </label>
      {venue.tier !== 'starter' && (
        <label className="block text-sm mb-2">Menu (Growth)
          <textarea className="mt-1 w-full border rounded px-3 py-2" rows={3} value={menu} onChange={(e) => setMenu(e.target.value)} />
        </label>
      )}
      <p className="text-xs opacity-50 mb-4">Pin correction & photos: use the mobile app map tools.</p>
      <button className="bg-neutral-900 text-white rounded px-4 py-2 text-sm font-medium" onClick={saveVenue}>Save profile</button>

      <h2 className="font-semibold mt-8 mb-2">Standing rooms <span className="text-xs font-normal opacity-60">({rooms.length}/{venue.tier === 'starter' ? 3 : venue.tier === 'growth' ? 10 : '∞'})</span></h2>
      <ul className="divide-y divide-neutral-200 border rounded-lg overflow-hidden mb-3">
        {rooms.map((r) => (
          <li key={r.id} className="px-4 py-2 text-sm flex justify-between"><span>{r.name}</span><span className="opacity-50">{r.members} members</span></li>
        ))}
        {rooms.length === 0 && <li className="px-4 py-3 text-sm opacity-60">None yet — a standing room is an always-open chat at your venue.</li>}
      </ul>
      <div className="flex gap-2">
        <input className="flex-1 border rounded px-3 py-2 text-sm" placeholder="e.g. Main floor" value={newRoom} onChange={(e) => setNewRoom(e.target.value)} />
        <button className="bg-neutral-900 text-white rounded px-4 py-2 text-sm font-medium" onClick={addRoom} disabled={!newRoom.trim()}>Add</button>
      </div>

      <h2 className="font-semibold mt-8 mb-2">Scanner</h2>
      <p className="text-sm opacity-70 mb-2">Check in guests by scanning their rotating QR.</p>
      <Link to="/merchant/scanner" className="inline-block bg-neutral-900 text-white rounded px-4 py-2 text-sm font-medium">Open scanner</Link>

      <h2 className="font-semibold mt-8 mb-2">Drops</h2>
      <DropsBuilder />
      <BillingSection />

      {msg && <p className="text-sm text-green-700 mt-4">{msg}</p>}
      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
    </main>
  );
}
