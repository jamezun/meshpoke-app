import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { join } from 'node:path';
import { startInfra, stopInfra, type TestInfra } from './db.js';

let infra: TestInfra | null = null;
let pool: pg.Pool | null = null;
const migrationsFolder = join(import.meta.dirname, '../drizzle');

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder });
});

afterAll(async () => {
  await pool?.end();
  await stopInfra();
});

async function mkUser(client: pg.PoolClient, id: string) {
  await client.query(
    `INSERT INTO users (id, email, auth_provider, display_name, date_of_birth, referral_code)
     VALUES ($1, $2, 'email', 'T', '2000-01-01', $3)`,
    [id, `${id}@t.hk`, id.replace(/-/g, '').slice(0, 12)],
  );
}

describe('T1.1 core schema', () => {
  it('migration applies; re-run is idempotent; all 7 tables exist', async () => {
    const client = await pool!.connect();
    try {
      const db = drizzle(pool!);
      await migrate(db, { migrationsFolder });
      const { rows } = await client.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN
         ('users','profiles','keywords','districts','venues','venue_reports','saved_venues') ORDER BY 1`,
      );
      expect(rows.map((r) => r.table_name)).toEqual(['districts', 'keywords', 'profiles', 'saved_venues', 'users', 'venue_reports', 'venues']);
    } finally {
      client.release();
    }
  });

  it('keyword trigger rejects the 11th keyword and the 4th level-8', async () => {
    const client = await pool!.connect();
    try {
      const uid = crypto.randomUUID();
      await mkUser(client, uid);
      for (let i = 0; i < 7; i++) {
        await client.query('INSERT INTO keywords (user_id, keyword, level) VALUES ($1, $2, 1)', [uid, `kw${i}`]);
      }
      await client.query('INSERT INTO keywords (user_id, keyword, level) VALUES ($1, $2, 8)', [uid, 'hiking']);
      await client.query('INSERT INTO keywords (user_id, keyword, level) VALUES ($1, $2, 8)', [uid, 'tennis']);
      await client.query('INSERT INTO keywords (user_id, keyword, level) VALUES ($1, $2, 8)', [uid, 'finance']);
      // 10 keywords, 3 at level 8 — the ceiling
      await expect(client.query('INSERT INTO keywords (user_id, keyword, level) VALUES ($1, $2, 1)', [uid, 'overflow']))
        .rejects.toThrow(/keyword cap/);
      // free a low slot; 4th level-8 must still fail (total stays ≤ 10)
      await client.query("DELETE FROM keywords WHERE user_id=$1 AND keyword='kw0'", [uid]);
      await expect(client.query('INSERT INTO keywords (user_id, keyword, level) VALUES ($1, $2, 8)', [uid, 'bignum']))
        .rejects.toThrow(/level-8 keyword cap/);
    } finally {
      client.release();
    }
  });

  it('citext keyword dedupe (Hiking = hiking)', async () => {
    const client = await pool!.connect();
    try {
      const uid = crypto.randomUUID();
      await mkUser(client, uid);
      await client.query('INSERT INTO keywords (user_id, keyword, level) VALUES ($1, $2, 1)', [uid, 'Hiking']);
      await expect(client.query('INSERT INTO keywords (user_id, keyword, level) VALUES ($1, $2, 1)', [uid, 'hiking']))
        .rejects.toThrow();
    } finally {
      client.release();
    }
  });

  it('geography MultiPolygon round-trips via GeoJSON', async () => {
    const client = await pool!.connect();
    try {
      const { rows } = await client.query(
        `INSERT INTO districts (name_en, name_zh, boundary)
         VALUES ('Test', '測試', ST_GeomFromGeoJSON($1)::geography)
         RETURNING ST_AsGeoJSON(boundary)::json AS gj`,
        [JSON.stringify({ type: 'MultiPolygon', coordinates: [[[[114.1, 22.2], [114.2, 22.2], [114.2, 22.3], [114.1, 22.3], [114.1, 22.2]]]] })],
      );
      expect(rows[0].gj.type).toBe('MultiPolygon');
    } finally {
      client.release();
    }
  });
});
