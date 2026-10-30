import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { SignJWT } from 'jose';
import { Pool } from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { drizzle } from 'drizzle-orm/node-postgres';
import { join } from 'node:path';
import * as schema from '../src/db/schema/index.js';
import { buildApp } from '../src/app.js';
import { seedDistricts } from '../src/db/seed.js';
import { useInfra, stopInfra } from './db.js';
import { computeScore, provenStateFor, hostingCapacityFor, enforcementFor } from '../src/routes/score.js';

const JWT = 'test-jwt-secret-at-least-32-characters-long';
const infra = useInfra();

let app: Awaited<ReturnType<typeof buildApp>>;
let pool: Pool;

const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000);

describe('computeScore unit (Bayesian)', () => {
  test('prior neutral start', () => {
    expect(computeScore([]).score).toBeCloseTo(0.5, 2);
  });
  test('worked examples from BM §4.4', () => {
    // May: 1 show after New = (1 + 1.5)/(1+3) = 0.625
    const one = computeScore([{ weight: 1, createdAt: daysAgo(1) }]);
    expect(one.score).toBeCloseTo(0.625, 2);
    // 4 shows = (4+1.5)/7 ≈ 0.786 (Reliable)
    const four = computeScore([1, 1, 1, 1].map((weight) => ({ weight, createdAt: daysAgo(2) })));
    expect(four.score).toBeCloseTo((4 + 1.5) / 7, 2);
    // 7 shows then bail 24-48h (0.75) = (7.75+1.5)/11 ≈ 0.841
    const withBail = computeScore([...[1, 1, 1, 1, 1, 1, 1].map((weight) => ({ weight, createdAt: daysAgo(3) })), { weight: 0.75, createdAt: daysAgo(1) }]);
    expect(withBail.score).toBeCloseTo((7.75 + 1.5) / 11, 2);
    // dilution fixed: 10 shows + 1 no-show = (10+1.5)/14 ≈ 0.821 vs 100 shows + 1 NS ≈ 0.985
    const small = computeScore([...Array(10).fill(1).map((weight) => ({ weight, createdAt: daysAgo(1) })), { weight: 0, createdAt: daysAgo(2) }]);
    expect(small.score).toBeCloseTo((10 + 1.5) / 14, 2);
  });
  test('window: >90d events excluded entirely', () => {
    expect(computeScore([{ weight: 1, createdAt: daysAgo(100) }]).eventsCount).toBe(0);
  });
});

describe('enforcementFor ladder', () => {
  const base = { score: 0.9, eventsCount: 10, hostGhost30d: 0, hostCancels30d: 0 };
  test('1 NS → warning; 2 NS → cooldown; 3 NS → paused', () => {
    expect(enforcementFor({ ...base, noShows30d: 1 }).action).toBe('warning');
    expect(enforcementFor({ ...base, noShows30d: 2 }).action).toBe('application_cooldown');
    expect(enforcementFor({ ...base, noShows30d: 3 }).action).toBe('hosting_paused');
  });
  test('low score gates only with n≥3 history', () => {
    expect(enforcementFor({ ...base, noShows30d: 0, eventsCount: 1, score: 0.1 }).action).toBe('none');
    expect(enforcementFor({ ...base, noShows30d: 0, eventsCount: 5, score: 0.35 }).action).toBe('application_cooldown');
    expect(enforcementFor({ ...base, noShows30d: 0, eventsCount: 5, score: 0.25 }).action).toBe('hosting_paused');
  });
  test('host ghost → 7d pause; 2 late host cancels → paused', () => {
    expect(enforcementFor({ ...base, noShows30d: 0, hostGhost30d: 1 }).action).toBe('hosting_paused');
    expect(enforcementFor({ ...base, noShows30d: 0, hostCancels30d: 2 }).action).toBe('hosting_paused');
  });
});

describe.skip('legacy unit (superseded by Bayesian)', () => {
  test('empty → 0.5 neutral', () => {
    expect(computeScore([]).score).toBe(0.5);
  });
  test('good attendance raises, no-shows sink; monotonic in event quality', () => {
    const good = computeScore([{ weight: 0.1, createdAt: daysAgo(1) }, { weight: 0.1, createdAt: daysAgo(2) }, { weight: 0.1, createdAt: daysAgo(3) }]);
    const bad = computeScore([{ weight: -0.25, createdAt: daysAgo(1) }, { weight: -0.25, createdAt: daysAgo(2) }]);
    const mid = computeScore([{ weight: 0.1, createdAt: daysAgo(1) }, { weight: -0.25, createdAt: daysAgo(2) }]);
    expect(good.score).toBeGreaterThan(mid.score);
    expect(mid.score).toBeGreaterThan(bad.score);
    expect(good.score).toBeGreaterThan(0.5);
    expect(bad.score).toBeLessThan(0.5);
  });
  test('decay: old positive events count less than fresh ones', () => {
    const fresh = computeScore([{ weight: 0.1, createdAt: daysAgo(1) }]);
    const old = computeScore([{ weight: 0.1, createdAt: daysAgo(80) }]);
    expect(fresh.score).toBeGreaterThan(old.score);
  });
  test('beyond 90d → fully decayed → neutral', () => {
    expect(computeScore([{ weight: 0.1, createdAt: daysAgo(100) }]).score).toBe(0.5);
  });
});

