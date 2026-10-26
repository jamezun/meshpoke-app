import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

/**
 * T10.5 trust signals for sketches/queues/member lists (PRD §3.3).
 * FoF = subject shares an active connection with one of viewer's active
 * connections (degree 2). Computed on request.
 * ponytail: no Redis cache yet — per-request CTE is fine at HK-launch scale; cache when queue p95 > 100ms.
 */
export function fofExists(viewerId: string) {
  return sql`exists (
    select 1
      from connections cv
      join connections cu
        on (cu.user_a = cv.user_a and cu.user_b <> cv.user_a)
        or (cu.user_a = cv.user_b and cu.user_b <> cv.user_b)
        or (cu.user_b = cv.user_a and cu.user_a <> cv.user_a)
        or (cu.user_b = cv.user_b and cu.user_a <> cv.user_b)
     where cv.active and cu.active
       and (cv.user_a = ${viewerId}::uuid or cv.user_b = ${viewerId}::uuid)
       and (cu.user_a = u.id or cu.user_b = u.id)
  )`;
}

export function trustExpr(viewerId: string | null) {
  return sql`
    json_build_object(
      'memberSince', u.created_at,
      'spotsAttended', (
        select count(*)::int from attendance a
         where a.user_id = u.id and a.status in ('attended', 'forgiven') and a.finalized_at is not null
      ),
      'score', (select sc.score from showup_scores sc where sc.user_id = u.id),
      'provenState', coalesce((select sc.proven_state from showup_scores sc where sc.user_id = u.id), 'unproven'),
      'friendOfFriend', ${viewerId ? fofExists(viewerId) : sql`false`}
    ) as trust`;
}

export type Trust = {
  memberSince: string;
  spotsAttended: number;
  score: string | null;
  provenState: string;
  friendOfFriend: boolean;
};

export async function trustFor(db: NodePgDatabase, userId: string, viewerId: string | null): Promise<Trust> {
  const r = await db.execute(sql`
    select ${trustExpr(viewerId)} from users u where u.id = ${userId}::uuid`);
  const rows = (r as unknown as { rows: { trust: Trust }[] }).rows;
  return rows[0].trust;
}
