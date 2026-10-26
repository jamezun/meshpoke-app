import { z } from 'zod';

const bool = z.enum(['true', 'false']).transform((v) => v === 'true');

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  GOTRUE_URL: z.string().url().default('http://localhost:9999'),
  GOTRUE_JWT_SECRET: z.string().min(32),

  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:8081'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  SENTRY_DSN: z.string().optional(),

  PII_ENCRYPTION_KEY: z.string().length(64),
  QR_HMAC_SECRET: z.string().min(32),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(12),
  ENABLE_SWAGGER: bool.default('true'),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return parsed.data;
}

export const corsOrigins = (config: Config): string[] =>
  config.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
