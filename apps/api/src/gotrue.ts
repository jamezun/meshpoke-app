/**
 * Minimal GoTrue (Supabase Auth) admin/otp client.
 * Ponytail: raw fetch, no SDK — 3 calls total (otp send, admin get, admin signout).
 */
import type { Config } from './config.js';

export type GoTrueAdminUser = {
  id: string;
  phone?: string;
  phone_confirmed_at?: string;
};

export class GoTrueClient {
  constructor(private cfg: Pick<Config, 'GOTRUE_URL'> & { GOTRUE_SERVICE_ROLE_KEY?: string }) {}

  private headers(): Record<string, string> {
    const k = this.cfg.GOTRUE_SERVICE_ROLE_KEY ?? '';
    return { apikey: k, Authorization: `Bearer ${k}` };
  }

  /** Send SMS OTP. Body: { phone }. */
  async sendOtp(phone: string): Promise<{ ok: boolean; status: number; body: unknown }> {
    const res = await fetch(`${this.cfg.GOTRUE_URL}/otp`, {
      method: 'POST',
      headers: { ...this.headers(), 'content-type': 'application/json' },
      body: JSON.stringify({ phone, create_user: true }),
    });
    return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) };
  }

  async adminGetUser(id: string): Promise<GoTrueAdminUser | null> {
    const res = await fetch(`${this.cfg.GOTRUE_URL}/admin/users/${id}`, { headers: this.headers() });
    if (!res.ok) return null;
    return (await res.json()) as GoTrueAdminUser;
  }

  async adminSignOutAll(id: string): Promise<void> {
    await fetch(`${this.cfg.GOTRUE_URL}/admin/users/${id}/logout`, { method: 'POST', headers: this.headers() }).catch(() => {});
  }
}
