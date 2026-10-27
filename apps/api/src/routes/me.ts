/**
 * Onboarding + /me. Auth required; GoTrue sub = future users.id.
 * Age >= 18 by HKT calendar (not 18*365.25 days).
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { getDb, withTx, type Tx } from '../db/client.js';
import { capture } from '../analytics.js';

import { profiles, users } from '../db/schema/core.js';
import { eq } from 'drizzle-orm';

const dobSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date_of_birth must be YYYY-MM-DD');

function ageAtLeast18Hkt(dob: string, now = new Date()): boolean {
  // calendar-date comparison, no Duration math: dob's 18th birthday must be ≤ today (HKT)
  const [y, m, d] = dob.split('-').map(Number);
  const bday18 = `${y + 18}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const hktNow = new Date(now.getTime() + 8 * 3600 * 1000); // UTC+8 fixed
  const todayHkt = hktNow.toISOString().slice(0, 10);
  return bday18 <= todayHkt;
}

const onboardSchema = z.object({
  date_of_birth: dobSchema,
  referral_code: z.string().trim().min(5).max(12).optional(),
});

const patchMeSchema = z.object({
  display_name: z.string().trim().min(1).max(40).optional(),
  industry: z.enum(['finance', 'tech', 'design', 'media', 'medical', 'legal', 'education', 'hospitality', 'student', 'other']).optional(),
  role_oneliner: z.string().trim().max(40).optional(),
  hide_photo_in_rooms: z.boolean().optional(),
});

function referralCode(): string {
  // 8 chars A-Z2-9 (no 0/O/1/I) — collision handled by unique index + retry
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MP';
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

async function insertUserWithRetry(tx: Tx, row: { id: string; email: string; authProvider: string; displayName: string; dob: string; referredBy: string | null }): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = referralCode();
    try {
      await tx.insert(users).values({
        id: row.id,
        email: row.email,
        authProvider: 'email' as never,
        displayName: row.displayName,
        dateOfBirth: row.dob,
        referralCode: code,
        referredBy: row.referredBy,
      });
      return code;
    } catch (e) {
      const msg = String(e);
      if (msg.includes('users_referral_code_idx') && attempt < 4) continue;
      throw e;
    }
  }
  throw new Error('referral code collision loop');
}

export function registerMe(app: FastifyInstance, dbUrl: string, redis: { del(key: string): Promise<unknown> }) {
  const db = getDb(dbUrl);

  app.post('/me/onboard', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = onboardSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(422).send({ type: 'about:blank', title: 'Unprocessable Entity', status: 422, errors: parsed.error.issues });
    }
    const { date_of_birth: dob, referral_code: refCode } = parsed.data;

    // idempotent: already onboarded? (also handles the insert race below)
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (existing.length > 0) return reply.code(200).send({ status: 'already-onboarded' });

    if (!ageAtLeast18Hkt(dob)) {
      return reply.code(422).send({ type: 'about:blank', title: 'Must be 18+', status: 422, detail: 'You must be at least 18 to use MeshPoke.' });
    }

    // referral: resolve referrer (and block self-referral)
    let referredBy: string | null = null;
    if (refCode && refCode !== 'ADMIN00001') {
      const referrer = await db.select({ id: users.id }).from(users).where(eq(users.referralCode, refCode)).limit(1);
      if (referrer.length > 0 && referrer[0].id !== req.user!.id) referredBy = referrer[0].id;
    }

    // GoTrue email: not in our users table (we don't store GoTrue emails here — email column required, use placeholder + auth provider)
    const email = `${req.user!.id}@gotrue.local`;
    try {
      await withTx(db, async (tx) => {
        const code = await insertUserWithRetry(tx, {
          id: req.user!.id, email, authProvider: 'email', displayName: 'New Poker', dob, referredBy,
        });
        await tx.insert(profiles).values({ userId: req.user!.id, industry: 'other' });
        return code;
      });
    } catch (e) {
      if (String(e).includes('users_pkey')) {
        await redis.del(`auth:user:${req.user!.id}`);
        return reply.code(200).send({ status: 'already-onboarded' });
      }
      throw e;
    }
    await redis.del(`auth:user:${req.user!.id}`); // kill cached onboarded:false
    capture('signed_up', req.user!.id, { referrer: !!refCode });
    return reply.code(201).send({ status: 'onboarded' });
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    const rows = await db.execute(sql`
      SELECT u.id, u.display_name, u.date_of_birth::text AS date_of_birth, u.referral_code, u.phone_verified_at IS NOT NULL AS phone_verified,
             p.industry, p.role_oneliner, p.hide_photo_in_rooms
      FROM users u LEFT JOIN profiles p ON p.user_id = u.id
      WHERE u.id = ${req.user!.id}`);
    const row = (rows as unknown as { rows: Record<string, unknown>[] }).rows[0];
    return row ?? {};
  });

  app.patch('/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parsed = patchMeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(422).send({ type: 'about:blank', title: 'Unprocessable Entity', status: 422, errors: parsed.error.issues });
    }
    const { display_name, industry, role_oneliner, hide_photo_in_rooms } = parsed.data;
    const updated = await withTx(db, async (tx) => {
      if (display_name !== undefined || industry !== undefined || hide_photo_in_rooms !== undefined) {
        await tx.update(users).set({ ...(display_name !== undefined ? { displayName: display_name } : {}) }).where(eq(users.id, req.user!.id));
        await tx.update(profiles).set({
          ...(industry !== undefined ? { industry } : {}),
          ...(role_oneliner !== undefined ? { roleOneliner: role_oneliner } : {}),
          ...(hide_photo_in_rooms !== undefined ? { hidePhotoInRooms: hide_photo_in_rooms } : {}),
        }).where(eq(profiles.userId, req.user!.id));
      }
      return true;
    });
    return { updated };
  });
}
