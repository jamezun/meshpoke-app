/**
 * One-shot FEHD import (BUILD_PLAN T8.5): fetch the live XML and upsert.
 * Usage: pnpm --filter @meshpoke/api fehd:import            (all districts)
 *        FEHD_DISTRICTS='Central and Western' pnpm …       (scoped)
 * Reads FEHD_URL / FEHD_DISTRICTS / DATABASE_URL from env (dotenv).
 * The daily pg-boss schedule in src/jobs does the same work in production.
 */
import 'dotenv/config';
import pg from 'pg';
import { fetchFehdXml, parseFehdXml, applyFehdImport } from '../src/venues/fehd.js';
import { loadConfig } from '../src/config.js';

const cfg = loadConfig();
const districtFilter = cfg.FEHD_DISTRICTS ? cfg.FEHD_DISTRICTS.split(',').map((d) => d.trim()).filter(Boolean) : undefined;
if (!cfg.FEHD_URL) throw new Error('FEHD_URL not set');

const pool = new pg.Pool({ connectionString: cfg.DATABASE_URL, max: 4 });
try {
  const xml = await fetchFehdXml(cfg.FEHD_URL);
  const result = await applyFehdImport(pool, parseFehdXml(xml), { districtFilter });
  console.log('[fehd:import]', JSON.stringify({ ...result, scoped: districtFilter ?? 'ALL' }));
} finally {
  await pool.end();
}
