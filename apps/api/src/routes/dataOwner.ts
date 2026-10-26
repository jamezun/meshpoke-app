/**
 * Data-ownership endpoints: DELETE /me (soft) + GET /me/export (PDPO data portability).
 * Anonymisation: scripts/anonymize-deleted.ts (run daily via cron/Dokploy scheduler).
 */
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { users, profiles, keywords } from '../db/schema/core.js';
import { pokes } from '../db/schema/spots.js';
import { messages } from '../db/schema/spots.js';
import { memberships, subscriptions } from '../db/schema/merchant.js';
import type { GoTrueClient } from '../gotrue.js';

export function registerDataOwner(app: FastifyInstance, dbUrl: string, redis: { del(key: string): Promise<unknown> }, gotrue: GoTrueClient) {
  const db = getDb(dbUrl);

  app.delete('/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.user!.onboarded) return reply.code(404).send({ type: 'about:blank', title: 'Not Found', status: 404 });
    await db.update(users).set({ deletedAt: sql`now()` }).where(eq(users.id, req.user!.id));
    await Promise.all([
      gotrue.adminSignOutAll(req.user!.id), // revoke all sessions
      redis.del(`auth:user:${req.user!.id}`), // kill cached identity
    ]);
    return { deleted: true };
  });

  app.get('/me/export', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.user!.onboarded) return reply.code(404).send({ type: 'about:blank', title: 'Not Found', status: 404 });
    const id = req.user!.id;

    const [u] = await db.select().from(users).where(eq(users.id, id));
    const [p] = await db.select().from(profiles).where(eq(profiles.userId, id));
    const kw = await db.select({ keyword: keywords.keyword, level: keywords.level }).from(keywords).where(eq(keywords.userId, id));
    const sentPokes = await db.select().from(pokes).where(eq(pokes.fromUser, id));
    const authored = await db.select().from(messages).where(eq(messages.userId, id));
    const myMemberships = await db.select().from(memberships).where(eq(memberships.userId, id));
    const mySubs = await db.select().from(subscriptions).where(eq(subscriptions.userId, id));

    return {
      exported_at: new Date().toISOString(),
      account: { ...u, phoneE164: '<encrypted>', phoneHash: undefined }, // never echo PII ciphertext
      profile: p ?? null,
      keywords: kw,
      pokes_sent: sentPokes.map((x) => ({ to: x.toUser, note: x.note, status: x.status, source: x.source, createdAt: x.createdAt })),
      messages_authored: authored.map((x) => ({ roomId: x.roomId, body: x.body, createdAt: x.createdAt })),
      memberships: myMemberships,
      subscriptions: mySubs,
    };
  });
}
