import { useState } from 'react';
import { MarketingHeader } from '../components/MarketingHeader';
import { SiteFooter } from '../components/SiteFooter';

export function HomePage() {
  const [waitlistState, setWaitlistState] = useState<'idle' | 'sending' | 'done' | 'already' | 'error'>('idle');
  return (
    <>
      <MarketingHeader />
      <main id="main" className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Poke the mesh.<br />Watch your network ripple.</h1>
      <p className="mt-4 text-lg text-muted">A live map for meeting people in real life. Spots, venues, crews — Hong Kong first.</p>
      <div className="mt-8 flex gap-3">
        <a href="#waitlist" className="btn-accent px-5 py-2.5">Join the waitlist</a>
        <a href="/pricing" className="btn-ghost px-5 py-2.5">Pricing</a>
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
          <label htmlFor="waitlist-email" className="sr-only">Email address</label>
          <input
            id="waitlist-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            placeholder="you@example.com…"
            className="flex-1 rounded-lg border border-line bg-transparent px-3 py-2.5"
          />
          <button disabled={waitlistState === 'sending'} className="btn-accent px-4 py-2.5">
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
      </main>
      <SiteFooter />
    </>
  );
}
