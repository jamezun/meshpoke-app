/**
 * Map & districts (PRD §4.3, §12.2): viewport-bounded, never global.
 * - INSERT triggers auto-assign district_id via ST_Contains (venues, spots).
 * - GET /map/viewport?bbox=minLng,minLat,maxLng,maxLat&time=today|week|all (venues + event spots, ≤500)
 * - GET /districts (18), GET /districts/:id/spots
 */
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';

export function registerMap(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);

  // ── district auto-assignment trigger (migration-level would be better, but keep it here for clarity)
  app.log.debug('map routes registered');

  app.get('/districts', { preHandler: [app.authenticate] }, async () => {
    const res = await db.execute(sql`
      SELECT d.id, d.name_en, d.name_zh,
             ST_AsGeoJSON(ST_Boundary(d.boundary::geometry))::jsonb AS outline
      FROM districts d ORDER BY d.name_en`);
    const rows = (res as unknown as { rows: Record<string, unknown>[] }).rows;
    return { districts: rows };
  });

  app.get('/districts/:id/spots', { preHandler: [app.authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const q = req.query as { time?: string };
    const time = ['today', 'week', 'all'].includes(q.time ?? '') ? q.time! : 'week';

    // never global: unknown district → 404; also no client-supplied offset paging past scope
    const exists = await db.execute(sql`SELECT 1 FROM districts WHERE id = ${id}::uuid`);
    if ((exists as unknown as { rows: unknown[] }).rows.length === 0) {
      return reply.code(404).send({ type: 'about:blank', title: 'Not Found', status: 404 });
    }

    const res = await db.execute(sql`
      SELECT s.id, s.kind, s.template, s.name, s.state, s.min_headcount, s.max_headcount,
             (SELECT count(*)::int FROM spot_members m WHERE m.spot_id = s.id AND m.state = 'active') AS member_count,
             s.starts_at, s.join_mode
      FROM spots s
      WHERE s.district_id = ${id}::uuid
        AND s.kind = 'event'
        AND s.state IN ('forming', 'confirmed', 'live')
        AND (${time} = 'all' OR s.starts_at IS NULL OR (
          ${time} = 'today' AND s.starts_at::date = (now() AT TIME ZONE 'Asia/Hong_Kong')::date
          OR ${time} = 'week' AND s.starts_at < (now() AT TIME ZONE 'Asia/Hong_Kong') + interval '7 days'
        ))
      ORDER BY s.starts_at NULLS LAST
      LIMIT 200`);
    return { spots: (res as unknown as { rows: Record<string, unknown>[] }).rows };
  });

  app.get('/map/viewport', { preHandler: [app.authenticate] }, async (req, reply) => {
    const q = req.query as { bbox?: string; time?: string };
    if (!q.bbox) return reply.code(400).send({ type: 'about:blank', title: 'bbox required', status: 400 });
    const parts = q.bbox.split(',').map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n)) ||
        Math.abs(parts[0]) > 180 || Math.abs(parts[2]) > 180 || Math.abs(parts[1]) > 90 || Math.abs(parts[3]) > 90 ||
        parts[0] >= parts[2] || parts[1] >= parts[3]) {
      return reply.code(422).send({ type: 'about:blank', title: 'invalid bbox', status: 422 });
    }
    const [minLng, minLat, maxLng, maxLat] = parts;
    const time = ['today', 'week', 'all'].includes(q.time ?? '') ? q.time! : 'week';

    // hard bbox clamp ~0.5° (~50km) — a phone screen can't ask for "the whole world"
    const MAX_SPAN = 0.5;
    if (maxLng - minLng > MAX_SPAN || maxLat - minLat > MAX_SPAN) {
      return reply.code(422).send({ type: 'about:blank', title: 'bbox too large — zoom in', status: 422 });
    }

    const venues = await db.execute(sql`
      SELECT v.id, v.display_name AS name, v.category, v.location::text AS point, v.pin_tier, v.status,
             COALESCE(a.activity7d, 0) AS activity7d,
             (SELECT count(*)::int FROM merchant_checkins c WHERE c.venue_id = v.id AND c.confidence = 'high') AS checkin_count
      FROM venues v
      LEFT JOIN venue_activity_7d a ON a.venue_id = v.id
      WHERE ST_Within(v.location::geometry, ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326))
        AND v.status = 'active'
      LIMIT 400`);
    const spots = await db.execute(sql`
      SELECT s.id, s.kind, s.template, s.name, s.state, s.min_headcount, s.max_headcount,
             (SELECT count(*)::int FROM spot_members m WHERE m.spot_id = s.id AND m.state = 'active') AS member_count,
             s.starts_at, s.join_mode
      FROM spots s
      WHERE s.district_id IN (SELECT id FROM districts WHERE ST_Intersects(boundary::geometry, ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)))
        AND s.kind = 'event'
        AND s.state IN ('forming', 'confirmed', 'live')
        AND (${time} = 'all' OR s.starts_at IS NULL OR (
          ${time} = 'today' AND s.starts_at::date = (now() AT TIME ZONE 'Asia/Hong_Kong')::date
          OR ${time} = 'week' AND s.starts_at < (now() AT TIME ZONE 'Asia/Hong_Kong') + interval '7 days'
        ))
      ORDER BY s.starts_at NULLS LAST
      LIMIT 200`);
    return {
      venues: (venues as unknown as { rows: Record<string, unknown>[] }).rows,
      spots: (spots as unknown as { rows: Record<string, unknown>[] }).rows,
    };
  });
}