describe('proven state + capacity', () => {
  test('unproven until 3 events; proven at 0.6/3; top at 0.85/6', () => {
    expect(provenStateFor(0.9, 2)).toBe('unproven');
    expect(provenStateFor(0.6, 3)).toBe('proven');
    expect(provenStateFor(0.85, 5)).toBe('proven');
    expect(provenStateFor(0.85, 6)).toBe('top');
    expect(provenStateFor(0.59, 10)).toBe('unproven'); // low score stays unproven
  });
  test('capacity 1→3→5', () => {
    expect(hostingCapacityFor('unproven')).toBe(1);
    expect(hostingCapacityFor('proven')).toBe(3);
    expect(hostingCapacityFor('top')).toBe(5);
  });
});

describe('score recompute + enforcement (integration)', () => {
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
    pool = new Pool({ connectionString: i.dbUrl });
    await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
    await seedDistricts(pool);
  });
  afterAll(async () => { await app.close(); await pool.end(); await stopInfra(); });

  test('recompute writes showup_scores + hosting_capacity; ladder escalates with no-shows', async () => {
    const adminTok = await (async () => {
      const id = crypto.randomUUID();
      await pool.query(
        `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, is_admin, admin_roles)
         values ($1, $2, 'email', 'A', '1990-01-01', $3, 'verified', true, '{superadmin}')`,
        [id, `a${id.slice(0, 8)}@t.test`, `MP${id.slice(0, 6).toUpperCase()}`]);
      return new SignJWT({ role: 'admin', aal: 'aal2' }).setProtectedHeader({ alg: 'HS256' }).setSubject(id)
        .setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(JWT));
    })();

    const goodUser = crypto.randomUUID();
    const flakeUser = crypto.randomUUID();
    for (const u of [goodUser, flakeUser]) {
      await pool.query(
        `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state)
         values ($1, $2, 'email', 'U', '1990-01-01', $3, 'verified')`,
        [u, `u${u.slice(0, 8)}@t.test`, `MP${u.slice(0, 6).toUpperCase()}`]);
    }
    // good user: 8 fresh attended events (m=3 prior → Rock needs 7+ shows ≥0.85)
    for (let i = 0; i < 8; i++) {
      await pool.query(`insert into score_events (user_id, type, weight, created_at) values ($1, 'attended', 1, now() - ($2 || ' days')::interval)`, [goodUser, String(i + 1)]);
    }
    // flake: 3 fresh no-shows
    for (let i = 0; i < 3; i++) {
      await pool.query(`insert into score_events (user_id, type, weight, created_at) values ($1, 'no_show', 0, now() - ($2 || ' days')::interval)`, [flakeUser, String(i + 1)]);
    }

    const res = await app.inject({ method: 'POST', url: '/v1/internal/score-recompute', headers: { authorization: `Bearer ${adminTok}` }, payload: {} });
    expect(res.statusCode).toBe(200);

    const good = (await pool.query(`select score, events_count, proven_state from showup_scores where user_id = $1`, [goodUser])).rows[0];
    expect(Number(good.score)).toBeCloseTo((8 + 1.5) / 11, 2);
    expect(good.proven_state).toBe('top');
    const goodCap = (await pool.query(`select max_active from hosting_capacity where user_id = $1`, [goodUser])).rows[0];
    expect(goodCap.max_active).toBe(5);

    const flake = (await pool.query(`select score, proven_state from showup_scores where user_id = $1`, [flakeUser])).rows[0];
    expect(Number(flake.score)).toBeCloseTo(0.25, 2);

    const ladder = await app.inject({ method: 'GET', url: `/v1/internal/enforcement/${flakeUser}`, headers: { authorization: `Bearer ${adminTok}` } });
    expect(ladder.json().action).toBe('hosting_paused');
    const goodLadder = await app.inject({ method: 'GET', url: `/v1/internal/enforcement/${goodUser}`, headers: { authorization: `Bearer ${adminTok}` } });
    expect(goodLadder.json().action).toBe('none');
  });
});
