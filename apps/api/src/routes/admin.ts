/**
 * Admin basics (T8.3): RBAC admin_roles (superadmin/moderator/support/finance;
 * superadmin passes all; MFA via ADMIN_REQUIRE_MFA + aal2), user search/detail
 * + suspend/restore, merchant claim queue w/ signed cert URLs, geocode-failed
 * venue queue + manual pin, venue reports, duplicate merge.
 */
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import type { Storage } from '../storage.js';

const problem = (reply: { code: (n: number) => { send: (b: unknown) => unknown } }, status: number, title: string) =>
  reply.code(status).send({ problem: { title, status } });

export function registerAdmin(app: FastifyInstance, dbUrl: string, storage: Storage | null) {
  const db = getDb(dbUrl);
  type Rows<T> = { rows: T[] };
  const asRows = <T>(r: unknown) => (r as Rows<T>).rows;

  // ── users ───────────────────────────────────────────────────────
  // T19.1: metrics — one aggregate query per metric
  app.get('/admin/metrics', { preHandler: [app.authenticate, app.requireAdminRole('support')] }, async () => {
    const db = getDb(dbUrl);
    const one = async (q: Parameters<typeof db.execute>[0]) => asRows<Record<string, unknown>>(await db.execute(q))[0] ?? {};
    const [funnel, attendance, rebook, fairness, venues, conversion, pokes] = await Promise.all([
      one(sql`select
        count(*)::int as created,
        count(*) filter (where state = 'forming')::int as forming,
        count(*) filter (where state = 'confirmed')::int as confirmed,
        count(*) filter (where state = 'live')::int as live,
        count(*) filter (where state = 'done')::int as done,
        count(*) filter (where state = 'cancelled')::int as cancelled,
        count(*) filter (where state = 'dissolved')::int as dissolved
        from spots where kind = 'event'`),
      one(sql`select
        count(*) filter (where status in ('attended','forgiven'))::int as attended,
        count(*)::int as total
        from attendance where finalized_at is not null`),
      one(sql`select
        (select count(*)::int from rebooks where new_spot_id is not null) as rebooks_with_spot,
        (select count(*)::int from spots where kind = 'event' and state = 'done') as done_spots`),
      one(sql`select
        count(*) filter (where coalesce(e.plan, 'free') = 'free')::int as free_accepted,
        count(*) filter (where coalesce(e.plan, 'free') <> 'free')::int as paid_accepted
        from applications a left join entitlements e on e.user_id = a.user_id
        where a.status = 'accepted'`),
      db.execute(sql`select v.display_name, count(*)::int as checkins
        from merchant_checkins c join venues v on v.id = c.venue_id
        group by v.display_name order by checkins desc limit 10`),
      one(sql`select
        count(*) filter (where e.plan in ('plus','pro'))::int as paying,
        count(*)::int as total
        from users u left join entitlements e on e.user_id = u.id
        where u.deleted_at is null`),
      one(sql`select
        count(*)::int as sent,
        count(*) filter (where status = 'returned')::int as returned
        from pokes`),
    ]);
    const n = (v: unknown) => Number(v ?? 0);
    const attendanceRate = n(attendance.total) > 0 ? n(attendance.attended) / n(attendance.total) : null;
    const rebookRate = n(rebook.done_spots) > 0 ? n(rebook.rebooks_with_spot) / n(rebook.done_spots) : null;
    const fairnessFreeShare = (Number(fairness.free_accepted) + Number(fairness.paid_accepted)) > 0
      ? Number(fairness.free_accepted) / (Number(fairness.free_accepted) + Number(fairness.paid_accepted)) : null;
    return {
      funnel,
      attendanceRate,
      rebookRate,
      fairness: { freeAccepted: fairness.free_accepted, paidAccepted: fairness.paid_accepted, freeShare: fairnessFreeShare },
      topVenues: asRows<{ display_name: string; checkins: number }>(venues).map((r) => ({ name: r.display_name, checkins: r.checkins })),
      conversion: { paying: conversion.paying, total: conversion.total, rate: n(conversion.total) > 0 ? n(conversion.paying) / n(conversion.total) : null },
      pokes,
    };
  });

  app.get<{ Querystring: { q?: string } }>('/admin/users', { preHandler: [app.authenticate, app.requireAdminRole('support')] }, async (req) => {
    const q = (req.query?.q ?? '').trim();
    const like = `%${q}%`;
    const res = q
      ? await db.execute(sql`select id, email, display_name, liveness_state, is_admin, deleted_at, created_at
          from users where email ilike ${like} or display_name ilike ${like} order by created_at desc limit 50`)
      : await db.execute(sql`select id, email, display_name, liveness_state, is_admin, deleted_at, created_at
          from users order by created_at desc limit 50`);
    return { users: asRows(res) };
  });

  app.get<{ Params: { id: string } }>('/admin/users/:id', { preHandler: [app.authenticate, app.requireAdminRole('support')] }, async (req, reply) => {
    const u = asRows<{ id: string; email: string; display_name: string; date_of_birth: string; liveness_state: string; phone_verified_at: Date | null; plan: string | null; created_at: Date }>(
      await db.execute(sql`select u.id, u.email, u.display_name, u.date_of_birth, u.liveness_state, u.phone_verified_at, e.plan, u.created_at
        from users u left join entitlements e on e.user_id = u.id where u.id = ${req.params.id}::uuid`))[0];
    if (!u) return problem(reply, 404, 'User not found');
    const reports = asRows(await db.execute(sql`select id, reason, status, created_at from reports where target_type = 'user' and target_id = ${u.id}::uuid order by created_at desc limit 20`));
    const mod = asRows(await db.execute(sql`select id, action, reason, created_at from moderation_actions where target_user = ${u.id}::uuid order by created_at desc limit 20`));
    return { user: u, reports, moderation: mod };
  });

  app.post<{ Params: { id: string }; Body: { suspend: boolean; reason: string } }>(
    '/admin/users/:id/moderate',
    { preHandler: [app.authenticate, app.requireAdminRole('moderator')] },
    async (req, reply) => {
      const { suspend, reason } = req.body ?? {};
      if (!reason?.trim()) return problem(reply, 422, 'Reason required');
      const target = asRows<{ id: string }>(await db.execute(sql`select id from users where id = ${req.params.id}::uuid`))[0];
      if (!target) return problem(reply, 404, 'User not found');
      if (target.id === req.user!.id) return problem(reply, 422, 'Cannot moderate yourself');
      await db.execute(sql`update users set deleted_at = ${suspend ? sql`now()` : null} where id = ${target.id}::uuid`);
      await db.execute(sql`insert into moderation_actions (admin_id, target_user, action, reason, audit)
        values (${req.user!.id}::uuid, ${target.id}::uuid, ${suspend ? 'suspend' : 'restore'}, ${reason.slice(0, 200)}, ${JSON.stringify({ type: suspend ? 'suspend' : 'restore' })}::jsonb)`);
      await db.execute(sql`insert into audit_log (actor_id, action, target, meta)
        values (${req.user!.id}, ${suspend ? 'admin.user.suspend' : 'admin.user.restore'}, 'user:' || ${target.id}::text, ${JSON.stringify({ reason })}::jsonb)`);
      return { ok: true, suspended: suspend };
    },
  );

  // ── T13.4 moderation queue ─────────────────────────────────────
  // Queue: open reports w/ content preview + currently muted/suspended users
  app.get('/admin/moderation/queue', { preHandler: [app.authenticate, app.requireAdminRole('moderator')] }, async () => {
    const openReports = asRows<Record<string, unknown>>(await db.execute(sql`
      select r.id, r.target_type, r.target_id, r.reason, r.details, r.status, r.created_at,
             ru.display_name as reporter,
             (select display_name from users tu where tu.id = r.target_id) as target_user,
             case r.target_type
               when 'message' then (select left(body, 140) from messages m where m.id = r.target_id)
               when 'spot' then (select name from spots sp where sp.id = r.target_id)
               when 'venue' then (select display_name from venues v where v.id = r.target_id)
             end as preview
        from reports r join users ru on ru.id = r.reporter_id
       where r.status = 'open'
       order by r.created_at desc limit 200`));
    const mutedUsers = asRows<Record<string, unknown>>(await db.execute(sql`
      select distinct on (ma.target_user) ma.target_user, ma.action, ma.reason, ma.created_at,
             u.display_name, u.deleted_at
        from moderation_actions ma join users u on u.id = ma.target_user
       order by ma.target_user, ma.created_at desc`));
    return { reports: openReports, muted: mutedUsers.filter((m) => m.action === 'mute' || m.action === 'suspend') };
  });

  // Action a user: warn|mute|suspend|restore (+ appeal note goes to audit)
  app.post<{ Params: { userId: string }; Body: { action: string; reason: string; appealNote?: string } }>(
    '/admin/moderation/:userId/action',
    { preHandler: [app.authenticate, app.requireAdminRole('moderator')] },
    async (req, reply) => {
      const { action, reason, appealNote } = req.body ?? {};
      if (!['warn', 'mute', 'suspend', 'restore'].includes(action)) return problem(reply, 422, 'Invalid action');
      if (!reason?.trim()) return problem(reply, 422, 'Reason required');
      const target = asRows<{ id: string }>(await db.execute(sql`select id from users where id = ${req.params.userId}::uuid`))[0];
      if (!target) return problem(reply, 404, 'User not found');
      if (target.id === req.user!.id) return problem(reply, 422, 'Cannot moderate yourself');

      if (action === 'suspend') {
        await db.execute(sql`update users set deleted_at = now() where id = ${target.id}::uuid`);
      } else if (action === 'restore') {
        await db.execute(sql`update users set deleted_at = null where id = ${target.id}::uuid`);
      }
      await db.execute(sql`
        insert into moderation_actions (admin_id, target_user, action, reason, audit)
        values (${req.user!.id}::uuid, ${target.id}::uuid, ${action}, ${reason.slice(0, 200)},
                ${JSON.stringify({ ...(appealNote ? { appealNote } : {}) })}::jsonb)`);
      await db.execute(sql`
        insert into audit_log (actor_id, action, target, meta)
        values (${req.user!.id}::uuid, ${'admin.moderation.' + action}, ${'user:' + target.id},
                ${JSON.stringify({ reason, ...(appealNote ? { appealNote } : {}) })}::jsonb)`);
      return { ok: true, action };
    },
  );

  // Resolve a report (dismiss or acted)
  app.post<{ Params: { id: string }; Body: { resolution: string; note?: string } }>(
    '/admin/reports/:id/resolve',
    { preHandler: [app.authenticate, app.requireAdminRole('moderator')] },
    async (req, reply) => {
      const { resolution } = req.body ?? {};
      if (!['dismissed', 'actioned'].includes(resolution)) return problem(reply, 422, 'Invalid resolution');
      const res = await db.execute(sql`
        update reports set status = ${resolution === 'dismissed' ? 'dismissed' : 'actioned'}
         where id = ${req.params.id}::uuid and status = 'open' returning id`);
      if (asRows(res).length === 0) return problem(reply, 404, 'Report not open');
      await db.execute(sql`
        insert into audit_log (actor_id, action, target, meta)
        values (${req.user!.id}::uuid, 'admin.report.resolve', ${'report:' + req.params.id},
                ${JSON.stringify({ resolution, ...(req.body?.note ? { note: req.body.note } : {}) })}::jsonb)`);
      return { ok: true };
    },
  );

  // ── merchant claims (view BR cert via signed URL) ───────────────
  app.get('/admin/merchant-claims', { preHandler: [app.authenticate, app.requireAdminRole('support')] }, async () => {
    const rows = asRows<{ id: string; venue_id: string; venue: string; owner: string; cert_key: string; price_band: number; claim_status: string; created_at: Date }>(
      await db.execute(sql`select ma.id, ma.venue_id, v.display_name as venue, u.email as owner, ma.business_reg_cert_key as cert_key,
        ma.price_band, ma.claim_status::text as claim_status, ma.created_at
        from merchant_accounts ma join venues v on v.id = ma.venue_id join users u on u.id = ma.owner_user_id
        where ma.claim_status = 'pending' order by ma.created_at`));
    const claims = await Promise.all(rows.map(async (c) => ({
      ...c,
      certUrl: storage && c.cert_key ? await storage.presignGet(c.cert_key, 900) : null,
    })));
    return { claims };
  });

  // ── venues: geocode-failed queue, manual pin ────────────────────
  app.get('/admin/venues/geocode-failed', { preHandler: [app.authenticate, app.requireAdminRole('support')] }, async () => {
    const rows = asRows(await db.execute(sql`select id, display_name, address_en, category::text as category, geocode_status
      from venues where geocode_status = 'failed' order by created_at limit 100`));
    return { venues: rows };
  });

  app.post<{ Params: { id: string }; Body: { lat: number; lng: number } }>(
    '/admin/venues/:id/pin',
    { preHandler: [app.authenticate, app.requireAdminRole('support')] },
    async (req, reply) => {
      const { lat, lng } = req.body ?? {};
      if (typeof lat !== 'number' || typeof lng !== 'number' || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return problem(reply, 422, 'Invalid coordinates');
      }
      const r = await db.execute(sql`update venues set location = st_setsrid(st_makepoint(${lng}, ${lat}), 4326), geocode_status = 'manual'
        where id = ${req.params.id}::uuid returning id`);
      if (asRows(r).length === 0) return problem(reply, 404, 'Venue not found');
      await db.execute(sql`insert into audit_log (actor_id, action, target, meta)
        values (${req.user!.id}, 'admin.venue.pin', 'venue:' || ${req.params.id}, ${JSON.stringify({ lat, lng })}::jsonb)`);
      return { ok: true };
    },
  );

  app.get('/admin/venue-reports', { preHandler: [app.authenticate, app.requireAdminRole('moderator')] }, async () => {
    const rows = asRows(await db.execute(sql`select vr.id, vr.venue_id, v.display_name, vr.reason, vr.status, vr.created_at
      from venue_reports vr join venues v on v.id = vr.venue_id where vr.status = 'open' order by vr.created_at limit 100`));
    return { reports: rows };
  });

  app.post<{ Params: { id: string }; Body: { resolution: string } }>(
    '/admin/venue-reports/:id/resolve',
    { preHandler: [app.authenticate, app.requireAdminRole('moderator')] },
    async (req, reply) => {
      const r = await db.execute(sql`update venue_reports set status = 'resolved'
        where id = ${req.params.id}::uuid returning id`);
      if (asRows(r).length === 0) return problem(reply, 404, 'Report not found');
      return { ok: true };
    },
  );

  // ── merge duplicates: move children, close the loser ────────────
  app.post<{ Body: { intoId: string; fromId: string } }>(
    '/admin/venues/merge',
    { preHandler: [app.authenticate, app.requireAdminRole('superadmin')] },
    async (req, reply) => {
      const { intoId, fromId } = req.body ?? {};
      if (!intoId || !fromId || intoId === fromId) return problem(reply, 422, 'intoId and fromId required (distinct)');
      const loser = asRows<{ id: string; claimed_by_merchant_id: string | null }>(
        await db.execute(sql`select id, claimed_by_merchant_id from venues where id = ${fromId}::uuid`))[0];
      if (!loser) return problem(reply, 404, 'fromId not found');
      if (loser.claimed_by_merchant_id) return problem(reply, 409, 'Cannot merge a claimed venue');
      await db.execute(sql`update spots set venue_id = ${intoId}::uuid where venue_id = ${fromId}::uuid`);
      await db.execute(sql`update memberships set venue_id = ${intoId}::uuid where venue_id = ${fromId}::uuid`);
      await db.execute(sql`update venue_reports set venue_id = ${intoId}::uuid where venue_id = ${fromId}::uuid`);
      await db.execute(sql`update saved_venues set venue_id = ${intoId}::uuid where venue_id = ${fromId}::uuid`);
      await db.execute(sql`update venues set status = 'closed', closed_at = now() where id = ${fromId}::uuid`);
      await db.execute(sql`insert into audit_log (actor_id, action, target, meta)
        values (${req.user!.id}, 'admin.venue.merge', 'venue:' || ${intoId}::text, ${JSON.stringify({ mergedFrom: fromId })}::jsonb)`);
      return { ok: true };
    },
  );
}
