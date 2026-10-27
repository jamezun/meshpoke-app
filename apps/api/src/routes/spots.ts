/// Event spots (BUILD_PLAN T9.1): creator-admin creation with full knobs (PRD §3.5).
/// Chat-spot creation stays in rooms.ts; this module owns kind:"event".
/// Rules: hosting capacity (1/3/5 earned), required keywords ≤3, min≤max headcount,
/// district anchor while forming (venue pin comes at confirm — T9.4), date range.
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { capture } from '../analytics.js';
import { z } from 'zod';
import { getDb } from '../db/client.js';

const TEMPLATES = ['dinner', 'drinks', 'coffee', 'hike', 'run', 'tennis', 'pickleball', 'badminton', 'board_games', 'industry_mingle', 'open_sport'] as const;

const CreateEvent = z
  .object({
    template: z.enum(TEMPLATES),
    name: z.string().trim().min(3).max(60),
    requiredKeywords: z.array(z.string().trim().min(1).max(40)).max(3).optional(),
    minScore: z.number().min(0).max(1).optional(),
    priceRange: z.enum(['free', '$', '$$', '$$$']).optional(), // informational only
    joinMode: z.enum(['open', 'application']).default('application'),
    districtId: z.string().uuid(),
    minHeadcount: z.number().int().min(2),
    maxHeadcount: z.number().int(),
    overbookBuffer: z.number().int().min(0).max(10).optional(),
    dateStart: z.string().datetime(),
    dateEnd: z.string().datetime(),
  })
  .refine((v) => v.maxHeadcount >= v.minHeadcount, { message: 'maxHeadcount must be ≥ minHeadcount' })
  .refine((v) => new Date(v.dateEnd) > new Date(v.dateStart), { message: 'dateEnd must be after dateStart' });

export function registerSpots(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);
  const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

  app.post<{ Body: unknown }>('/spots/events', { preHandler: [app.authenticate] }, async (req, reply) => {
    const userId = req.user!.id;
    const parsed = CreateEvent.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(422).send({ problem: { title: 'Invalid spot', status: 422, detail: parsed.error.issues.map((i) => i.message).join('; ') } });
    }
    const v = parsed.data;

    // liveness gate (same as chat spots): phone-verified, not deleted
    const alive = rows(await db.execute(sql`select 1 from users where id = ${userId} and deleted_at is null and liveness_state = 'verified'`));
    if (alive.length === 0) return reply.code(403).send({ problem: { title: 'Phone verification required to host', status: 403 } });

    // district must exist
    const district = rows(await db.execute(sql`select 1 from districts where id = ${v.districtId}::uuid`));
    if (district.length === 0) return reply.code(422).send({ problem: { title: 'Unknown district', status: 422 } });

    // hosting capacity (1/3/5 earned via Show-up Score) — counts active hosted spots of BOTH kinds
    const cap = rows(await db.execute(sql`select max_active from hosting_capacity where user_id = ${userId}`));
    const maxActive = (cap[0]?.max_active as number | undefined) ?? 1;
    const active = rows(
      await db.execute(sql`
        select count(*)::int as n from spots s
        join spot_members m on m.spot_id = s.id and m.user_id = ${userId} and m.role = 'host' and m.state = 'active'
        where s.state is null or s.state in ('forming','confirmed','live')`),
    );
    if ((active[0].n as number) >= maxActive) {
      return reply.code(402).send({ problem: { title: 'Hosting cap reached', status: 402, detail: 'Earn a higher Show-up Score to host more spots.', type: 'cap', capType: 'hosting' } });
    }

    // event caps from entitlements (activeEventSpots: free 3 / plus 5 / pro 10)
    const ent = rows(await db.execute(sql`select coalesce(plan,'free') as plan from entitlements where user_id = ${userId} and (expires_at is null or expires_at > now())`));
    const plan = (ent[0]?.plan as string | undefined) ?? 'free';
    const eventCap = plan === 'pro' ? 10 : plan === 'plus' ? 5 : 3;
    const activeEvents = rows(
      await db.execute(sql`
        select count(*)::int as n from spots s
        join spot_members m on m.spot_id = s.id and m.user_id = ${userId} and m.role = 'host' and m.state = 'active'
        where s.kind = 'event' and (s.state is null or s.state in ('forming','confirmed','live'))`),
    );
    if ((activeEvents[0].n as number) >= eventCap) {
      return reply.code(402).send({ problem: { title: 'Active event spots cap reached', status: 402, detail: `Your plan allows ${eventCap} active event spots.`, type: 'cap', capType: 'activeEventSpots' } });
    }

    const dateRange = `[${new Date(v.dateStart).toISOString()}, ${new Date(v.dateEnd).toISOString()}]`;
    const keywords = sql.param(v.requiredKeywords ?? []); // sql.param: raw JS array would inline as tuple ()
    const res = await db.execute(sql`
      with s as (insert into spots
                   (kind, host_user_id, template, name, required_keywords, min_score, price_range, join_mode,
                    district_id, min_headcount, max_headcount, overbook_buffer, date_range, state)
                 values ('event', ${userId}::uuid, ${v.template}::spot_template, ${v.name}, ${keywords}::text[],
                         ${v.minScore !== undefined ? String(v.minScore) : null}::numeric, ${v.priceRange ?? null}, ${v.joinMode}::join_mode,
                         ${v.districtId}::uuid, ${v.minHeadcount}, ${v.maxHeadcount}, ${v.overbookBuffer ?? 0}, ${dateRange}, 'forming')
                 returning id),
           r as (insert into rooms (kind, spot_id) select 'event', id from s returning id)
      insert into spot_members (spot_id, user_id, role) select id, ${userId}, 'host' from s returning spot_id`);
    const spotId = rows(res)[0].spot_id as string;
    await db.execute(sql`insert into room_members (room_id, user_id, role) select id, ${userId}, 'host' from rooms where spot_id = ${spotId} on conflict do nothing`);
    capture('spot_created', req.user!.id, { template: v.template, joinMode: v.joinMode });
    return { spotId, state: 'forming' };
  });
}
