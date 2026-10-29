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
  // mount-only redirect; deps intentionally empty
  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => { if (data.session) nav(afterAuth); });
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
    <div className="auth-wrap">
      <aside className="auth-aside">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg mono font-bold" style={{ background: 'var(--accent)', color: 'var(--accent-on)' }}>M</span>
          MeshPoke
        </Link>
        <h2 className="text-2xl font-bold">Poke the mesh. Watch your network ripple.</h2>
        <p className="text-sm text-muted">
          A live map for meeting people in real life. Spots, venues, crews — Hong Kong first.
        </p>
        <div className="mt-2 flex flex-col gap-2 text-sm">
          {['Free tier included, no card required', 'Verified humans only — phone-checked at signup', 'Hong Kong first, every district on the map'].map((t) => (
            <span key={t} className="flex items-center gap-2">✓ {t}</span>
          ))}
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div>
            <Link to="/" className="text-sm text-muted">← MeshPoke</Link>
            <h1 className="mt-2 text-xl font-bold">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
            <p className="mt-1 text-sm text-muted">
              {mode === 'signin' ? 'Sign in to open the app.' : 'Join the mesh — free tier included, no card required.'}
            </p>
          </div>

          <div className="auth-providers">
            <button type="button" onClick={google} className="auth-provider">
              <span className="mono font-bold">G</span> Continue with Google
            </button>
          </div>
          <div className="auth-divider">or with email</div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border border-line bg-transparent px-3 py-2.5" />
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ chars)" className="w-full rounded-lg border border-line bg-transparent px-3 py-2.5" />
        {mode === 'signup' && (
          <label className="block text-sm text-muted">Date of birth <span className="text-muted">(18+ only, never shown)</span>
            <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-transparent px-3 py-2.5" />
          </label>
        )}
        {mode === 'signup' && dob && !adult && <p className="text-sm text-red-400">You must be 18 or older to join.</p>}
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button disabled={busy} className="btn-accent min-h-11 rounded-lg px-4 py-2 font-medium">
          {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="text-sm text-muted">
        {mode === 'signin' ? (
          <>New here? <button type="button" className="underline" onClick={() => setMode('signup')}>Create an account</button></>
        ) : (
          <>Already have an account? <button type="button" className="underline" onClick={() => setMode('signin')}>Sign in</button></>
        )}
      </p>
          <p className="text-xs text-muted">
        By continuing you agree to the <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
