import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from './supabase';
import { isAdultDob } from './Signup';

/**
 * Unified sign-in / register page (SupremaNode pattern):
 * providers first (Google), email+password fallback, mode toggle, afterAuth
 * redirect param, consent footer. Registration keeps the MeshPoke 18+ DOB gate
 * and lands on /verify-phone (phone verification is compulsory at registration).
 */
export function LoginPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup'>(params.get('mode') === 'signup' ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // where to land after auth (?next= carries the intent through, e.g. /app/billing)
  const afterAuth = params.get('next') ?? '/app';
  const adult = useMemo(() => isAdultDob(dob), [dob]);

  // already signed in → straight in (mount only)
  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => { if (data.session) nav(afterAuth); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function google() {
    if (!supabase) return setErr('Auth not configured (missing VITE_SUPABASE_*)');
    setErr(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + afterAuth,
        // force the account picker so a logged-in Google session can't silently win
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) setErr(`Google sign-in unavailable here: ${error.message}`);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return setErr('Auth not configured (missing VITE_SUPABASE_*)');
    if (mode === 'signup' && !adult) return setErr('You must be 18 or older.');
    setBusy(true); setErr(null);
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { dob } } });
      setBusy(false);
      if (error) setErr(error.message);
      else nav('/verify-phone');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) setErr(error.message);
      else nav(afterAuth);
    }
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-20">
      <Link to="/" className="text-sm text-zinc-400">← MeshPoke</Link>
      <h1 className="mt-3 text-2xl font-bold">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
      <p className="mt-1 text-sm text-zinc-400">
        {mode === 'signin' ? 'Sign in to open the app.' : 'Join the mesh — free tier included, no card required.'}
      </p>

      <div className="mt-6 space-y-2">
        <button type="button" onClick={google}
          className="w-full rounded-lg border border-zinc-700 bg-white px-4 py-2.5 font-medium text-black">
          <span className="font-bold" style={{ fontFamily: 'var(--font-mono, monospace)' }}>G</span>&nbsp; Continue with Google
        </button>
      </div>
      <div className="my-4 flex items-center gap-3 text-xs text-zinc-500">
        <div className="h-px flex-1 bg-zinc-800" />or with email<div className="h-px flex-1 bg-zinc-800" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border border-zinc-700 bg-transparent px-3 py-2" />
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ chars)" className="w-full rounded-lg border border-zinc-700 bg-transparent px-3 py-2" />
        {mode === 'signup' && (
          <label className="block text-sm text-zinc-400">Date of birth <span className="text-zinc-500">(18+ only, never shown)</span>
            <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="mt-1 w-full rounded-lg border border-zinc-700 bg-transparent px-3 py-2" />
          </label>
        )}
        {mode === 'signup' && dob && !adult && <p className="text-sm text-red-400">You must be 18 or older to join.</p>}
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button disabled={busy} className="w-full rounded-lg px-4 py-2 font-medium" style={{ background: 'var(--accent)', color: '#08110c' }}>
          {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-sm text-zinc-400">
        {mode === 'signin' ? (
          <>New here? <button type="button" className="underline" onClick={() => setMode('signup')}>Create an account</button></>
        ) : (
          <>Already have an account? <button type="button" className="underline" onClick={() => setMode('signin')}>Sign in</button></>
        )}
      </p>
      <p className="mt-6 text-xs text-zinc-500">
        By continuing you agree to the <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </main>
  );
}
