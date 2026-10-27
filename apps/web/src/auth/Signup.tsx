export function isAdultDob(dob: string, today = new Date()): boolean {
  // HKT calendar check, mirrors API onboard gate (T2.2): string compare on YYYY-MM-DD.
  const t = new Date(today.getTime() + 8 * 3600_000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
  const d18 = new Date(Date.parse(dob) + 18 * 365.25 * 86400_000).toISOString().slice(0, 10);
  return d18 <= t;
}

// /signup now redirects to the unified login page in signup mode
export function SignupPage() {
  window.location.replace('/login?mode=signup');
  return null;
}
