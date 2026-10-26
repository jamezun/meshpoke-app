// Runs before test imports: neutralize Docker Desktop credsStore for testcontainers.
process.env.DOCKER_CONFIG = new URL('../../infra/test-docker-config/', import.meta.url).pathname;

// PII helper reads process.env directly (not app config); give tests a deterministic key
process.env.PII_ENCRYPTION_KEY ??= 'a'.repeat(64);
