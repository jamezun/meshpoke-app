# Staging Runbook — first deploy (T8.4)

Staging target: Hetzner VPS `hetzner-vps` (Tailscale `100.89.25.61`, public `95.216.184.16`), shared with SupremaNode via Dokploy (swarm, Traefik owns 80/443). SSH: `ssh jamezun@100.89.25.61` (no sudo; docker group).

## Already done (this machine + VPS)

- [x] DB `meshpoke` + role `meshpoke_app` + `postgis` 3.3 + `citext` inside the existing `supabase-db` container (reachable on `dokploy-network` as `db:5432`). DSN in `infra/staging/.db-url` (gitignored).
- [x] Secrets + service JWTs generated → `infra/staging/.env.staging` (gitignored; template `env.example`).
- [x] Compose file `infra/staging/meshpoke-staging.yml` (api 512M / web 128M / gotrue v2.171.0 192M / redis 128M ≈ 1 GB ceiling; ~3.2 GB free on the box).
- [x] Nightly backup: `~/backup-meshpoke.sh` on VPS, crontab `18:30 UTC` → `~/backups/meshpoke/meshpoke-YYYYMMDD-HHMM.sql.gz`, 14-day retention. Manual run: `~/backup-meshpoke.sh`.
- [x] Dockerfiles: `apps/api/Dockerfile` (pnpm deploy --prod), `apps/web/Dockerfile` (Vite build args + nginx SPA + `/v1/` proxy to api container — keeps web same-origin).

## User steps (dashboard work — ~10 min)

1. **Cloudflare DNS** (meshpoke.com zone) — 3 A records → `95.216.184.16`:
   | Name | Type | Value |
   |---|---|---|
   | `staging` | A | 95.216.184.16 |
   | `api-staging` | A | 95.216.184.16 |
   | `auth-staging` | A | 95.216.184.16 |
   (Proxy status: DNS only / grey cloud first; orange-cloud later if desired.)
2. **Dokploy** (https://dokploy.<your-domain> → your existing install):
   - New project `meshpoke` → **Compose** app, source GitHub `jamezun/meshpoke-app`, branch `main`.
   - Paste `infra/staging/meshpoke-staging.yml`.
   - App env: paste contents of `infra/staging/.env.staging`.
   - Domains (Dokploy per-service, HTTPS auto):
     - `meshpoke-api` → `api-staging.meshpoke.com`
     - `meshpoke-web` → `staging.meshpoke.com`
     - `meshpoke-auth` → `auth-staging.meshpoke.com` (web port 9999)
   - Deploy.
3. **Migrate + seed** (one-time, from VPS):
   ```bash
   docker exec -it <meshpoke-api-container> node dist/db/migrate.js 2>/dev/null || \
   docker run --rm --network dokploy-network -v $HOME/meshpoke-seed:/e -w /app node:22-alpine \
     sh -c 'npm i -g pnpm && cd /repo && pnpm --filter @meshpoke/api db:migrate'  # fallback: run from WSL against db via SSH tunnel
   ```
   Simplest reliable path: from WSL, `ssh -L 15432:localhost:15432 jamezun@100.89.25.61` won't reach swarm-internal db; instead publish nothing and run migrations by temporarily `docker exec` into the api container using the tsx-free compiled build (`pnpm db:migrate` compiles? tsx needed) — **use the one-liner in "Migrations" below.**

## Migrations (one-liner from VPS)

```bash
SB=$(docker ps --format '{{.Names}}' | grep supabase-db | head -1)
docker exec $SB psql -U meshpoke_app -d meshpoke -f - < apps/api/drizzle/0000_first_charles_xavier.sql   # repeat per file in order
```
Drizzle migrations are plain SQL in `apps/api/drizzle/0*.sql` — apply in filename order. Seed districts/admin needs the node script; from WSL:
```bash
DATABASE_URL="postgresql://meshpoke_app:<pw>@localhost:5432/meshpoke" pnpm --filter @meshpoke/api db:seed
# requires SSH tunnel to supabase-db: ask (it's not published; run via docker exec psql instead for SQL-only seed parts)
```
Ponytail note: for staging, applying drizzle SQL files via `docker exec psql` is enough; districts geojson seeding can run from WSL through a temporary `docker run --network dokploy-network` tsx job if needed.

## Smoke tests (after deploy)

```bash
curl -s https://api-staging.meshpoke.com/v1/health          # {"status":"ok","checks":{"db":true,"redis":true}}
curl -s https://auth-staging.meshpoke.com/health            # {"name":"GoTrue",...}
curl -s -o /dev/null -w '%{http_code}\n' https://staging.meshpoke.com/   # 200
# auth round-trip (staging has email autoconfirm):
curl -s -X POST https://auth-staging.meshpoke.com/signup -H 'apikey: <ANON>' -H 'content-type: application/json' \
  -d '{"email":"smoke@meshpoke.test","password":"smoke-test-123"}'
```

## Restore runbook

```bash
SB=$(docker ps --format '{{.Names}}' | grep supabase-db | head -1)
gunzip -c ~/backups/meshpoke/meshpoke-<STAMP>.sql.gz | docker exec -i $SB psql -U supabase_admin -d meshpoke
```
Test the restore quarterly into a scratch DB (`createdb meshpoke_restore_test`) then drop it.

## R2 offsite upload (TODO when R2 activated)

`backup-meshpoke.sh` keeps local copies only. When R2 keys exist (`R2_*` in Dokploy env), append:
```bash
docker run --rm -v "$DIR:/data:ro" rclone/rclone copy /data r2:meshpoke-backups/meshpoke --config /path/to/rclone.conf
```

## Guardrails

- SupremaNode unaffected: our containers never touch its network except `dokploy-network` (read-only usage of `db` alias) and ~1 GB memory ceiling vs ~3.2 GB free. Check after deploy: `docker stats --no-stream | grep meshpoke`.
- If `dokploy-network` alias `db` ever collides with another app's `db` alias, switch DATABASE_URL host to the full container name `suprema-node-supabase-sytuei-supabase-db`.
