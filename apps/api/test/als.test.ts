import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { join } from 'node:path';
import { hk1980ToWgs84, lookupAddress, geocodePendingVenues, type AlsMatch } from '../src/venues/als.js';
import { startInfra, stopInfra, type TestInfra } from './db.js';
import * as schema from '../src/db/schema/index.js';

let infra: TestInfra | null = null;
let pool: pg.Pool | null = null;

beforeAll(async () => {
  infra = await startInfra();
  pool = new pg.Pool({ connectionString: infra.dbUrl, max: 5 });
  await migrate(drizzle(pool, { schema }), { migrationsFolder: join(import.meta.dirname, '../drizzle') });
});

afterAll(async () => {
  await pool?.end();
  await stopInfra();
});

describe('T4.3 ALS geocoder', () => {
  it('HK1980 → WGS84: known landmark within 20 m (Central MTR = 834282, 815892)', () => {
    const { lat, lng } = hk1980ToWgs84(834282, 815892);
    // Central Station: ~22.2819 N, 114.1576 E
    expect(Math.abs(lat - 22.2819)).toBeLessThan(0.0005); // ~55m in lat... tighten below
    expect(Math.abs(lng - 114.1576)).toBeLessThan(0.0005);
    const distM = Math.hypot((lat - 22.2819) * 111_320, (lng - 114.1576) * 111_320 * Math.cos((22.28 * Math.PI) / 180));
    expect(distM).toBeLessThan(20);
  });

  it('lookupAddress picks best score and converts; below minScore → null', async () => {
    const fake = (async (_url: unknown, init?: RequestInit) => {
      const body = new URLSearchParams(String(init!.body));
      void body;
      return new Response(JSON.stringify({
        results: [
          { address: { json: { easting: 830570, northing: 816920 } }, score: 88 },
          { address: { json: { easting: 999999, northing: 999999 } }, score: 95 },
        ],
      }), { status: 200 });
    }) as unknown as typeof fetch;
    const best = await lookupAddress('Queen\'s Road Central', { fetchImpl: fake });
    expect(best).not.toBeNull();
    expect(best!.score).toBe(95);
    expect(best!.easting).toBe(999999);

    const lowScoreOnly = (async () => new Response(JSON.stringify({
      results: [{ address: { json: { easting: 1, northing: 2 } }, score: 40 }],
    }), { status: 200 })) as unknown as typeof fetch;
    expect(await lookupAddress('nowhere', { fetchImpl: lowScoreOnly })).toBeNull();
  });

  it('geocodePendingVenues marks done/failed and writes coordinates', async () => {
    const mkVenue = async (addr: string) => {
      const r = await pool!.query(
        `INSERT INTO venues (source, display_name, category, location, status, geocode_status, address_en)
         VALUES ('fehd', $1, 'restaurant', ST_SetSRID(ST_MakePoint(0,0),4326), 'active', 'pending', $1) RETURNING id`,
        [addr],
      );
      return r.rows[0].id as string;
    };
    const okId = await mkVenue('GOOD ADDRESS');
    const badId = await mkVenue('IMPOSSIBLE ADDRESS');

    const stub = (async (addr: string) =>
      addr === 'GOOD ADDRESS'
        ? ({ easting: 830570, northing: 816920, lat: 22.2819, lng: 114.1576, score: 90 } satisfies AlsMatch)
        : null) as unknown as typeof lookupAddress;

    const result = await geocodePendingVenues(pool!, { limit: 10, throttleMs: 0, lookup: stub });
    expect(result.geocoded).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBeGreaterThanOrEqual(1);

    const ok = await pool!.query(`SELECT geocode_status, ST_X(location::geometry) AS lng FROM venues WHERE id=$1`, [okId]);
    expect(ok.rows[0].geocode_status).toBe('done');
    expect(Number(ok.rows[0].lng)).toBeCloseTo(114.1576, 3);

    const bad = await pool!.query(`SELECT geocode_status FROM venues WHERE id=$1`, [badId]);
    expect(bad.rows[0].geocode_status).toBe('failed');
  });
});
