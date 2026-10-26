import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const healthResponse = z.object({
  status: z.literal('ok'),
  checks: z.object({
    db: z.boolean(),
    redis: z.boolean(),
  }),
  time: z.string(),
});

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        response: { 200: healthResponse, 503: healthResponse },
      },
    },
    async (_req, reply) => {
      let db = false;
      let redis = false;
      try {
        await app.db.query('SELECT 1');
        db = true;
      } catch {
        db = false;
      }
      try {
        redis = (await app.redis.ping()) === 'PONG';
      } catch {
        redis = false;
      }
      const body = { status: 'ok' as const, checks: { db, redis }, time: new Date().toISOString() };
      const code = db && redis ? 200 : 503;
      return reply.code(code).send(body);
    },
  );
};
