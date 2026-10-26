/**
 * PUT /me/keywords — replace the whole set (client sends final list).
 * Caps enforced by DB trigger (T1.1): 10 total, 3 at level ≥ 8. We also pre-validate
 * for friendlier 422s; the trigger is the backstop.
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { keywords } from '../db/schema/core.js';
import { normalizeKeyword } from '@meshpoke/shared/keywords';

const kwOrWithLevel = z.union([
  z.string().trim().min(1).max(40),
  z.object({ keyword: z.string().trim().min(1).max(40), level: z.number().int().min(1).max(10) }),
]);

const putSchema = z.object({
  keywords: z.array(kwOrWithLevel).min(0).max(20), // pre-dedup headroom; real cap after normalize
});

export function registerKeywords(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);

  app.get('/me/keywords', { preHandler: [app.authenticate] }, async (req) => {
    const rows = await db
      .select({ keyword: keywords.keyword, level: keywords.level })
      .from(keywords)
      .where(eq(keywords.userId, req.user!.id));
    return { keywords: rows };
  });

  app.put('/me/keywords', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.user!.onboarded) return reply.code(403).send({ type: 'about:blank', title: 'Onboard first', status: 403 });
    const parsed = putSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(422).send({ type: 'about:blank', title: 'Unprocessable Entity', status: 422, errors: parsed.error.issues });
    }

    const norm = (k: string | { keyword: string; level: number }) =>
      typeof k === 'string' ? { keyword: normalizeKeyword(k), level: undefined as number | undefined } : { keyword: normalizeKeyword(k.keyword), level: k.level };
    // later entries win on level; dedupe on keyword
    const byKw = new Map<string, number | undefined>();
    for (const item of parsed.data.keywords.map(norm)) if (item.keyword.length > 0) byKw.set(item.keyword, item.level);
    const normalized = [...byKw.keys()];

    if (normalized.length > 10) {
      return reply.code(422).send({ type: 'about:blank', title: 'Too many keywords', status: 422, detail: 'Max 10 keywords (you have ' + normalized.length + ')' });
    }
    // replace set: simplest correct diff is delete-then-insert inside a tx,
    // preserving levels for keywords that survive.
    const existing = await db.select().from(keywords).where(eq(keywords.userId, req.user!.id));
    const levelByKw = new Map(existing.map((k) => [k.keyword, k.level]));

    try {
      await db.transaction(async (tx) => {
        await tx.delete(keywords).where(eq(keywords.userId, req.user!.id));
        if (normalized.length > 0) {
          await tx.insert(keywords).values(
            normalized.map((keyword) => ({ userId: req.user!.id, keyword, level: levelByKw.get(keyword) ?? 1 })),
          );
        }
      });
    } catch (e) {
      // DB trigger backstop (levels preserved from surviving keywords): friendlier 422
      const msg = String(e);
      if (msg.includes('keyword cap reached')) {
        return reply.code(422).send({ type: 'about:blank', title: 'Too many keywords', status: 422, detail: 'Max 10 keywords' });
      }
      if (msg.includes('level-8 keyword cap')) {
        return reply.code(422).send({ type: 'about:blank', title: 'Too many maxed keywords', status: 422, detail: 'Max 3 keywords at level 8+' });
      }
      throw e;
    }

    const rows = await db
      .select({ keyword: keywords.keyword, level: keywords.level })
      .from(keywords)
      .where(eq(keywords.userId, req.user!.id));
    return { keywords: rows };
  });
}
