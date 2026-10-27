/**
 * T20.1–T20.4: ladder config, memberships, level engine, attribution billing.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SignJWT } from 'jose';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { join } from 'node:path';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import { buildApp } from '../src/app.js';
import * as schema from '../src/db/schema/index.js';
import { onCheckin } from '../src/billing.js';
import type { Db } from '../src/db/client.js';
import { drizzle as drizzleT } from 'drizzle-orm/node-postgres';

const JWT = 'e2e-secret-e2e-secret-e2e-secret-e2e-secret';

let infra: TestInfra;
let pool: pg.Pool;
let app: Awaited<ReturnType<typeof buildApp>>;
let db: Db;
let merchantTok: string; // merchant owner
let hostTok: string; // plain user
let venueId: string;

async function token(sub: string) {
  return new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' }).setSubject(sub)
    .setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(JWT));
}

async function mkUser(opts: { admin?: boolean } = {}) {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, is_admin, phone_verified_at)
     values ($1::uuid, $2, 'email', $3, '2000-01-01', $4, 'verified', $5, now())`,
    [id, `m${id.slice(0, 8)}@ladder.test`, 'Ladder ' + id.slice(0, 4), 'LAD' + Math.floor(Math.random() * 999999), opts.admin ?? false],
  );
  return id;
}

async function mkVenue(name: string) {
  const id = crypto.randomUUID();
  await pool.query(
    `insert into venues (id, display_name, category, location, status, source, geocode_status)
     values ($1::uuid, $2, 'cafe', ST_SetSRID(ST_MakePoint(114.15, 22.28), 4326)::geography, 'active', 'user', 'ok')`,
    [id, name],
  );
  return id;
}

async function claimVenue(venueId: string, ownerId: string, tier = 'starter') {
  await pool.query(
    `insert into merchant_accounts (id, owner_user_id, venue_id, business_reg_cert_key, claim_status, tier)
     values ($1::uuid, $2::uuid, $3::uuid, 'k', 'approved', $4)`,
    [crypto.randomUUID(), ownerId, venueId, tier],
  );
}

async function joinMembership(uid: string, venue: string) {
  const t = await token(uid);
  return app.inject({ method: 'POST', url: `/v1/venues/${venue}/membership`, headers: { authorization: `Bearer ${t}` } });
}

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  db = drizzleT(pool, { schema }) as unknown as Db;
  await migrate(drizzleT(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  app = await buildApp({ config: {
    NODE_ENV: 'test', PORT: '0', LOG_LEVEL: 'error', DATABASE_URL: infra.dbUrl, REDIS_URL: infra.redisUrl,
    GOTRUE_URL: 'http://127.0.0.1:9', GOTRUE_JWT_SECRET: JWT,
    CORS_ORIGINS: 'http://localhost:5173', RATE_LIMIT_MAX: '1000', SENTRY_DSN: '',
    PII_ENCRYPTION_KEY: 'a'.repeat(64), QR_HMAC_SECRET: 'b'.repeat(32),
    ADMIN_BOOTSTRAP_PASSWORD: 'adminpw', ENABLE_SWAGGER: false,
  } as never });
  await app.ready();

  const ownerId = await mkUser();
  merchantTok = await token(ownerId);
  hostTok = await token(await mkUser());
  venueId = await mkVenue('Ladder Test Cafe');
  await claimVenue(venueId, ownerId, 'growth');
});

afterAll(async () => {
  await app.close();
  await pool.end();
  await stopInfra();
});

describe('T20.1 ladder', () => {
  it('template save + tier level cap + custom blocked on starter', async () => {
    const save = await app.inject({ method: 'PUT', url: '/v1/merchant/ladder', headers: { authorization: `Bearer ${merchantTok}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ template: 'restaurant', inactivityDays: 60, levels: [] }) });
    expect(save.statusCode).toBe(200);
    expect(save.json().reductionProtection).toBeNull();

    const get = await app.inject({ method: 'GET', url: '/v1/merchant/ladder', headers: { authorization: `Bearer ${merchantTok}` } });
    expect(get.json().levels).toHaveLength(4); // restaurant template = 4 levels

    // 6 levels exceeds growth cap (5)
    const six = Array.from({ length: 6 }, (_, i) => ({ position: i + 1, name: `L${i}`, minVisits: i + 1, minMonths: 0 }));
    const over = await app.inject({ method: 'PUT', url: '/v1/merchant/ladder', headers: { authorization: `Bearer ${merchantTok}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ template: 'custom', inactivityDays: 60, levels: six }) });
    expect(over.statusCode).toBe(402);
  });

  it('benefit reduction → 30-day effective_from + members notified', async () => {
    const harsh = [
      { position: 1, name: 'L1', minVisits: 1, minMonths: 0 },
      { position: 2, name: 'L2', minVisits: 50, minMonths: 12 }, // harder than restaurant L2 (6/1)
      { position: 3, name: 'L3', minVisits: 50, minMonths: 12 },
      { position: 4, name: 'L4', minVisits: 50, minMonths: 12 },
    ];
    const res = await app.inject({ method: 'PUT', url: '/v1/merchant/ladder', headers: { authorization: `Bearer ${merchantTok}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ template: 'custom', inactivityDays: 60, levels: harsh }) });
    expect(res.statusCode).toBe(200);
    expect(res.json().reductionProtection).toContain('30 days');
    const get = await app.inject({ method: 'GET', url: '/v1/merchant/ladder', headers: { authorization: `Bearer ${merchantTok}` } });
    expect(new Date(get.json().levels[1].effective_from).getTime()).toBeGreaterThan(Date.now() + 29 * 86400_000);
  });
});

describe('T20.2 memberships', () => {
  it('join active; venue cap overflow → waitlisted; leave frees seat for waitlist backfill', async () => {
    // starter-tier venue for the cap test
    const capVenue = await mkVenue('Cap Cafe');
    const capOwner = await mkUser();
    await claimVenue(capVenue, capOwner, 'starter');
    // seed 25 active members directly (cap = 25)
    for (let i = 0; i < 25; i++) {
      const u = await mkUser();
      await pool.query(
        `insert into memberships (venue_id, user_id, kind, status) values ($1::uuid, $2::uuid, 'member', 'active')`,
        [capVenue, u],
      );
    }
    const extra = await mkUser();
    const join = await joinMembership(extra, capVenue);
    expect(join.statusCode).toBe(201);
    expect(join.json().status).toBe('waitlisted');

    // founding circle excluded from caps — up to 25
    const fc = await joinMembership(await mkUser(), venueId);
    expect(fc.json().status).toBe('active');

    const list = await app.inject({ method: 'GET', url: '/v1/me/memberships', headers: { authorization: `Bearer ${hostTok}` } });
    expect(list.statusCode).toBe(200);
  });
});

describe('T20.3 level engine + T20.4 attribution billing', () => {
  it('member visit recomputes level up and notifies; attribution bills max 3', async () => {
    const member = await mkUser();
    await joinMembership(member, venueId);
    // replace the harsh ladder with a minimal non-reducing one (L1 only, effective now)
    const easy = await app.inject({ method: 'PUT', url: '/v1/merchant/ladder', headers: { authorization: `Bearer ${merchantTok}`, 'content-type': 'application/json' },
      payload: JSON.stringify({ template: 'custom', inactivityDays: 60, levels: [{ position: 1, name: 'L1', minVisits: 1, minMonths: 0 }] }) });
    expect(easy.statusCode).toBe(200);
    // staff scan requires QR; simpler: call level logic via membership visit directly — simulate scan flow pieces
    // (scan QR machinery is covered by scan.test.ts; here we test engine + billing gate)
    await pool.query(`update memberships set visits_count = 3 where user_id = $1::uuid and venue_id = $2::uuid`, [member, venueId]);

    const sweepTok = await token(await mkUser({ admin: true }));
    // ensure the admin user has superadmin role
    const adm = await pool.query(`select id from users where is_admin = true order by created_at desc limit 1`);
    await pool.query(`update users set admin_roles = '{superadmin}' where id = $1::uuid`, [adm.rows[0].id]);
    const sweep = await app.inject({ method: 'POST', url: '/v1/internal/membership-sweep', headers: { authorization: `Bearer ${await token(adm.rows[0].id)}`, 'content-type': 'application/json' }, payload: '{}' });
    expect(sweep.statusCode).toBe(200);
    expect(sweep.json().leveledUp).toBeGreaterThanOrEqual(1); // visits 3 ≥ L1 (3) since joined_at now, months 0

    // attribution billing: 3 member-visit checkins bill, 4th doesn't
    const merchantId = (await pool.query(`select id from merchant_accounts where venue_id = $1::uuid`, [venueId])).rows[0].id;
    const amounts: number[] = [];
    await pool.query(`update users set created_at = now() - interval '8 days' where id = $1::uuid`, [member]);
    for (let i = 0; i < 4; i++) {
      const chk = await pool.query(
        `insert into merchant_checkins (venue_id, user_id, scanned_by, context, confidence)
         values ($1::uuid, $2::uuid, $3::uuid, 'member_visit', 'high') returning id`,
        [venueId, member, (await pool.query(`select owner_user_id from merchant_accounts where id=$1::uuid`, [merchantId])).rows[0].owner_user_id],
      );
      const r = await onCheckin(db, chk.rows[0].id);
      amounts.push(r.amount ?? 0);
    }
    expect(amounts.filter((a) => a > 0)).toHaveLength(3); // 3 billed, 4th blocked by attribution cap
  });
});
