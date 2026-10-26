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
  await migrate(drizzle(pool), { migrationsFolder });
});

afterAll(async () => {
  await pool?.end();
  await stopInfra();
});

const T1_2_TABLES = [
  'spots', 'spot_members', 'applications', 'attendance', 'absence_reports',
  'score_events', 'showup_scores', 'hosting_capacity', 'pokes', 'connections',
  'poke_balances', 'referrals', 'rooms', 'room_members', 'messages',
  'crews', 'crew_members', 'rebooks',
];

describe('T1.2 spots/attendance/trust/pokes/chat/crews schema', () => {
  it('all 18 tables exist', async () => {
    const client = await pool!.connect();
    try {
      const { rows } = await client.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1) ORDER BY 1`,
        [T1_2_TABLES],
      );
      expect(rows.map((r) => r.table_name).sort()).toEqual([...T1_2_TABLES].sort());
    } finally {
      client.release();
    }
  });

  it('§11.2 indexes exist (spots browse, applications queue, pokes partial, messages room)', async () => {
    const client = await pool!.connect();
    try {
      const { rows } = await client.query(
        `SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname = ANY($1)`,
        [['spots_browse_idx', 'applications_queue_idx', 'pokes_pending_expiry_idx', 'messages_room_idx', 'connections_pair_idx', 'venues_location_gist', 'districts_boundary_gist']],
      );
      expect(rows).toHaveLength(7);
    } finally {
      client.release();
    }
  });

  it('pokes partial index only covers pending', async () => {
    const client = await pool!.connect();
    try {
      const { rows } = await client.query(
        `SELECT pg_get_indexdef(i.indexrelid) AS def FROM pg_index i
         JOIN pg_class c ON c.oid = i.indexrelid WHERE c.relname = 'pokes_pending_expiry_idx'`,
      );
      expect(rows[0].def).toContain("status = 'pending'::poke_status");
    } finally {
      client.release();
    }
  });

  it('connections unique pair index rejects (a,b)+(b,a)', async () => {
    const client = await pool!.connect();
    try {
      const a = crypto.randomUUID();
      const b = crypto.randomUUID();
      await client.query('INSERT INTO connections (user_a, user_b) VALUES ($1, $2)', [a, b]);
      await expect(client.query('INSERT INTO connections (user_a, user_b) VALUES ($1, $2)', [b, a])).rejects.toThrow();
      await expect(client.query('INSERT INTO connections (user_a, user_b) VALUES ($1, $2)', [a, b])).rejects.toThrow();
    } finally {
      client.release();
    }
  });

  it('spots headcount check rejects min > max', async () => {
    const client = await pool!.connect();
    try {
      await expect(client.query(
        `INSERT INTO spots (kind, name, join_mode, min_headcount, max_headcount)
         VALUES ('event', 'x', 'open', 5, 3)`,
      )).rejects.toThrow(/headcount/);
    } finally {
      client.release();
    }
  });
});
