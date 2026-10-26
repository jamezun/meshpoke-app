import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFehdXml, applyFehdImport } from '../src/venues/fehd.js';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import * as schema from '../src/db/schema/index.js';

let infra: TestInfra | null = null;
let pool: pg.Pool | null = null;

const FIXTURE = readFileSync(join(import.meta.dirname, 'fixtures/fehd-sample.xml'), 'utf8');

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
});

afterAll(async () => {
  await pool?.end();
  await stopInfra();
});

describe('T4.2 FEHD importer', () => {
  it('parses the fixture into 3 records with all fields', () => {
    const records = parseFehdXml(FIXTURE);
    expect(records).toHaveLength(3);
    const first = records.find((r) => r.licenceNo === '2211000123')!;
    expect(first.licenceType).toBe('General Restaurant');
    expect(first.nameEn).toBe('TEST CAFE CENTRAL');
    expect(first.nameZh).toBe('測試茶餐廳');
    expect(first.addrEn).toContain("QUEEN'S ROAD WEST");
    expect(first.addrEn).toContain('WESTERN PLAZA');
    expect(first.addrZh).toContain('皇后大道西');
    expect(first.district).toBe('CENTRAL AND WESTERN');
  });

  it('district filter scopes the import (launch: Central & Western only)', async () => {
    const records = parseFehdXml(FIXTURE);
    const r = await applyFehdImport(pool!, records, { districtFilter: ['CENTRAL AND WESTERN'] });
    expect(r.inserted).toBe(2);
    const n = await pool!.query(`SELECT count(*)::int AS n FROM venues WHERE source='fehd'`);
    expect(n.rows[0].n).toBe(2); // Kowloon City row skipped
  });

  it('idempotent re-run: 0 inserted, 2 updated, nothing closed', async () => {
    const records = parseFehdXml(FIXTURE);
    const r = await applyFehdImport(pool!, records, { districtFilter: ['CENTRAL AND WESTERN'] });
    expect(r.inserted).toBe(0);
    expect(r.updated).toBe(2);
    expect(r.closed).toBe(0);
  });

  it('closure detection: licence missing from file → closed + closed_at; reappears → reopened', async () => {
    // simulate licence 456 gone
    const shrink = parseFehdXml(FIXTURE).filter((r) => r.licenceNo !== '2211000456');
    const r1 = await applyFehdImport(pool!, shrink, { districtFilter: ['CENTRAL AND WESTERN'] });
    expect(r1.closed).toBe(1);

    const closed = await pool!.query(`SELECT status, closed_at IS NOT NULL AS has_ts FROM venues WHERE fehd_licence_no='2211000456'`);
    expect(closed.rows[0].status).toBe('closed');
    expect(closed.rows[0].has_ts).toBe(true);

    // full file again → reopened
    const r2 = await applyFehdImport(pool!, parseFehdXml(FIXTURE), { districtFilter: ['CENTRAL AND WESTERN'] });
    expect(r2.reopened).toBe(1);
    const back = await pool!.query(`SELECT status FROM venues WHERE fehd_licence_no='2211000456'`);
    expect(back.rows[0].status).toBe('active');
  });

  it('address change → geocode_status back to pending', async () => {
    await pool!.query(`UPDATE venues SET geocode_status='done', location=ST_SetSRID(ST_MakePoint(114.15,22.28),4326) WHERE fehd_licence_no='2211000123'`);
    const changed = parseFehdXml(FIXTURE).map((r) =>
      r.licenceNo === '2211000123' ? { ...r, addrEn: 'NEW STREET 99, MOVED BUILDING' } : r,
    );
    const r = await applyFehdImport(pool!, changed, { districtFilter: ['CENTRAL AND WESTERN'] });
    expect(r.geocodePending).toBeGreaterThanOrEqual(1);
    const v = await pool!.query(`SELECT geocode_status FROM venues WHERE fehd_licence_no='2211000123'`);
    expect(v.rows[0].geocode_status).toBe('pending');
  });
});
