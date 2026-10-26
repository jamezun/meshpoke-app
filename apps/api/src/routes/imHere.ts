import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { GEO_RULES } from '@meshpoke/shared';

/** T10.1 "I'm here" GPS check-in — live spots only, ~100m + accuracy overlap, coords never stored. */
export function registerImHere(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);
  const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

  app.post<{ Params: { id: string }; Body: unknown }>(
    '/spots/:id/im-here',
    { preHandler: [app.authenticate, app.requirePhoneVerified] },
    async (req, reply) => {
      const userId = req.user!.id;
      const b = req.body as { lat?: number; lng?: number; accuracy_m?: number };
      const lat = Number(b?.lat);
      const lng = Number(b?.lng);
      const acc = Number.isFinite(Number(b?.accuracy_m)) ? Number(b!.accuracy_m) : 0;
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return reply.code(422).send({ problem: { title: 'Invalid coordinates', status: 422 } });
      }
      if (acc < 0 || acc > 500) {
        return reply.code(422).send({ problem: { title: 'Accuracy out of range (0–500 m)', status: 422 } });
      }

      const spot = rows(await db.execute(sql`
        select s.id, s.state, s.venue_id,
               ST_X(v.location::geometry) as venue_lng, ST_Y(v.location::geometry) as venue_lat
          from spots s join venues v on v.id = s.venue_id
         where s.id = ${req.params.id}::uuid`));
      if (spot.length === 0) return reply.code(404).send({ problem: { title: 'Spot or venue not found', status: 404 } });
      const s = spot[0];
      if (s.state !== 'live') {
        return reply.code(422).send({ problem: { title: 'Spot is not live', status: 422 } });
      }

      // active member only
      const member = rows(await db.execute(sql`
        select 1 from spot_members
         where spot_id = ${s.id}::uuid and user_id = ${userId} and state = 'active' and role in ('host','member')`));
      if (member.length === 0) return reply.code(403).send({ problem: { title: 'Active members only', status: 403 } });

      const overlap = rows(await db.execute(sql`
        select ST_DWithin(
          v.location,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat})::geography, 4326),
          ${GEO_RULES.gpsOverlapRadiusM + acc}) as within,
        ST_Distance(
          v.location,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat})::geography, 4326)) as dist_m
          from venues v where v.id = ${s.venue_id}::uuid`));
      const within = overlap[0].within === true;
      if (!within) {
        // distance sent for UX ("move 42 m closer"); point itself discarded
        return reply.code(422).send({
          problem: {
            title: 'Not close enough to the venue',
            status: 422,
            detail: `You are about ${Math.round(Number(overlap[0].dist_m))} m away — get within ${GEO_RULES.gpsOverlapRadiusM + acc} m`,
          },
        });
      }

      const res = rows(await db.execute(sql`
        insert into attendance (spot_id, user_id, status, verified_gps, im_here_at)
        values (${s.id}::uuid, ${userId}, 'attended', true, now())
        on conflict (spot_id, user_id) do update set verified_gps = true, im_here_at = now()
        returning status, verified_gps, im_here_at`));
      // coordinates never persisted — only the boolean
      return { status: res[0].status, verifiedGps: res[0].verified_gps, imHereAt: res[0].im_here_at };
    },
  );
}
