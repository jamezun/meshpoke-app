import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { join } from 'node:path';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import { spawnSync } from 'node:child_process';

let infra: TestInfra | null = null;
let pool: pg.Pool | null = null;

async function runSeed(dbUrl: string) {
  const res = spawnSync('pnpm', ['--filter', '@meshpoke/api', 'db:seed'], {
    env: { ...process.env, DATABASE_URL: dbUrl },
    cwd: join(import.meta.dirname, '../..'),
    encoding: 'utf8',
  });
  if (res.status !== 0) throw new Error(`seed failed:\n${res.stderr}${res.stdout}`);
}

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  await migrate(drizzle(pool), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
  await runSeed(infra.dbUrl);
});

afterAll(async () => {
  await pool?.end();
  await stopInfra();
});

describe('T1.4 seed data', () => {
  it('18 districts with zh names; idempotent re-run', async () => {
    const client = await pool!.connect();
    try {
      const { rows } = await client.query('SELECT count(*)::int AS n FROM districts');
      expect(rows[0].n).toBe(18);
      const { rows: zh } = await client.query(`SELECT name_zh FROM districts WHERE name_en = 'Central and Western'`);
      expect(zh[0].name_zh).toBe('中西區');
      await runSeed(infra!.dbUrl); // second run must not duplicate
      const { rows: again } = await client.query('SELECT count(*)::int AS n FROM districts');
      expect(again[0].n).toBe(18);
    } finally {
      client.release();
    }
  });

  it('a point in Central resolves to Central and Western via ST_Contains', async () => {
    const client = await pool!.connect();
    try {
      const { rows } = await client.query(
        `SELECT name_en FROM districts
         WHERE ST_Contains(boundary::geometry, ST_SetSRID(ST_MakePoint(114.1547, 22.2820), 4326))`,
      );
      expect(rows.map((r) => r.name_en)).toContain('Central and Western');
    } finally {
      client.release();
    }
  });

  it('18 city rooms, founding counters, admin user', async () => {
    const client = await pool!.connect();
    try {
      const { rows: rooms } = await client.query(`SELECT count(*)::int AS n FROM rooms WHERE kind='city'`);
      expect(rooms[0].n).toBe(18);
      const { rows: counters } = await client.query(`SELECT key, max FROM founding_counters ORDER BY key`);
      expect(counters).toEqual([
        { key: 'consumer_500', max: 500 },
        { key: 'merchant_50', max: 50 },
      ]);
      const { rows: admin } = await client.query(`SELECT count(*)::int AS n FROM users WHERE liveness_state='verified'`);
      expect(admin[0].n).toBeGreaterThanOrEqual(1);
    } finally {
      client.release();
    }
  });
});
