import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createRouter } from './router';

describe('web routes', () => {
  it('landing renders hero + waitlist + attributions', () => {
    const { Router } = createRouter({ memory: true });
    render(<Router />);
    expect(screen.getAllByText(/Watch your network ripple/).length).toBeGreaterThan(0); // hero + footer tagline
    expect(screen.getAllByText(/waitlist/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/DATA\.GOV\.HK/)).toBeTruthy();
  });

  it('pricing renders from shared constants (flat, founding banner)', () => {
    const { Router } = createRouter({ memory: true, initial: '/pricing' });
    render(<Router />);
    expect(screen.getByText(/HK\$128/)).toBeTruthy();
    expect(screen.getByText(/locked forever/i)).toBeTruthy();
  });

  it('static pages render: how-it-works, safety, venue, support, legal', () => {
    for (const [path, needle] of [
      ['/how-it-works', 'Rebook the crew'],
      ['/safety', 'Scameter'],
      ['/venue', 'Founding circle'],
      ['/venue/pricing', 'per verified new-member visit'],
      ['/support', 'Show-up Score'],
      ['/terms', 'Hong Kong SAR'],
      ['/privacy', 'PDPO'],
    ] as const) {
      const { Router } = createRouter({ memory: true, initial: path });
      const r = render(<Router />);
      expect(screen.getByText(new RegExp(needle))).toBeTruthy();
      r.unmount();
    }
  });
});
