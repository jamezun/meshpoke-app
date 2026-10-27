/**
 * User-added venues + reports + saves + search (PRD §4.2, §12.2).
 * Phone-verified users may add venues; dedupe by normalised name within 50 m.
 */
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client.js';

const CATEGORIES = ['restaurant', 'cafe', 'bar', 'dessert', 'fast_food', 'convenience', 'gym', 'sports', 'park', 'library', 'coworking', 'other'] as const;

export function registerVenues(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);

  // ── GET /venues/:id — venue page payload (venue + ladder + my membership) (T20.7) ──
  app.get<{ Params: { id: string } }>('/venues/:id', { preHandler: [app.authenticate] }, async (req, reply) => {
    const id = req.params.id;
    const v = (await db.execute(sql`
      select v.id, v.display_name, v.category, v.address, v.claimed_by_merchant_id,
             coalesce(a.activity, 0) as activity_7d,
             (select count(*)::int from memberships m where m.venue_id = v.id and m.status = 'active' and m.kind = 'member') as member_count
        from venues v
        left join venue_activity_7d a on a.venue_id = v.id
       where v.id = ${id}::uuid and v.status <> 'closed'`)) as unknown as { rows: Record<string, unknown>[] };
    if (!v.rows[0]) return reply.code(404).send({ problem: { title: 'Venue not found', status: 404 } });
    const venue = v.rows[0];
    // claimed → include the public ladder
    let ladder: unknown[] = [];
    if (venue.claimed_by_merchant_id) {
      const l = (await db.execute(sql`
        select position, name, min_visits, min_months, discount_pct, perk_text
          from ladder_levels where venue_id = ${id}::uuid and effective_from <= now() order by position`)) as unknown as { rows: unknown[] };
      ladder = l.rows;
    }
    const mine = (await db.execute(sql`
      select status, kind, level_position, visits_count from memberships
       where venue_id = ${id}::uuid and user_id = ${req.user!.id}::uuid and status in ('active','waitlisted') limit 1`)) as unknown as { rows: Record<string, unknown>[] };
    return { venue: { ...venue, claimed: venue.claimed_by_merchant_id != null }, ladder, myMembership: mine.rows[0] ?? null };
  });

  const createVenue = z.object({
    name: z.string().min(1).max(120),
    category: z.enum(CATEGORIES),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    force: z.boolean().optional(),
  });

  app.post('/venues', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.user!.phoneVerified) {
      return reply.code(403).send({ type: 'about:blank', title: 'Phone verification required', status: 403 });
    }
    const parsed = createVenue.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(422).send({ type: 'about:blank', title: 'Invalid venue', status: 422, errors: parsed.error.issues });
    }
    const { name, category, lat, lng, force } = parsed.data;
    const norm = name.trim().toLowerCase();

    // dedupe: same normalised name within 50 m → require force
    const dupes = await db.execute(sql`
      SELECT id, display_name FROM venues
      WHERE lower(trim(display_name)) = ${norm}
        AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), 50)
        AND status = 'active'
      LIMIT 5`);
    const dups = (dupes as unknown as { rows: { id: string; display_name: string }[] }).rows;
    if (dups.length > 0 && !force) {
      return reply.code(409).send({ type: 'about:blank', title: 'Possible duplicates', status: 409, duplicates: dups });
    }

    const res = await db.execute(sql`
      INSERT INTO venues (source, display_name, category, location, status, created_by)
      VALUES ('user', ${name}, ${category}, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), 'active', ${req.user!.id}::uuid)
      RETURNING id, display_name`);
    const venue = (res as unknown as { rows: Record<string, unknown>[] }).rows[0];
    return reply.code(201).send({ venue });
  });

  app.post('/venues/:id/report', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({ reason: z.enum(['wrong_pin', 'closed', 'duplicate', 'other']) }).safeParse(req.body);
    if (!body.success) return reply.code(422).send({ type: 'about:blank', title: 'Invalid reason', status: 422 });

    // one report per user per venue
    const exists = await db.execute(sql`
      INSERT INTO venue_reports (venue_id, reporter_id, kind, status)
      VALUES (${id}::uuid, ${req.user!.id}::uuid, ${body.data.reason}, 'open')
      ON CONFLICT (venue_id, reporter_id) DO NOTHING
      RETURNING id`);
    if ((exists as unknown as { rows: unknown[] }).rows.length === 0) {
      return reply.code(200).send({ already_reported: true });
    }

    // 3 distinct reports → escalate to admin queue
    const count = await db.execute(sql`
      SELECT count(*)::int AS n FROM venue_reports
      WHERE venue_id = ${id}::uuid AND status = 'open'`);
    const n = (count as unknown as { rows: { n: number }[] }).rows[0].n;
    if (n >= 3) {
      await db.execute(sql`UPDATE venue_reports SET status = 'escalated' WHERE venue_id = ${id}::uuid AND status = 'open'`);
    }
    return reply.code(201).send({ escalated: n >= 3 });
  });

  app.post('/venues/:id/save', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const r = await db.execute(sql`
      INSERT INTO saved_venues (venue_id, user_id) VALUES (${id}::uuid, ${req.user!.id}::uuid)
      ON CONFLICT DO NOTHING RETURNING venue_id`);
    return reply.code(201).send({ saved: (r as unknown as { rows: unknown[] }).rows.length > 0 });
  });

  app.delete('/venues/:id/save', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await db.execute(sql`DELETE FROM saved_venues WHERE venue_id = ${id}::uuid AND user_id = ${req.user!.id}::uuid`);
    return reply.code(200).send({ saved: false });
  });

  app.get('/venues/search', { preHandler: [app.authenticate] }, async (req) => {
    const q = req.query as { q?: string; district?: string };
    if (!q.q || q.q.trim().length < 2) return { venues: [] };

    // trigram similarity over EN+ZH names, optional district scope — never global by name alone when district given
    const res = await db.execute(sql`
      SELECT v.id, v.display_name, v.category, v.fehd_district,
             ST_X(v.location::geometry) AS lng, ST_Y(v.location::geometry) AS lat,
             GREATEST(
               similarity(coalesce(v.display_name,''), ${q.q}),
               similarity(coalesce(v.legal_name,''), ${q.q})) AS score
      FROM venues v
      WHERE v.status = 'active'
        ${q.district ? sql`AND v.district_id = ${q.district}::uuid` : sql``}
        AND (
          coalesce(v.display_name,'') % ${q.q}
          OR coalesce(v.legal_name,'') % ${q.q}
          OR v.display_name ILIKE ${'%' + q.q + '%'})
      ORDER BY score DESC
      LIMIT 20`);
    return { venues: (res as unknown as { rows: Record<string, unknown>[] }).rows };
  });
}
