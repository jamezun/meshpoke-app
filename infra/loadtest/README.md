# T19.2 Load & resilience scripts

k6 scripts for the four PRD §17 load profiles. All run against **staging** after the
RUNBOOK deploy steps are done (never prod).

## Install
```bash
# local (WSL) — one-time
sudo apt install k6   # or: https://k6.io/docs/get-started/installation
```

## Fixtures

All scripts read token files relative to `infra/loadtest/`:

- `tokens.json` — array of GoTrue access tokens (≥50 for viewport, 30+ for ws).
  Mint via staging password-grant (seed users or a `loadtest-NN@e2e.test` batch):
  ```bash
  for i in $(seq 1 60); do
    curl -s -X POST "$AUTH/auth/v1/token?grant_type=password" \
      -H 'content-type: application/json' \
      -d "{\"email\":\"load$i@e2e.test\",\"password\":\"LoadPassw0rd!\"}" | jq -r .access_token
  done > tokens.json
  ```
- `drops.json` — active drops `[{ "id": "...", "capacity": 2 }]` (create via a
  merchant account, cap low on purpose — the point is contention).
- `qr.json` — guest QR payloads from `GET /v1/me/qr` (they rotate every 30s,
  mint fresh right before running scan_burst).

## Run

```bash
BASE=https://api-staging.meshpoke.com k6 run viewport.js        # p95<300ms reads
BASE=https://api-staging.meshpoke.com k6 run drop_stampede.js   # exactly-once capacity
WS_BASE=wss://api-staging.meshpoke.com k6 run ws_fanout.js      # socket.io connect health
BASE=... STAFF_TOKEN=... k6 run scan_burst.js                   # p95<600ms writes
```

## Judging results

- **viewport / scan**: k6 thresholds fail the run if p95 misses PRD targets.
- **drop_stampede**: after the run, sum `drop_claims` per drop in staging DB —
  must equal capacity exactly. Any over-count = bug.
- **ws_fanout**: k6 has no Socket.io ACK timing — this script validates connect
  health + server stability under concurrent sockets (crash/hang detection).
  Message-delivery p95 < 800ms is measured by the mobile app + PostHog, not k6.

## Memory / pool tuning (shared box)

During the run watch `docker stats` on the VPS:
- `meshpoke-api` stays under its 512M compose limit without OOM kills.
- Postgres connections: API pool default × workers must stay under
  `max_connections` (SupremaNode box shares PG with other apps — keep
  DATABASE pool ≤ 10 while other tenants run).
- Redis `maxmemory 96mb` + `allkeys-lru` holds the QR/scan hot path fine at
  these rates.

Tune first at: `DATABASE_POOL_MAX` (api config) → compose memory limits →
only then consider a bigger VPS.
