import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';
import { Redis } from 'ioredis';
import pg from 'pg';
import { corsOrigins, type Config } from './config.js';
import { healthRoutes } from './routes/health.js';
import { registerAuth } from './auth.js';
import { registerMe } from './routes/me.js';
import { registerPhone } from './routes/phone.js';
import { registerDataOwner } from './routes/dataOwner.js';
import { registerCaps } from './routes/caps.js';
import { registerKeywords } from './routes/keywords.js';
import { GoTrueClient } from './gotrue.js';
import { initSentry } from './observability.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
    db: pg.Pool;
    redis: Redis;
  }
}

export interface BuildAppOptions {
  config: Config;
  /** Testcontainers helper injects per-run instances. */
  db?: pg.Pool;
  redis?: Redis;
}

let reqCounter = 0;

export async function buildApp(opts: BuildAppOptions) {
  const { config } = opts;
  initSentry(config);

  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      genReqId: () => `req_${Date.now().toString(36)}_${(reqCounter++).toString(36)}`,
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    },
    // Zod validator + serializer shared with the type provider
  }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.decorate('config', config);
  app.decorate(
    'db',
    opts.db ??
      new pg.Pool({
        connectionString: config.DATABASE_URL,
        max: 10,
      }),
  );
  app.decorate(
    'redis',
    opts.redis ?? new Redis(config.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: false }),
  );

  await app.register(helmet);
  await app.register(cors, { origin: corsOrigins(config), credentials: true });
  await app.register(sensible);
  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
    nameSpace: 'rl:',
    redis: app.redis,
    // health checks stay unthrottled for uptime probes
    keyGenerator: (req) => (req.url === '/v1/health' ? 'health' : req.ip),
  });

  if (config.ENABLE_SWAGGER && config.NODE_ENV !== 'production') {
    await app.register(swagger, {
      // render Zod route schemas into the OpenAPI spec
      transform: jsonSchemaTransform,
      openapi: {
        openapi: '3.1.0',
        info: { title: 'MeshPoke API', version: '0.1.0' },
        servers: [{ url: 'https://api.meshpoke.com', description: 'prod' }, { url: 'http://localhost:3000', description: 'dev' }],
      },
    });
    await app.register(swaggerUi, { routePrefix: '/docs' });
  }

  // RFC 7807 problem+json errors, with request id correlation
  app.setErrorHandler((err: FastifyError, req, reply) => {
    const status = err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
    req.log.error({ err }, status >= 500 ? 'unhandled error' : 'request error');
    reply.code(status).header('content-type', 'application/problem+json').send({
      type: `https://docs.meshpoke.com/errors/${status}`,
      title: err.name || 'InternalServerError',
      status,
      detail: status >= 500 && config.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      instance: req.url,
      request_id: req.id,
    });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.code(404).header('content-type', 'application/problem+json').send({
      type: 'https://docs.meshpoke.com/errors/404',
      title: 'NotFound',
      status: 404,
      detail: `Route ${req.method} ${req.url} not found`,
      instance: req.url,
      request_id: req.id,
    });
  });

  // Close decorated infra on shutdown (app.close / SIGTERM)
  const dbProvided = Boolean(opts.db);
  const redisProvided = Boolean(opts.redis);
  app.addHook('onClose', async () => {
    if (!dbProvided) await app.db.end();
    if (!redisProvided) app.redis.disconnect();
  });

  await app.register(healthRoutes, { prefix: '/v1' });
  registerAuth(app, config.DATABASE_URL, app.redis, config.GOTRUE_JWT_SECRET);
  const gotrue = new GoTrueClient(config);
  await app.register(
    (instance) => {
      registerMe(instance, config.DATABASE_URL, app.redis);
      registerPhone(instance, config.DATABASE_URL, app.redis, gotrue);
      registerDataOwner(instance, config.DATABASE_URL, app.redis, gotrue);
      registerCaps(instance, config.DATABASE_URL);
      registerKeywords(instance, config.DATABASE_URL);
    },
    { prefix: '/v1' },
  );
  return app;
}
