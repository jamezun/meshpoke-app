import type { ReactNode } from 'react';

export function StaticPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold">{title}</h1>
      <div className="mt-6 space-y-4 text-zinc-300">{children}</div>
      <footer className="mt-16 border-t border-zinc-800 pt-6 text-xs text-zinc-500">
        <a href="/" className="underline">← Back</a> · © 2026 MeshPoke
      </footer>
    </main>
  );
}

const P = ({ children }: { children: ReactNode }) => <p className="text-sm leading-6">{children}</p>;
export { P };
