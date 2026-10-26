#!/usr/bin/env bash
# Generate a Drizzle migration, then strip the quotes drizzle-kit puts around
# PostGIS geography typmods ("geography(Point,4326)" → geography(Point,4326)).
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm exec drizzle-kit generate
for f in drizzle/*.sql; do
  sed -i 's/"geography(\(Point\|MultiPolygon\),4326)"/geography(\1,4326)/g' "$f"
done
echo "geography typmods unquoted in $f"
