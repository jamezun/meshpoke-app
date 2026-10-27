import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema',
  out: './drizzle',
  dbCredentials: {
    // no silent dev fallback — force explicit DATABASE_URL so dev creds can't leak into other envs
    url: (() => { if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required (drizzle-kit)'); return process.env.DATABASE_URL; })(),
  },
});
