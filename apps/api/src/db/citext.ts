import { customType } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/** citext — case-insensitive text (needs `CREATE EXTENSION citext`, done in migration 0000). */
export const citext = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'citext';
  },
});

/** Ensure citext extension exists (safe to call repeatedly). */
export const ensureCitext = sql`CREATE EXTENSION IF NOT EXISTS citext`;
