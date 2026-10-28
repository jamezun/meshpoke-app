import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, storageKey } from './supabase';

type Session = { userId: string; email: string } | null;
const AuthCtx = createContext<{ session: Session; ready: boolean }>({ session: null, ready: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [ready, setReady] = useState(!supabase); // no client → guard stays open (dev mode)

  useEffect(() => {
    if (!supabase) return;
    // read the stored session directly: supabase-js getSession can stall behind
    // navigator locks in headless browsers; JWT payload is enough to boot.
    try {
      const key = storageKey();
      const raw = key ? localStorage.getItem(key) : null;
      if (raw) {
        const stored = JSON.parse(raw) as { access_token?: string };
        const payload = stored.access_token?.split('.')[1];
        if (payload) {
          const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: string; exp?: number };
          if (claims.sub && claims.exp && claims.exp > Date.now() / 1000) {
            setSession({ userId: claims.sub, email: '' });
          }
        }
      }
    } catch { /* fall through to client */ }
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      setSession(s?.user ? { userId: s.user.id, email: s.user.email ?? '' } : null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s?.user ? { userId: s.user.id, email: s.user.email ?? '' } : null);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <AuthCtx.Provider value={{ session, ready }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, ready } = useAuth();
  if (!ready) return <div className="p-16 text-center text-muted">Loading…</div>;
  if (!session) return <AuthGate />;
  return <>{children}</>;
}

function AuthGate() {
  return (
    <main className="mx-auto max-w-sm px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">Sign in to continue</h1>
      <p className="mt-2 text-sm text-muted">MeshPoke web is a companion — the full experience lives in the app.</p>
      <a href="/login" className="mt-6 inline-block rounded-lg px-5 py-2.5 font-medium" style={{ background: 'var(--accent)', color: '#08110c' }}>Sign in</a>
    </main>
  );
}
