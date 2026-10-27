/**
 * Phone verification sync. Client-side flow:
 * 1. POST /me/phone/otp {phone} → API validates +852, rate-limits 3/h per user AND per IP, proxies to GoTrue
 * 2. user enters SMS code → GoTrue verify (client-direct)
 * 3. POST /me/phone/confirm → API reads phone from GoTrue admin, checks uniqueness by hash, stores encrypted
 */
import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { eq, and, ne, sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { referralOnPhoneVerified } from './referrals.js';
import { encryptPii, piiHash } from '../db/pii.js';
import { users } from '../db/schema/core.js';
import type { GoTrueClient } from '../gotrue.js';

const HK_PHONE = /^\+852\d{8}$/;
const phoneSchema = z.object({ phone: z.string().regex(HK_PHONE, 'phone must be +852XXXXXXXX') });

export function registerPhone(app: FastifyInstance, dbUrl: string, redis: Redis, gotrue: GoTrueClient) {
  const db = getDb(dbUrl);

  app.post('/me/phone/otp', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = phoneSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(422).send({ type: 'about:blank', title: 'Unprocessable Entity', status: 422, errors: parsed.error.issues });
    }
    if (!req.user!.onboarded) {
      return reply.code(403).send({ type: 'about:blank', title: 'Onboard first', status: 403 });
    }

    // 3/h per user; 10/h per IP (looser — HK offices NAT heavily; user bucket is the real guard)
    const [uHit, ipHit] = await Promise.all([
      redis.incr(`phone_otp:u:${req.user!.id}`),
      redis.incr(`phone_otp:ip:${req.ip}`),
    ]);
    if (uHit === 1) await redis.expire(`phone_otp:u:${req.user!.id}`, 3600);
    if (ipHit === 1) await redis.expire(`phone_otp:ip:${req.ip}`, 3600);
    if (uHit > 3 || ipHit > 10) {
      return reply.code(429).send({ type: 'about:blank', title: 'Too Many Requests', status: 429, detail: 'OTP limit: 3/hour per account' });
    }

    const res = await gotrue.sendOtp(parsed.data.phone);
    if (!res.ok) {
      return reply.code(502).send({ type: 'about:blank', title: 'SMS provider error', status: 502 });
    }
    return { sent: true };
  });

  app.post('/me/phone/confirm', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.user!.onboarded) {
      return reply.code(403).send({ type: 'about:blank', title: 'Onboard first', status: 403 });
    }
    const gotrueUser = await gotrue.adminGetUser(req.user!.id);
    const phone = gotrueUser?.phone;
    if (!gotrueUser || !gotrueUser.phone_confirmed_at || !phone) {
      return reply.code(409).send({ type: 'about:blank', title: 'Phone not verified yet', status: 409, detail: 'Complete the SMS code in the app first.' });
    }
    if (!HK_PHONE.test(phone)) {
      return reply.code(422).send({ type: 'about:blank', title: 'Only +852 numbers supported', status: 422 });
    }

    const hash = piiHash(phone);
    const dup = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.phoneHash, hash), ne(users.id, req.user!.id)))
      .limit(1);
    if (dup.length > 0) {
      return reply.code(409).send({ type: 'about:blank', title: 'Phone already registered', status: 409 });
    }

    await db
      .update(users)
      .set({ phoneE164: encryptPii(phone), phoneHash: hash, phoneVerifiedAt: sql`now()` })
      .where(eq(users.id, req.user!.id));
    await redis.del(`auth:user:${req.user!.id}`); // kill cached phoneVerified:false
    await referralOnPhoneVerified(db, req.user!.id);
    return { verified: true };
  });
}
