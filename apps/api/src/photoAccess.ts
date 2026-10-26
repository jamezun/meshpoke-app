/**
 * Photo visibility resolver (PRD §3.1 ladder):
 *   map        → nothing (faceless map, ALWAYS)
 *   spot_card  / queue / inbox → sketch only (no photos)
 *   chat_room  → sketch unless hide_photo_in_rooms → primary thumb only after mutual... no:
 *                chat room members see PRIMARY thumb (they chose to join the same room)
 *                unless subject set hide_photo_in_rooms
 *   event_room → members of same event: primary photo (real group forming)
 *   event_done → both attended (verified) → full profile incl. all photos
 *   profile    → connected (mutual poke) → full; else sketch
 * Blocks override everything: viewer blocked subject (or was blocked) → 404-ish minimal.
 */
import { and, eq, or } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { getDb } from './db/client.js';
import { profiles } from './db/schema/core.js';
import { connections } from './db/schema/spots.js';
import { blocks } from './db/schema/platform.js';

export type ViewContext = 'map' | 'spot_card' | 'queue' | 'inbox' | 'chat_room' | 'event_room' | 'event_done' | 'profile';

export type PhotoAccess =
  | { level: 'none' }        // map / blocked: sketch only, no photos
  | { level: 'sketch' }      // no photos at all
  | { level: 'primary' }     // first photo (thumb+full) only
  | { level: 'full' };       // all photos + full profile fields

export async function resolveProfileView(
  dbUrl: string,
  viewerId: string,
  subjectId: string,
  context: ViewContext,
  contextId?: string,
): Promise<PhotoAccess> {
  const db = getDb(dbUrl);

  if (viewerId === subjectId) return { level: 'full' };

  // blocks both directions → nothing (as if profile barely exists)
  const blocked = await db.select({ blocker: blocks.blockerId }).from(blocks)
    .where(or(
      and(eq(blocks.blockerId, viewerId), eq(blocks.blockedId, subjectId)),
      and(eq(blocks.blockerId, subjectId), eq(blocks.blockedId, viewerId)),
    )).limit(1);
  if (blocked.length > 0) return { level: 'none' };

  const conn = await db.select({ id: connections.id }).from(connections)
    .where(and(
      or(
        and(eq(connections.userA, viewerId), eq(connections.userB, subjectId)),
        and(eq(connections.userA, subjectId), eq(connections.userB, viewerId)),
      ),
      eq(connections.active, true),
    )).limit(1);
  const connected = conn.length > 0;

  switch (context) {
    case 'map':
      return { level: 'none' };
    case 'spot_card':
    case 'queue':
    case 'inbox':
      return { level: 'sketch' };
    case 'chat_room': {
      if (connected) return { level: 'full' };
      const [p] = await db.select({ hide: profiles.hidePhotoInRooms }).from(profiles).where(eq(profiles.userId, subjectId));
      return p?.hide ? { level: 'sketch' } : { level: 'primary' };
    }
    case 'event_room':
      return connected ? { level: 'full' } : { level: 'primary' };
    case 'event_done': {
      // same event, both attended (verified check-in) → full
      if (!contextId) return { level: 'sketch' };
      const rows = await db.execute(sql`
        SELECT count(*)::int AS n FROM attendance a
        JOIN attendance b ON a.spot_id = b.spot_id
        WHERE a.spot_id = ${contextId}
          AND a.user_id = ${viewerId} AND a.status = 'attended'
          AND b.user_id = ${subjectId} AND b.status = 'attended'`);
      const n = (rows as unknown as { rows: { n: number }[] }).rows[0].n;
      return n > 0 ? { level: 'full' } : { level: 'primary' };
    }
    case 'profile':
      return connected ? { level: 'full' } : { level: 'sketch' };
  }
}
