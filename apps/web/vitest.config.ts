import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // NODE_ENV pinned: an inherited NODE_ENV=production loads React's prod build, which has no act()
    env: { NODE_ENV: 'test', VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
