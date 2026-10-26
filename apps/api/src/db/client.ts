/**
 * Pool + transaction helpers. Single pool per process; tests import providedDb variants.
 */
import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema/index.js';
import { sql, type SQL } from 'drizzle-orm';

export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

let cachedPool: pg.Pool | null = null;

export function getPool(url: string): pg.Pool {
  if (!cachedPool) {
    cachedPool = new pg.Pool({ connectionString: url, max: 10 });
  }
  return cachedPool;
}

export function getDb(url: string): Db {
  return drizzle(getPool(url), { schema });
}

/**
 * Run `fn` inside a transaction. Pass the tx as the ONLY db handle to `fn`'s queries.
 * Throws propagate and roll back.
 */
export async function withTx<T>(db: Db, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(fn);
}

/**
 * Lock a row FOR UPDATE inside a transaction. Returns the locked row or null.
 * Usage: counter/capacity claims (founding_counters, capacities, waitlists).
 */
export async function lockRow<T extends Record<string, unknown>>(
  tx: Tx,
  table: string,
  where: SQL,
): Promise<T | null> {
  const res = await tx.execute<T>(sql`SELECT * FROM ${sql.identifier(table)} WHERE ${where} FOR UPDATE`);
  const rows = (res as unknown as { rows: T[] }).rows;
  return rows[0] ?? null;
}

/**
 * Atomically claim a slot from a counter-like row (key/used/max columns):
 * `UPDATE t SET used = used + 1 WHERE key = $1 AND used < max RETURNING used`.
 * Returns the new used value, or null if the row is at capacity.
 */
export async function claimSlot(tx: Tx, table: string, key: string): Promise<number | null> {
  const res = await tx.execute<{ used: number }>(
    sql`UPDATE ${sql.identifier(table)} SET used = used + 1 WHERE key = ${key} AND used < max RETURNING used`,
  );
  const rows = (res as unknown as { rows: { used: number }[] }).rows;
  return rows[0]?.used ?? null;
}
