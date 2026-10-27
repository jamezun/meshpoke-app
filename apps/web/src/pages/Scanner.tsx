import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../auth/supabase.js';

type ScanResult = {
  checkinId: string; venue: string;
  guest: { displayName: string; verified: boolean };
  context: string; dropId: string | null; spotId: string | null;
  confidence: 'high' | 'low'; gpsDistanceM: number | null; billable: boolean;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  const res = await fetch(`/v1${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`);
  return res.json() as Promise<T>;
}

/**
 * T15.4 merchant scanner: full-screen camera QR scan → POST /merchant/scan.
 * Tablet mode = big layout + Wake Lock.
 */
export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tablet, setTablet] = useState(false);
  const [manual, setManual] = useState('');
  const [scanning, setScanning] = useState(false);

  const scan = useCallback(async (payload: string) => {
    setError(null);
    try {
      const r = await api<ScanResult>('/merchant/scan', { method: 'POST', body: JSON.stringify({ qrPayload: payload }) });
      setResult(r);
      navigator.vibrate?.(200); // feedback: buzz on success
    } catch (e) {
      setError(String(e)); navigator.vibrate?.([80, 60, 80]);
    }
  }, []);

  useEffect(() => {
    if (!scanning) return;
    let cancelled = false;
    let wakeLock: { release: () => Promise<void> } | null = null;
    void (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (r) => {
          if (!cancelled && r) void scan(r.getText());
        });
        controlsRef.current = controls;
        if ('wakeLock' in navigator && tablet) {
          wakeLock = await (navigator as Navigator & { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } })
            .wakeLock.request('screen');
        }
      } catch (e) { setError(String(e)); }
    })();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      void wakeLock?.release();
    };
  }, [scanning, tablet, scan]);

  return (
    <div className={tablet ? 'fixed inset-0 z-50 bg-black p-4 text-white' : ''}>
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className={tablet ? 'text-4xl font-bold' : 'text-2xl font-bold'}>Scanner</h1>
          <div className="flex gap-2">
            <button className="rounded border border-zinc-600 px-3 py-1 text-sm" onClick={() => setTablet((t) => !t)}>
              {tablet ? 'Exit tablet mode' : 'Tablet mode'}
            </button>
            <button className="rounded bg-red-600 px-3 py-1 text-sm text-white" onClick={() => setScanning((s) => !s)}>
              {scanning ? 'Stop camera' : 'Start camera'}
            </button>
          </div>
        </div>

        {scanning && <video ref={videoRef} className={`mt-4 w-full rounded ${tablet ? 'max-h-[70vh]' : ''}`} />}

        <div className="mt-4">
          <label className="text-sm text-zinc-400">Manual entry (fallback)</label>
          <div className="flex gap-2">
            <input className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" value={manual}
              onChange={(e) => setManual(e.target.value)} placeholder="Paste QR payload" />
            <button className="rounded bg-blue-600 px-3 py-2 text-sm text-white" onClick={() => manual && void scan(manual)}>Scan</button>
          </div>
        </div>

        {error && <p className="mt-4 rounded border border-red-800 bg-red-950 p-3 text-sm text-red-300">{error}</p>}

        {result && (
          <div className={`mt-4 rounded border p-4 ${result.billable ? 'border-green-700 bg-green-950' : 'border-zinc-700 bg-zinc-900'}`}>
            <p className={tablet ? 'text-2xl font-bold' : 'text-lg font-semibold'}>
              {result.guest.displayName} — {result.context.replace('_', ' ')}
            </p>
            <p className={`mt-1 text-sm ${result.confidence === 'high' ? 'text-green-400' : 'text-yellow-400'}`}>
              {result.confidence === 'high' ? '✓ GPS verified' : `⚠ Low confidence${result.gpsDistanceM != null ? ` (${Math.round(result.gpsDistanceM)}m)` : ' (no ping)'}`}
              {result.billable ? ' · billable seat' : ' · not billable'}
            </p>
            <p className="mt-1 text-xs text-zinc-500">{result.venue} · check-in {result.checkinId.slice(0, 8)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
