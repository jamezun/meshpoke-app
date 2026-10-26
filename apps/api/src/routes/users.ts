/**
 * GET /users/:id?context=&contextId= — sketch / primary / full by photo ladder.
 * Photo URLs presigned on demand (10 min). Full profile incl. socials only at full level.
 */
import type { FastifyInstance } from 'fastify';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { users, profiles, keywords } from '../db/schema/core.js';
import { resolveProfileView, type ViewContext } from '../photoAccess.js';
import type { Storage } from '../storage.js';

const CONTEXTS: ViewContext[] = ['map', 'spot_card', 'queue', 'inbox', 'chat_room', 'event_room', 'event_done', 'profile'];

export function registerUsers(app: FastifyInstance, dbUrl: string, storage: Storage | null) {
  const db = getDb(dbUrl);

  app.get('/users/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const query = req.query as { context?: string; contextId?: string };
    const context = (CONTEXTS as string[]).includes(query.context ?? '') ? (query.context as ViewContext) : 'profile';

    const access = await resolveProfileView(dbUrl, req.user!.id, id, context, query.contextId);
    if (access.level === 'none') {
      return reply.code(404).send({ type: 'about:blank', title: 'Not Found', status: 404 });
    }

    const [u] = await db
      .select({ id: users.id, displayName: users.displayName, phoneVerified: sql<boolean>`${users.phoneVerifiedAt} IS NOT NULL` })
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    if (!u) return reply.code(404).send({ type: 'about:blank', title: 'Not Found', status: 404 });

    const [p] = await db.select().from(profiles).where(eq(profiles.userId, id));
    const kws = await db.select({ keyword: keywords.keyword, level: keywords.level }).from(keywords).where(eq(keywords.userId, id));

    // sketch — the always-visible layer
    const sketch: Record<string, unknown> = {
      id: u.id,
      display_name: u.displayName,
      phone_verified: u.phoneVerified,
      industry: p?.industry ?? null,
      role_oneliner: p?.roleOneliner ?? null,
      keywords: kws,
    };

    if (access.level === 'sketch') return { level: 'sketch', user: sketch };

    const photoSlots = Array.isArray(p?.photos) ? (p!.photos as { n: number; key: string; thumbKey: string }[]) : [];
    const url = async (key: string) => storage ? await storage.presignGet(key) : null;

    if (access.level === 'primary') {
      const primary = photoSlots[0];
      return {
        level: 'primary',
        user: {
          ...sketch,
          primary_photo: primary ? { url: await url(primary.key), thumb_url: await url(primary.thumbKey) } : null,
        },
      };
    }

    // full: everything incl. prompts + socials + all photos
    return {
      level: 'full',
      user: {
        ...sketch,
        role_oneliner: p?.roleOneliner ?? null,
        prompts: p?.prompts ?? null,
        socials: p?.socials ?? null,
        photos: await Promise.all(photoSlots.map(async (s) => ({ n: s.n, url: await url(s.key), thumb_url: await url(s.thumbKey) }))),
      },
    };
  });
}
