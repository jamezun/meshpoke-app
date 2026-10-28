import type { ReactNode } from 'react';
import { MarketingHeader } from '../components/MarketingHeader';
import { SiteFooter } from '../components/SiteFooter';

export function StaticPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <MarketingHeader />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-bold">{title}</h1>
        <div className="mt-6 space-y-4 text-muted">{children}</div>
        <p className="mt-16 text-xs text-muted"><a href="/" className="underline">← Back</a></p>
      </main>
      <SiteFooter />
    </>
  );
}

const P = ({ children }: { children: ReactNode }) => <p className="text-sm leading-6">{children}</p>;
export { P };
