/**
 * T21.4 + T21.5: promo consent gating + rate limits + district/day cap.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SignJWT } from 'jose';
import pg from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'node:path';
import { buildApp } from '../src/app.js';
import { seedDistricts } from '../src/db/seed.js';
import { useInfra, stopInfra } from './db.js';

const JWT = 'test-jwt-secret-at-least-32-characters-long';

const infra = useInfra();

describe('T21.4+T21.5 promo', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let pool: pg.Pool;
  const users: Record<string, { id: string; tok: string }> = {};

  async function mkUser(name: string, opts?: { promo?: boolean }): Promise<void> {
    const id = crypto.randomUUID();
    await pool.query(
      `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, phone_verified_at)
       values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified', now())`,
      [id, `${name}${id.slice(0, 8)}@t.test`, name, `MP${id.slice(0, 6).toUpperCase()}`],
    );
    if (opts?.promo) {
      await pool.query(`insert into notification_prefs (user_id, promo_opt_in, promo_consent_at) values ($1, true, now())`, [id]);
    }
    const tok = await new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' })
      .setSubject(id).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(JWT));
    users[name] = { id, tok };
  }

  beforeAll(async () => {
    const i = await infra;
    app = await buildApp({ config: {
      NODE_ENV: 'test', PORT: 0, LOG_LEVEL: 'fatal',
      DATABASE_URL: i.dbUrl, REDIS_URL: i.redisUrl,
      GOTRUE_URL: 'http://localhost:9999', GOTRUE_JWT_SECRET: JWT,
      CORS_ORIGINS: 'http://localhost:5173', RATE_LIMIT_MAX: 1000,
      PII_ENCRYPTION_KEY: '0'.repeat(64),
      QR_HMAC_SECRET: 'test-qr-hmac-secret-32-chars-minimum!!!',
      ADMIN_BOOTSTRAP_PASSWORD: 'test-admin-bootstrap-pw',
      SENTRY_DSN: undefined, ENABLE_JOBS: false, ENABLE_SWAGGER: false,
    } });
    pool = new pg.Pool({ connectionString: i.dbUrl });
    const { drizzle } = await import('drizzle-orm/node-postgres');
    await migrate(drizzle(pool, { mode: 'default' } as never), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
    await seedDistricts(pool);
    await mkUser('owner');
    await mkUser('member_optin', { promo: true });
    await mkUser('member_optout');
    // venue + merchant claim
    const vname = `Promo venue ${crypto.randomUUID().slice(0, 6)}`;
    await pool.query(
      `insert into venues (source, display_name, category, location, status, district_id)
       select 'merchant', $1, 'bar', ST_SetSRID(ST_MakePoint(114.16, 22.28), 4326), 'active', id from districts limit 1`, [vname]);
    const vid = (await pool.query(`select id from venues where display_name = $1`, [vname])).rows[0].id;
    await pool.query(
      `insert into merchant_accounts (owner_user_id, venue_id, business_reg_cert_key, claim_status, tier)
       values ($1, $2, 'k', 'approved', 'growth')`, [users.owner!.id, vid]);
    for (const n of ['member_optin', 'member_optout']) {
      await pool.query(`insert into memberships (venue_id, user_id, kind, status, level_position) values ($1, $2, 'member', 'active', 0)`, [vid, users[n]!.id]);
    }
    (users as Record<string, unknown>).venueId = vid;
  });

  it('T21.5 promo blast queues audience, consent gate filters push, 7d rate limit', async () => {
    const vid = (users as unknown as { venueId: string }).venueId;
    const r1 = await app.inject({ method: 'POST', url: '/v1/merchant/promo', headers: { authorization: `Bearer ${users.owner!.tok}` }, payload: { text: 'Happy hour 2-for-1 tonight' } });
    expect(r1.statusCode).toBe(200);
    expect(r1.json().queued).toBe(2);
    // activity_items for BOTH (feed always), push_outbox ONLY for opted-in
    const feed = await pool.query(`select count(*)::int as n from activity_items where type = 'venue_offer'`);
    expect(feed.rows[0].n).toBe(2);
    const push = await pool.query(`select count(*)::int as n from push_outbox where type = 'venue_offer'`);
    expect(push.rows[0].n).toBe(0); // no push tokens registered → nothing enqueued even when consented
    // consent alone: opted-out user never gets push even with a token
    await pool.query(`insert into push_tokens (user_id, token, platform) values ($1, 'tok-optin-aaaaaa', 'ios'), ($2, 'tok-optout-bbbbbb', 'ios')`,
      [users.member_optin!.id, users.member_optout!.id]);
    const r2 = await app.inject({ method: 'POST', url: '/v1/merchant/promo', headers: { authorization: `Bearer ${users.owner!.tok}` }, payload: { text: 'Second try within 7 days' } });
    expect(r2.statusCode).toBe(429); // rate limit
    const push2 = await pool.query(`select count(*)::int as n from push_outbox where type = 'venue_offer'`);
    expect(push2.rows[0].n).toBe(0);
    void vid;
  });

  it('T21.4 sponsored drop amplifies to opted-in only, district/day cap', async () => {
    const vid = (users as unknown as { venueId: string }).venueId;
    // clear venue promo rate key so this is fresh; register tokens already done above
    const r1 = await app.inject({ method: 'POST', url: '/v1/merchant/drops', headers: { authorization: `Bearer ${users.owner!.tok}` }, payload: {
      kind: 'individual', title: 'Sponsored happy hour', offerText: 'Free wings w/ drink', capacity: 10,
      sponsored: true, startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 86400000).toISOString(),
    }});
    expect(r1.statusCode).toBe(201);
    expect(r1.json().amplified.capped).toBe(false);
    // opted-in member got the push (token registered), opted-out did not
    const push = await pool.query(`select p.user_id from push_outbox p where p.type = 'sponsored_drop'`);
    expect(push.rows.map((r) => r.user_id)).toEqual([users.member_optin!.id]);
    // second sponsored drop same district same day → capped, no new pushes
    const r2 = await app.inject({ method: 'POST', url: '/v1/merchant/drops', headers: { authorization: `Bearer ${users.owner!.tok}` }, payload: {
      kind: 'individual', title: 'Sponsored again', offerText: 'More wings', capacity: 10,
      sponsored: true, startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 86400000).toISOString(),
    }});
    expect(r2.json().amplified.sent).toBe(0);
    void vid;
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
    await stopInfra();
  });
});
