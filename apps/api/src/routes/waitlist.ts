/// Public waitlist signup (T8.5) — marketing form posts here before auth exists.
/// No auth; per-IP rate limit + email validation; idempotent (duplicate → 200 already_joined).
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client.js';

const Body = z.object({ email: z.string().email().max(254), source: z.string().max(32).optional() });

export function registerWaitlist(app: FastifyInstance, dbUrl: string) {
  const db = getDb(dbUrl);

  app.post('/waitlist', { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } }, async (req, reply) => {
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return reply.code(422).send({ problem: { title: 'Valid email required', status: 422 } });
    const { email, source } = parsed.data;
    const res = await db.execute(
      sql`insert into waitlist_signups (email, source) values (${email.toLowerCase()}, ${source ?? 'web'})
          on conflict (email) do nothing
          returning id`,
    );
    const rows = (res as unknown as { rows: unknown[] }).rows;
    return { status: 'ok', alreadyJoined: rows.length === 0 };
  });

  app.get('/admin/waitlist', { preHandler: [app.authenticate, app.requireAdminRole('support')] }, async () => {
    const res = await db.execute(
      sql`select email, source, created_at from waitlist_signups order by created_at desc limit 1000`,
    );
    return { signups: (res as unknown as { rows: unknown[] }).rows };
  });
}
