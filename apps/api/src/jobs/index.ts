/**
 * pg-boss jobs (BUILD_PLAN §Jobs): registered in one place, workers in src/jobs/.
 * Schedules here; heavy lifting lives in pure modules (testable without a queue).
 */
import pg from 'pg';
import { PgBoss } from 'pg-boss';
import { fetchFehdXml, applyFehdImport } from '../venues/fehd.js';
import { geocodePendingVenues } from '../venues/als.js';

export async function startJobs(databaseUrl: string, fehdUrl: string, districtFilter?: string[]) {
  const boss = new PgBoss({ connectionString: databaseUrl });
  boss.on('error', (err: unknown) => console.error('[jobs] boss error', err));
  await boss.start();

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 2 });

  await boss.work('fehd-import', async () => {
    const xml = await fetchFehdXml(fehdUrl);
    const { parseFehdXml } = await import('../venues/fehd.js');
    const result = await applyFehdImport(pool, parseFehdXml(xml), { districtFilter });
    console.log('[jobs] fehd-import', JSON.stringify(result));
  });
  // daily 10:00 HKT = 02:00 UTC; geocode sweep right after (ALS throttle handles pacing)
  await boss.schedule('fehd-import', '0 2 * * *', { filter: districtFilter });
  await boss.work('als-geocode', async () => {
    const r = await geocodePendingVenues(pool);
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY venue_activity_7d');
    console.log('[jobs] als-geocode', JSON.stringify(r));
  });
  await boss.schedule('als-geocode', '30 2 * * *');

  return { boss, pool };
}
