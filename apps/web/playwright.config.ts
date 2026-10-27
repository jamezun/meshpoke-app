import { defineConfig } from '@playwright/test';

const API_ENV = {
  NODE_ENV: 'test',
  PORT: '3000',
  LOG_LEVEL: 'error',
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:15432/meshpoke_e2e',
  REDIS_URL: process.env.E2E_REDIS_URL ?? 'redis://localhost:16379',
  GOTRUE_URL: process.env.E2E_GOTRUE_URL ?? 'http://localhost:9998',
  GOTRUE_JWT_SECRET: 'e2e-secret-e2e-secret-e2e-secret-e2e-secret',
  CORS_ORIGINS: 'http://localhost:5199',
  PII_ENCRYPTION_KEY: 'e2e0000000000000000000000000000000000000000000000000000000000000',
  QR_HMAC_SECRET: 'e2e-qr-secret-e2e-qr-secret-e2e-qr-secret',
  ADMIN_BOOTSTRAP_PASSWORD: 'e2e-admin-password',
};

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'line',
  use: { baseURL: 'http://localhost:5199', trace: 'on-first-retry' },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'specs', testDir: './e2e', testIgnore: /auth\.setup\.ts/, dependencies: ['setup'] },
  ],
  webServer: [
    {
      command: 'pnpm exec tsx src/server.ts',
      cwd: '../api',
      url: 'http://localhost:3000/v1/health',
      reuseExistingServer: true,
      env: { ...process.env, ...API_ENV } as NodeJS.ProcessEnv,
      timeout: 60_000,
    },
    {
      command: 'node e2e/auth-server.mjs',
      url: 'http://localhost:9998/health',
      reuseExistingServer: true,
      timeout: 20_000,
    },
    {
      command: 'pnpm exec vite --port 5199 --strictPort',
      url: 'http://localhost:5199',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
