import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { SCORE_RULES } from '@meshpoke/shared';

/**
 * T10.3 Show-up Score engine. Score 0–1 from weighted events with 90-day decay
 * (older events weigh less, linear). Unproven until 3 finalised outcomes.
 * proven: score ≥ 0.6 with 3+ events · top: score ≥ 0.85 with 6+ events.
 * Hosting capacity: unproven 1 → proven 3 → top 5 (SPOT_RULES.hosting*).
 */
const PROVEN_SCORE = 0.6;
const TOP_SCORE = 0.85;
const TOP_EVENTS = 6;

export function computeScore(events: { weight: number; createdAt: Date }[], now = new Date()): { score: number; eventsCount: number } {
  if (events.length === 0) return { score: 0.5, eventsCount: 0 };
  let num = 0;
  let counted = 0;
  for (const e of events) {
    const ageDays = (now.getTime() - e.createdAt.getTime()) / 86400_000;
    if (ageDays > SCORE_RULES.decayDays) continue; // fully decayed
    const decay = 1 - ageDays / SCORE_RULES.decayDays; // linear: 1 → 0 at 90d
    // positives decay fully; negatives never fully vanish (recent flakes keep biting)
    num += e.weight >= 0 ? e.weight * decay : e.weight * (0.5 + 0.5 * decay);
    counted++;
  }
  if (counted === 0) return { score: 0.5, eventsCount: events.length };
  // baseline 0.5 + decayed lifetime behaviour, clamped 0–1
  const score = Math.min(1, Math.max(0, 0.5 + num));
  return { score: Math.round(score * 1000) / 1000, eventsCount: events.length };
}

export function provenStateFor(score: number, eventsCount: number): 'unproven' | 'proven' | 'top' {
  if (eventsCount >= TOP_EVENTS && score >= TOP_SCORE) return 'top';
  if (eventsCount >= SCORE_RULES.unprovenThresholdEvents && score >= PROVEN_SCORE) return 'proven';
  return 'unproven';
}

export function hostingCapacityFor(state: 'unproven' | 'proven' | 'top'): 1 | 3 | 5 {
  return state === 'top' ? 5 : state === 'proven' ? 3 : 1;
}

export function registerScore(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);
  const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

  /** recompute one user (or all when userId empty). Idempotent. */
  const recompute = async (userId: string) => {
    const targets = userId
      ? rows(await db.execute(sql`select ${userId}::uuid as user_id`))
      : rows(await db.execute(sql`select distinct user_id from score_events`));
    let updated = 0;
    for (const t of targets) {
      const evts = rows(await db.execute(sql`
        select weight, created_at from score_events
         where user_id = ${t.user_id}::uuid and created_at > now() - interval '${sql.raw(String(SCORE_RULES.decayDays))} days'
         order by created_at desc`));
      const { score, eventsCount } = computeScore(evts.map((e) => ({ weight: Number(e.weight), createdAt: new Date(String(e.created_at)) })));
      const state = provenStateFor(score, eventsCount);
      await db.execute(sql`
        insert into showup_scores (user_id, score, events_count, proven_state, factors, updated_at)
        values (${t.user_id}::uuid, ${score}, ${eventsCount}, ${state}, ${JSON.stringify({ recentEvents: eventsCount })}::jsonb, now())
        on conflict (user_id) do update
          set score = ${score}, events_count = ${eventsCount}, proven_state = ${state}, updated_at = now()`);
      // hosting capacity follows proven_state — earned, never paid
      const cap = hostingCapacityFor(state);
      await db.execute(sql`
        insert into hosting_capacity (user_id, max_active)
        values (${t.user_id}::uuid, ${cap})
        on conflict (user_id) do update set max_active = ${cap}`);
      updated++;
    }
    return updated;
  };

  /** nightly recompute — admin/internal */
  app.post('/internal/score-recompute', { preHandler: [app.authenticate, app.requireAdminRole('superadmin')] }, async (req) => {
    const userId = (req.body as { userId?: string } | null)?.userId ?? '';
    const updated = await recompute(userId);
    return { updated };
  });

  /** enforcement ladder — called from recompute path manually for now (M14 notifications wire the messages) */
  app.get<{ Params: { userId: string } }>('/internal/enforcement/:userId', { preHandler: [app.authenticate, app.requireAdminRole('superadmin')] }, async (req) => {
    const r = rows(await db.execute(sql`
      select (select count(*) from score_events
               where user_id = ${req.params.userId}::uuid and type = 'no_show' and created_at > now() - interval '30 days') as recent_no_shows,
             coalesce((select score from showup_scores where user_id = ${req.params.userId}::uuid), 0.5) as score`));
    const noShows = Number(r[0].recent_no_shows);
    const score = Number(r[0].score);
    const action = noShows >= 3 || score < 0.3 ? 'hosting_paused' : noShows >= 2 || score < 0.4 ? 'application_cooldown' : noShows >= 1 ? 'warning' : 'none';
    return { recentNoShows: noShows, score, action };
  });
}
