import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { SCORE_RULES } from '@meshpoke/shared';

/**
 * Reliability 2.0 — Bayesian Show-up Score (BM §4.4).
 * score = (Σpoints + m·μ) / (n + m), m=3 prior events at μ=0.5, over the last
 * 20 events within 12 months (a 3-month holiday no longer resets a Rock to New). score_events.weight now stores the event's POINT VALUE (0–1):
 * show=1 · bail 24-48h=0.75 · bail <24h=0.5 · no-show=0 · host_cancel=0.2–0.8
 * (finalised by apology responses) · host_ghost=0. forgiven → NO event (erased).
 * Tiers: New n<3 · Reliable n≥3 & ≥60% · Rock n≥7 & ≥85% → hosting 1/3/5.
 * Enforcement: counts-axis ladder (catches bursts rates miss) + rate gates
 * only with n≥3 history. Two axes → see conduct (safety.ts) for the other ledger.
 */
const { priorWeight: M, priorScore: MU, decayDays, windowMaxEvents } = SCORE_RULES;
const E = SCORE_RULES.enforcement;

export function computeScore(events: { weight: number; createdAt: Date }[], now = new Date()): { score: number; eventsCount: number } {
  const inWindow = events
    .filter((e) => (now.getTime() - e.createdAt.getTime()) / 86400_000 <= decayDays)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, windowMaxEvents);
  const n = inWindow.length;
  const sum = inWindow.reduce((acc, e) => acc + Math.min(1, Math.max(0, e.weight)), 0); // points, clamped
  const score = Math.min(1, Math.max(0, (sum + M * MU) / (n + M)));
  return { score: Math.round(score * 1000) / 1000, eventsCount: n };
}

export function provenStateFor(score: number, eventsCount: number): 'unproven' | 'proven' | 'top' {
  if (eventsCount >= SCORE_RULES.rockMinEvents && score >= SCORE_RULES.rockMinScore) return 'top';
  if (eventsCount >= SCORE_RULES.reliableMinEvents && score >= SCORE_RULES.reliableMinScore) return 'proven';
  return 'unproven';
}

export function hostingCapacityFor(state: 'unproven' | 'proven' | 'top'): 1 | 3 | 5 {
  return state === 'top' ? 5 : state === 'proven' ? 3 : 1;
}

export interface EnforcementState {
  action: 'none' | 'warning' | 'application_cooldown' | 'hosting_paused';
  reason: string;
  cooldownUntil?: Date;
  pausedUntil?: Date;
}

/** enforcement ladder from raw counters (single source for routes + internal endpoint). */
export function enforcementFor(c: {
  noShows30d: number; score: number; eventsCount: number;
  hostGhost30d: number; hostCancels30d: number; now?: Date;
}): EnforcementState {
  const now = c.now ?? new Date();
  if (c.hostGhost30d >= 1) return { action: 'hosting_paused', reason: 'host ghost — missed own confirmed spot', pausedUntil: new Date(now.getTime() + E.hostGhostPauseDays * 86400_000) };
  if (c.noShows30d >= E.pausedNoShows30d || (c.eventsCount >= E.cooldownScoreMinEvents && c.score < E.pausedScoreBelow)) {
    return { action: 'hosting_paused', reason: `${c.noShows30d} no-shows / 30d`, pausedUntil: new Date(now.getTime() + E.pausedDays * 86400_000) };
  }
  if (c.hostCancels30d >= E.hostCancelPausedCount30d) {
    return { action: 'hosting_paused', reason: `${c.hostCancels30d} late host cancellations / 30d`, pausedUntil: new Date(now.getTime() + E.pausedDays * 86400_000) };
  }
  if (c.noShows30d >= E.cooldownNoShows30d || (c.eventsCount >= E.cooldownScoreMinEvents && c.score < E.cooldownScoreBelow)) {
    return { action: 'application_cooldown', reason: `${c.noShows30d} no-shows / 30d`, cooldownUntil: new Date(now.getTime() + E.cooldownDays * 86400_000) };
  }
  if (c.noShows30d >= E.warningNoShows30d) return { action: 'warning', reason: 'recent no-show — it happens, don\'t make it a habit' };
  return { action: 'none', reason: '' };
}

/** live enforcement state for a user — call before join/apply/host/claim/redeem. */
export async function enforcementState(db: ReturnType<typeof getDb>, userId: string): Promise<EnforcementState> {
  const r = (await db.execute(sql`
    select
      (select count(*) from score_events where user_id = ${userId}::uuid and type = 'no_show' and created_at > now() - interval '30 days')::int as ns,
      (select count(*) from score_events where user_id = ${userId}::uuid and type = 'host_ghost' and created_at > now() - interval '30 days')::int as ghost,
      (select count(*) from score_events where user_id = ${userId}::uuid and type = 'host_cancel' and created_at > now() - interval '30 days')::int as hc,
      coalesce((select score from showup_scores where user_id = ${userId}::uuid), 0.5) as score,
      coalesce((select events_count from showup_scores where user_id = ${userId}::uuid), 0)::int as n`))
    .rows as { ns: number; ghost: number; hc: number; score: number; n: number }[];
  return enforcementFor({ noShows30d: r[0].ns, score: r[0].score, eventsCount: r[0].n, hostGhost30d: r[0].ghost, hostCancels30d: r[0].hc });
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
         where user_id = ${t.user_id}::uuid and created_at > now() - interval '${sql.raw(String(decayDays))} days'
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

  /** enforcement ladder — single source of truth for gates */
  app.get<{ Params: { userId: string } }>('/internal/enforcement/:userId', { preHandler: [app.authenticate, app.requireAdminRole('superadmin')] }, async (req) => {
    const st = await enforcementState(db, req.params.userId);
    return { ...st, cooldownUntil: st.cooldownUntil?.toISOString(), pausedUntil: st.pausedUntil?.toISOString() };
  });

  return { recompute, enforcementState: (userId: string) => enforcementState(db, userId) };
}
