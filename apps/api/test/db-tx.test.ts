import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { join } from 'node:path';
import { withTx, claimSlot, type Db } from '../src/db/client.js';
import { sql } from 'drizzle-orm';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import * as schema from '../src/db/schema/index.js';

let infra: TestInfra | null = null;
let db: Db | null = null;
let pool: pg.Pool | null = null;

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 10 });
  db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: join(import.meta.dirname, '../drizzle') });
});

afterAll(async () => {
  await pool?.end();
  await stopInfra();
});

describe('withTx + claimSlot (T1.5)', () => {
  it('concurrent claims never exceed max; totals exact', async () => {
    const client = await pool!.connect();
    try {
      await client.query(`INSERT INTO founding_counters (key, used, max) VALUES ('test_cap', 0, 25)`);
    } finally {
      client.release();
    }
    const results = await Promise.all(
      Array.from({ length: 40 }, () => withTx(db!, (tx) => claimSlot(tx, 'founding_counters', 'test_cap'))),
    );
    const successes = results.filter((r) => r !== null);
    expect(successes).toHaveLength(25); // exactly max, no oversell
    expect(new Set(successes)).toEqual(new Set([...Array(25)].map((_, i) => i + 1))); // used went 1..25 exactly once each
    const client2 = await pool!.connect();
    try {
      const { rows } = await client2.query(`SELECT used FROM founding_counters WHERE key='test_cap'`);
      expect(rows[0].used).toBe(25);
    } finally {
      client2.release();
    }
  });

  it('withTx rolls back on throw', async () => {
    await withTx(db!, async (tx) => {
      await tx.execute(sql`INSERT INTO founding_counters (key, used, max) VALUES ('rollback_test', 5, 10)`);
    });
    await expect(
      withTx(db!, async (tx) => {
        await tx.execute(sql`UPDATE founding_counters SET used = 9 WHERE key = 'rollback_test'`);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    const client = await pool!.connect();
    try {
      const { rows } = await client.query(`SELECT used FROM founding_counters WHERE key='rollback_test'`);
      expect(rows[0].used).toBe(5); // update rolled back
    } finally {
      client.release();
    }
  });
});
