CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE UNIQUE INDEX venue_reports_once_idx ON venue_reports (venue_id, reporter_id);

CREATE INDEX venues_display_trgm_idx ON venues USING gin (display_name gin_trgm_ops);
CREATE INDEX venues_legal_trgm_idx ON venues USING gin (legal_name gin_trgm_ops);
