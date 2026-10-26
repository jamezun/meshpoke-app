/**
 * Idempotent seed: districts (18), founding_counters, city chat rooms, admin user.
 * Run: pnpm --filter @meshpoke/api db:seed
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@meshpoke.hk';

export async function seedDistricts(pool: pg.Pool) {
  const geo = JSON.parse(readFileSync(join(import.meta.dirname, '../../../../infra/seed/districts.geojson'), 'utf8')) as {
    features: { properties: { name_en: string; name_zh: string }; geometry: { type: string; coordinates: number[][][][] } }[];
  };
  for (const f of geo.features) {
    const { name_en, name_zh } = f.properties;
    await pool.query(
      `INSERT INTO districts (name_en, name_zh, boundary)
       VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)::geography)
       ON CONFLICT (name_en) DO UPDATE SET name_zh = EXCLUDED.name_zh, boundary = EXCLUDED.boundary`,
      [name_en, name_zh, JSON.stringify(f.geometry)],
    );
    await pool.query(
      `INSERT INTO rooms (kind, district_id)
       SELECT 'city', d.id FROM districts d WHERE d.name_en = $1
       AND NOT EXISTS (SELECT 1 FROM rooms r WHERE r.district_id = d.id AND r.kind = 'city')`,
      [name_en],
    );
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: join(import.meta.dirname, '../../drizzle') });

  // ── districts ──
  await seedDistricts(pool);
  console.log(`districts: ensured (with city rooms)`);

  // ── founding counters ──
  await pool.query(
    `INSERT INTO founding_counters (key, used, max) VALUES ('consumer_500', 0, 500)
     ON CONFLICT (key) DO NOTHING`,
  );
  await pool.query(
    `INSERT INTO founding_counters (key, used, max) VALUES ('merchant_50', 0, 50)
     ON CONFLICT (key) DO NOTHING`,
  );
  console.log('founding_counters: consumer_500, merchant_50 ensured');

  // ── admin user ──
  const adminId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, is_admin)
     VALUES ($1, $2, 'email', 'Admin', '1990-01-01', 'ADMIN00001', 'verified', true)
     ON CONFLICT (email) DO NOTHING`,
    [adminId, ADMIN_EMAIL],
  );
  console.log(`admin user ensured (${ADMIN_EMAIL})`);

  await pool.end();
}

// only auto-run when invoked as a script (tsx src/db/seed.ts), not on import
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
