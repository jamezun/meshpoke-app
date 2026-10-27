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
import { registerPhotos } from './routes/photos.js';
import { registerUsers } from './routes/users.js';
import { registerMap } from './routes/map.js';
import { registerVenues } from './routes/venues.js';
import { registerMeta } from './routes/meta.js';
import { registerShare } from './routes/share.js';
import { registerWaitlist } from './routes/waitlist.js';
import { registerRealtime } from './routes/realtime.js';
import { registerRooms } from './routes/rooms.js';
import { registerSpots } from './routes/spots.js';
import { registerSpotJoin } from './routes/spotJoin.js';
import { registerSpotLifecycle } from './routes/spotLifecycle.js';
import { registerImHere } from './routes/imHere.js';
import { registerAttendance } from './routes/attendance.js';
import { registerScore } from './routes/score.js';
import { registerPokeLedger } from './routes/pokeLedger.js';
import { registerPokes } from './routes/pokes.js';
import { registerSafety } from './routes/safety.js';
import { registerShareSafety } from './routes/shareSafety.js';
import { registerActivity } from './routes/activity.js';
import { registerUserQr } from './routes/userQr.js';
import { registerScan } from './routes/scan.js';
import { registerCrews } from './routes/crews.js';
import { registerRebook } from './routes/rebook.js';
import { registerMerchant } from './routes/merchant.js';
import { registerAdmin } from './routes/admin.js';
import { storageFromEnv } from './storage.js';
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
  // Socket.io rides the same HTTP server (path /ws); needs a real listener — skipped in unit tests via LIGHT_API=1? no: attach anyway, inject doesn't hit ws.
  await registerRealtime(app, config.DATABASE_URL, config.REDIS_URL, config.GOTRUE_JWT_SECRET);
  registerAuth(app, config.DATABASE_URL, app.redis, config.GOTRUE_JWT_SECRET);
  const storage = storageFromEnv(process.env);
  await app.register(async (r) => registerRooms(r, config.DATABASE_URL), { prefix: '/v1' });
  await app.register(async (r) => registerSpots(r, config.DATABASE_URL), { prefix: '/v1' });
  await app.register(async (r) => registerSpotJoin(r, config.DATABASE_URL), { prefix: '/v1' });
  await app.register(async (r) => registerSpotLifecycle(r, config.DATABASE_URL), { prefix: '/v1' });
  await app.register(async (r) => registerImHere(r, config.DATABASE_URL), { prefix: '/v1' });
  await app.register(async (r) => registerAttendance(r, config.DATABASE_URL), { prefix: '/v1' });
  await app.register(async (r) => registerScore(r, config.DATABASE_URL), { prefix: '/v1' });
  await app.register(async (r) => registerPokeLedger(r, config.DATABASE_URL), { prefix: '/v1' });
  await app.register(async (r) => registerPokes(r, config.DATABASE_URL), { prefix: '/v1' });
  await app.register(async (r) => registerSafety(r, config.DATABASE_URL), { prefix: '/v1' });
  await app.register(async (r) => registerShareSafety(r, config.DATABASE_URL, config.QR_HMAC_SECRET), { prefix: '/v1' });
  await app.register(async (r) => registerActivity(r, config.DATABASE_URL), { prefix: '/v1' });
  await app.register(async (r) => registerUserQr(r, config.DATABASE_URL, config.QR_HMAC_SECRET), { prefix: '/v1' });
  await app.register(async (r) => registerScan(r, config.DATABASE_URL, config.QR_HMAC_SECRET), { prefix: '/v1' });
  await app.register(async (r) => registerCrews(r, config.DATABASE_URL), { prefix: '/v1' });
  await app.register(async (r) => registerRebook(r, config.DATABASE_URL), { prefix: '/v1' });
  await app.register(async (r) => registerMerchant(r, config.DATABASE_URL, storage), { prefix: '/v1' });
  await app.register(async (r) => registerAdmin(r, config.DATABASE_URL, storage), { prefix: '/v1' });
  const gotrue = new GoTrueClient(config);
  await app.register(
    (instance) => {
      registerMe(instance, config.DATABASE_URL, app.redis);
      registerPhone(instance, config.DATABASE_URL, app.redis, gotrue);
      registerDataOwner(instance, config.DATABASE_URL, app.redis, gotrue);
      registerCaps(instance, config.DATABASE_URL);
      registerKeywords(instance, config.DATABASE_URL);
      registerMap(instance, config.DATABASE_URL);
      registerVenues(instance, config.DATABASE_URL);
      registerMeta(instance);
      registerShare(instance, config.DATABASE_URL);
      registerWaitlist(instance, config.DATABASE_URL);
      if (storage) {
        registerPhotos(instance, config.DATABASE_URL, storage);
        registerUsers(instance, config.DATABASE_URL, storage);
      }
    },
    { prefix: '/v1' },
  );
  return app;
}
