import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { isAdultDob } from './Signup';
import { RequireAuth, AuthProvider } from './AuthProvider';

describe('isAdultDob (HKT string-compare, mirrors API T2.2)', () => {
  it('accepts 18+ and rejects minors', () => {
    expect(isAdultDob('2000-01-01')).toBe(true);
    expect(isAdultDob('2010-06-01')).toBe(false);
  });
  it('boundary: exactly 18 today', () => {
    // dob such that +18y == today → allowed
    const t = new Date();
    const dob = new Date(Date.UTC(t.getUTCFullYear() - 18, t.getUTCMonth(), t.getUTCDate())).toISOString().slice(0, 10);
    expect(isAdultDob(dob)).toBe(true);
  });
  it('rejects garbage', () => {
    expect(isAdultDob('nope')).toBe(false);
  });
});

describe('RequireAuth guard', () => {
  it('shows gate when no session (supabase disabled = ready, null session → gate)', () => {
    render(
      <AuthProvider>
        <RequireAuth><div>SECRET</div></RequireAuth>
      </AuthProvider>,
    );
    // no client → ready immediately, session null → gate
    expect(screen.getByText(/Sign in to continue/i)).toBeTruthy();
    expect(screen.queryByText('SECRET')).toBeNull();
  });
});
