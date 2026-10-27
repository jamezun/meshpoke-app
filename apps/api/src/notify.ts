import type { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import { getDb } from './db/client.js';
import { isQuietHoursHKT } from '@meshpoke/shared/time';

/**
 * T14.1+T14.2 activity feed + push dispatch.
 * notify() writes activity_items always; push is queued as a lightweight
 * pending row on push_tokens owners (dispatcher runs in-process, FCM-ready).
 * ponytail: single-user-per-process push loop; move to a queue when >10k MAU.
 */

export type NotifyCategory = 'pokes' | 'spots' | 'crews' | 'moderation' | 'promo' | 'proximity';

// logical category → activity_items.category enum
const DB_CATEGORY: Record<NotifyCategory, 'social' | 'spots' | 'venue' | 'promo' | 'proximity' | 'system'> = {
  pokes: 'social', crews: 'social', moderation: 'system',
  spots: 'spots', promo: 'promo', proximity: 'proximity',
};

const QUIET_DEFER_MINUTES = 8 * 60; // 23:00→08:00

export async function notify(
  dbUrl: string,
  userId: string,
  category: NotifyCategory,
  type: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  const db = getDb(dbUrl);
  await db.execute(sql`
    insert into activity_items (user_id, category, type, payload)
    values (${userId}::uuid, ${DB_CATEGORY[category]}, ${type}, ${JSON.stringify(payload)}::jsonb)`);

  // push side: respect category opt-outs (promo/proximity need explicit consent;
  // others on unless the user muted the category in prefs)
  if (category === 'promo' || category === 'proximity') {
    const ok = (db.execute(sql`
      select 1 from notification_prefs where user_id = ${userId}::uuid
        and ${category === 'promo' ? sql`promo_opt_in` : sql`proximity_opt_in`} = true`)
    ) as unknown as { rows: unknown[] };
    if ((await ok).rows.length === 0) return;
  } else {
    const muted = (db.execute(sql`
      select 1 from notification_prefs
       where user_id = ${userId}::uuid and categories::jsonb ? ${category}`)
    ) as unknown as { rows: unknown[] };
    if ((await muted).rows.length > 0) return;
  }

  await enqueuePush(dbUrl, userId, category, type, payload);
}

async function enqueuePush(
  dbUrl: string, userId: string, category: NotifyCategory, type: string, payload: Record<string, unknown>,
): Promise<void> {
  const db = getDb(dbUrl);
  // quiet hours 23:00–08:00 HKT: defer non-urgent (moderation is urgent)
  let sendAt = new Date();
  if (category !== 'moderation' && isQuietHoursHKT(new Date())) {
    sendAt = new Date(Date.now() + QUIET_DEFER_MINUTES * 60_000);
  }
  const rows = (db.execute(sql`
    select token, platform from push_tokens where user_id = ${userId}::uuid`
  )) as unknown as { rows: { token: string; platform: string }[] };
  const targets = (await rows).rows;
  if (targets.length === 0) return;

  // ponytail: dispatch is logging-only until FCM key exists; store send_at so a
  // real dispatcher can pick these up. Structure matches FCM message fields.
  for (const t of targets) {
    await db.execute(sql`
      insert into push_outbox (user_id, token, platform, category, type, payload, send_at, status)
      values (${userId}::uuid, ${t.token}, ${t.platform}, ${category}, ${type},
              ${JSON.stringify({ ...payload, collapse_key: category })}::jsonb, ${sendAt.toISOString()}, 'pending')`);
  }
}

/** Test seam: list pending outbox for a user (dispatcher entrypoint). */
export async function pendingFor(pool: Pool, userId: string): Promise<unknown[]> {
  const r = await pool.query(
    `select * from push_outbox where user_id = $1 order by send_at`, [userId]);
  return r.rows;
}
