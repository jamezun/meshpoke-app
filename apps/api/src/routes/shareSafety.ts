import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getDb } from '../db/client.js';
import { SPOT_TEMPLATES } from '@meshpoke/shared';

/** T13.3 share-my-spot (signed public link, expires 2h after end) + private post-spot safety ratings. */

function shareSig(spotId: string, secret: string): string {
  return createHmac('sha256', secret).update(`share:${spotId}`).digest('base64url').slice(0, 22);
}

function verifySig(spotId: string, sig: string, secret: string): boolean {
  const expect = Buffer.from(shareSig(spotId, secret));
  const got = Buffer.from(sig);
  return expect.length === got.length && timingSafeEqual(expect, got);
}

export function registerShareSafety(app: FastifyInstance, dbUrl: string, hmacSecret: string): void {
  const db = getDb(dbUrl);
  const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

  // member generates a share link for their spot (privacy-safe: venue, time, count only)
  app.post<{ Params: { id: string } }>('/spots/:id/share-my-spot', {
    preHandler: app.authenticate,
    schema: { params: z.object({ id: z.string().uuid() }) },
  }, async (req, reply) => {
    const me = req.user!.id;
    const spot = rows(await db.execute(sql`
      select s.id, s.state from spots s
       where s.id = ${req.params.id}::uuid
         and exists (select 1 from spot_members m where m.spot_id = s.id and m.user_id = ${me}::uuid and m.state = 'active')`));
    if (spot.length === 0) return reply.code(404).send({ problem: { title: 'Spot not found', status: 404 } });
    return { url: `/share/${spot[0].id}?sig=${shareSig(spot[0].id as string, hmacSecret)}` };
  });

  // public (no auth): verify sig + expiry; expose venue name, time, attendee count only
  app.get('/public/spot-share', {
    schema: { querystring: z.object({ spot: z.string().uuid(), sig: z.string().min(10) }) },
  }, async (req, reply) => {
    const { spot: spotId, sig } = req.query as { spot: string; sig: string };
    if (!verifySig(spotId, sig, hmacSecret)) {
      return reply.code(403).send({ problem: { title: 'Invalid share link', status: 403 } });
    }
    const spot = rows(await db.execute(sql`
      select s.starts_at, s.state::text as state, s.template::text as template,
             v.display_name as venue
        from spots s left join venues v on v.id = s.venue_id
       where s.id = ${spotId}::uuid`));
    if (spot.length === 0) return reply.code(404).send({ problem: { title: 'Not found', status: 404 } });

    const tmpl = (SPOT_TEMPLATES as Record<string, { defaultDurationHours: number }>)[spot[0].template as string];
    const startsAt = spot[0].starts_at as string | null;
    const endAt = startsAt
      ? new Date(new Date(startsAt).getTime() + ((tmpl?.defaultDurationHours ?? 2) + 2) * 3600_000)
      : null;
    if (!endAt || Date.now() > endAt.getTime()) {
      return reply.code(410).send({ problem: { title: 'Share link expired', status: 410 } });
    }
    const n = rows(await db.execute(sql`
      select count(*)::int as n from spot_members
       where spot_id = ${spotId}::uuid and state = 'active' and role in ('host','member')`));
    return { venue: spot[0].venue, startsAt, attendeeCount: n[0].n };
  });

  // private safety rating after a spot (1–5 + flag) — attendees only, once per rated user
  app.post<{ Params: { id: string } }>('/spots/:id/safety-rating', {
    preHandler: app.authenticate,
    schema: { params: z.object({ id: z.string().uuid() }),
      body: z.object({ ratedUserId: z.string().uuid(), rating: z.number().int().min(1).max(5), flag: z.boolean().optional() }) },
  }, async (req, reply) => {
    const me = req.user!.id;
    const b = req.body as { ratedUserId: string; rating: number; flag?: boolean };
    if (b.ratedUserId === me) return reply.code(422).send({ problem: { title: 'Cannot rate yourself', status: 422 } });

    const att = rows(await db.execute(sql`
      select 1 from attendance
       where spot_id = ${req.params.id}::uuid and user_id = ${me}::uuid and status in ('attended','forgiven')`));
    if (att.length === 0) return reply.code(403).send({ problem: { title: 'Attendees only', status: 403 } });

    const targetAttended = rows(await db.execute(sql`
      select 1 from attendance
       where spot_id = ${req.params.id}::uuid and user_id = ${b.ratedUserId}::uuid and status in ('attended','forgiven')`));
    if (targetAttended.length === 0) return reply.code(422).send({ problem: { title: 'Did not attend this spot', status: 422 } });

    const dup = rows(await db.execute(sql`
      select 1 from safety_ratings where spot_id = ${req.params.id}::uuid and rater_id = ${me}::uuid and rated_user_id = ${b.ratedUserId}::uuid`));
    if (dup.length > 0) return reply.code(409).send({ problem: { title: 'Already rated', status: 409 } });

    await db.execute(sql`
      insert into safety_ratings (spot_id, rater_id, rated_user_id, rating, flag)
      values (${req.params.id}::uuid, ${me}::uuid, ${b.ratedUserId}::uuid, ${b.rating}, ${b.flag === true})`);

    // flags feed moderation: 2 distinct flags on a user across spots → auto-report for review
    if (b.flag === true) {
      await db.execute(sql`
        insert into reports (reporter_id, target_type, target_id, reason)
        values (${me}::uuid, 'user', ${b.ratedUserId}::uuid, 'safety flag (auto-attached to rating)')
        on conflict do nothing`);
    }
    return reply.code(201).send({ status: 'ok' });
  });
}
