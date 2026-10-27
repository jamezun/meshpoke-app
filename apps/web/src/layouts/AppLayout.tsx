import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { RequireAuth, useAuth } from '../auth/AuthProvider';
import { supabase } from '../auth/supabase';

const nav = [
  ['Activity', '/app/activity'],
  ['Inbox', '/app/inbox'], ['Spots', '/app/spots'], ['Rooms', '/app/rooms'],
  ['Connections', '/app/connections'], ['Wallet', '/app/wallet'], ['Billing', '/app/billing'], ['Settings', '/app/settings'], ['Merchant', '/merchant'],
] as const;

export function AppLayout() {
  return (
    <RequireAuth>
      <div className="min-h-screen">
        <nav className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
          <div>
            {nav.map(([label, to]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `mr-4 text-sm ${isActive ? 'font-semibold' : 'text-zinc-400'}`}>{label}</NavLink>
            ))}
          </div>
          <SignOut />
        </nav>
        <Outlet />
      </div>
    </RequireAuth>
  );
}

function SignOut() {
  const { session } = useAuth();
  const nav = useNavigate();
  if (!session) return null;
  return (
    <button className="text-sm text-zinc-400 underline" onClick={async () => { await supabase?.auth.signOut(); nav('/'); }}>
      Sign out
    </button>
  );
}

export function SettingsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold">Settings</h1>
      <section className="mt-8 space-y-4">
        <details className="rounded-lg border border-zinc-800 p-4">
          <summary className="cursor-pointer text-sm font-medium">Notification preferences</summary>
          <p className="mt-2 text-sm text-zinc-500">Wired with push notifications (coming with the mobile release).</p>
        </details>
        <details className="rounded-lg border border-zinc-800 p-4">
          <summary className="cursor-pointer text-sm font-medium">Blocked accounts</summary>
          <p className="mt-2 text-sm text-zinc-500">Nobody blocked.</p>
        </details>
        <details className="rounded-lg border border-zinc-800 p-4">
          <summary className="cursor-pointer text-sm font-medium">Export my data</summary>
          <p className="mt-2 text-sm text-zinc-500"><a className="underline" href="/v1/me/export" download>Download</a> — everything MeshPoke holds on you.</p>
        </details>
        <details className="rounded-lg border border-red-900 p-4">
          <summary className="cursor-pointer text-sm font-medium text-red-400">Delete account</summary>
          <p className="mt-2 text-sm text-zinc-500">Deletes your profile, spots memberships, and messages. Phone number retention window per PDPO policy.</p>
          <button className="mt-3 rounded-lg border border-red-800 px-4 py-2 text-sm text-red-400" onClick={() => { if (confirm('Delete your account? This cannot be undone.')) fetch('/v1/me', { method: 'DELETE' }).then(() => (location.href = '/')); }}>
            Delete permanently
          </button>
        </details>
      </section>
    </main>
  );
}
