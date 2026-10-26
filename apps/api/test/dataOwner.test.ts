import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { join } from 'node:path';
import { SignJWT } from 'jose';
import { buildApp } from '../src/app.js';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import * as schema from '../src/db/schema/index.js';
import { anonymizeDeleted } from '../src/jobs/anonymize-deleted.js';

const JWT_SECRET = 'test-secret-test-secret-test-secret!';

let infra: TestInfra | null = null;
let pool: pg.Pool | null = null;
let app: Awaited<ReturnType<typeof buildApp>> | null = null;
let gotruePort = 0;
let logoutCalls = 0;

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
  mock.post('/admin/users/:id/logout', async () => { logoutCalls++; return {}; });
  await mock.listen({ port: 0, host: '127.0.0.1' });
  gotruePort = (mock.server.address() as { port: number }).port;

  app = await buildApp({
    config: {
      NODE_ENV: 'test', PORT: '0', LOG_LEVEL: 'silent', DATABASE_URL: infra.dbUrl, REDIS_URL: infra.redisUrl,
      GOTRUE_URL: `http://127.0.0.1:${gotruePort}`, GOTRUE_JWT_SECRET: JWT_SECRET, CORS_ORIGINS: 'http://localhost:5173',
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

describe('T2.4 deletion + export', () => {
  it('DELETE /me soft-deletes, revokes GoTrue sessions, hides from queries', async () => {
    const u = await onboardedUser();
    const before = await pool!.query('SELECT deleted_at IS NOT NULL AS gone FROM users WHERE id = $1', [u.id]);
    expect(before.rows[0].gone).toBe(false);

    const del = await app!.inject({ method: 'DELETE', url: '/v1/me', headers: u.headers });
    expect(del.statusCode).toBe(200);
    expect(logoutCalls).toBeGreaterThan(0);

    const after = await pool!.query('SELECT deleted_at IS NOT NULL AS gone, display_name FROM users WHERE id = $1', [u.id]);
    expect(after.rows[0].gone).toBe(true); // soft: row retained (billing/safety)
  });

  it('GET /me/export returns only own data (no other users)', async () => {
    const a = await onboardedUser();
    const b = await onboardedUser();
    // b pokes a; a exports — must NOT contain b's note-to-a (only pokes a SENT)
    await pool!.query(
      `INSERT INTO pokes (id, from_user, to_user, note, source, cost_type, status, expires_at)
       VALUES (gen_random_uuid(), $1, $2, 'hi from b', 'profile', 'weekly', 'pending', now() + interval '7 days')`,
      [b.id, a.id],
    );
    const exp = await app!.inject({ method: 'GET', url: '/v1/me/export', headers: a.headers });
    expect(exp.statusCode).toBe(200);
    const body = JSON.stringify(exp.json());
    expect(body).not.toContain('hi from b'); // received pokes excluded
    expect(exp.json().account.id).toBe(a.id);
  });

  it('anonymize job scrubs users deleted >30d, leaves fresh deletions alone', async () => {
    const old = await onboardedUser();
    const fresh = await onboardedUser();
    await app!.inject({ method: 'DELETE', url: '/v1/me', headers: old.headers });
    await app!.inject({ method: 'DELETE', url: '/v1/me', headers: fresh.headers });
    await pool!.query(`UPDATE users SET deleted_at = now() - interval '31 days' WHERE id = $1`, [old.id]);

    const n = await anonymizeDeleted(infra!.dbUrl);
    expect(n).toBeGreaterThanOrEqual(1);
    const oldRow = (await pool!.query('SELECT display_name, email, anonymized_at FROM users WHERE id = $1', [old.id])).rows[0];
    expect(oldRow.display_name).toBe('Deleted user');
    expect(oldRow.email).toContain('@meshpoke.invalid');
    expect(oldRow.anonymized_at).not.toBeNull();
    const freshRow = (await pool!.query('SELECT anonymized_at FROM users WHERE id = $1', [fresh.id])).rows[0];
    expect(freshRow.anonymized_at).toBeNull();
  });

  it('anonymize is idempotent (second run scrubs 0)', async () => {
    expect(await anonymizeDeleted(infra!.dbUrl)).toBe(0);
  });
});
