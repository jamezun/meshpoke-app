import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client.js';
import { verifyQrToken, markQrUsed, lastLocationPing } from './userQr.js';
import { onCheckin } from '../billing.js';

const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

/**
 * T15.2 merchant staff scan: QR → context resolution → merchant_checkins (+ T16.1 billing hook).
 */
export function registerScan(app: FastifyInstance, dbUrl: string, secret: string): void {
  const db = getDb(dbUrl);

  app.post('/merchant/scan', {
    preHandler: app.authenticate,
    schema: { body: z.object({
      qrPayload: z.string().min(10).max(500),
      context: z.enum(['drop', 'group_drop', 'member_visit']).optional(),
      dropId: z.string().uuid().optional(),
      spotId: z.string().uuid().optional(),
    }) },
  }, async (req, reply) => {
    const staffId = req.user!.id;
    const { qrPayload, dropId, spotId } = req.body as { qrPayload: string; context?: 'drop' | 'group_drop' | 'member_visit'; dropId?: string; spotId?: string };

    // 1. staff authorization FIRST — a non-staff must never burn a valid QR
    const staffMerchant = rows(await db.execute(sql`
      select ma.id as merchant_id, ma.venue_id, v.display_name
        from merchant_accounts ma
        join venues v on v.id = ma.venue_id
       where ma.claim_status = 'approved'
         and (ma.owner_user_id = ${staffId}::uuid
              or exists (select 1 from merchant_staff ms
                          where ms.merchant_id = ma.id and ms.user_id = ${staffId}::uuid))
       limit 1`));
    if (!staffMerchant[0]) return reply.code(403).send({ title: 'Not merchant staff' });
    const venueId = staffMerchant[0].venue_id as string;

    // 2. verify QR signature/window + replay
    const v = verifyQrToken(qrPayload, secret);
    if (!v.ok) return reply.code(v.reason === 'bad_sig' ? 403 : 410).send({ title: `QR ${v.reason}` });
    if (!(await markQrUsed(app.redis!, qrPayload))) {
      return reply.code(409).send({ title: 'QR already scanned' });
    }
    const guestId = v.userId;
    const ping = await lastLocationPing(app.redis!, guestId);

    // 3. context resolution — explicit context wins, else priority drop → group_drop → member_visit
    let context: 'drop' | 'group_drop' | 'member_visit' | null = null;
    let resolvedDropId: string | null = null;
    let resolvedSpotId: string | null = null;

    const claimedDrop = rows(await db.execute(sql`
      select dc.id as claim_id, d.id as drop_id
        from drop_claims dc
        join drops d on d.id = dc.drop_id
       where dc.user_id = ${guestId}::uuid
         and d.venue_id = ${venueId}::uuid
         and dc.redeemed_at is null
         and d.status = 'active'
         and now() between d.starts_at and d.ends_at
         and d.kind = 'individual'
       order by dc.claimed_at desc limit 1`));

    const groupDrop = rows(await db.execute(sql`
      select d.id as drop_id, sm.spot_id
        from drops d
        join spots s on s.venue_id = d.venue_id and s.state = 'live'
        join spot_members sm on sm.spot_id = s.id and sm.user_id = ${guestId}::uuid and sm.state = 'active'
       where d.venue_id = ${venueId}::uuid
         and d.kind = 'group'
         and d.status = 'active'
         and now() between d.starts_at and d.ends_at
         and (sm.spot_id = ${spotId ?? null}::uuid or ${spotId ?? null}::uuid is null)
       limit 1`));

    const activeMembership = rows(await db.execute(sql`
      select id from memberships
       where user_id = ${guestId}::uuid and venue_id = ${venueId}::uuid and status = 'active'
       limit 1`));

    const explicit = (req.body as { context?: string }).context;
    if (explicit === 'drop' && (claimedDrop[0] || dropId)) {
      context = 'drop';
      resolvedDropId = (claimedDrop[0]?.drop_id ?? dropId) as string;
    } else if (explicit === 'group_drop' && groupDrop[0]) {
      context = 'group_drop'; resolvedDropId = groupDrop[0].drop_id as string; resolvedSpotId = groupDrop[0].spot_id as string;
    } else if (explicit === 'member_visit' && activeMembership[0]) {
      context = 'member_visit';
    } else if (claimedDrop[0]) {
      context = 'drop'; resolvedDropId = claimedDrop[0].drop_id as string;
      // redeem the claim on scan
      await db.execute(sql`update drop_claims set redeemed_at = now() where id = ${claimedDrop[0].claim_id}::uuid`);
    } else if (groupDrop[0]) {
      context = 'group_drop'; resolvedDropId = groupDrop[0].drop_id as string; resolvedSpotId = groupDrop[0].spot_id as string;
    } else if (activeMembership[0]) {
      // member visits max once per day per venue
      const today = rows(await db.execute(sql`
        select 1 from merchant_checkins
         where user_id = ${guestId}::uuid and venue_id = ${venueId}::uuid
           and context = 'member_visit'
           and created_at > now() - interval '24 hours' limit 1`));
      if (today[0]) return reply.code(409).send({ title: 'Member visit already counted today' });
      context = 'member_visit';
    } else {
      return reply.code(422).send({ title: 'Nothing to check in — no claimed drop, group drop, or membership' });
    }

    // 4. GPS confidence from guest's recent ping vs venue location
    const venue = rows(await db.execute(sql`
      select location from venues where id = ${venueId}::uuid`));
    let confidence: 'high' | 'low' = 'low';
    let distanceM: number | null = null;
    if (ping && venue[0]) {
      const d = rows(await db.execute(sql`
        select ST_Distance(${venue[0].location}, ST_SetSRID(ST_MakePoint(${ping.lng}, ${ping.lat}), 4326)::geography)::numeric as m`));
      distanceM = Number(d[0].m);
      confidence = distanceM <= 100 + ping.accuracyM ? 'high' : 'low';
    }

    // 5. write check-in (T16.1 seat-charge engine hooks here: high-confidence + account gate → seat_charges)
    const ins = rows(await db.execute(sql`
      insert into merchant_checkins (venue_id, user_id, scanned_by, context, drop_id, spot_id, confidence, gps_distance_m)
      values (${venueId}::uuid, ${guestId}::uuid, ${staffId}::uuid, ${context}, ${resolvedDropId}::uuid, ${resolvedSpotId}::uuid, ${confidence}, ${distanceM})
      returning id`));

    // 5b. billing hook (T16.1): high-confidence billable events → seat_charges
    const billableEvent = confidence === 'high';
    let charge: { charged: boolean; shadow: boolean; amount: number | null } = { charged: false, shadow: false, amount: null };
    if (billableEvent) charge = await onCheckin(db, ins[0].id as string);

    // 6. membership visit counting + last-visit touch
    if (context === 'member_visit') {
      await db.execute(sql`
        update memberships set visits_count = visits_count + 1, last_visit_at = now()
         where user_id = ${guestId}::uuid and venue_id = ${venueId}::uuid and status = 'active'`);
    }

    // 7. user sketch for staff identification (display name only — no photo browsing for staff)
    const guest = rows(await db.execute(sql`
      select u.display_name, u.phone_verified_at is not null as verified
        from users u where u.id = ${guestId}::uuid`));

    return reply.code(200).send({
      checkinId: ins[0].id,
      venue: staffMerchant[0].display_name,
      guest: { displayName: guest[0]?.display_name, verified: guest[0]?.verified },
      context, dropId: resolvedDropId, spotId: resolvedSpotId,
      confidence, gpsDistanceM: distanceM,
      charge,
      billable: billableEvent && (context === 'drop' || context === 'group_drop' || (context === 'member_visit' && Boolean(activeMembership[0]))),
    });
  });
}
