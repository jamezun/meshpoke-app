import type { Config } from './config.js';

/**
 * ponytail: no-op until a DSN exists — install @sentry/node and wire
 * Sentry.init({ dsn }) here when the VPS is up (T-migrations/ops milestone).
 */
export function initSentry(config: Config): void {
  if (config.SENTRY_DSN) {
    // Not wired yet; log once so a configured DSN isn't silently ignored.
    console.warn('[observability] SENTRY_DSN set but Sentry client not installed yet');
  }
}
