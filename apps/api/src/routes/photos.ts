/**
 * Photos: private R2 objects, max 6 per user. Keys: users/{id}/photos/{n}.jpg
 * Upload flow: POST /me/photos → presigned PUT (client uploads) → POST /me/photos/confirm
 * → server downloads, strips EXIF (location!), resizes 1080 + 320 thumb, re-uploads both.
 */
import type { FastifyInstance } from 'fastify';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { profiles } from '../db/schema/core.js';
import type { Storage } from '../storage.js';

export const MAX_PHOTOS = 6;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Strip ALL metadata + resize. Returns {full 1080, thumb 320} JPEG. */
export async function processImage(input: Uint8Array): Promise<{ full: Buffer; thumb: Buffer }> {
  const base = sharp(Buffer.from(input), { failOn: 'error' }).rotate(); // auto-orient from EXIF then drop it
  const full = await base.clone().resize(1080, 1080, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  const thumb = await base.clone().resize(320, 320, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();
  return { full, thumb };
}

type PhotoSlot = { n: number; key: string; thumbKey: string };

function photoKey(userId: string, n: number): string {
  return `users/${userId}/photos/${n}.jpg`;
}
function thumbKey(userId: string, n: number): string {
  return `users/${userId}/photos/${n}_t.jpg`;
}

/** Current photo slots from profiles.photos jsonb: [{n, key, thumbKey}] or legacy string[]. */
function slotsOf(photos: unknown): PhotoSlot[] {
  if (!Array.isArray(photos)) return [];
  return (photos as unknown[]).filter((p): p is PhotoSlot => typeof p === 'object' && p !== null && 'n' in p);
}

export function registerPhotos(app: FastifyInstance, dbUrl: string, storage: Storage) {
  const db = getDb(dbUrl);

  app.post('/me/photos', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.user!.onboarded) return reply.code(403).send({ type: 'about:blank', title: 'Onboard first', status: 403 });
    const { content_type: contentType } = (req.body ?? {}) as { content_type?: string };
    if (!contentType || !ALLOWED.has(contentType)) {
      return reply.code(422).send({ type: 'about:blank', title: 'Unsupported type', status: 422, detail: 'jpeg, png or webp only' });
    }

    const [p] = await db.select().from(profiles).where(eq(profiles.userId, req.user!.id));
    const existing = slotsOf(p?.photos);
    if (existing.length >= MAX_PHOTOS) {
      return reply.code(422).send({ type: 'about:blank', title: 'Photo limit', status: 422, detail: `Max ${MAX_PHOTOS} photos` });
    }
    // lowest unused slot number
    const used = new Set(existing.map((s) => s.n));
    let n = 1;
    while (used.has(n)) n++;
    const key = photoKey(req.user!.id, n);
    const uploadUrl = await storage.presignPut(key, contentType);
    return { n, key, upload_url: uploadUrl, expires_in: 900 };
  });

  app.post('/me/photos/confirm', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.user!.onboarded) return reply.code(403).send({ type: 'about:blank', title: 'Onboard first', status: 403 });
    const { n } = (req.body ?? {}) as { n?: number };
    if (typeof n !== 'number' || n < 1 || n > MAX_PHOTOS) {
      return reply.code(422).send({ type: 'about:blank', title: 'Bad slot', status: 422 });
    }
    const key = photoKey(req.user!.id, n);

    const raw = await storage.get(key);
    if (!raw || raw.byteLength === 0) {
      return reply.code(409).send({ type: 'about:blank', title: 'Nothing uploaded', status: 409, detail: 'Upload the file to the presigned URL first.' });
    }
    if (raw.byteLength > MAX_UPLOAD_BYTES) {
      await storage.del(key);
      return reply.code(422).send({ type: 'about:blank', title: 'Too large', status: 422, detail: '8 MB max' });
    }

    let processed: { full: Buffer; thumb: Buffer };
    try {
      processed = await processImage(raw);
    } catch {
      await storage.del(key);
      return reply.code(422).send({ type: 'about:blank', title: 'Invalid image', status: 422 });
    }
    await storage.put(key, processed.full, 'image/jpeg');
    await storage.put(thumbKey(req.user!.id, n), processed.thumb, 'image/jpeg');

    const [p] = await db.select().from(profiles).where(eq(profiles.userId, req.user!.id));
    const existing = slotsOf(p?.photos).filter((s) => s.n !== n);
    const next = [...existing, { n, key, thumbKey: thumbKey(req.user!.id, n) }].sort((a, b) => a.n - b.n);
    await db.update(profiles).set({ photos: next }).where(eq(profiles.userId, req.user!.id));
    return { n, confirmed: true };
  });

  app.get('/me/photos', { preHandler: [app.authenticate] }, async (req) => {
    const [p] = await db.select().from(profiles).where(eq(profiles.userId, req.user!.id));
    const slots = slotsOf(p?.photos);
    return {
      photos: await Promise.all(slots.map(async (s) => ({
        n: s.n,
        url: await storage.presignGet(s.key),
        thumb_url: await storage.presignGet(s.thumbKey),
      }))),
    };
  });

  app.delete('/me/photos/:n', { preHandler: [app.authenticate] }, async (req, reply) => {
    const n = Number((req.params as { n: string }).n);
    if (!Number.isInteger(n) || n < 1 || n > MAX_PHOTOS) {
      return reply.code(422).send({ type: 'about:blank', title: 'Bad slot', status: 422 });
    }
    const [p] = await db.select().from(profiles).where(eq(profiles.userId, req.user!.id));
    const existing = slotsOf(p?.photos);
    if (!existing.some((s) => s.n === n)) {
      return reply.code(404).send({ type: 'about:blank', title: 'Not Found', status: 404 });
    }
    await Promise.all([storage.del(photoKey(req.user!.id, n)), storage.del(thumbKey(req.user!.id, n))]);
    await db.update(profiles)
      .set({ photos: existing.filter((s) => s.n !== n) })
      .where(eq(profiles.userId, req.user!.id));
    return { deleted: true };
  });

  app.put('/me/photos/order', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { order } = (req.body ?? {}) as { order?: number[] };
    const [p] = await db.select().from(profiles).where(eq(profiles.userId, req.user!.id));
    const existing = slotsOf(p?.photos);
    if (!Array.isArray(order) || order.length !== existing.length || new Set(order).size !== order.length) {
      return reply.code(422).send({ type: 'about:blank', title: 'Bad order', status: 422 });
    }
    const byN = new Map(existing.map((s) => [s.n, s]));
    if (!order.every((n) => byN.has(n))) {
      return reply.code(422).send({ type: 'about:blank', title: 'Bad order', status: 422 });
    }
    // first position = primary; keep original slot numbers, just reorder the array
    const next = order.map((n) => byN.get(n)!);
    await db.update(profiles).set({ photos: next }).where(eq(profiles.userId, req.user!.id));
    return { order };
  });
}
