/**
 * T17.4 advanced filters gate: Plus/Pro or an active filter_pass grant (HK$18/7d).
 * Free users can always browse; only the extra keyword filter is paid.
 */
import { sql } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Db } from '../db/client.js';

const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

export async function hasAdvancedFilters(db: Db, userId: string): Promise<boolean> {
  const r = rows(await db.execute(sql`
    select 1 where exists (
        select 1 from entitlements
         where user_id = ${userId}::uuid and plan in ('plus', 'pro')
           and (expires_at is null or expires_at > now()))
      or exists (
        select 1 from grants
         where user_id = ${userId}::uuid and kind = 'filter_pass' and ends_at > now())`));
  return r.length > 0;
}

/** 402 problem when the caller uses filter features without Plus/Pro or a pass. */
export async function requireAdvancedFilters(db: Db, req: FastifyRequest, reply: FastifyReply): Promise<boolean> {
  if (!req.user) {
    await reply.code(401).send({ problem: { title: 'Unauthorized', status: 401 } });
    return false;
  }
  if (await hasAdvancedFilters(db, req.user.id)) return true;
  await reply.code(402).send({
    problem: {
      title: 'Keyword filters need Plus/Pro or the HK$18 weekly filter pass', status: 402, type: 'filter_pass',
    },
  });
  return false;
}
