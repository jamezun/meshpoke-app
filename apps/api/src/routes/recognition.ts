/// Reliability 2.0 recognition layer (BM §4.4 §7): streaks, venue regulars,
/// conduct ledger (separate from the credit score), appeals, hearts.
/// All cosmetic except appeals — none of it moves the Show-up Score.
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client.js';
import { SCORE_RULES } from '@meshpoke/shared/constants';
import { capture } from '../analytics.js';

const HKT_DAY = 86400_000;

export function registerRecognition(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);
  const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

  /** 🔥 streak — consecutive event-weeks (HKT Mon–Sun) with ≥1 finalised attended event. Display-only. */
  app.get('/me/streak', { preHandler: [app.authenticate] }, async (req) => {
    const evts = rows(await db.execute(sql`
      select distinct date_trunc('day', (created_at AT TIME ZONE 'Asia/Hong_Kong')::date::timestamp) as d
        from score_events
       where user_id = ${req.user!.id}::uuid and type = 'attended' and created_at > now() - interval '180 days'`));
    // monday-of-week for each HKT day — both sides as naive-HKT-day math
    const weekOf = (t: number) => {
      const day = Math.floor((t + 8 * 3600_000) / HKT_DAY) * HKT_DAY; // HKT calendar day start, naive UTC
      const weekday = (new Date(day).getUTCDay() + 6) % 7; // Mon=0
      return day - weekday * HKT_DAY;
    };
    const weeks = new Set<number>();
    for (const e of evts) weeks.add(weekOf(new Date(String(e.d)).getTime()));
    let cursor = weekOf(Date.now());
    if (!weeks.has(cursor)) cursor -= 7 * HKT_DAY; // current week not yet "counted" — streak may be from last week
    let streak = 0;
    while (weeks.has(cursor)) { streak++; cursor -= 7 * HKT_DAY; }
    return { streakWeeks: streak };
  });

  /** 📍 Venue Regular badge — 3+ verified venue visits (member/drop contexts) in 60d. */
  app.get('/me/regulars', { preHandler: [app.authenticate] }, async (req) => {
    const v = rows(await db.execute(sql`
      select mc.venue_id, v.display_name, count(*)::int as visits,
             max(mc.created_at) as last_visit
        from merchant_checkins mc join venues v on v.id = mc.venue_id
       where mc.user_id = ${req.user!.id}::uuid
         and mc.created_at > now() - interval '${sql.raw(String(SCORE_RULES.regularBadge.windowDays))} days'
         and mc.context in ('member_visit','drop','group_drop')
       group by mc.venue_id, v.display_name
      having count(*) >= ${SCORE_RULES.regularBadge.minVisits}
       order by visits desc`));
    return { regularAt: v.map((r) => ({ venueId: r.venue_id, name: r.display_name, visits: r.visits, lastVisit: r.last_visit })) };
  });

  /** conduct ledger — Clean/Muted/Suspended chip; resets after 30 clean days. Never a number. */
  app.get('/me/conduct', { preHandler: [app.authenticate] }, async (req) => {
    const last = rows(await db.execute(sql`
      select action, created_at from moderation_actions
       where target_user = ${req.user!.id}::uuid
       order by created_at desc limit 1`));
    if (!last[0]) return { chip: 'clean' };
    const ageDays = (Date.now() - new Date(String(last[0].created_at)).getTime()) / HKT_DAY;
    if (ageDays > SCORE_RULES.conduct.cleanResetDays) return { chip: 'clean', note: 'reset after 30 clean days' };
    const chip = last[0].action === 'suspend' ? 'suspended' : last[0].action === 'mute' ? 'muted' : 'clean';
    return { chip, since: last[0].created_at };
  });

  /** appeal a moderation action — free, 1 per 30d (pay-to-appeal rejected by design). */
  app.post('/me/appeal', {
    preHandler: [app.authenticate],
    schema: { body: z.object({ reason: z.string().trim().min(10).max(1000) }) },
  }, async (req, reply) => {
    const me = req.user!.id;
    const recent = rows(await db.execute(sql`
      select 1 from appeals where user_id = ${me}::uuid
         and created_at > now() - interval '${sql.raw(String(SCORE_RULES.conduct.appealPerDays))} days'`));
    if (recent.length > 0) return reply.code(429).send({ problem: { title: 'One appeal per 30 days', status: 429 } });
    const ins = rows(await db.execute(sql`
      insert into appeals (user_id, reason) values (${me}::uuid, ${(req.body as { reason: string }).reason}) returning id`));
    capture('appeal_filed', me, {});
    return reply.code(201).send({ id: ins[0].id, status: 'open' });
  });

  /** ❤️ hearts — reactions only (flair at 10/50/100 received), 5/day, never score-relevant. */
  app.post<{ Params: { roomId: string; id: string }; Body: { emoji?: string } }>('/rooms/:roomId/messages/:id/react', {
    preHandler: [app.authenticate],
    config: { rateLimit: { max: 20 } },
  }, async (req, reply) => {
    const me = req.user!.id;
    const today = rows(await db.execute(sql`
      select count(*)::int as n from message_reactions
       where user_id = ${me}::uuid and created_at > now() - interval '24 hours'`));
    if (Number(today[0].n) >= SCORE_RULES.streaks.heartDailyLimit) {
      return reply.code(429).send({ problem: { title: 'Daily heart limit (5) — spread the love tomorrow', status: 429 } });
    }
    // must be a member of the room; message must belong to it
    const ok = rows(await db.execute(sql`
      insert into message_reactions (message_id, user_id, emoji)
      select m.id, ${me}::uuid, 'heart' from messages m
       where m.id = ${req.params.id}::uuid and m.room_id = ${req.params.roomId}::uuid
         and exists (select 1 from room_members rm where rm.room_id = ${req.params.roomId}::uuid
                      and rm.user_id = ${me}::uuid and rm.left_at is null)
       on conflict do nothing returning id`));
    if (ok.length === 0) return reply.code(409).send({ problem: { title: 'Already hearted (or not your room)', status: 409 } });
    const count = rows(await db.execute(sql`select count(*)::int as n from message_reactions where message_id = ${req.params.id}::uuid`));
    return { hearted: true, hearts: count[0].n };
  });

  /** my hearts received + flair level (10/50/100). */
  app.get('/me/hearts', { preHandler: [app.authenticate] }, async (req) => {
    const r = rows(await db.execute(sql`
      select count(*)::int as n from message_reactions r
        join messages m on m.id = r.message_id
       where m.user_id = ${req.user!.id}::uuid and r.user_id <> ${req.user!.id}::uuid`));
    const n = Number(r[0].n);
    const flair = SCORE_RULES.streaks.flairAt.filter((f) => n >= f).pop() ?? null;
    return { hearts: n, flair };
  });
}
