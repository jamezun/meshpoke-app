import type { FastifyInstance } from 'fastify';
import { type SQL, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client.js';

const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

/** T14.1 activity feed + T14.2 push tokens + T14.3 prefs & merchant mutes. */
export function registerActivity(app: FastifyInstance, dbUrl: string): void {
  const db = getDb(dbUrl);

  app.get<{ Querystring: { cursor?: string; limit?: number } }>('/me/activity', {
    preHandler: app.authenticate,
    schema: { querystring: z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(50).optional() }) },
  }, async (req) => {
    const me = req.user!.id;
    const limit = req.query.limit ?? 20;
    const items = rows(await db.execute(sql`
      select id, category, type, payload, read_at, created_at
        from activity_items
       where user_id = ${me}::uuid
         and (${req.query.cursor ?? null}::uuid is null or created_at < (select created_at from activity_items where id = ${req.query.cursor ?? null}::uuid))
       order by created_at desc limit ${limit}`));
    return {
      items,
      unread: rows(await db.execute(sql`
        select count(*)::int as n from activity_items
         where user_id = ${me}::uuid and read_at is null`))[0].n,
    };
  });

  app.post('/me/activity/read', {
    preHandler: app.authenticate,
    schema: { body: z.object({ ids: z.array(z.string().uuid()).min(1).max(50) }) },
  }, async (req) => {
    const ids = (req.body as { ids: string[] }).ids;
    await db.execute(sql`
      update activity_items set read_at = now()
       where user_id = ${req.user!.id}::uuid and id = any(${sql.param(ids)}::uuid[])`);
    return { ok: true };
  });

  // ── T14.2 push tokens (mobile registers FCM/APNs-via-FCM token) ──
  app.post('/me/push-tokens', {
    preHandler: app.authenticate,
    schema: { body: z.object({ token: z.string().min(10).max(500), platform: z.enum(['ios', 'android', 'web']) }) },
  }, async (req) => {
    const { token, platform } = req.body as { token: string; platform: 'ios' | 'android' | 'web' };
    await db.execute(sql`
      insert into push_tokens (user_id, token, platform) values (${req.user!.id}::uuid, ${token}, ${platform})
      on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now()`);
    return { ok: true };
  });

  // ── T14.3 notification preferences (promo consent timestamped w/ version) ──
  const CONSENT_TEXT_VERSION = 'promo-consent-v1';

  app.get('/me/notification-prefs', { preHandler: app.authenticate }, async (req) => {
    const r = rows(await db.execute(sql`
      select promo_opt_in, promo_consent_at, proximity_opt_in, quiet_hours, categories
        from notification_prefs where user_id = ${req.user!.id}::uuid`));
    return {
      promoOptIn: r[0]?.promo_opt_in ?? false,
      promoConsentAt: r[0]?.promo_consent_at ?? null,
      proximityOptIn: r[0]?.proximity_opt_in ?? false,
      quietHours: r[0]?.quiet_hours ?? true,
      categories: r[0]?.categories ?? {},
      consentTextVersion: CONSENT_TEXT_VERSION,
    };
  });

  app.patch('/me/notification-prefs', {
    preHandler: app.authenticate,
    schema: { body: z.object({
      promoOptIn: z.boolean().optional(),
      proximityOptIn: z.boolean().optional(),
      quietHours: z.boolean().optional(),
      categories: z.record(z.string(), z.boolean()).optional(),
    }) },
  }, async (req) => {
    const b = req.body as { promoOptIn?: boolean; proximityOptIn?: boolean; quietHours?: boolean; categories?: Record<string, boolean> };
    if (b.promoOptIn === undefined && b.proximityOptIn === undefined && b.quietHours === undefined && b.categories === undefined) {
      return { ok: true, consentTextVersion: CONSENT_TEXT_VERSION };
    }
    const sets: SQL[] = [];
    if (b.promoOptIn !== undefined) {
      sets.push(sql`promo_opt_in = ${b.promoOptIn}`);
      if (b.promoOptIn) sets.push(sql`promo_consent_at = now()`);
    }
    if (b.proximityOptIn !== undefined) sets.push(sql`proximity_opt_in = ${b.proximityOptIn}`);
    if (b.quietHours !== undefined) sets.push(sql`quiet_hours = ${b.quietHours}`);
    if (b.categories !== undefined) sets.push(sql`categories = ${JSON.stringify(b.categories)}::jsonb`);
    const setExpr = sql.join(sets, sql`, `);
    await db.execute(sql`
      insert into notification_prefs (user_id, promo_opt_in, promo_consent_at, proximity_opt_in, quiet_hours, categories)
      values (${req.user!.id}::uuid, ${b.promoOptIn ?? false}, ${b.promoOptIn ? sql`now()` : null}, ${b.proximityOptIn ?? false}, ${b.quietHours ?? true}, ${JSON.stringify(b.categories ?? {})}::jsonb)
      on conflict (user_id) do update set ${setExpr}`);
    return { ok: true, consentTextVersion: CONSENT_TEXT_VERSION };
  });

  // merchant mute (list on GET, toggle on POST, DELETE unmutes)
  app.post<{ Params: { id: string } }>('/merchants/:id/mute', {
    preHandler: app.authenticate,
    schema: { params: z.object({ id: z.string().uuid() }) },
  }, async (req) => {
    await db.execute(sql`
      insert into merchant_mutes (user_id, merchant_id) values (${req.user!.id}::uuid, ${req.params.id}::uuid)
      on conflict do nothing`);
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>('/merchants/:id/mute', {
    preHandler: app.authenticate,
    schema: { params: z.object({ id: z.string().uuid() }) },
  }, async (req) => {
    await db.execute(sql`
      delete from merchant_mutes where user_id = ${req.user!.id}::uuid and merchant_id = ${req.params.id}::uuid`);
    return { ok: true };
  });
}
