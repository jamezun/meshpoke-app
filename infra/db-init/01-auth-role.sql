-- Dedicated GoTrue role, mirroring the Supabase platform's supabase_auth_admin.
-- Role-level search_path makes bare-table queries (users, identities, ...) resolve
-- to the auth schema without touching the connection URL (which breaks migration
-- bookkeeping). Empirically required for standalone GoTrue; see T0.2 notes.
CREATE ROLE supabase_auth_admin LOGIN PASSWORD 'postgres_dev_2026';
ALTER ROLE supabase_auth_admin SET search_path = 'auth';
GRANT USAGE, CREATE ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON TABLES TO supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT ALL ON SEQUENCES TO supabase_auth_admin;
