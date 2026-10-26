import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db/client.js';

/** T13.1 reports & blocks — POST /reports, POST/DELETE /blocks/:userId, auto-mute at 3 distinct reports. */
export function registerSafety(app: FastifyInstance, dbUrl: string): void {
  const db = getDb(dbUrl);
  const rows = (r: unknown) => (r as { rows: Record<string, unknown>[] }).rows;

  const Target = z.enum(['user', 'message', 'spot', 'venue']);

  app.post('/reports', {
    preHandler: app.authenticate,
    schema: { body: z.object({ targetType: Target, targetId: z.string().uuid(), reason: z.string().min(3).max(200) }) },
  }, async (req, reply) => {
    const me = req.user!.id;
    const b = req.body as { targetType: z.infer<typeof Target>; targetId: string; reason: string };

    if (b.targetType === 'user' && b.targetId === me) {
      return reply.code(422).send({ problem: { title: 'Cannot report yourself', status: 422 } });
    }
    const dup = rows(await db.execute(sql`
      select 1 from reports
       where reporter_id = ${me}::uuid and target_type = ${b.targetType} and target_id = ${b.targetId}::uuid and status = 'open'`));
    if (dup.length > 0) {
      return reply.code(409).send({ problem: { title: 'Already reported', status: 409 } });
    }
    await db.execute(sql`
      insert into reports (reporter_id, target_type, target_id, reason)
      values (${me}::uuid, ${b.targetType}, ${b.targetId}::uuid, ${b.reason})`);

    // 3 distinct open reports on a user → auto-mute (posting disabled) pending review
    if (b.targetType === 'user') {
      const n = rows(await db.execute(sql`
        select count(distinct reporter_id)::int as n from reports
         where target_type = 'user' and target_id = ${b.targetId}::uuid and status = 'open'`));
      if ((n[0].n as number) >= 3) {
        const SYSTEM = '00000000-0000-0000-0000-000000000000';
        await db.execute(sql`
          insert into moderation_actions (admin_id, target_user, action, reason, audit)
          select ${SYSTEM}::uuid, ${b.targetId}::uuid, 'mute', 'auto: 3 distinct reports', jsonb_build_object('auto', true)
          where (select action from moderation_actions
                  where target_user = ${b.targetId}::uuid order by created_at desc limit 1)
                in ('restore') or not exists (
            select 1 from moderation_actions where target_user = ${b.targetId}::uuid)`);
      }
    }
    return reply.code(201).send({ status: 'ok' });
  });

  app.post('/blocks/:userId', {
    preHandler: app.authenticate,
    schema: { params: z.object({ userId: z.string().uuid() }) },
  }, async (req, reply) => {
    const me = req.user!.id;
    const { userId } = req.params as { userId: string };
    if (userId === me) return reply.code(422).send({ problem: { title: 'Cannot block yourself', status: 422 } });
    const target = rows(await db.execute(sql`select 1 from users where id = ${userId}::uuid`));
    if (target.length === 0) return reply.code(404).send({ problem: { title: 'User not found', status: 404 } });
    await db.execute(sql`
      insert into blocks (blocker_id, blocked_id) values (${me}::uuid, ${userId}::uuid)
      on conflict do nothing`);
    return reply.code(201).send({ status: 'ok' });
  });

  app.delete('/blocks/:userId', {
    preHandler: app.authenticate,
    schema: { params: z.object({ userId: z.string().uuid() }) },
  }, async (req, reply) => {
    const me = req.user!.id;
    const { userId } = req.params as { userId: string };
    await db.execute(sql`delete from blocks where blocker_id = ${me}::uuid and blocked_id = ${userId}::uuid`);
    return reply.send({ status: 'ok' });
  });
}
