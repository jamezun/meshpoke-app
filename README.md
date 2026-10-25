# MeshPoke

> **Poke the mesh. Watch your network ripple.** — a live map for meeting people in real life.

Map-native social mesh app for Hong Kong: spots (dinner, drinks, tennis, hikes…) form on a live map, people meet in person, crews form and rebook. See [`Business_Model.md`](Business_Model.md), [`PRD.md`](PRD.md), and [`BUILD_PLAN.md`](BUILD_PLAN.md).

## Monorepo layout

```
apps/api        Fastify API (Node + TypeScript)
apps/web        React web (marketing, authenticated app, merchant portal, admin)
apps/mobile     Flutter app (iOS + Android) — scaffold lands at T5.1
packages/shared Business constants, Zod schemas, HKT time helpers (single source of truth)
packages/api-client  Generated TypeScript API client
infra/          docker-compose dev stack, Dokploy compose files, seed data, CI
```

## Commands

Requires Node ≥ 20 and pnpm (`corepack enable` picks up the pinned version from `package.json`). Docker for the local dev stack (T0.2+).

```bash
pnpm install        # install all workspace deps
pnpm typecheck      # tsc --noEmit across the workspace
pnpm lint           # eslint across the workspace
pnpm test           # run all tests (populated per milestone)
pnpm build          # build all packages (populated per milestone)
pnpm dev            # dev servers (populated per milestone)
```

Per package: `pnpm --filter @meshpoke/api dev` etc. Local dev stack: `docker compose -f infra/docker-compose.dev.yml up -d` (PostGIS + Redis + GoTrue auth + Mailpit). See `infra/` README for endpoints.
