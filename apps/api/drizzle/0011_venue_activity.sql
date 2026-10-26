-- activity7d: high-confidence merchant check-ins per venue, last 7 days.
-- Materialised view (PRD §4.1 marker sizing); refresh via jobs (cheap enough daily + on demand).
CREATE MATERIALIZED VIEW venue_activity_7d AS
SELECT v.id AS venue_id,
       count(*)::int AS activity7d
FROM venues v
JOIN merchant_checkins c ON c.venue_id = v.id
WHERE c.confidence = 'high'
  AND c.created_at >= now() - interval '7 days'
GROUP BY v.id;

CREATE UNIQUE INDEX venue_activity_7d_pk ON venue_activity_7d (venue_id);
