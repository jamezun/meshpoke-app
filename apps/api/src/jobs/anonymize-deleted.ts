/**
 * Daily anonymisation: users soft-deleted >30 days ago get PII scrubbed + name genericised.
 * Run: pnpm --filter @meshpoke/api anonymize  (Dokploy cron: 0 4 * * *)
 */
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { loadConfig } from '../config.js';

export async function anonymizeDeleted(dbUrl?: string): Promise<number> {
  // tests pass their container URL; cron entrypoint resolves env below
  const db = getDb(dbUrl ?? loadConfig(process.env).DATABASE_URL);
  const res = await db.execute(sql`
    UPDATE users SET
      display_name = 'Deleted user',
      email = 'deleted+' || id || '@meshpoke.invalid',
      phone_e164 = NULL,
      phone_hash = NULL,
      referral_code = 'DEL' || left(id::text, 8),
      anonymized_at = now()
    WHERE deleted_at IS NOT NULL
      AND deleted_at < now() - interval '30 days'
      AND anonymized_at IS NULL
    RETURNING id`);
  return (res as unknown as { rows: unknown[] }).rows.length;
}

if (process.argv[1]?.endsWith('anonymize-deleted.ts')) {
  anonymizeDeleted().then((n) => { console.log(`anonymized ${n} users`); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
}
