#!/usr/bin/env bash
# Nightly meshpoke DB backup — run from jamezun@hetzner-vps crontab.
# Local gzip to ~/backups/meshpoke, keep 14. R2 upload when R2 creds are set (TODO in RUNBOOK).
set -euo pipefail
DIR="$HOME/backups/meshpoke"; mkdir -p "$DIR"
SB=$(docker ps --format '{{.Names}}' | grep supabase-db | head -1)
STAMP=$(date -u +%Y%m%d-%H%M)
docker exec "$SB" pg_dump -U supabase_admin -d meshpoke | gzip > "$DIR/meshpoke-$STAMP.sql.gz"
find "$DIR" -name 'meshpoke-*.sql.gz' -mtime +14 -delete
echo "$(date -u +%FT%TZ) backup ok: meshpoke-$STAMP.sql.gz $(du -h "$DIR/meshpoke-$STAMP.sql.gz" | cut -f1)"
