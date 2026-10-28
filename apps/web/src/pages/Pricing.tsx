import { PRICES, MERCHANT_PRICES } from '@meshpoke/shared/constants';

const fmt = (hkd: number) => `HK$${hkd}`;

export function PricingPage() {
  const tiers = [
    { name: 'Free', price: 0, note: '5 pokes/week, 3 RSVPs, 5 rooms — the full mesh, metered.' },
    { name: 'Plus', price: PRICES.plus.web.monthly, founding: PRICES.plus.web.foundingMonthly, note: '20 pokes/wk, express badge, 2× queue weight, auto-join 1 venue.' },
    { name: 'Pro', price: PRICES.pro.web.monthly, founding: PRICES.pro.web.foundingMonthly, note: '50 pokes/wk, express-top, 3× weight, auto-join 3 venues.' },
  ];
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-bold">Flat, transparent pricing</h1>
      <p className="mt-2 text-muted">One price for everyone. No personalized offers, ever.</p>
      <p className="glass-card mt-4 p-4 text-sm" style={{ borderColor: 'var(--accent)' }}>
        Founding first 500: <b>HK$88/mo Plus · HK$148/mo Pro — locked forever.</b> When they're gone, they're gone.
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {tiers.map((t) => (
          <div key={t.name} className="glass-card p-5">
            <h3 className="font-semibold">{t.name}</h3>
            <p className="mt-2 text-3xl font-bold">{t.price === 0 ? 'Free' : fmt(t.price)}<span className="text-sm font-normal text-muted">{t.price > 0 && '/mo'}</span></p>
            {t.founding != null && <p className="text-xs" style={{ color: 'var(--accent)' }}>founding {fmt(t.founding)}/mo</p>}
            <p className="mt-3 text-sm text-muted">{t.note}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-16 text-2xl font-bold">For venues</h2>
      <p className="mt-2 text-muted">Claim free. Tools when you're ready. Per-seat pricing that follows your foot traffic — see <a href="/venue/pricing" className="underline">venue pricing</a>.</p>
      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div className="glass-card p-5"><h3 className="font-semibold">Starter</h3><p className="mt-2 text-2xl font-bold">Free</p><p className="mt-2 text-sm text-muted">Claim, 3 standing spots, founding circle, discount ladder.</p></div>
        <div className="glass-card p-5"><h3 className="font-semibold">Growth</h3><p className="mt-2 text-2xl font-bold">{fmt(MERCHANT_PRICES.growth.web.monthly)}<span className="text-sm font-normal text-muted">/mo</span></p><p className="text-xs" style={{ color: 'var(--accent)' }}>founding {fmt(MERCHANT_PRICES.growth.founding.monthly)}/mo year 1</p><p className="mt-2 text-sm text-muted">10 spots, drops, full CRM, per-seat billing.</p></div>
        <div className="glass-card p-5"><h3 className="font-semibold">Pro</h3><p className="mt-2 text-2xl font-bold">{fmt(MERCHANT_PRICES.pro.web.monthly)}<span className="text-sm font-normal text-muted">/mo</span></p><p className="text-xs" style={{ color: 'var(--accent)' }}>founding {fmt(MERCHANT_PRICES.pro.founding.monthly)}/mo year 1</p><p className="mt-2 text-sm text-muted">Unlimited spots, export, priority amplification, multi-location.</p></div>
      </div>
    </main>
  );
}
