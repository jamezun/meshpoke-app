// Runs before test imports: neutralize Docker Desktop credsStore for testcontainers.
process.env.DOCKER_CONFIG = new URL('../../infra/test-docker-config/', import.meta.url).pathname;
