import { useMemo, useState } from 'react';
import { supabase } from './supabase';

export function isAdultDob(dob: string, today = new Date()): boolean {
  // HKT calendar check, mirrors API onboard gate (T2.2): string compare on YYYY-MM-DD.
  const t = new Date(today.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
  const d18 = new Date(Date.parse(dob) + 18 * 365.25 * 86400_000).toISOString().slice(0, 10);
  return d18 <= t;
}

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const adult = useMemo(() => isAdultDob(dob), [dob]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return setErr('Auth not configured (missing VITE_SUPABASE_*)');
    if (!adult) return setErr('You must be 18 or older.');
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { dob } } });
    setBusy(false);
    if (error) setErr(error.message);
    else location.href = '/verify-phone';
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-24">
      <h1 className="text-2xl font-bold">Create your account</h1>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border border-zinc-700 bg-transparent px-3 py-2" />
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ chars)" className="w-full rounded-lg border border-zinc-700 bg-transparent px-3 py-2" />
        <label className="block text-sm text-zinc-400">Date of birth <span className="text-zinc-500">(18+ only, never shown)</span>
          <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-transparent px-3 py-2" />
        </label>
        {dob && !adult && <p className="text-sm text-red-400">You must be 18 or older to join.</p>}
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button disabled={busy} className="w-full rounded-lg px-4 py-2 font-medium" style={{ background: 'var(--accent)', color: '#08110c' }}>{busy ? 'Creating…' : 'Sign up'}</button>
      </form>
    </main>
  );
}
