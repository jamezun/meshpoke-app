// T18.4 e2e seed: verified users rows + districts + one hosted spot + minted-session user map.
// No GoTrue in the e2e stack — sessions are minted with the shared JWT secret.
// Run: E2E_DATABASE_URL / E2E_GOTRUE_JWT_SECRET env (defaults match compose.e2e.yml).
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { seedDistricts } from '../src/db/seed.js';

const DB = process.env.E2E_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:15432/meshpoke_e2e';
const USERS = [
  { email: 'host@e2e.test', name: 'E2E Host', ref: 'E2EHOS01' },
  { email: 'member@e2e.test', name: 'E2E Member', ref: 'E2EMEM01' },
];

async function main() {
  const pool = new pg.Pool({ connectionString: DB });
  await seedDistricts(pool);
  const out: Record<string, string> = {};
  for (const u of USERS) {
    // reuse id if the row exists (idempotent re-seeds keep storageStates valid)
    const existing = await pool.query('select id from users where email = $1', [u.email]);
    const id = (existing.rows[0]?.id as string) ?? randomUUID();
    await pool.query(
      `insert into users (id, email, auth_provider, display_name, date_of_birth, referral_code, liveness_state, phone_verified_at)
       values ($1, $2, 'email', $3, '1990-01-01', $4, 'verified', now())
       on conflict (email) do update set liveness_state = 'verified', phone_verified_at = now(), display_name = excluded.display_name`,
      [id, u.email, u.name, u.ref],
    );
    out[u.name.includes('Host') ? 'host' : 'member'] = id;
  }
  // host's spot — direct SQL (API need not be up for seeding)
  const d = await pool.query(`select id from districts where name_en = 'Central and Western' limit 1`);
  if (d.rows.length > 0) {
    const have = await pool.query(`select 1 from spots where name = 'E2E Friday drinks'`);
    if (have.rows.length === 0) {
      const spotId = randomUUID();
      const roomId = randomUUID();
      const start = new Date(Date.now() + 3 * 86400_000).toISOString();
      const end = new Date(Date.now() + 5 * 86400_000).toISOString();
      await pool.query(
        `insert into spots (id, kind, template, host_user_id, name, required_keywords, join_mode, district_id, min_headcount, max_headcount, overbook_buffer, date_range, state)
         values ($1, 'event', 'drinks', $2, 'E2E Friday drinks', '{finance}', 'application', $3, 2, 5, 0, $4, 'forming')`,
        [spotId, out.host, d.rows[0].id, `[${start}, ${end}]`],
      );
      await pool.query(`insert into rooms (id, kind, spot_id) values ($1, 'event', $2)`, [roomId, spotId]);
      await pool.query(`insert into spot_members (spot_id, user_id, role) values ($1, $2, 'host')`, [spotId, out.host]);
      await pool.query(`insert into room_members (room_id, user_id) values ($1, $2)`, [roomId, out.host]);
    }
  }
  mkdirSync('../web/e2e/.state', { recursive: true });
  writeFileSync('../web/e2e/.state/users.json', JSON.stringify(out));
  console.log('e2e seed ok');
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
