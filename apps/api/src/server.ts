import 'dotenv/config';
import { loadConfig } from './config.js';
import { buildApp } from './app.js';

const config = loadConfig();
const app = await buildApp({ config });

if (config.ENABLE_JOBS && config.FEHD_URL) {
  const { startJobs } = await import('./jobs/index.js');
  await startJobs(config.DATABASE_URL, config.FEHD_URL, config.FEHD_DISTRICTS?.split(',').map((d) => d.trim()));
  app.log.info('jobs started (fehd-import daily 02:00 UTC)');
}

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ port: config.PORT });
