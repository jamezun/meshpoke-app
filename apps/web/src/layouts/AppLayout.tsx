import { NavLink, Outlet } from 'react-router-dom';

const nav = [
  ['Inbox', '/app/inbox'], ['Spots', '/app/spots'], ['Rooms', '/app/rooms'],
  ['Connections', '/app/connections'], ['Wallet', '/app/wallet'], ['Billing', '/app/billing'], ['Settings', '/app/settings'],
] as const;

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-zinc-800 px-6 py-3">
        {nav.map(([label, to]) => (
          <NavLink key={to} to={to} className={({ isActive }) => `mr-4 text-sm ${isActive ? 'font-semibold' : 'text-zinc-400'}`}>{label}</NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
