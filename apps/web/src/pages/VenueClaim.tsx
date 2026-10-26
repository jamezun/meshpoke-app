import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, supabaseEnabled } from '../auth/supabase';

type VenueHit = { id: string; display_name: string; category: string };

export function VenueClaimPage() {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<VenueHit[]>([]);
  const [venue, setVenue] = useState<VenueHit | null>(null);
  const [cert, setCert] = useState<File | null>(null);
  const [band, setBand] = useState(2);
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2 || venue) { setHits([]); return; }
    supabase?.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) { setError('Sign in to claim a venue.'); return; }
      const res = await fetch(`/v1/venues/search?q=${encodeURIComponent(q)}`, { headers: { authorization: `Bearer ${token}` } });
      const d = await res.json();
      setHits(d.venues?.slice(0, 8) ?? []);
    });
  }, [q, venue]);

  const submit = async () => {
    setError(null);
    if (!venue) return setError('Pick your venue first.');
    if (!cert) return setError('Upload your Business Registration certificate (PDF/JPG).');
    const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
    const token = data.session?.access_token;
    if (!token) return setError('Sign in to claim a venue.');

    // 1. presign + upload BR certificate
    const pre = await fetch('/v1/merchant/claim/presign', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ contentType: cert.type }),
    });
    if (!pre.ok) return setError('Could not upload certificate — check file type (PDF/JPG/PNG).');
    const { uploadUrl, key } = await pre.json();
    await fetch(uploadUrl, { method: 'PUT', body: cert, headers: { 'content-type': cert.type } });

    // 2. claim
    const res = await fetch('/v1/merchant/claim', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        venueId: venue.id, certKey: key, priceBand: band,
        contactName: contact.name, contactPhone: contact.phone, contactEmail: contact.email,
      }),
    });
    if (res.ok) setStatus('Claim submitted — we review within 2 working days.');
    else setError((await res.json())?.problem?.title ?? 'Claim failed.');
  };

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link to="/venue" className="text-sm underline">← For venues</Link>
      <h1 className="text-2xl font-bold mt-4 mb-1">Claim your venue</h1>
      <p className="text-sm opacity-70 mb-6">Free forever Starter tier: standing rooms, check-in data, membership ladder.</p>
      {status ? <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm">{status}</div> : (
      <div className="space-y-4">
        {!supabaseEnabled && <p className="text-sm text-red-600">Auth unavailable — set VITE_SUPABASE_*.</p>}
        {venue ? (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><div className="font-medium">{venue.display_name}</div><div className="text-xs opacity-60">{venue.category}</div></div>
            <button className="text-sm underline" onClick={() => setVenue(null)}>change</button>
          </div>
        ) : (
          <>
            <input className="w-full border rounded px-3 py-2" placeholder="Search your venue name…" value={q} onChange={(e) => setQ(e.target.value)} />
            <ul className="divide-y divide-neutral-200 border rounded-lg overflow-hidden">
              {hits.map((h) => (
                <li key={h.id}><button className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-sm" onClick={() => setVenue(h)}>{h.display_name} <span className="opacity-50">· {h.category}</span></button></li>
              ))}
            </ul>
          </>
        )}
        <label className="block text-sm font-medium">Business Registration certificate
          <input type="file" accept="application/pdf,image/jpeg,image/png" className="mt-1 block w-full text-sm"
                 onChange={(e) => setCert(e.target.files?.[0] ?? null)} />
        </label>
        <label className="block text-sm font-medium">Price band (per head, HKD)
          <select className="mt-1 block w-full border rounded px-2 py-2 bg-white" value={band} onChange={(e) => setBand(Number(e.target.value))}>
            <option value={1}>Under $50</option><option value={2}>$50–100</option><option value={3}>$101–200</option>
            <option value={4}>$201–400</option><option value={5}>$401–800</option><option value={6}>$800+</option>
          </select>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <input className="border rounded px-2 py-2 text-sm" placeholder="Contact name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
          <input className="border rounded px-2 py-2 text-sm" placeholder="Phone" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
          <input className="border rounded px-2 py-2 text-sm" placeholder="Email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="w-full bg-neutral-900 text-white rounded py-2 text-sm font-medium" onClick={submit}>Submit claim</button>
      </div>)}
    </main>
  );
}
