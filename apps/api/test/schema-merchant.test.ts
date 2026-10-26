import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { join } from 'node:path';
import { startInfra, stopInfra, type TestInfra } from './db.js';

let infra: TestInfra | null = null;
let pool: pg.Pool | null = null;
const migrationsFolder = join(import.meta.dirname, '../drizzle');
let elapsedMs = 0;

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  const t0 = Date.now();
  await migrate(drizzle(pool), { migrationsFolder });
  elapsedMs = Date.now() - t0;
});

afterAll(async () => {
  await pool?.end();
  await stopInfra();
});

const T1_3_TABLES = [
  'merchant_accounts', 'merchant_staff', 'ladder_configs', 'ladder_levels',
  'memberships', 'coupons', 'drops', 'drop_claims', 'merchant_checkins', 'seat_charges',
  'subscriptions', 'entitlements', 'grants', 'founding_counters', 'merchant_subscriptions', 'invoices',
  'activity_items', 'notification_prefs', 'merchant_mutes', 'proximity_log', 'push_tokens',
  'blocks', 'reports', 'moderation_actions', 'safety_ratings', 'audit_log',
];

describe('T1.3 merchants/billing/notifications/safety schema', () => {
  it('full schema migrates from zero in < 30 s', () => {
    expect(elapsedMs).toBeLessThan(30_000);
  });

  it('all 26 tables exist', async () => {
    const client = await pool!.connect();
    try {
      const { rows } = await client.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1)`,
        [T1_3_TABLES],
      );
      expect(rows.map((r) => r.table_name).sort()).toEqual([...T1_3_TABLES].sort());
    } finally {
      client.release();
    }
  });

  it('seat_charges: one charge per check-in', async () => {
    const client = await pool!.connect();
    try {
      const u1 = crypto.randomUUID();
      const { rows: drows } = await client.query(
        `INSERT INTO districts (name_en, name_zh, boundary)
         VALUES ('t' || $1, 't', ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[[[[114,22],[114.01,22],[114.01,22.01],[114,22],[114,22]]]]}')::geography)
         RETURNING id`, [u1]);
      const { rows: vrows } = await client.query(
        `INSERT INTO venues (source, display_name, category, location, district_id)
         VALUES ('merchant', 'V', 'cafe', ST_SetSRID(ST_MakePoint(114.15, 22.28), 4326)::geography, $1) RETURNING id`, [drows[0].id]);
      const { rows: mrows } = await client.query(
        `INSERT INTO merchant_accounts (owner_user_id, venue_id, business_reg_cert_key) VALUES ($1, $2, 'k') RETURNING id`,
        [u1, vrows[0].id]);
      const cid = crypto.randomUUID();
      await client.query(
        `INSERT INTO seat_charges (merchant_id, venue_id, checkin_id, event_type, band, base_fee, amount)
         VALUES ($1, $2, $3, 'drop_seat', 1, 3, 3)`, [mrows[0].id, vrows[0].id, cid]);
      await expect(client.query(
        `INSERT INTO seat_charges (merchant_id, venue_id, checkin_id, event_type, band, base_fee, amount)
         VALUES ($1, $2, $3, 'drop_seat', 1, 3, 3)`, [mrows[0].id, vrows[0].id, cid])).rejects.toThrow();
    } finally {
      client.release();
    }
  });

  it('drop_claims (drop_id, user_id) unique; proximity_log pk limits 1/day', async () => {
    const client = await pool!.connect();
    try {
      const u = crypto.randomUUID();
      const { rows: drows } = await client.query(
        `INSERT INTO districts (name_en, name_zh, boundary)
         VALUES ('p' || $1, 'p', ST_GeomFromGeoJSON('{"type":"MultiPolygon","coordinates":[[[[114,22],[114.01,22],[114.01,22.01],[114,22],[114,22]]]]}')::geography)
         RETURNING id`, [u]);
      const { rows: vrows } = await client.query(
        `INSERT INTO venues (source, display_name, category, location, district_id)
         VALUES ('merchant', 'V2', 'cafe', ST_SetSRID(ST_MakePoint(114.16, 22.29), 4326)::geography, $1) RETURNING id`, [drows[0].id]);
      await client.query(
        `INSERT INTO merchant_accounts (owner_user_id, venue_id, business_reg_cert_key) VALUES ($1, $2, 'k2')`, [u, vrows[0].id]);
      const { rows: drops1 } = await client.query(
        `INSERT INTO drops (venue_id, kind, title, offer_text, capacity, starts_at, ends_at, status)
         VALUES ($1, 'individual', 'D', 'x', 5, now(), now() + interval '1 day', 'active') RETURNING id`, [vrows[0].id]);
      await client.query(`INSERT INTO drop_claims (drop_id, user_id) VALUES ($1, $2)`, [drops1[0].id, u]);
      await expect(client.query(`INSERT INTO drop_claims (drop_id, user_id) VALUES ($1, $2)`, [drops1[0].id, u])).rejects.toThrow();
      await client.query(`INSERT INTO proximity_log (user_id, sent_on, venue_id) VALUES ($1, CURRENT_DATE, $2)`, [u, vrows[0].id]);
      await expect(client.query(`INSERT INTO proximity_log (user_id, sent_on, venue_id) VALUES ($1, CURRENT_DATE, $2)`, [u, vrows[0].id])).rejects.toThrow();
    } finally {
      client.release();
    }
  });
});
