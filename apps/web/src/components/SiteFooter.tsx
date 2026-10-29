import { Link } from 'react-router-dom';
import { IconInstagram, IconX } from './SocialIcons';

// Founder: swap '#' for the real profile URLs when the accounts are live.
const SOCIALS: { label: string; href: string; Icon: typeof IconX }[] = [
  { label: 'Instagram', href: '#', Icon: IconInstagram },
  { label: 'X (Twitter)', href: '#', Icon: IconX },
];

const COLS: { title: string; links: [string, string][] }[] = [
  {
    title: 'Product',
    links: [
      ['How it works', '/how-it-works'],
      ['Pricing', '/pricing'],
      ['Safety', '/safety'],
      ['FAQ', '/faq'],
      ['Join the waitlist', '/#waitlist'],
    ],
  },
  {
    title: 'For venues',
    links: [
      ['Why MeshPoke', '/venue'],
      ['Venue pricing', '/venue/pricing'],
      ['Claim your venue', '/venue/claim'],
      ['Merchant portal', '/merchant'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About', '/about'],
      ['Support', '/support'],
      ['Terms', '/terms'],
      ['Privacy', '/privacy'],
      ['Log in', '/login'],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto grid max-w-4xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="text-lg font-bold">MeshPoke</Link>
          <p className="mt-3 max-w-[34ch] text-sm text-muted">
            A live map for meeting people in real life. Hong Kong first.
          </p>
          <div className="mt-4 flex gap-3" aria-label="MeshPoke on social media">
            {SOCIALS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                title={href === '#' ? `${label} — coming soon` : label}
                className="hover-shade inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-line p-2.5 text-muted transition"
                style={{ transitionDuration: 'var(--motion-fast)' }}
              >
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>
        {COLS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h4 className="text-sm font-semibold">{col.title}</h4>
            <ul className="mt-3 space-y-2">
              {col.links.map(([label, to]) => (
                <li key={to + label}>
                  <Link to={to} className="text-sm text-muted hover:text-fg">{label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-muted">
        © 2026 MeshPoke · Poke the mesh. Watch your network ripple.
        <br />
        Venue seed data from <a className="underline" href="https://data.gov.hk" target="_blank" rel="noopener noreferrer">DATA.GOV.HK</a> (FEHD licensed premises) · district boundaries © CSDI
      </div>
    </footer>
  );
}
