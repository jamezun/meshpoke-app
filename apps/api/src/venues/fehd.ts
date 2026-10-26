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

export function parseFehdXml(xml: string): FehdRecord[] {
  // isArray everywhere + no numeric parsing: FEHD licence numbers keep leading zeros
  const parser = new XMLParser({ ignoreAttributes: false, trimValues: true, parseTagValue: false, isArray: () => true });
  const doc = parser.parse(xml) as Record<string, unknown>;

  // FEHD bulk format: <XMLLicenceMOE_MFE><XMLLicenceMOE_MFE>…rows…</></>
  const rootKey = Object.keys(doc).find((k) => !k.startsWith('?')) ?? Object.keys(doc)[0];
  const root = (doc[rootKey] as unknown[])?.[0] as Record<string, unknown[]> | undefined;
  const list = root?.[rootKey] as unknown[] | undefined;
  const flat = ((list ?? [root]) as Record<string, unknown[]>[]).filter(Boolean);

  const one = (v: unknown): unknown => (Array.isArray(v) ? v[0] : v);
  const str = (v: unknown): string => {
    const s = one(v);
    return s === undefined || s === null ? '' : String(s).trim();
  };

  return flat.map((row) => {
    const r = row as Record<string, unknown>;
    const ta = (one(r.TA) ?? {}) as Record<string, unknown>;
    const addr = (one(ta.TA_AD) ?? {}) as Record<string, unknown>;
    return {
      licenceNo: str(r.LIC_NO),
      licenceType: str(r.WI_ACTVTY_REST ?? r.LIC_TYPE),
      nameEn: str(r.FLD_NME_E),
      nameZh: str(r.FLD_NME_T),
      addrEn: [str(ta.TA_EN), str(addr.AD_ST), str(addr.AD_BULD), str(addr.AD_BUFLR)].filter(Boolean).join(', '),
      addrZh: [str(ta.TA_ZH), str(addr.AD_ST_ZH), str(addr.AD_BULD_ZH), str(addr.AD_BUFLR_ZH)].filter(Boolean).join(', '),
      district: str(r.DISTRICT_C ?? r.DISTRICT),
    };
  }).filter((r) => r.licenceNo !== '');
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
