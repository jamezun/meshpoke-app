/**
 * FEHD restaurant licence importer (PRD §4.2).
 * Source: data.gov.hk FEHD licensed restaurants (XML; URL from config — confirm at deploy).
 * Flow: fetch → parse → upert by fehd_licence_no → new/changed address → geocode_status=pending (T4.3 worker picks up)
 *       licence missing from today's file → status=closed + closed_at (hidden from map after 14d unless claimed).
 * Pure functions (parse/apply) are testable against a fixture; the job wrapper lives in jobs/.
 */
import pg from 'pg';
import { XMLParser } from 'fast-xml-parser';

export type FehdRecord = {
  licenceNo: string;
  licenceType: string;
  nameEn: string;
  nameZh: string;
  addrEn: string;
  addrZh: string;
  district: string;
};

// FEHD DIST codes → our districts.name_en (seed uses full official names).
// Legend ships inside the file (<DIST_CODE><CODE ID="61">Yau Tsim</CODE>…); FEHD splits
// Yau Tsim Mong into two codes (61 Yau Tsim, 62 Mong Kok) and spells C&W as "Central/Western".
const DIST_ALIAS: Record<string, string> = {
  'Yau Tsim': 'Yau Tsim Mong',
  'Mong Kok': 'Yau Tsim Mong',
  'Central/Western': 'Central and Western',
  'Food Truck': '', // mobile trucks have no fixed district; geocoder assigns later
};

export function parseFehdXml(xml: string): FehdRecord[] {
  // isArray everywhere + no numeric parsing: FEHD licence numbers keep leading zeros
  const parser = new XMLParser({ ignoreAttributes: false, trimValues: true, parseTagValue: false, isArray: () => true });
  const doc = parser.parse(xml) as Record<string, unknown>;

  // Real format (LP_Restaurants_EN.XML): <DATA><LPS><LP>TYPE/DIST/LICNO/SS/ADR/INFO/EXPDATE</LP>…</LPS></DATA>
  const data: Record<string, unknown[]> = ((doc.DATA as Record<string, unknown[]>[] | undefined)?.[0] as Record<string, unknown[]>) ?? {};
  const lps = (data.LPS as Record<string, unknown[]>[] | undefined)?.[0];
  const rows = (lps?.LP as Record<string, unknown>[] | undefined) ?? [];

  const one = (v: unknown): unknown => (Array.isArray(v) ? v[0] : v);
  const str = (v: unknown): string => {
    const s = one(v);
    return s === undefined || s === null ? '' : String(s).trim();
  };

  // build code→name legend from the file itself (DIST_CODE → CODE ID/name)
  const legend: Record<string, string> = {};
  const distCode = (data.DIST_CODE as Record<string, unknown[]>[] | undefined)?.[0];
  const codes = (distCode?.CODE as Record<string, unknown>[] | undefined) ?? [];
  for (const c of codes) legend[String(one(c['@_ID']) ?? '')] = String(one(c['#text']) ?? '').trim();

  return rows
    .map((row) => {
      const rawDistrict = DIST_ALIAS[legend[str(row.DIST)] ?? ''] ?? legend[str(row.DIST)] ?? '';
      return {
        licenceNo: str(row.LICNO),
        licenceType: str(row.TYPE),
        nameEn: str(row.SS),
        nameZh: '', // EN file only; TC file can backfill later
        addrEn: str(row.ADR),
        addrZh: '',
        district: rawDistrict,
      };
    })
    .filter((r) => r.licenceNo !== '');
}

export type ImportResult = { inserted: number; updated: number; closed: number; reopened: number; geocodePending: number };

export async function applyFehdImport(
  pool: pg.Pool,
  records: FehdRecord[],
  opts: { districtFilter?: string[] } = {},
): Promise<ImportResult> {
  const filter = opts.districtFilter;
  const scoped = filter ? records.filter((r) => filter.includes(r.district)) : records;
  const seen = new Set(scoped.map((r) => r.licenceNo));

  const result: ImportResult = { inserted: 0, updated: 0, closed: 0, reopened: 0, geocodePending: 0 };

  for (const r of scoped) {
    // FEHD rows carry no coordinates — placeholder point (0,0) until T4.3 geocodes the address;
    // geocoded venues get real coords, status active, and appear on the map only once geocoded.
    const res = await pool.query(
      `INSERT INTO venues (source, fehd_licence_no, licence_type, legal_name, display_name, address_en, address_zh, location, status, geocode_status, fehd_district, category)
       VALUES ('fehd', $1::varchar, $2::varchar, $3::varchar, COALESCE(NULLIF($4,''), $3::varchar), $5::varchar, $6::varchar, ST_SetSRID(ST_MakePoint(0,0),4326), 'active', 'pending', $7::varchar, 'restaurant')
       ON CONFLICT (fehd_licence_no) DO UPDATE SET
         licence_type = EXCLUDED.licence_type,
         legal_name = EXCLUDED.legal_name,
         display_name = EXCLUDED.display_name,
         address_en = EXCLUDED.address_en,
         address_zh = EXCLUDED.address_zh,
         fehd_district = EXCLUDED.fehd_district,
         -- address changed → needs re-geocode
         geocode_status = CASE WHEN venues.address_en IS DISTINCT FROM EXCLUDED.address_en THEN 'pending' ELSE venues.geocode_status END
       RETURNING (xmax = 0) AS inserted`,
      [r.licenceNo, r.licenceType, r.nameEn || r.nameZh, r.nameEn, r.addrEn, r.addrZh, r.district],
    );
    if (res.rows[0].inserted) result.inserted += 1;
    else result.updated += 1;
  }

  // closure detection: active FEHD venues whose licence is absent from today's file
  const closed = await pool.query(
    `UPDATE venues SET status = 'closed', closed_at = now()
     WHERE source = 'fehd' AND status = 'active'
       AND fehd_licence_no IS NOT NULL
       AND NOT (fehd_licence_no = ANY($1::text[]))
     RETURNING id`,
    [[...seen]],
  );
  result.closed = closed.rowCount ?? 0;

  // reopen safety: licence reappeared (e.g. suspension lifted) → active again
  const reopened = await pool.query(
    `UPDATE venues SET status = 'active', closed_at = NULL
     WHERE source = 'fehd' AND status = 'closed'
       AND fehd_licence_no = ANY($1::text[])
     RETURNING id`,
    [[...seen]],
  );
  result.reopened = reopened.rowCount ?? 0;

  const pending = await pool.query(`SELECT count(*)::int AS n FROM venues WHERE source = 'fehd' AND geocode_status = 'pending'`);
  result.geocodePending = pending.rows[0].n;
  return result;
}

export async function fetchFehdXml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { Accept: 'text/xml, application/xml' } });
  if (!res.ok) throw new Error(`FEHD fetch failed: ${res.status}`);
  return res.text();
}
