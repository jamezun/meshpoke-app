import { Link, NavLink } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

// Simplified dating-site nav pattern (Bumble/Tinder/CMB/Timeleft all converge on
// How it works · Pricing/Safety · About · FAQ) — enough for launch, room to grow.
const TABS: [string, string][] = [
  ['How it works', '/how-it-works'],
  ['Pricing', '/pricing'],
  ['Safety', '/safety'],
  ['About', '/about'],
  ['FAQ', '/faq'],
];

export function MarketingHeader() {
  return (
    <header className="border-b border-line">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
        <Link to="/" className="text-lg font-bold">MeshPoke</Link>
        <nav className="ml-4 flex flex-1 flex-wrap gap-x-4" aria-label="Site">
          {TABS.map(([label, to]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `text-sm ${isActive ? 'font-semibold text-fg' : 'text-muted hover:text-fg'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <ThemeToggle />
        <Link
          to="/login"
          className="hover-shade rounded-lg border border-line px-4 py-2 text-sm font-medium transition"
        >
          Log in
        </Link>
      </div>
    </header>
  );
}
