-- Standalone GoTrue/auth expects the auth schema to pre-exist (the Supabase platform normally creates it).
CREATE SCHEMA IF NOT EXISTS auth;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
