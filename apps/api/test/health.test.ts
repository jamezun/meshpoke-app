import pg from 'pg';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { stopInfra, useInfra } from './db.js';

const infraReady = useInfra();
let app: Awaited<ReturnType<typeof buildApp>> | undefined;
// Provided instances are NOT closed by app.close(); we own their teardown.
let providedDb: pg.Pool | undefined;
let providedRedis: Redis | undefined;

beforeAll(async () => {
  const { dbUrl, redisUrl } = await infraReady;
  providedDb = new pg.Pool({ connectionString: dbUrl });
  providedRedis = new Redis(redisUrl);
  app = await buildApp({
    config: {
      NODE_ENV: 'test',
      PORT: 0,
      LOG_LEVEL: 'fatal',
      DATABASE_URL: dbUrl,
      REDIS_URL: redisUrl,
      GOTRUE_URL: 'http://localhost:9999',
      GOTRUE_JWT_SECRET: 'test-gotrue-jwt-secret-at-least-32-chars!!',
      CORS_ORIGINS: 'http://localhost:5173',
      RATE_LIMIT_MAX: 1000,
      PII_ENCRYPTION_KEY: '0'.repeat(64),
      QR_HMAC_SECRET: 'test-qr-hmac-secret-32-chars-minimum!!!',
      ADMIN_BOOTSTRAP_PASSWORD: 'test-admin-bootstrap-pw',
      SENTRY_DSN: undefined,
      ENABLE_SWAGGER: false,
    },
    db: providedDb,
    redis: providedRedis,
  });
});

// Order matters: end app pools/redis BEFORE stopping containers.
afterAll(async () => {
  await app?.close();
  await providedDb?.end();
  providedRedis?.disconnect();
  await stopInfra();
});

describe('GET /v1/health', () => {
  it('returns ok with db and redis checks up', async () => {
    const res = await app!.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok', checks: { db: true, redis: true } });
  });

  it('returns 503 when db is unreachable', async () => {
    const { redisUrl } = await infraReady;
    const brokenApp = await buildApp({
      config: {
        NODE_ENV: 'test',
        PORT: 0,
        LOG_LEVEL: 'fatal',
        DATABASE_URL: 'postgres://nobody:nobody@127.0.0.1:1/meshpoke_test',
        REDIS_URL: redisUrl,
        GOTRUE_URL: 'http://localhost:9999',
        GOTRUE_JWT_SECRET: 'test-gotrue-jwt-secret-at-least-32-chars!!',
        CORS_ORIGINS: 'http://localhost:5173',
        RATE_LIMIT_MAX: 1000,
        PII_ENCRYPTION_KEY: '0'.repeat(64),
        QR_HMAC_SECRET: 'test-qr-hmac-secret-32-chars-minimum!!!',
        ADMIN_BOOTSTRAP_PASSWORD: 'test-admin-bootstrap-pw',
        SENTRY_DSN: undefined,
        ENABLE_SWAGGER: false,
      },
    });
    const res = await brokenApp.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(503);
    expect(res.json().checks.db).toBe(false);
    await brokenApp.close();
  });

  it('unknown routes return problem+json 404', async () => {
    const res = await app!.inject({ method: 'GET', url: '/v1/nope' });
    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.json()).toMatchObject({ title: 'NotFound', status: 404 });
  });
});
