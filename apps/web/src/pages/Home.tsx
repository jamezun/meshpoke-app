import { useState } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';

export function HomePage() {
  const [waitlistState, setWaitlistState] = useState<'idle' | 'sending' | 'done' | 'already' | 'error'>('idle');
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex justify-end"><ThemeToggle /></div>
      <h1 className="text-4xl font-bold tracking-tight">Poke the mesh.<br />Watch your network ripple.</h1>
      <p className="mt-4 text-lg text-muted">A live map for meeting people in real life. Spots, venues, crews — Hong Kong first.</p>
      <div className="mt-8 flex gap-3">
        <a href="#waitlist" className="rounded-lg px-5 py-2.5 font-medium" style={{ background: 'var(--accent)', color: '#08110c' }}>Join the waitlist</a>
        <a href="/pricing" className="rounded-lg border border-line px-5 py-2.5 font-medium">Pricing</a>
      </div>
      <section className="mt-16 grid gap-6 sm:grid-cols-3">
        {[
          ['Live map', 'See spots forming around you — tennis tonight, coffee tomorrow, drinks Friday.'],
          ['Real verification', 'QR check-ins at the venue. No catfish, no ghost profiles.'],
          ['Crews that stick', 'Had a good one? One tap rebooks the whole crew.'],
        ].map(([t, d]) => (
          <div key={t} className="rounded-xl border border-line p-5">
            <h3 className="font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-muted">{d}</p>
          </div>
        ))}
      </section>
      <section id="waitlist" className="mt-16 rounded-xl border border-line p-6">
        <h2 className="text-xl font-semibold">Join the waitlist</h2>
        <form
          className="mt-4 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const email = new FormData(form).get('email');
            setWaitlistState('sending');
            try {
              const res = await fetch('/v1/waitlist', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ email }),
              });
              const body = (await res.json()) as { alreadyJoined?: boolean };
              setWaitlistState(body.alreadyJoined ? 'already' : 'done');
            } catch {
              setWaitlistState('error');
            }
          }}
        >
          <input type="email" name="email" required placeholder="you@example.com" className="flex-1 rounded-lg border border-line bg-transparent px-3 py-2" />
          <button disabled={waitlistState === 'sending'} className="rounded-lg px-4 py-2 font-medium disabled:opacity-50" style={{ background: 'var(--accent)', color: '#08110c' }}>
            {waitlistState === 'sending' ? '…' : 'Notify me'}
          </button>
        </form>
        <p className="mt-2 text-xs text-muted">
          {waitlistState === 'done' && 'You are on the list — we will email you at launch. No spam.'}
          {waitlistState === 'already' && 'You are already on the list. See you at launch!'}
          {waitlistState === 'error' && 'Something went wrong — please try again.'}
          {(!waitlistState || waitlistState === 'idle') && 'Launch notice only. No spam.'}
        </p>
      </section>
      <footer className="mt-16 border-t border-line pt-6 text-xs text-muted">
        <p>Contains information from DATA.GOV.HK / 資料一線通 — FEHD licensed restaurants. Geocoding via Lands Department ALS.</p>
        <p className="mt-2">© 2026 MeshPoke · <a href="/terms" className="underline">Terms</a> · <a href="/privacy" className="underline">Privacy</a> · <a href="/safety" className="underline">Safety</a></p>
      </footer>
    </main>
  );
}
