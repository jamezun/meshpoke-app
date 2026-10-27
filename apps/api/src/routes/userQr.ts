import type { FastifyInstance } from 'fastify';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { Redis } from 'ioredis';
import { QR_RULES } from '@meshpoke/shared/constants';
import { getDb } from '../db/client.js';

const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url');

export function qrWindow(now = Date.now()): number {
  return Math.floor(now / 1000 / QR_RULES.rotationSeconds);
}

export function signQrToken(userId: string, window: number, secret: string): string {
  const sig = createHmac('sha256', secret).update(`${userId}|${window}`).digest('base64url');
  return b64u(`${userId}|${window}|${sig}`);
}

export type QrVerify = { ok: true; userId: string; window: number } | { ok: false; reason: 'malformed' | 'bad_sig' | 'expired' };

export function verifyQrToken(payload: string, secret: string, now = Date.now()): QrVerify {
  const parts = Buffer.from(payload, 'base64url').toString().split('|');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const [userId, winStr, sig] = parts;
  const win = Number(winStr);
  if (!Number.isInteger(win) || win <= 0) return { ok: false, reason: 'malformed' };
  const expect = createHmac('sha256', secret).update(`${userId}|${win}`).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: 'bad_sig' };
  const current = qrWindow(now);
  const tol = QR_RULES.clockToleranceSeconds;
  // window units are rotationSeconds; allow ±1 window (≈ ±30 s) for clock skew
  if (win > current + 1 || win < current - 1 - Math.floor(tol / QR_RULES.rotationSeconds)) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, userId, window: win };
}

/** Replay protection: token unusable once scanned (Redis, TTL > 2× rotation). */
export async function markQrUsed(redis: Redis, payload: string): Promise<boolean> {
  const key = `qr:used:${payload}`;
  const r = await redis.set(key, '1', 'EX', QR_RULES.replayTtlSeconds, 'NX');
  return r === 'OK'; // false = replay
}

/** Guest's last location ping for staff-scan GPS confidence (Redis only, never DB). */
export async function storeLocationPing(redis: Redis, userId: string, lat: number, lng: number, accuracyM: number): Promise<void> {
  await redis.set(`qr:loc:${userId}`, JSON.stringify({ lat, lng, accuracyM }), 'EX', 600);
}

export async function lastLocationPing(redis: Redis, userId: string): Promise<{ lat: number; lng: number; accuracyM: number } | null> {
  const raw = await redis.get(`qr:loc:${userId}`);
  return raw ? JSON.parse(raw) : null;
}

/** T15.1 user rotating QR. */
export function registerUserQr(app: FastifyInstance, dbUrl: string, secret: string): void {
  const db = getDb(dbUrl);

  app.get('/me/qr', { preHandler: app.authenticate }, async (req, reply) => {
    const r = await db.execute(sql`select phone_verified_at is not null as ok from users where id = ${req.user!.id}::uuid`);
    const rows = (r as unknown as { rows: { ok: boolean }[] }).rows;
    if (!rows[0]?.ok) return reply.code(403).send({ title: 'Phone verification required' });
    const win = qrWindow();
    return {
      payload: signQrToken(req.user!.id, win, secret),
      secondsRemaining: QR_RULES.rotationSeconds - (Math.floor(Date.now() / 1000) % QR_RULES.rotationSeconds),
    };
  });

  app.post('/me/location-ping', {
    preHandler: app.authenticate,
    schema: { body: z.object({
      lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180),
      accuracyM: z.number().min(0).max(5000).default(50), purpose: z.literal('qr'),
    }) },
  }, async (req) => {
    const { lat, lng, accuracyM, purpose } = req.body as { lat: number; lng: number; accuracyM: number; purpose: 'qr' };
    await storeLocationPing(app.redis!, req.user!.id, lat, lng, accuracyM);
    return { ok: true, purpose };
  });
}
