/**
 * Public metadata (no auth): attribution texts for web footer + app About (PRD §14).
 * data.gov.hk terms require "資料來源：資料一線通" / "Source: DATA.GOV.HK" style attribution.
 */
import type { FastifyInstance } from 'fastify';

const ATTRIBUTIONS = {
  data_gov_hk: 'Contains information from DATA.GOV.HK / 資料一線通 (data.gov.hk) — FEHD licensed restaurants, provided by the Government of the Hong Kong Special Administrative Region.',
  fehd: 'Restaurant licence data © FEHD (環境保護署/食物環境衞生署), refreshed daily.',
  als: 'Address geocoding via the Address Lookup Service (ALS), Lands Department (地政總署).',
  hk1980: 'Coordinate conversion: HK1980 Grid System, Survey & Mapping Office, Lands Department.',
} as const;

export function registerMeta(app: FastifyInstance) {
  app.get('/meta/attributions', async () => ({ attributions: ATTRIBUTIONS }));
}
