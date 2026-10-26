export function AppPage({ title, note }: { title: string; note?: string }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-3 text-sm text-zinc-400">{note ?? 'This section is best on the mobile app — the web is your desk companion.'}</p>
    </main>
  );
}
