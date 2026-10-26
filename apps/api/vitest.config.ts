import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['test/setup.ts'],
    include: ['test/**/*.test.ts'],
    testTimeout: 180_000, // testcontainers startup
    hookTimeout: 180_000,
    fileParallelism: false, // one shared infra set per run
    pool: 'forks',
  },
});
