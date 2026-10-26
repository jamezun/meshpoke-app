import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { join } from 'node:path';
import { SignJWT } from 'jose';
import { buildApp } from '../src/app.js';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import * as schema from '../src/db/schema/index.js';
import { normalizeKeyword, KEYWORD_SUGGESTIONS } from '@meshpoke/shared/keywords';

const JWT_SECRET = 'test-secret-test-secret-test-secret!';

let infra: TestInfra | null = null;
let pool: pg.Pool | null = null;
let app: Awaited<ReturnType<typeof buildApp>> | null = null;

async function mkToken(sub: string) {
  return new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' }).setSubject(sub)
    .setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(JWT_SECRET));
}

async function onboardedUser() {
  const id = crypto.randomUUID();
  const headers = { authorization: `Bearer ${await mkToken(id)}` };
  await app!.inject({ method: 'POST', url: '/v1/me/onboard', headers, payload: { date_of_birth: '1995-01-01' } });
  return { id, headers };
}

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });

  const { default: Fastify } = await import('fastify');
  const mock = Fastify();
  mock.post('/otp', async () => ({}));
  mock.get('/admin/users/:id', async () => ({}));
  mock.post('/admin/users/:id/logout', async () => ({}));
  await mock.listen({ port: 0, host: '127.0.0.1' });
  const port = (mock.server.address() as { port: number }).port;

  app = await buildApp({
    config: {
      NODE_ENV: 'test', PORT: '0', LOG_LEVEL: 'silent', DATABASE_URL: infra.dbUrl, REDIS_URL: infra.redisUrl,
      GOTRUE_URL: `http://127.0.0.1:${port}`, GOTRUE_JWT_SECRET: JWT_SECRET, CORS_ORIGINS: 'http://localhost:5173',
      RATE_LIMIT_MAX: '1000', SENTRY_DSN: '', PII_ENCRYPTION_KEY: 'a'.repeat(64), QR_HMAC_SECRET: 'b'.repeat(32),
      ADMIN_BOOTSTRAP_PASSWORD: 'adminpw', ENABLE_SWAGGER: false,
    } as never,
  });
});

afterAll(async () => {
  await app?.close();
  await pool?.end();
  await stopInfra();
});

describe('T3.1 keywords', () => {
  it('PUT replaces set, normalizes (trim/lowercase/aliases), dedupes case-insensitively', async () => {
    const u = await onboardedUser();
    const res = await app!.inject({
      method: 'PUT', url: '/v1/me/keywords', headers: u.headers,
      payload: { keywords: ['  Tennis ', 'boardgames', 'TENNIS', 'Hiking', 'IT'] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().keywords.map((k: { keyword: string }) => k.keyword).sort()).toEqual(['board games', 'hiking', 'tech', 'tennis']);
  });

  it('rejects 11 keywords (422) but accepts 10', async () => {
    const u = await onboardedUser();
    const ten = Array.from({ length: 10 }, (_, i) => `kw${i}`);
    expect((await app!.inject({ method: 'PUT', url: '/v1/me/keywords', headers: u.headers, payload: { keywords: ten } })).statusCode).toBe(200);
    expect((await app!.inject({ method: 'PUT', url: '/v1/me/keywords', headers: u.headers, payload: { keywords: [...ten, 'extra'] } })).statusCode).toBe(422);
  });

  it('preserves levels on replace; DB trigger backstop for level-8 cap (422)', async () => {
    const u = await onboardedUser();
    await pool!.query(
      `INSERT INTO keywords (user_id, keyword, level) VALUES ($1,'tennis',9),($1,'board games',8)`,
      [u.id],
    );
    const res = await app!.inject({
      method: 'PUT', url: '/v1/me/keywords', headers: u.headers,
      payload: { keywords: ['tennis', 'board games'] },
    });
    expect(res.statusCode).toBe(200);
    const levels = Object.fromEntries(res.json().keywords.map((k: { keyword: string; level: number }) => [k.keyword, k.level]));
    expect(levels.tennis).toBe(9); // survived replace with level

    // 3 high already + request keeps them + adds another → cannot exceed via API,
    // but try to sneak 4 high by pre-seeding levels then replacing with 4:
    await pool!.query(`DELETE FROM keywords WHERE user_id = $1`, [u.id]);
    await pool!.query(
      `INSERT INTO keywords (user_id, keyword, level) VALUES ($1,'tennis',9),($1,'board games',8),($1,'hiking',10)`,
      [u.id],
    );
    // adding a 4th LOW keyword when 3 high exist is legal
    const four = await app!.inject({
      method: 'PUT', url: '/v1/me/keywords', headers: u.headers,
      payload: { keywords: ['tennis', 'board games', 'hiking', 'language exchange'] },
    });
    expect(four.statusCode).toBe(200);

    // backstop: raising a 4th to level 8 via SQL (API has no level param) → trigger rejects
    await expect(
      pool!.query(`UPDATE keywords SET level = 8 WHERE user_id = $1 AND keyword = 'language exchange'`, [u.id]),
    ).rejects.toThrow(/level-8 keyword cap/);
  });

  it('GET returns current set; suggestions list is sane', async () => {
    const u = await onboardedUser();
    await app!.inject({ method: 'PUT', url: '/v1/me/keywords', headers: u.headers, payload: { keywords: ['wine'] } });
    const got = await app!.inject({ method: 'GET', url: '/v1/me/keywords', headers: u.headers });
    expect(got.json().keywords).toEqual([{ keyword: 'wine', level: 1 }]);
    expect(KEYWORD_SUGGESTIONS).toContain('pickleball');
    expect(normalizeKeyword('  PiCkLeBall ')).toBe('pickleball');
  });
});
