/**
 * T19.3: authz sweep — every write/admin route must reject
 * (a) no token → 401, (b) plain user where admin required → 403.
 * Table-driven; bodies are minimal — we only assert the auth wall, not logic.
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

const JWT = 'e2e-secret-e2e-secret-e2e-secret-e2e-secret';

async function token(sub: string, extra: Record<string, unknown> = {}) {
  return new SignJWT({ role: 'authenticated', ...extra }).setProtectedHeader({ alg: 'HS256' }).setSubject(sub)
    .setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(JWT));
}

let infra: TestInfra;
let pool: pg.Pool;
let app: Awaited<ReturnType<typeof buildApp>>;
let userTok: string;
const uid = () => crypto.randomUUID();

const WRITE_ROUTES: [string, string, string][] = [
  ['POST', '/v1/spots/events', '{}'],
  ['POST', '/v1/pokes', '{}'],
  ['POST', '/v1/reports', JSON.stringify({ targetType: 'user', targetId: '00000000-0000-0000-0000-000000000000', reason: 'sweep' })],
  ['POST', '/v1/me/push-tokens', JSON.stringify({ token: 'sweep-token-0123456789', platform: 'ios' })],
  ['PATCH', '/v1/me/notification-prefs', '{}'],
  ['POST', '/v1/spots/x/join', '{}'],
  ['POST', '/v1/spots/x/apply', '{}'],
  ['POST', '/v1/merchant/scan', JSON.stringify({ qrPayload: 'aaaaaaaaaa|1|sig' })],
  ['POST', '/v1/drops/x/claim', '{}'],
];

const ADMIN_ROUTES: [string, string, string][] = [
  ['GET', '/v1/admin/users', ''],
  ['GET', '/v1/admin/moderation/queue', ''],
  ['GET', '/v1/admin/merchant-claims', ''],
  ['GET', '/v1/admin/metrics', ''],
  ['POST', '/v1/internal/spot-sweep', '{}'],
  ['POST', '/v1/internal/score-recompute', '{}'],
];

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  app = await buildApp({ config: {
    NODE_ENV: 'test', PORT: '0', LOG_LEVEL: 'error', DATABASE_URL: infra.dbUrl, REDIS_URL: infra.redisUrl,
    GOTRUE_URL: 'http://127.0.0.1:9', GOTRUE_JWT_SECRET: JWT,
    CORS_ORIGINS: 'http://localhost:5173', RATE_LIMIT_MAX: '1000', SENTRY_DSN: '',
    PII_ENCRYPTION_KEY: 'a'.repeat(64), QR_HMAC_SECRET: 'b'.repeat(32),
    ADMIN_BOOTSTRAP_PASSWORD: 'adminpw', ENABLE_SWAGGER: false,
  } as never });
  await app.ready();
  const id = crypto.randomUUID();
  await pool.query(
    `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state)
     values ($1::uuid, $3, 'email', 'Plain User', '2000-01-01', $2, 'verified')`,
    [id, 'AUTHZ' + Math.floor(Math.random() * 99999), 'authz@sweep.test'],
  );
  userTok = await token(id);
});

afterAll(async () => {
  await app.close();
  await pool.end();
  await stopInfra();
});



describe('authz sweep', () => {
  it('every write route rejects missing token with 401', async () => {
    for (const [method, url, body] of WRITE_ROUTES) {
      const res = await app.inject({ method: method as 'POST', url, payload: body || undefined,
        headers: body ? { 'content-type': 'application/json' } : {} });
      expect(res.statusCode, `${method} ${url}`).toBe(401);
    }
  });

  it('admin + internal routes reject plain user with 403', async () => {
    for (const [method, url, body] of ADMIN_ROUTES) {
      const res = await app.inject({
        method: method as 'GET', url,
        headers: { authorization: `Bearer ${userTok}`, ...(body ? { 'content-type': 'application/json' } : {}) },
        payload: body || undefined,
      });
      expect(res.statusCode, `${method} ${url}`).toBe(403);
    }
  });
});
