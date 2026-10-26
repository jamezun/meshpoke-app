/**
 * GET /me/caps — plan + per-cap {limit, used}. Usage sources:
 *  activeEventSpots: spots hosted by user in forming|confirmed
 *  chatRooms: room_members active (room not decayed)
 *  weeklyPokes: poke_balances.weekly_used (Monday HKT reset job zeroes it)
 *  others: 0 until their features land (crews T5, merchant spots T6)
 */
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { getPlan, getCaps, type CapType } from '../entitlements.js';

export function registerCaps(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);

  app.get('/me/caps', { preHandler: [app.authenticate] }, async (req) => {
    if (!req.user!.onboarded) {
      return { plan: 'free', caps: buildCaps('free', {}) };
    }
    const userId = req.user!.id;
    const plan = await getPlan(dbUrl, userId);

    const usage = await db.execute(sql`
      SELECT
        (SELECT count(*) FROM spots s
          JOIN spot_members sm ON sm.spot_id = s.id AND sm.user_id = ${userId} AND sm.role = 'host'
          WHERE s.state IN ('forming','confirmed'))::int AS active_event_spots,
        (SELECT count(*) FROM room_members rm
          JOIN rooms r ON r.id = rm.room_id
          WHERE rm.user_id = ${userId}
            AND rm.left_at IS NULL
            AND (r.decay_at IS NULL OR r.decay_at > now()))::int AS chat_rooms,
        COALESCE((SELECT pb.weekly_used FROM poke_balances pb WHERE pb.user_id = ${userId}), 0)::int AS weekly_pokes_used
    `);
    const u = (usage as unknown as { rows: { active_event_spots: number; chat_rooms: number; weekly_pokes_used: number }[] }).rows[0];

    const used: Partial<Record<CapType, number>> = {
      activeEventSpots: u.active_event_spots,
      chatRooms: u.chat_rooms,
      weeklyPokes: u.weekly_pokes_used,
    };
    return { plan, caps: buildCaps(plan, used) };
  });
}

function buildCaps(plan: 'free' | 'plus' | 'pro', used: Partial<Record<CapType, number>>) {
  const caps = getCaps(plan);
  const out: Record<string, { limit: number | null; used: number }> = {};
  for (const [k, v] of Object.entries(caps) as [CapType, number][]) {
    out[k] = { limit: Number.isFinite(v) ? v : null, used: used[k] ?? 0 }; // ∞ → null in JSON
  }
  return out;
}
