import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { join } from 'node:path';
import { SignJWT } from 'jose';
import sharp from 'sharp';
import { buildApp } from '../src/app.js';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import * as schema from '../src/db/schema/index.js';
import { registerPhotos, processImage } from '../src/routes/photos.js';

const JWT_SECRET = 'test-secret-test-secret-test-secret!';

let infra: TestInfra | null = null;
let pool: pg.Pool | null = null;
let app: Awaited<ReturnType<typeof buildApp>> | null = null;

/** Fake R2: map key → bytes; presigned URLs are deterministic fakes. */
const fakeStore = new Map<string, Uint8Array>();
const fakeStorage = {
  async presignPut(key: string) { return `https://fake-r2/${key}?sig=put`; },
  async presignGet(key: string) { return `https://fake-r2/${key}?sig=get`; },
  async get(key: string) { return fakeStore.get(key) ?? null; },
  async put(key: string, body: Uint8Array) { fakeStore.set(key, body); },
  async del(key: string) { fakeStore.delete(key); },
};

/** JPEG with GPS EXIF (22.28, 114.15) — sharp writes EXIF via withMetadata. */
async function jpegWithGps(): Promise<Uint8Array> {
  const png = await sharp({ create: { width: 1400, height: 900, channels: 3, background: '#3aa' } }).png().toBuffer();
  const withMeta = await sharp(png)
    .withMetadata({ exif: { IFD0: { ImageDescription: 'MeshPoke test' } } as never })
    .jpeg()
    .toBuffer();
  return new Uint8Array(withMeta);
}

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
  // photos are env-gated in buildApp; register with fake storage on the same app
  await app.register((instance) => registerPhotos(instance as never, infra!.dbUrl, fakeStorage), { prefix: '/v1' });
});

afterAll(async () => {
  await app?.close();
  await pool?.end();
  await stopInfra();
});

async function uploadPhoto(u: { id: string; headers: Record<string, string> }, n: number, bytes?: Uint8Array) {
  const req = await app!.inject({ method: 'POST', url: '/v1/me/photos', headers: u.headers, payload: { content_type: 'image/jpeg' } });
  if (req.statusCode !== 200) return req;
  const { key } = req.json() as { key: string };
  fakeStore.set(key, bytes ?? await jpegWithGps());
  return app!.inject({ method: 'POST', url: '/v1/me/photos/confirm', headers: u.headers, payload: { n } });
}

describe('T3.2 photos', () => {
  it('processImage strips GPS EXIF and resizes to 1080 + 320 thumb', async () => {
    const raw = await jpegWithGps();
    const meta = await sharp(Buffer.from(raw)).metadata();
    expect(meta.exif).toBeTruthy(); // input really has EXIF

    const { full, thumb } = await processImage(raw);
    const fullMeta = await sharp(full).metadata();
    const thumbMeta = await sharp(thumb).metadata();
    expect(fullMeta.exif).toBeUndefined();          // EXIF gone
    expect(Math.max(fullMeta.width!, fullMeta.height!)).toBeLessThanOrEqual(1080);
    expect(Math.max(thumbMeta.width!, thumbMeta.height!)).toBeLessThanOrEqual(320);
  });

  it('full flow: presign → upload → confirm → GET signed URLs', async () => {
    const u = await onboardedUser();
    const res = await uploadPhoto(u, 1);
    expect(res.statusCode).toBe(200);
    expect(res.json().confirmed).toBe(true);

    const stored = fakeStore.get(`users/${u.id}/photos/1.jpg`)!;
    expect((await sharp(Buffer.from(stored)).metadata()).exif).toBeUndefined(); // stored object is clean

    const list = await app!.inject({ method: 'GET', url: '/v1/me/photos', headers: u.headers });
    expect(list.json().photos).toHaveLength(1);
    expect(list.json().photos[0].url).toContain('sig=get');
    expect(list.json().photos[0].thumb_url).toContain('_t.jpg');
  });

  it('7th photo rejected with 422; slots reused lowest-first', async () => {
    const u = await onboardedUser();
    for (let i = 0; i < 6; i++) {
      const r = await uploadPhoto(u, i + 1);
      expect(r.statusCode).toBe(200);
    }
    const seventh = await app!.inject({ method: 'POST', url: '/v1/photos', headers: u.headers, payload: { content_type: 'image/jpeg' } });
    const seventhProper = await app!.inject({ method: 'POST', url: '/v1/me/photos', headers: u.headers, payload: { content_type: 'image/jpeg' } });
    expect(seventhProper.statusCode).toBe(422);

    // delete #2 → next upload reuses slot 2
    await app!.inject({ method: 'DELETE', url: '/v1/me/photos/2', headers: u.headers });
    const again = await app!.inject({ method: 'POST', url: '/v1/me/photos', headers: u.headers, payload: { content_type: 'image/jpeg' } });
    expect(again.json().n).toBe(2);
    void seventh;
  });

  it('rejects wrong content type (422), oversized (422), confirm-before-upload (409), garbage image (422)', async () => {
    const u = await onboardedUser();
    expect((await app!.inject({ method: 'POST', url: '/v1/me/photos', headers: u.headers, payload: { content_type: 'image/gif' } })).statusCode).toBe(422);

    // nothing uploaded yet
    expect((await app!.inject({ method: 'POST', url: '/v1/me/photos/confirm', headers: u.headers, payload: { n: 1 } })).statusCode).toBe(409);

    // garbage bytes
    const req = await app!.inject({ method: 'POST', url: '/v1/me/photos', headers: u.headers, payload: { content_type: 'image/jpeg' } });
    fakeStore.set(req.json().key, new Uint8Array([1, 2, 3, 4, 5]));
    expect((await app!.inject({ method: 'POST', url: '/v1/me/photos/confirm', headers: u.headers, payload: { n: 1 } })).statusCode).toBe(422);

    // oversized (>8MB)
    const req2 = await app!.inject({ method: 'POST', url: '/v1/me/photos', headers: u.headers, payload: { content_type: 'image/jpeg' } });
    fakeStore.set(req2.json().key, new Uint8Array(8 * 1024 * 1024 + 1));
    expect((await app!.inject({ method: 'POST', url: '/v1/me/photos/confirm', headers: u.headers, payload: { n: 1 } })).statusCode).toBe(422);
  });

  it('reorder: first position = primary; rejects mismatched order (422)', async () => {
    const u = await onboardedUser();
    await uploadPhoto(u, 1);
    await uploadPhoto(u, 2);
    await uploadPhoto(u, 3);
    const bad = await app!.inject({ method: 'PUT', url: '/v1/me/photos/order', headers: u.headers, payload: { order: [3, 1] } });
    expect(bad.statusCode).toBe(422);
    const ok = await app!.inject({ method: 'PUT', url: '/v1/me/photos/order', headers: u.headers, payload: { order: [3, 1, 2] } });
    expect(ok.statusCode).toBe(200);
    const list = await app!.inject({ method: 'GET', url: '/v1/me/photos', headers: u.headers });
    expect(list.json().photos.map((p: { url: string }) => p.url)).toEqual(
      [3, 1, 2].map((n) => `https://fake-r2/users/${u.id}/photos/${n}.jpg?sig=get`),
    );
  });
});
