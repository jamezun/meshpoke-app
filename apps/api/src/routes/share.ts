/// Public share card data for /s/{id} OG rendering (PRD §6.1).
/// NO member data — only what a WhatsApp preview may show.
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';

export function registerShare(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);

  app.get<{ Params: { id: string } }>('/spots/:id/share', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (req, reply) => {
    const res = await db.execute(sql`
      select s.name, s.template, d.name_en as district, s.state, s.starts_at as event_date,
             (select count(*)::int from spot_members m where m.spot_id = s.id and m.role <> 'waitlist') as headcount,
             s.max_headcount
        from spots s left join districts d on d.id = s.district_id
       where s.id = ${req.params.id} and coalesce(s.state, 'forming') not in ('cancelled','dissolved')`);
    const spot = (res as unknown as { rows: Record<string, unknown>[] }).rows[0];
    if (!spot) return reply.code(404).send({ problem: { title: 'Spot not found', status: 404 } });
    return {
      name: spot.name,
      template: spot.template,
      district: spot.district,
      state: spot.state ?? 'forming',
      headcount: spot.headcount,
      maxHeadcount: spot.max_headcount,
      eventDate: spot.event_date,
    };
  });
}
