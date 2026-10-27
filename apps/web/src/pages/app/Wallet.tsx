// T18.3: read-only wallet (claimed drops) + People-you-met with free pokes.
import { useEffect, useState } from 'react';
import { supabase } from '../../auth/supabase.js';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  const res = await fetch(`/v1${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`);
  return res.json() as Promise<T>;
}

type WalletDrop = {
  claimId: string; title: string; offerText: string | null; kind: string;
  venueName: string | null; claimedAt: string; redeemedAt: string | null; expiresAt: string; status: string;
};
type Person = {
  userId: string; displayName: string;
  trust?: { score?: number | null; provenState?: string; spotsAttended?: number } | null;
};
type Pym = { spotId: string; windowOpen: boolean; closesAt: string; people: Person[] };

export function WalletPage() {
  const [tab, setTab] = useState<'wallet' | 'pym'>('wallet');
  const [drops, setDrops] = useState<WalletDrop[]>([]);
  const [spots, setSpots] = useState<{ id: string; name: string }[]>([]);
  const [pym, setPym] = useState<Pym | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api<{ drops: WalletDrop[] }>('/me/wallet/drops').then((d) => setDrops(d.drops)).catch((e) => setMsg(String(e)));
    // done spots I attended → people-you-met pickers
    api<{ spots: { id: string; name: string }[] }>('/me/spots/attended?state=done')
      .then((r) => setSpots(r.spots)).catch(() => {});
  }, []);

  const loadPym = async (spotId: string) => {
    setMsg('');
    try { setPym(await api<Pym>(`/people-you-met/${spotId}`)); } catch (e) { setMsg(String(e)); }
  };
  const poke = async (userId: string) => {
    if (!pym) return;
    const note = window.prompt('Note (optional, max 500)') ?? '';
    try {
      await api('/pokes', { method: 'POST', body: JSON.stringify({ to: userId, note, source: 'people_you_met', spotId: pym.spotId }) });
      setMsg('Poked — free while the window is open');
    } catch (e) { setMsg(String(e)); }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex gap-2">
        <button className={`rounded-full px-4 py-1.5 text-sm ${tab === 'wallet' ? 'bg-blue-600 text-white' : 'border'}`} onClick={() => setTab('wallet')}>Wallet</button>
        <button className={`rounded-full px-4 py-1.5 text-sm ${tab === 'pym' ? 'bg-blue-600 text-white' : 'border'}`} onClick={() => setTab('pym')}>People you met</button>
      </div>
      {msg && <p className="text-sm text-blue-700">{msg}</p>}

      {tab === 'wallet' && (
        <div className="space-y-3">
          {drops.map((d) => (
            <div key={d.claimId} className="rounded-xl border p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{d.title}</p>
                  <p className="text-sm text-gray-500">{d.venueName} · claimed {new Date(d.claimedAt).toLocaleDateString('en-HK')}</p>
                </div>
                <span className={`text-xs rounded-full px-2 py-0.5 ${d.status === 'redeemed' ? 'bg-gray-100 text-gray-600' : d.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{d.status}</span>
              </div>
              {d.offerText && <p className="text-sm text-gray-600 mt-1">{d.offerText}</p>}
            </div>
          ))}
          {drops.length === 0 && <p className="text-gray-400">No claimed drops yet — claim one from a venue page.</p>}
        </div>
      )}

      {tab === 'pym' && (
        <div className="space-y-3">
          <select className="rounded-lg border px-3 py-2" defaultValue="" onChange={(e) => e.target.value && loadPym(e.target.value)}>
            <option value="">Pick a finished spot…</option>
            {spots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {pym && (
            <>
              <p className="text-xs text-gray-500">
                {pym.windowOpen ? <>Free-poke window open until {new Date(pym.closesAt).toLocaleString('en-HK')}</> : 'Window closed — normal pokes apply'}
              </p>
              {pym.people.map((p) => (
                <div key={p.userId} className="rounded-xl border p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{p.displayName}</p>
                    {p.trust?.spotsAttended ? <p className="text-xs text-gray-500">{p.trust.spotsAttended} spots attended</p> : null}
                  </div>
                  <button className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm" onClick={() => poke(p.userId)}>Poke</button>
                </div>
              ))}
              {pym.people.length === 0 && <p className="text-gray-400">Nobody else attended.</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
