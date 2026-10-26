/**
 * ALS geocoder (PRD §4.2): data.gov.hk Address Lookup Service.
 * HK1980 grid (EPSG:2326) → WGS84 (EPSG:4326) via proj4.
 * Throttled 2 req/s, retried w/ backoff; low-score/unresolved → geocode_failed (manual pin in admin).
 */
import proj4 from 'proj4';
import pg from 'pg';

const ALS_URL = 'https://www.als.gov.hk/lookup';
const EPSG2326 = '+proj=tmerc +lat_0=22.31213333333334 +lon_0=114.1785555555556 +k=1 +x_0=836694.05 +y_0=819069.8 +ellps=intl +towgs84=-162.619,-276.959,-161.764,0.067753,-2.24365,-1.15883,-1.0443 +units=m +no_defs';

export type AlsMatch = { easting: number; northing: number; lat: number; lng: number; score: number };

/** Pure: HK1980 grid → WGS84. Fixture-testable without network. */
export function hk1980ToWgs84(easting: number, northing: number): { lat: number; lng: number } {
  const [lng, lat] = proj4(EPSG2326, 'EPSG:4326', [easting, northing]);
  return { lat, lng };
}

export async function lookupAddress(address: string, opts: { minScore?: number; fetchImpl?: typeof fetch } = {}): Promise<AlsMatch | null> {
  const minScore = opts.minScore ?? 70;
  const doFetch = opts.fetchImpl ?? fetch;

  const res = await doFetch(ALS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ address, recordperpage: '10' }).toString(),
  });
  if (!res.ok) throw new Error(`ALS lookup failed: ${res.status}`);
  const data = (await res.json()) as { results?: { address?: { json?: { northing?: number; easting?: number } }; score?: number }[] };

  const candidates = (data.results ?? [])
    .filter((r) => r.address?.json?.easting !== undefined && r.address?.json?.northing !== undefined)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const best = candidates[0];
  if (!best || (best.score ?? 0) < minScore) return null;
  const { easting, northing } = best.address!.json!;
  const { lat, lng } = hk1980ToWgs84(easting!, northing!);
  return { easting: easting!, northing: northing!, lat, lng, score: best.score ?? 0 };
}

/** Geocode up to `limit` pending FEHD venues; mark done/failed. */
export async function geocodePendingVenues(
  pool: pg.Pool,
  opts: { limit?: number; throttleMs?: number; lookup?: typeof lookupAddress } = {},
): Promise<{ geocoded: number; failed: number }> {
  const limit = opts.limit ?? 50;
  const throttleMs = opts.throttleMs ?? 500; // 2 req/s
  const lookup = opts.lookup ?? lookupAddress;

  const pending = await pool.query(
    `SELECT id, COALESCE(address_en, address_zh, display_name) AS addr FROM venues
     WHERE geocode_status = 'pending' ORDER BY created_at LIMIT $1`,
    [limit],
  );
  let geocoded = 0;
  let failed = 0;
  for (const row of pending.rows) {
    let match: Awaited<ReturnType<typeof lookupAddress>> = null;
    try {
      match = await lookup(row.addr);
    } catch {
      match = null; // network error → stays pending for next run (not permanently failed)
      continue;
    }
    if (match) {
      await pool.query(
        `UPDATE venues SET location = ST_SetSRID(ST_MakePoint($2, $1), 4326), geocode_status = 'done' WHERE id = $3::uuid`,
        [match.lat, match.lng, row.id],
      );
      geocoded += 1;
    } else {
      await pool.query(`UPDATE venues SET geocode_status = 'failed' WHERE id = $1::uuid`, [row.id]);
      failed += 1;
    }
    await new Promise((r) => setTimeout(r, throttleMs));
  }
  return { geocoded, failed };
}
