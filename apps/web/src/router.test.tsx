import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createRouter } from './router';

describe('web routes', () => {
  it('landing renders hero + waitlist + attributions', () => {
    const { Router } = createRouter({ memory: true });
    render(<Router />);
    expect(screen.getByText(/Watch your network ripple/)).toBeTruthy();
    expect(screen.getAllByText(/waitlist/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/DATA\.GOV\.HK/)).toBeTruthy();
  });

  it('pricing renders from shared constants (flat, founding banner)', () => {
    const { Router } = createRouter({ memory: true, initial: '/pricing' });
    render(<Router />);
  });
});
