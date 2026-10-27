import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { notify } from '../notify.js';
import { Redis } from 'ioredis';

/** audience: active members + savers of the venue, excluding merchant-muted */
async function venueAudience(db: ReturnType<typeof getDb>, venueId: string): Promise<{ id: string }[]> {
  const r = (await db.execute(sql`
    select distinct u.id from users u
     where u.deleted_at is null
       and (exists (select 1 from memberships m
                     where m.user_id = u.id and m.venue_id = ${venueId}::uuid and m.status = 'active')
         or exists (select 1 from saved_venues s
                     where s.user_id = u.id and s.venue_id = ${venueId}::uuid))
       and not exists (select 1 from merchant_mutes mm
                        where mm.user_id = u.id and mm.merchant_id = ${venueId}::uuid)`)) as unknown as { rows: { id: string }[] };
  return r.rows;
}

/**
 * T21.4 + T21.5: merchant promotional reach.
 * - sponsored drops: promo push (opted-in only, per-district/day cap) — amplification hook below
 * - promo blast: members + savers of a venue, 1/7d per venue, consent-gated by notify(), per-merchant mute respected
 * Map prominence NEVER affected (marker size = verified check-ins only).
 */
export function registerPromo(app: FastifyInstance, dbUrl: string, redisUrl: string): void {
  const db = getDb(dbUrl);
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  app.addHook('onClose', async () => { redis.disconnect(); });

  /** T21.5: merchant "offer to members/savers" */
  app.post('/merchant/promo', { preHandler: [app.authenticate] }, async (req, reply) => {
    if (!req.user) return reply.code(401).send({ title: 'Unauthorized' });
    const { text, venueId } = req.body as { text?: string; venueId?: string };
    if (!text || text.length < 3 || text.length > 200) return reply.code(422).send({ title: 'Text 3–200 chars' });
    const mer = (await db.execute(sql`
      select m.venue_id from merchant_accounts m
       where m.owner_user_id = ${req.user.id}::uuid and m.claim_status = 'approved'`)) as unknown as { rows: { venue_id: string }[] };
    const vid = venueId ?? mer.rows[0]?.venue_id;
    if (!vid || !mer.rows.some((r) => r.venue_id === vid)) return reply.code(404).send({ title: 'No claimed venue' });

    await redis.connect().catch(() => {});
    const k = `promo:venue:${vid}`;
    const ok = await redis.set(k, '1', 'EX', 7 * 86400, 'NX').catch(() => null);
    if (ok === null) return reply.code(429).send({ title: 'One promo per venue per 7 days' });

    const users = await venueAudience(db, vid);
    for (const u of users) {
      // notify() drops non-opted-in users itself (promo consent gate)
      await notify(dbUrl, u.id, 'promo', 'venue_offer', { venueId: vid, text }).catch(() => {});
    }
    return { queued: users.length, consentGated: true };
  });
}

/**
 * T21.4: sponsored-drop amplification — call after creating a sponsored drop.
 * Per-district per-day cap (1) via Redis; opted-out never receive (notify promo
 * gate); marker size untouched.
 */
export async function amplifySponsoredDrop(
  dbUrl: string, redisUrl: string, dropId: string, venueId: string, title: string,
): Promise<{ sent: number; capped: boolean }> {
  const db = getDb(dbUrl);
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  await redis.connect().catch(() => {});

  const district = (await db.execute(sql`
    select district_id from venues where id = ${venueId}::uuid`)) as unknown as { rows: { district_id: string }[] };
  const did = district.rows[0]?.district_id;
  if (!did) return { sent: 0, capped: false };

  const k = `promo:district:${did}:${new Date().toISOString().slice(0, 10)}`;
  const n = await redis.incr(k).catch(() => 1);
  if (n === 1) await redis.expire(k, 86400).catch(() => {});
  // ponytail: 1 sponsored amplification per district per day; raise if districts complain of noise
  if (n > 1) return { sent: 0, capped: true };

  const users = await venueAudience(db, venueId);
  for (const u of users) {
    await notify(dbUrl, u.id, 'promo', 'sponsored_drop', { dropId, venueId, title, sponsored: true }).catch(() => {});
  }
  return { sent: users.length, capped: false };
}
