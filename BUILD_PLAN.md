# MeshPoke Build Plan

**Implements:** `PRD.md` v2.1 → which implements `Business_Model.md` v6.
**Scope:** backend API, web (marketing + authenticated app + merchant portal + admin) and Flutter mobile app (iOS + Android).
**Audience:** an AI coding agent (and James) working through the build one task at a time.

---

## 0. How to use this plan (read first, every session)

### 0.1 Status legend

Every task and subtask has a checkbox. Use exactly these markers:

| Marker | Meaning |
| --- | --- |
| `[ ]` | Not started |
| `[~]` | In progress (only **one** task may be `[~]` at a time) |
| `[x]` | Done — all acceptance criteria met and tests passing |
| `[!]` | Blocked — write the reason on the line below, prefixed `BLOCKED:` |

### 0.2 Session protocol for the agent

1. Open this file. Find the **first task that is `[ ]` whose dependencies are all `[x]`** (or the one already `[~]`).
2. Mark it `[~]`.
3. Read the PRD sections listed under **PRD refs** before writing code. If the PRD and this plan disagree, **the PRD wins**; if the PRD and the Business Model disagree, **the Business Model wins** — note the conflict in the Progress Log.
4. Work through the subtasks in order, ticking each `[x]` as it is completed.
5. Write the tests listed under **Tests**. Run the full affected test suite.
6. Check every **Acceptance** bullet. Only then mark the task `[x]`.
7. Commit with message `T<id>: <task title>` (one task per commit where practical).
8. Append one line to the **Progress Log** (§99): date, task ID, what was done, anything deferred.
9. Update the milestone counter in the **Progress Dashboard** (§1).
10. Never mark a task done with failing tests, TODOs in business logic, or hard-coded values that belong in `packages/shared/constants`.

### 0.3 Definition of Done (applies to every task)

- [ ] Code compiles with zero TypeScript / Dart analyzer errors (`pnpm typecheck`, `flutter analyze`).
- [ ] Lint passes (`pnpm lint`, `dart format --set-exit-if-changed`).
- [ ] New logic has unit tests; new endpoints have integration tests.
- [ ] All business numbers (caps, prices, weights, bands, windows) come from `packages/shared/src/constants.ts` (and its generated Dart mirror), never inline.
- [ ] User-facing strings are externalised (i18n keys), English only for now.
- [ ] No web prices or web-checkout links anywhere in the mobile app.
- [ ] No secrets committed.

### 0.4 Global conventions

| Area | Convention |
| --- | --- |
| Repo | pnpm workspaces + Turborepo monorepo |
| Node | Node 20 LTS, TypeScript `strict: true` |
| API | Fastify, Zod schemas via `fastify-type-provider-zod`, OpenAPI via `@fastify/swagger`; module per domain under `apps/api/src/modules/<domain>/` with `routes.ts`, `service.ts`, `repo.ts`, `schemas.ts`, `*.test.ts` |
| DB | Drizzle ORM + drizzle-kit migrations in `apps/api/src/db/`; PostGIS via custom column types + raw SQL where needed |
| Jobs | pg-boss, workers in `apps/api/src/jobs/`, registered in one `jobs/index.ts` |
| Realtime | Socket.io with Redis adapter, namespace `/ws` |
| Errors | RFC 7807 problem+json; cap errors `402 {type:"cap", cap, limit}`; verification `403 {type:"verify", require:"phone"}` |
| Web | React 18 + Vite + TypeScript + Tailwind + TanStack Router/Query + react-hook-form + Zod; generated client from `packages/api-client` |
| Mobile | Flutter 3, Riverpod, go_router, freezed + json_serializable, dio; generated Dart client in `apps/mobile/lib/api/` (openapi-generator `dart-dio`) |
| Time | Store UTC; business logic in `Asia/Hong_Kong` (HKT) via a single `time.ts` helper |
| Money | Integers in HKD cents in the DB; formatted only at the edge |
| IDs | UUID v7 |
| Feature flags | PostHog (`recommended_weights`, `nearby_perks`, `promo_push`, etc.) with defaults in `constants.ts` |

### 0.5 Commands (fill in at T0.2, keep updated)

```
pnpm install
pnpm dev               # api + web
pnpm test              # all unit + integration (Testcontainers)
pnpm typecheck && pnpm lint
pnpm db:generate       # drizzle migration from schema (from M1)
pnpm db:migrate        # apply migrations (from M1)
pnpm db:seed           # districts, templates, constants, admin (from M1)
pnpm api:openapi       # regenerate openapi.json + TS client + Dart client (from T0.4)
cd apps/mobile && flutter run          # (from T5.1)
docker compose -f infra/docker-compose.dev.yml up -d
```

---

## 1. Progress Dashboard

Update the "Done" column whenever a task is marked `[x]`.

| Milestone | Phase | Tasks | Done | Status |
| --- | --- | --- | --- | --- |
| M0 Foundations | 0 | 6 | 6 | ✓ |
| M1 Database & shared package | 0 | 5 | 3 | ◐ |
| M2 Auth & accounts | 0 | 5 | 0 | ☐ |
| M3 Profiles, keywords, photos | 0 | 4 | 0 | ☐ |
| M4 Venues & geo | 0 | 6 | 0 | ☐ |
| M5 Mobile foundation | 0 | 6 | 0 | ☐ |
| M6 Web foundation | 0 | 5 | 0 | ☐ |
| M7 Chat rooms & realtime | 0 | 5 | 0 | ☐ |
| M8 Merchant claim, admin basics, Phase 0 release | 0 | 5 | 0 | ☐ |
| M9 Event spots & queues | 1 | 7 | 0 | ☐ |
| M10 Attendance & Show-up Score | 1 | 5 | 0 | ☐ |
| M11 Pokes & connections | 1 | 5 | 0 | ☐ |
| M12 Crews & rebook | 1 | 3 | 0 | ☐ |
| M13 Safety & moderation | 1 | 5 | 0 | ☐ |
| M14 Notifications & activity feed | 1 | 4 | 0 | ☐ |
| M15 Merchant check-in & drops | 1 | 6 | 0 | ☐ |
| M16 Merchant billing & founding programme | 1 | 5 | 0 | ☐ |
| M17 Consumer billing, entitlements, referrals | 1 | 6 | 0 | ☐ |
| M18 Authenticated web & host console | 1 | 4 | 0 | ☐ |
| M19 Phase 1 hardening & launch | 1 | 7 | 0 | ☐ |
| M20 Memberships & ladders | 2 | 7 | 0 | ☐ |
| M21 Scale features | 3 | 8 | 0 | ☐ |
| M22 Expand backlog | 4 | 6 | 0 | ☐ |

---

# PHASE 0 — SEED (Month 0–2)

## M0 Foundations

### [x] T0.1 Create the monorepo
**PRD refs:** §2.2, §16 (monorepo layout) · **Depends:** none
- [x] `pnpm init`, `pnpm-workspace.yaml` with `apps/*`, `packages/*`
- [x] Turborepo `turbo.json` with pipelines: `build`, `dev`, `test`, `lint`, `typecheck`
- [x] Folders: `apps/api`, `apps/web`, `apps/mobile`, `packages/shared`, `packages/api-client`, `infra/`
- [x] Root `tsconfig.base.json` (strict), ESLint (typescript-eslint), Prettier, `.editorconfig`, `.gitignore`, `.nvmrc` (20)
- [x] `README.md` with the commands from §0.5
**Acceptance:** `pnpm install` and `pnpm typecheck` succeed on an empty skeleton.

### [x] T0.2 Local development stack
**PRD refs:** §2.3 · **Depends:** T0.1
- [x] `infra/docker-compose.dev.yml`: `postgis/postgis:15-3.4` (db `meshpoke`), `supabase/gotrue` (pointed at db, `GOTRUE_SMS_TEST_OTP` for local phone OTP), `redis:7`, `axllent/mailpit` (local email)
- [x] `infra/gotrue.dev.env` with Apple/Google placeholders, phone provider Twilio (test mode), JWT secret
- [x] `.env.example` covering every variable in PRD §2 (DB URL, Redis URL, GoTrue URL + JWT secret, Twilio, Resend, Stripe, RevenueCat, Google Maps key, R2, PII encryption key, PostHog, Sentry, QR HMAC secret)
- [x] `apps/api/src/config.ts` — Zod-validated env loader (fails fast on missing vars)
- [x] Fill in §0.5 commands
**Acceptance:** `docker compose up -d` brings up all services; `psql` connects; `SELECT postgis_version();` works; GoTrue `/health` returns ok.

### [x] T0.3 API skeleton
**PRD refs:** §2.2, §12 (conventions) · **Depends:** T0.2
- [x] Fastify app factory `apps/api/src/app.ts` (separate from `server.ts` for testing)
- [x] Plugins: CORS (allowlist), helmet, `@fastify/rate-limit` (Redis store), sensible, Zod type provider, problem+json error handler
- [x] `@fastify/swagger` + `/docs` (dev only); `pnpm api:openapi` writes `apps/api/openapi.json`
- [x] `GET /v1/health` (db + redis checks)
- [x] Logger (pino) with request IDs; Sentry init (no-op if DSN missing)
- [x] Vitest config + Testcontainers helper (`test/db.ts`) spinning up PostGIS + Redis per test run
**Tests:** health endpoint integration test.
**Acceptance:** `pnpm --filter api dev` serves `/v1/health`; `pnpm test` runs the integration test green.

### [x] T0.4 Generated API clients
**PRD refs:** §2.2 · **Depends:** T0.3
- [x] `packages/api-client`: `openapi-typescript` + `openapi-fetch` wrapper exporting a typed client
- [x] Dart client generation script (`openapi-generator-cli generate -g dart-dio`) into `apps/mobile/lib/api/generated/`
- [x] Single command `pnpm api:openapi` regenerates both
**Acceptance:** after adding the health route, both clients contain a typed `health` call.

### [x] T0.5 CI pipeline
**PRD refs:** §2.2 (CI/CD) · **Depends:** T0.3
- [x] GitHub Actions: on PR → install, typecheck, lint, test (with Docker for Testcontainers), build web
- [x] Flutter job: `flutter analyze` + `flutter test` (after M5 exists; add a placeholder now)
- [x] Cache pnpm store and Flutter pub cache
**Acceptance:** a PR shows green checks.

### [x] T0.6 Shared constants package
**PRD refs:** BM §4, §7.3; PRD §3.8, §3.10, §8 · **Depends:** T0.1
- [x] `packages/shared/src/constants.ts` containing **every** business number:
  - [x] Caps: event 3/5/10, chat 5/10/20, merchant 10/30/∞, crews 3/10/∞
  - [x] Pokes: weekly 5/20/50, expiry 7 days, reset Monday 00:00 HKT, note length 200/200/500, post-spot window 48h, referral 5+5, referral cap 10/month
  - [x] Recommended sort: weights 0.2/0.5/0.3, tier values 0/0.6/1.0, unproven score 0.5, neutral vibe 0.5
  - [x] Spots: confirm window 48h, bail grace 24h, roll-call window 24h, peer report threshold 2, forgiveness window 48h, hosting capacity 1/3/5, crew dormancy 60d, room decay 14d
  - [x] Score: unproven threshold 3 events, decay 90 days
  - [x] Merchant: bands `[{max:50,fee:3},{max:100,fee:6},{max:200,fee:12},{max:500,fee:25},{max:1000,fee:50},{max:null,fee:80}]` (HKD), sponsored multiplier 1.5, attribution visits 3 within 60 days, membership release 60d, inactivity options 30/60/90, venue member caps 25/100/∞, standing rooms 3/10/∞, ladder max levels 3/5/5, discount info threshold 20%, founding free months 3, guarantee 30 seats, shadow months 1
  - [x] Prices (web + IAP) for every product in PRD §8.1 and merchant products in §8.3
  - [x] Notification: proximity max 1/day, quiet hours 23:00–08:00
  - [x] Geo: GPS overlap base radius 100 m, duplicate venue radius 50 m
  - [x] QR: window 30 s, tolerance ±1, replay TTL 120 s
- [x] `packages/shared/src/time.ts`: HKT helpers incl. `mostRecentMondayMidnightHKT(now)`
- [x] Script `pnpm shared:dart` generating `apps/mobile/lib/core/constants.g.dart` from `constants.ts`
**Tests:** snapshot test of constants; unit tests for `time.ts` (DST-free HKT, Monday boundary cases).
**Acceptance:** API, web and mobile import constants from one source.

---

## M1 Database & shared package

### [x] T1.1 Core schema: identity, profile, geography
**PRD refs:** §11.1 (Identity, Profile, Geography) · **Depends:** T0.3, T0.6
- [x] Drizzle schema files: `users`, `profiles`, `keywords`, `districts`, `venues`, `venue_reports`, `saved_venues`
- [x] PostGIS custom types (`geography(Point,4326)`, `geography(MultiPolygon,4326)`)
- [x] Keyword trigger (max 10 per user, max 3 with level ≥ 8) as SQL migration
- [x] Migration generated and applied
**Tests:** migration applies on a fresh container; keyword trigger rejects the 11th keyword and the 4th level-8.
**Acceptance:** `pnpm db:migrate` is idempotent.

### [x] T1.2 Schema: spots, attendance, trust, pokes, chat, crews
**PRD refs:** §11.1 · **Depends:** T1.1
- [x] Tables: `spots`, `spot_members`, `applications`, `attendance`, `absence_reports`, `score_events`, `showup_scores`, `hosting_capacity`, `pokes`, `connections`, `poke_balances`, `referrals`, `rooms`, `room_members`, `messages`, `crews`, `crew_members`, `rebooks`
- [x] Unique index for connections on `(least(user_a,user_b), greatest(user_a,user_b))`
- [x] Indexes from §11.2
**Acceptance:** migration applies; `\d` shows all indexes.

### [x] T1.3 Schema: merchants, billing, notifications, safety
**PRD refs:** §11.1 · **Depends:** T1.2
- [x] Tables: `merchant_accounts`, `merchant_staff`, `ladder_configs`, `ladder_levels`, `memberships`, `coupons`, `drops`, `drop_claims`, `merchant_checkins`, `seat_charges`, `subscriptions`, `entitlements`, `grants`, `founding_counters`, `merchant_subscriptions`, `invoices`, `activity_items`, `notification_prefs`, `merchant_mutes`, `proximity_log`, `push_tokens`, `blocks`, `reports`, `moderation_actions`, `safety_ratings`, `audit_log`
- [x] `seat_charges.checkin_id` unique (one charge per check-in)
- [x] `drop_claims (drop_id, user_id)` unique
**Acceptance:** full schema migrates from zero in < 30 s.

### [ ] T1.4 Seed data
**PRD refs:** §4.3, §16 · **Depends:** T1.3
- [ ] `infra/seed/districts.geojson` — 18 HK district boundaries (source: HK government open data; record source + licence in `infra/seed/SOURCES.md`)
- [ ] Seed script: districts, `founding_counters` (`consumer_500`, `merchant_50`), city chat room per district, admin user from `ADMIN_EMAIL`
- [ ] Spot templates list + default durations in `constants.ts` (no table needed)
**Tests:** after seed, a point in Central resolves to "Central and Western" via `ST_Contains`.
**Acceptance:** `pnpm db:seed` is idempotent.

### [ ] T1.5 Repository & transaction helpers
**PRD refs:** §9 · **Depends:** T1.3
- [ ] `db/client.ts` (pool), `withTx(fn)` helper, row-lock helpers (`SELECT … FOR UPDATE`) for counters and capacities
- [ ] Shared pagination helper (cursor = `(created_at, id)`)
- [ ] PII encryption helper (AES-256-GCM) for `phone_e164` storage + deterministic hash column for uniqueness lookup
**Tests:** encryption round-trip; concurrent increment of a counter with `withTx` yields exact totals.

---

## M2 Auth & accounts

### [ ] T2.1 GoTrue integration & JWT middleware
**PRD refs:** §2.2 (Auth), §12.1 · **Depends:** T1.5
- [ ] Fastify `authenticate` decorator verifying GoTrue JWT (HS256 shared secret; JWKS support behind config)
- [ ] `request.user` = `{id, phoneVerified, role}` loaded from `users` (cached 60 s in Redis)
- [ ] Guards: `requireAuth`, `requirePhoneVerified` (→ 403 verify), `requireRole(admin roles)`
**Tests:** valid/expired/forged tokens; guard responses.

### [ ] T2.2 Onboarding: DOB gate + user row
**PRD refs:** §3.1, §7.1, §12.1 · **Depends:** T2.1
- [ ] `POST /me/onboard {date_of_birth, referral_code?}`: creates `users` + `profiles` rows; rejects age < 18 (HKT date math) with 422 and does not create the row
- [ ] Generates `referral_code`; links `referred_by` if code valid (reward logic in T17.6)
- [ ] `GET /me`, `PATCH /me` (display name, sketch fields)
**Tests:** age 17y364d rejected, 18y0d accepted; duplicate onboard is idempotent.

### [ ] T2.3 Phone verification sync
**PRD refs:** §6.1 (BM), §7.1 · **Depends:** T2.2
- [ ] GoTrue phone OTP configured for +852 only (API also validates `^\+852\d{8}$` before calling)
- [ ] After OTP success, client calls `POST /me/phone/confirm`; API reads the verified phone from GoTrue admin API, checks uniqueness via hash, stores encrypted, sets `phone_verified_at`
- [ ] One account per phone: second account with same phone → 409
- [ ] Rate limit OTP requests 3/hour per user and per IP
**Tests:** happy path; duplicate phone; non-852 rejected.

### [ ] T2.4 Account deletion & data export
**PRD refs:** §5.3 (Settings), §14, §15 (Retention) · **Depends:** T2.2
- [ ] `DELETE /me`: soft delete (`deleted_at`), revoke sessions (GoTrue admin), hide from all queries; anonymisation job after 30 days
- [ ] `GET /me/export`: JSON of the user's own data (profile, keywords, pokes sent, messages authored, memberships, subscriptions)
**Tests:** deleted user disappears from viewport/member lists; export contains only own data.

### [ ] T2.5 Caps & entitlements read model (stub)
**PRD refs:** §3.10, §8.1 · **Depends:** T2.2
- [ ] `entitlements` service: `getPlan(userId)` → `free|plus|pro` (default free), `getCaps(plan)` from constants
- [ ] `GET /me/caps` returning limits and current usage per cap type
- [ ] `assertCap(userId, capType)` helper throwing 402
**Tests:** usage counts per cap type; 402 shape.

---

## M3 Profiles, keywords, photos

### [ ] T3.1 Keywords API
**PRD refs:** §3.1 · **Depends:** T2.2
- [ ] `PUT /me/keywords` (replace set; normalise lowercase/trim; validate max 10, max 3 at ≥ 8 → 422 with reason)
- [ ] Keyword suggestions list (`packages/shared/keywords.ts`) for autocomplete
**Tests:** validation cases.

### [ ] T3.2 Photos (R2)
**PRD refs:** §3.1, §15 (Security) · **Depends:** T2.2
- [ ] `POST /me/photos` → presigned PUT URL (R2, private bucket), max 6, image types only, 8 MB limit
- [ ] `POST /me/photos/confirm`, `DELETE /me/photos/{i}`, reorder endpoint (first = primary)
- [ ] Image processing job: strip EXIF (location!), resize to 1080 + 320 thumbnail
- [ ] Signed GET URL generator (10 min)
**Tests:** EXIF stripped; 7th photo rejected.

### [ ] T3.3 Photo visibility resolver
**PRD refs:** §3.1 (resolver table) · **Depends:** T3.2, T1.2
- [ ] `canSeePhoto(viewerId, subjectId, context)` and `resolveProfileView(viewerId, subjectId, context)` returning sketch-only / primary-photo / full
- [ ] Contexts: `map`, `spot_card`, `queue`, `inbox`, `chat_room`, `event_room`, `event_done`, `profile`
- [ ] Respect blocks, `hide_photo_in_rooms`, connections, attendance statuses (attendance table exists from T1.2; populated later)
- [ ] `GET /users/{id}?context=&contextId=`
**Tests:** a full matrix test (every context × relationship) — this test is a launch gate.

### [ ] T3.4 Vibe match
**PRD refs:** §3.2 · **Depends:** T3.1
- [ ] `vibe(userKeywords, referenceKeywords)` per PRD formula; returns 0.5 if either side empty; clamp [0,1]
- [ ] Display helper → integer % capped at 99
**Tests:** worked examples incl. empty sides.

---

## M4 Venues & geo

### [ ] T4.1 District resolution & viewport queries
**PRD refs:** §4.3, §12.2 · **Depends:** T1.4
- [ ] Insert hooks/triggers setting `district_id` via `ST_Contains`
- [ ] `GET /map/viewport?bbox=` (venues + spots, limit 500, scoped to districts intersecting bbox)
- [ ] `GET /districts`, `GET /districts/{id}/spots`
**Tests:** bbox spanning two districts returns both; no global query path exists.

### [ ] T4.2 FEHD importer
**PRD refs:** §4.2 · **Depends:** T4.1
- [ ] Fetch the FEHD restaurant licence dataset (data.gov.hk; XML/API — confirm current resource URL at build time and store it in config)
- [ ] Parse records: licence number, licence type, licensed name (EN/ZH), address (EN/ZH)
- [ ] Upsert by `fehd_licence_no`; new or changed address → enqueue geocode job
- [ ] Licences missing from today's file → `status=closed` + `closed_at`; hide after 14 days unless claimed
- [ ] pg-boss schedule daily 10:00 HKT; config flag to limit to selected districts (launch: Central & Western)
- [ ] Import run log (counts, errors) for admin
**Tests:** parser against a saved fixture; idempotent re-run; closure detection.

### [ ] T4.3 ALS geocoder
**PRD refs:** §4.2 · **Depends:** T4.2
- [ ] Call Address Lookup Service (`https://www.als.gov.hk/lookup`, `Accept: application/json`) with the address
- [ ] Pick best match by score; read HK1980 grid easting/northing
- [ ] Convert HK1980 grid → WGS84 using `proj4` (EPSG:2326 → EPSG:4326)
- [ ] Throttle (e.g. 2 req/s), retry with backoff; unresolved → `geocode_failed` queue for manual pin in admin
**Tests:** conversion fixture (known landmark within 20 m); low-score handling.

### [ ] T4.4 User-added venues, dedupe, reports, saves
**PRD refs:** §4.2, §12.2 · **Depends:** T4.1, T2.3
- [ ] `POST /venues` (phone-verified): name, category, lat/lng; dedupe check (normalised name within 50 m → return `{duplicates:[...]}` and require `force=true`)
- [ ] `POST /venues/{id}/report` (3 reports → admin queue)
- [ ] `POST/DELETE /venues/{id}/save`
- [ ] `GET /venues/search?q=&district=` (trigram index on display/legal names, EN + ZH)
**Tests:** dedupe; report threshold; search ranking.

### [ ] T4.5 Venue activity counts (marker size)
**PRD refs:** §4.1 · **Depends:** T4.1
- [ ] Materialised view or cached query: high-confidence `merchant_checkins` per venue, last 7 days
- [ ] Included in viewport response as `activity7d`; never member count
**Tests:** low-confidence check-ins excluded.

### [ ] T4.6 Data attribution
**PRD refs:** §4.2, §14 · **Depends:** T4.2
- [ ] Attribution text constant ("Contains data from DATA.GOV.HK" — verify wording against data.gov.hk terms) exposed via `GET /meta/attributions`
**Acceptance:** text present for web footer and app About (wired in M5/M6).

---

## M5 Mobile foundation (Flutter)

### [ ] T5.1 Flutter project setup
**PRD refs:** §5, §2.2 · **Depends:** T0.4, T0.6
- [ ] `flutter create apps/mobile` (bundle ids `com.meshpoke.app`), flavors `dev`/`prod`
- [ ] Packages: riverpod, go_router, freezed, json_serializable, dio, flutter_secure_storage, supabase_flutter (auth only), google_maps_flutter, geolocator, permission_handler, firebase_core, firebase_messaging, flutter_local_notifications, intl, cached_network_image
- [ ] Folder structure: `lib/core` (theme, constants.g.dart, router, api client, errors), `lib/features/<feature>/{data,state,ui}`
- [ ] Theme from Design System §13 (dark-first palette, Inter + Noto Sans TC, rounded-16 cards)
- [ ] i18n with `flutter_localizations` + ARB files (en only)
- [ ] CI job enabled (T0.5)
**Acceptance:** app runs on iOS simulator + Android emulator showing the themed shell.

### [ ] T5.2 Auth & onboarding screens
**PRD refs:** §5.2 (Registration), §6.1 (BM) · **Depends:** T5.1, T2.3
- [ ] Sign in with Apple, Google, email/password (GoTrue via supabase_flutter); session stored securely
- [ ] DOB screen (blocks < 18 with friendly message); referral code captured from deep link `meshpoke://r/{code}`
- [ ] Phone verification screen (+852 prefix fixed, OTP entry, resend timer)
- [ ] Browse-only banner + "verify to …" prompts when a guarded action returns 403 verify
**Tests:** widget tests for DOB validation and OTP flow states.

### [ ] T5.3 Navigation shell
**PRD refs:** §5.1 · **Depends:** T5.2
- [ ] Bottom tabs: Map, Spots, Rooms, Inbox, Profile; header with activity bell + My QR (placeholders until M14/M15)
- [ ] go_router deep links: `meshpoke://spot/{id}`, `venue/{id}`, `r/{code}`; universal links config (apple-app-site-association / assetlinks.json served by web in T6.1)
- [ ] Global error handling: 402 → upgrade sheet (no prices from web), 403 verify → verify sheet
**Acceptance:** deep link opens the right screen from a cold start.

### [ ] T5.4 Profile editing
**PRD refs:** §3.1, §5.3 · **Depends:** T5.3, T3.1, T3.2
- [ ] Sketch editor (industry, one-liner 40 chars, prompts)
- [ ] Keywords editor with level slider and live validation (max 10, max 3 at 8+)
- [ ] Photo manager (pick, crop, upload, reorder, delete) + "Hide my photo in chat rooms" toggle
- [ ] Trust-signal row component (member since, spots attended, score/unproven)
**Tests:** keyword validation widget test.

### [ ] T5.5 Map screen
**PRD refs:** §4.1, §5.3 (Map home) · **Depends:** T5.3, T4.1, T4.5
- [ ] Google map (dark style), location permission (when-in-use) with explanation screen
- [ ] Viewport fetch on camera idle (debounced), clustering, venue markers sized by `activity7d`, spot markers by state
- [ ] District banner, filter chips (template, date: Today/This week/All, keywords), default "This week"
- [ ] Graceful degradation: map error → list view
**Acceptance:** panning Central shows FEHD venues from the seeded import.

### [ ] T5.6 Venue page & add-a-place
**PRD refs:** §4.2, §5.3 (Venue page) · **Depends:** T5.5, T4.4
- [ ] Venue page: name, category, address, claimed badge, activity, save/unsave, report
- [ ] "Add a place" flow: drop pin, name, category, duplicate suggestions
- [ ] About screen with data attribution (T4.6)
**Tests:** duplicate suggestion flow widget test.

---

## M6 Web foundation

### [ ] T6.1 Web app setup
**PRD refs:** §6.1, §13 · **Depends:** T0.4, T0.6
- [ ] Vite + React + TS + Tailwind + TanStack Router/Query; design tokens from §13 (light + dark)
- [ ] Route groups: public (`/`), `app/*`, `merchant/*`, `admin/*`
- [ ] Serve `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`
- [ ] Sentry + PostHog (consent-aware)
**Acceptance:** `pnpm --filter web dev` renders the landing route.

### [ ] T6.2 Marketing pages
**PRD refs:** §6.1 · **Depends:** T6.1
- [ ] `/` hero with pitch line "Poke the mesh. Watch your network ripple." + subline, live-map mock, how it works, safety highlights, waitlist form (stores email; double opt-in via Resend)
- [ ] `/how-it-works`, `/safety` (18+, verification, photo rules, Scameter + 999), `/about`, `/terms`, `/privacy` (placeholders for legal text), `/support/*` FAQ
- [ ] `/pricing` rendered from constants (web prices, founding banner with live counter, merchant section + per-seat explainer)
- [ ] `/venue`, `/venue/pricing` merchant landing
- [ ] Footer with data attribution
- [ ] SEO: meta, OG images, sitemap, robots
**Acceptance:** Lighthouse ≥ 90 performance/SEO on `/`.

### [ ] T6.3 Web auth
**PRD refs:** §6.1 (`/login`, `/signup`) · **Depends:** T6.1, T2.3
- [ ] Apple/Google/email via supabase-js; DOB step; phone verification step
- [ ] Session refresh; protected route guard for `app/*`, `merchant/*`, `admin/*`
**Tests:** Playwright sign-up with email (local GoTrue + mailpit).

### [ ] T6.4 Authenticated shell & profile
**PRD refs:** §6.2 · **Depends:** T6.3, T3.1, T3.2
- [ ] Layout with nav: Inbox, Spots, Rooms, Connections, Wallet, Billing, Settings
- [ ] Profile editor (sketch, keywords, photos, hide-photo toggle) sharing Zod schemas with API
- [ ] Settings: notifications prefs (wired in M14), blocked list, delete account, data export
**Acceptance:** profile edits on web appear in the mobile app.

### [ ] T6.5 Spot share pages
**PRD refs:** §6.1 (`/s/{id}`) · **Depends:** T6.1
- [ ] Server-rendered OG metadata for `/s/{id}` (template, district, date state, seats left — no member data) via a small SSR handler in the web container or API-rendered HTML
- [ ] "Open in app" + store links
**Acceptance:** WhatsApp link preview shows the card (test with a public URL in staging).

---

## M7 Chat rooms & realtime

### [ ] T7.1 Realtime gateway
**PRD refs:** §9 (Chat), §12.4 · **Depends:** T2.1
- [ ] Socket.io server on `/ws` with JWT auth handshake, Redis adapter
- [ ] Room join/leave authorisation (membership check), typing (optional), presence counts per room
- [ ] Message persistence (`messages`), delivery ack, offline catch-up via `GET /rooms/{id}/messages?cursor`
**Tests:** two clients exchange messages; unauthorised join rejected.

### [ ] T7.2 Chat room spots & city rooms
**PRD refs:** §3.5 (chat room spot), §3.10 · **Depends:** T7.1, T2.5
- [ ] `POST /spots {kind:"chat"}` (hosting rights) creates spot + room; city rooms seeded per district
- [ ] `POST /rooms/{id}/join` with chat cap check; unverified users may join **read-only**
- [ ] Posting requires phone verification (server-enforced on WS and REST)
- [ ] Member list uses photo resolver (`chat_room` context)
**Tests:** unverified can read but not post; cap 402 at 6th room for free.

### [ ] T7.3 Message safety hooks (basic)
**PRD refs:** §7.2 · **Depends:** T7.1
- [ ] Link detection; links blocked for unverified and (in DMs) until link lock lifts (completed in T13.2)
- [ ] Per-user message rate limit (e.g. 20/min)
**Tests:** link in message from unverified rejected.

### [ ] T7.4 Mobile rooms
**PRD refs:** §5.3 (Room) · **Depends:** T7.2, T5.3
- [ ] Rooms tab list (unread badges), room screen (messages, member rail with photo rules, read-only banner for unverified)
- [ ] Socket.io client with reconnect and offline queue
**Acceptance:** message round-trip between two devices < 1 s on local network.

### [ ] T7.5 Web rooms
**PRD refs:** §6.2 · **Depends:** T7.2, T6.4
- [ ] Rooms list + chat view using the same WS protocol
**Acceptance:** web ↔ mobile chat works.

---

## M8 Merchant claim, admin basics, Phase 0 release

### [ ] T8.1 Merchant claim flow
**PRD refs:** §4.2 (claims), §12.8 · **Depends:** T4.4, T6.3
- [ ] `/venue/claim` web flow: search venue (or add), upload Business Registration certificate (R2 private), declare price band, contact details
- [ ] `POST /merchant/claim` → `merchant_accounts (claim_status=pending, tier=starter)`; staff table with owner
- [ ] On approval: venue `claimed_by_merchant_id`, users can no longer edit the venue
**Tests:** one active claim per venue; rejected claim can be resubmitted.

### [ ] T8.2 Merchant portal shell (Starter features)
**PRD refs:** §6.3 · **Depends:** T8.1
- [ ] `/merchant` layout (mobile-responsive), dashboard (check-ins placeholder), venue profile editor (display name, pin correction on a small map, hours, menu, photos — rich fields locked below Growth)
- [ ] Standing rooms management (Starter 3 / Growth 10 / Pro ∞) creating chat room spots owned by the merchant
**Acceptance:** a founding merchant can claim and run a standing room in Phase 0.

### [ ] T8.3 Admin basics
**PRD refs:** §10 · **Depends:** T6.3
- [ ] `/admin` with RBAC (superadmin, moderator, support, finance) and mandatory 2FA (GoTrue MFA TOTP)
- [ ] Users search + detail (verification, DOB, plan, safety history), suspend/restore with reason → `audit_log`
- [ ] Merchant claim approvals (view BR certificate via signed URL)
- [ ] Venues: import runs, geocode-failed queue (set pin manually), venue reports, merge duplicates
**Tests:** non-admin gets 403 on all admin routes.

### [ ] T8.4 Staging deploy (first)
**PRD refs:** §2.3 · **Depends:** T6.2, T8.2
- [ ] On the existing Hetzner box: create `meshpoke` DB + `meshpoke_app` role + PostGIS extension on the existing Postgres
- [ ] Dokploy apps: `meshpoke-api`, `meshpoke-web`, `meshpoke-auth`, `meshpoke-redis` with memory limits
- [ ] Cloudflare DNS for `staging.meshpoke.com`, `api-staging…`, `auth-staging…`
- [ ] Nightly `pg_dump` to R2 job; restore runbook in `infra/RUNBOOK.md`
**Acceptance:** staging reachable over HTTPS; SupremaNode unaffected (memory headroom checked).

### [ ] T8.5 Phase 0 internal release
**PRD refs:** §16 (Phase 0) · **Depends:** T5.6, T7.4, T8.4
- [ ] TestFlight + Play internal track builds via Codemagic
- [ ] Waitlist landing live on production domain
- [ ] FEHD import running for Central & Western; founding merchants onboarded in admin
- [ ] Smoke checklist: sign-up → DOB → verify → profile → map → venue → join city room → chat
**Acceptance:** 5 internal testers complete the smoke checklist.

---

# PHASE 1 — VALIDATE (Month 2–5)

## M9 Event spots & queues

### [ ] T9.1 Event spot creation & hosting capacity
**PRD refs:** §3.5 · **Depends:** T7.2, T3.4
- [ ] `POST /spots {kind:"event"}`: template, name, required keywords ≤3, min score, price range, join mode, district anchor, min/max headcount, date range
- [ ] Hosting capacity check (1/3/5 from `hosting_capacity`, default 1) counting active hosted event spots
- [ ] Event cap check for host
- [ ] Spot room created (kind `event`)
**Tests:** capacity exceeded → 403 with reason; validation errors.

### [ ] T9.2 Join & apply
**PRD refs:** §3.5, §3.10 · **Depends:** T9.1
- [ ] `POST /spots/{id}/join` (open mode, capacity check, phone-verified, event cap)
- [ ] `POST /spots/{id}/apply {note}` (application mode): hard filters (min score, required keywords) evaluated at apply time → 422 with reason if not eligible
- [ ] Waitlist when full; leave endpoint
**Tests:** hard-filter rejections; event cap 402 at 4th spot for free.

### [ ] T9.3 Recommended sort service
**PRD refs:** §3.8 · **Depends:** T9.2, T3.4
- [ ] `recommendedScore({tier, vibe, score})` using weights from PostHog flag (fallback constants), 60 s cache
- [ ] Unproven → 0.5; missing keywords → vibe 0.5; ties by `created_at` asc
- [ ] `GET /spots/{id}/queue?sort=` with counts per status and express badge flag
**Tests:** **worked example test (Amy 0.61, Cara 0.57, Ben 0.37 in that order)**; tie ordering; weights override via flag.

### [ ] T9.4 Decisions, date-on-fill, confirm, bail
**PRD refs:** §3.5 (Date-on-fill) · **Depends:** T9.3
- [ ] `POST /applications/{id}/decision` with reason presets (constants) + free text
- [ ] When accepted count ≥ min headcount, host can `POST /spots/{id}/schedule {starts_at, venue_id, group_drop_id?}` → state `confirmed`, `confirm_deadline = now + 48h`
- [ ] `POST /spots/{id}/confirm`, `POST /spots/{id}/bail` (within grace: no penalty; after: `late_cancel` score event; waitlist backfill)
- [ ] Jobs: dissolve at deadline if not all confirmed (configurable rule: dissolve if confirmed < min headcount), `confirmed → live → done` transitions by time
- [ ] Host cancel → score event + auto-apology system message
**Tests:** full state-machine integration test including dissolve and backfill.

### [ ] T9.5 Mobile: spots discovery, detail, apply
**PRD refs:** §5.2, §5.3 · **Depends:** T9.2, T5.5
- [ ] Spots tab list (district/viewport scoped, filters), spot detail screen (all fields, trust signals, group drop badge placeholder), apply sheet with note counter
- [ ] Map spot markers open spot detail
**Acceptance:** apply flow works end-to-end on device.

### [ ] T9.6 Mobile: host flow
**PRD refs:** §5.2 (Host), §5.3 · **Depends:** T9.4, T9.5
- [ ] Create-spot stepper; queue screen with sort switcher, accept/decline + reasons; schedule screen (date picker + venue search + optional group drop list); confirm/bail UI for members
**Acceptance:** two-device test: host creates → member applies → accept → schedule → confirm.

### [ ] T9.7 Spot share links
**PRD refs:** §6.1 (`/s/{id}`) · **Depends:** T9.1, T6.5
- [ ] `GET /s/{id}/share` public endpoint; share button in mobile (WhatsApp-first share sheet)
**Acceptance:** shared link renders OG card and deep-links into the app.

---

## M10 Attendance & Show-up Score

### [ ] T10.1 "I'm here" GPS
**PRD refs:** §3.5 (Live), §4.3 · **Depends:** T9.4
- [ ] `POST /spots/{id}/im-here {lat,lng,accuracy_m}` during `live` only; GPS overlap via `ST_DWithin(venue, point, 100 + accuracy)`; sets `verified_gps`; coordinates not stored
**Tests:** inside/outside/accuracy-edge cases.

### [ ] T10.2 Attendance lifecycle
**PRD refs:** §3.6 · **Depends:** T10.1
- [ ] On `done`: create `attendance` rows (`attended`) for confirmed members
- [ ] Roll-call: `GET/POST /spots/{id}/roll-call` (host, 24h window) → `absent_host`
- [ ] Peer reports: `POST /spots/{id}/report-absent` (attendees only, 24h) → `absent_reported` at ≥2 distinct reporters
- [ ] Forgiveness: `POST /spots/{id}/forgiveness` (48h) + host accept → `forgiven`
- [ ] Finalisation job at done + 24h: freeze statuses (forgiveness can still flip later), emit `score_events`, trigger referral reward check (T17.6), People-you-met membership recalculated
**Tests:** default attended; host absent; 1 report no effect, 2 reports absent; forgiveness flips.

### [ ] T10.3 Show-up Score engine
**PRD refs:** §3.6 · **Depends:** T10.2
- [ ] Score computation (0–1) from weighted events with 90-day decay; unproven until 3 finalised outcomes; `proven_state` thresholds (constants)
- [ ] Hosting capacity updates from score (unproven 1 → proven 3 → top 5)
- [ ] Enforcement ladder (warning → application cooldown → hosting paused) with notifications
- [ ] Nightly recompute job
**Tests:** score monotonicity cases; decay; capacity transitions.

### [ ] T10.4 Mobile: live & after-event UX
**PRD refs:** §5.2 (Attend), §5.3 (Roll-call) · **Depends:** T10.2
- [ ] "I'm here" button on live spot (with location permission flow)
- [ ] Host roll-call screen (all ticked by default)
- [ ] After-event screen: report absent, forgiveness prompt when marked absent
- [ ] Photo reveal after done per resolver (`event_done` context)
**Acceptance:** two-device test of roll-call and reveal.

### [ ] T10.5 Trust signals everywhere
**PRD refs:** §3.3 · **Depends:** T10.3
- [ ] API returns `trust: {memberSince, spotsAttended, score | "unproven"}` on sketches, queue items, inbox items, member lists
- [ ] Friend-of-friend flag (connections degree 2, computed on request with cache)
**Tests:** spotsAttended counts only `attended|forgiven`.

---

## M11 Pokes & connections

### [ ] T11.1 Poke ledger & cost resolution
**PRD refs:** §3.4 · **Depends:** T2.5, T10.2
- [ ] `poke_balances` with lazy Monday 00:00 HKT reset (`last_reset_at < mostRecentMondayMidnightHKT(now)` → reset)
- [ ] `resolvePokeCost(from, to, source)` order: (1) pending poke from `to` exists → `free_poke_back`; (2) both attended same done spot within 48h → `free_post_spot`; (3) weekly allowance → `weekly`; (4) credits → `credit`; else 402
- [ ] Expiry job (7 days) → `expired`, **no refund**
**Tests:** Monday boundary (Sun 23:59 vs Mon 00:00 HKT); each cost branch; expiry no refund.

### [ ] T11.2 Poke & connection endpoints
**PRD refs:** §3.4, §12.4 · **Depends:** T11.1, T9.3
- [ ] `POST /pokes {to, note, source, spot_id?}` (phone-verified, note length by plan, not blocked, not already connected, one pending poke per direction)
- [ ] Poke back creates `connections` row atomically and marks both pokes `returned`; opens DM room
- [ ] `GET /pokes/incoming?sort=` (Recommended with inbox vibe), `GET /connections`, `POST /connections/{id}/disconnect` (silent, closes DM for both)
- [ ] `GET /people-you-met/{spot_id}` (48h, attendees only, excludes absent)
**Tests:** poke back free + connection; disconnect closes DM; reconnect via new mutual poke.

### [ ] T11.3 DMs
**PRD refs:** §9 (Chat) · **Depends:** T11.2, T7.1
- [ ] DM room per connection; closed on disconnect (history hidden for both)
- [ ] Link lock: links/handles blocked unless the two users share an `attended|forgiven` spot (enforced server-side)
**Tests:** link lock on/off cases.

### [ ] T11.4 Mobile: pokes, inbox, connections
**PRD refs:** §5.2 (Poke → connection), §5.3 · **Depends:** T11.2
- [ ] Poke sheet (note counter, allowance indicator: "3 of 5 left this week")
- [ ] Inbox: Recommended sort default + switcher, trust signals, **"Poke back · Free"** button
- [ ] People-you-met list with "Free poke · met at {spot} · {h}h left"
- [ ] Connections list (Message, Disconnect with confirm); CTA switches Poke → Message
- [ ] Ripple animation on poke CTA (one-shot)
**Acceptance:** device test: poke → poke back → message.

### [ ] T11.5 Web: inbox & connections
**PRD refs:** §6.2 · **Depends:** T11.2, T6.4
- [ ] Inbox with poke back, connections list, DM chat, People-you-met
**Acceptance:** parity with mobile for these flows.

---

## M12 Crews & rebook

### [ ] T12.1 Crew API
**PRD refs:** §3.7 · **Depends:** T10.2
- [ ] `POST /spots/{id}/crew {keep}` (attendees only); crew created on first keeper; crew room
- [ ] Crew cap check (active crews); `PATCH /crews/{id}` WhatsApp URL; leave
- [ ] Dormancy job (60d no rebook) → not counted in caps; reactivation on rebook
**Tests:** cap counts exclude dormant crews.

### [ ] T12.2 Rebook with date poll
**PRD refs:** §3.7 · **Depends:** T12.1, T9.4
- [ ] `POST /crews/{id}/rebook {poll_options[2..5]}` (hosting rights + capacity) → `rebooks`
- [ ] Vote, finalize → creates event spot (same template + venue) with crew members pre-invited (still need confirm), optional public seats
**Tests:** finalize creates spot with correct members.

### [ ] T12.3 Mobile & web crew UI
**PRD refs:** §5.3 (Crew view) · **Depends:** T12.2
- [ ] "Do it again?" prompt after done; crew screen (members, chat, Rebook, poll voting); web crew view
**Acceptance:** two-device rebook flow.

---

## M13 Safety & moderation

### [ ] T13.1 Reports & blocks
**PRD refs:** §7.2, §7.3 · **Depends:** T7.1, T11.2
- [ ] `POST /reports` (targets: user, message, spot, venue), `POST/DELETE /blocks/{user_id}`
- [ ] Blocks hide both users from each other everywhere (queues, inbox, rooms, map member lists)
- [ ] 3 distinct reports → auto-mute (posting disabled) pending review
**Tests:** block matrix; auto-mute threshold.

### [ ] T13.2 Scam filters & link lock
**PRD refs:** §7.2 · **Depends:** T11.3
- [ ] Pattern library (`packages/shared/scam-patterns.ts`): crypto, investment returns, "download this app", move-to-Telegram/WhatsApp, phone numbers, @handles, emails
- [ ] On send: flagged → interstitial required (`requireConfirm`); on receive: warning banner flag
- [ ] Scameter link in scam report flow
**Tests:** fixture messages flagged / not flagged.

### [ ] T13.3 Share-my-spot & safety ratings
**PRD refs:** §7.2 · **Depends:** T9.4
- [ ] Share-my-spot: signed public link (venue, time, attendee count; expires 2h after end)
- [ ] Post-spot private safety rating (1–5 + flag) feeding moderation signals
**Tests:** link expiry; ratings never exposed via public endpoints.

### [ ] T13.4 Admin moderation queue
**PRD refs:** §10 · **Depends:** T13.1, T8.3
- [ ] Queue of reports + auto-muted users, content preview, warn/mute/suspend/restore, appeal notes, audit log
**Acceptance:** moderator can action a report end-to-end.

### [ ] T13.5 Mobile & web safety UI
**PRD refs:** §5.3, §7 · **Depends:** T13.2, T13.3
- [ ] Report/block entry points on profiles, messages, spots, venues; interstitial screens; share-my-spot; rating prompt
**Acceptance:** manual safety checklist in §17 passes.

---

## M14 Notifications & activity feed

### [ ] T14.1 Activity feed service
**PRD refs:** §3.11 · **Depends:** T11.2, T9.4
- [ ] `notify(userId, category, type, payload)` writes `activity_items` and enqueues push
- [ ] `GET /me/activity?cursor`, `POST /me/activity/read`
- [ ] Emit for: pokes, poke backs, connections, application decisions, date pinned, confirm reminders, event reminders, post-spot window, crew polls, enforcement notices
**Tests:** each emitter creates an item.

### [ ] T14.2 Push dispatch
**PRD refs:** §3.11, §5.4 · **Depends:** T14.1
- [ ] FCM (Android) + APNs (iOS via FCM) dispatch worker; `POST /me/push-tokens`
- [ ] Category preferences, quiet hours 23:00–08:00 HKT (defer non-urgent), collapse keys, deep-link payloads
- [ ] `promo` and `proximity` categories disabled unless opted in (enforced in dispatcher)
**Tests:** quiet hours deferral; opted-out category never sent.

### [ ] T14.3 Notification preferences & consent
**PRD refs:** §3.11, BM §6.4 · **Depends:** T14.2
- [ ] `GET/PATCH /me/notification-prefs` (records `promo_consent_at` with consent text version)
- [ ] `POST/DELETE /merchants/{id}/mute`
**Tests:** consent timestamp stored; mute respected.

### [ ] T14.4 Mobile & web notification UI
**PRD refs:** §5.3 (Activity feed, Settings) · **Depends:** T14.3
- [ ] Bell with unread count, activity feed with category filters, deep links
- [ ] Settings: categories, promo consent sheet (explicit wording), muted merchants list; web settings parity
**Acceptance:** push arrives on device and opens the right screen.

---

## M15 Merchant check-in & drops

### [ ] T15.1 User rotating QR
**PRD refs:** §3.9 (User QR) · **Depends:** T2.3
- [ ] Token: `base64url(user_id | window | HMAC(secret, user_id|window))`, 30 s window, verify current ±1
- [ ] `GET /me/qr` (phone-verified) returns payload + seconds remaining; client also posts its location (`POST /me/location-ping` with `purpose=qr`, kept 10 min in Redis only)
- [ ] Replay protection: Redis set of used tokens (120 s TTL)
**Tests:** valid, expired, tampered, replayed tokens.

### [ ] T15.2 Staff scan endpoint
**PRD refs:** §3.9 (Staff scan), §8.3 · **Depends:** T15.1, T8.2
- [ ] `POST /merchant/scan {qr_payload, context?, drop_id?, spot_id?}` (merchant staff only)
- [ ] Resolve context: claimed drop for this venue → `drop`; event spot at this venue with attached group drop and user attending → `group_drop`; active membership → `member_visit` (max 1/day/venue)
- [ ] GPS confidence: guest's recent location within `100 m + accuracy` of venue → `high`, else `low`
- [ ] Writes `merchant_checkins`; calls billing hook (T16.1) for high-confidence billable events
- [ ] Response: user sketch (display name + primary photo for staff identification), event type, billable flag, confidence
**Tests:** each context; low-confidence never billable; double scan same day rejected for member visits.

### [ ] T15.3 Drops (individual + group) API
**PRD refs:** §3.9, BM §7.2–7.3 · **Depends:** T15.2
- [ ] Merchant CRUD: `POST/PATCH /merchant/drops`, pause/resume; tier limits (Starter 1 active individual + 1 group; Growth ~3/week; Pro unlimited)
- [ ] Estimated cost per guest endpoint (offer value estimate + band fee); info flag when discount > 20%
- [ ] User: `GET /venues/{id}/drops`, `POST /drops/{id}/claim` (phone-verified, capacity with row lock, one claim per user per drop)
- [ ] Group drops attachable in `POST /spots/{id}/schedule` (validated: venue matches, active, capacity in tables)
- [ ] Budget cap check: if merchant's month-to-date billable amount ≥ cap → drops auto-paused
**Tests:** concurrent claims never exceed capacity (exactly-once); budget pause.

### [ ] T15.4 Merchant scanner (web)
**PRD refs:** §6.3 (Scanner) · **Depends:** T15.2
- [ ] `/merchant/scanner`: full-screen camera scanner (`@zxing/browser`), context picker, result card (sketch, event type, billable, confidence), sound/vibration feedback
- [ ] Tablet mode toggle (large layout, stays awake via Wake Lock API)
- [ ] Staff management (`POST/DELETE /merchant/staff`), multi-staff on Pro
**Acceptance:** scanning a QR from the mobile app on a staff phone browser returns a result in < 2 s.

### [ ] T15.5 Merchant drops UI
**PRD refs:** §6.3 (Drops builder) · **Depends:** T15.3
- [ ] Drops builder (individual + group), perk-first templates, estimated cost card, >20% note, budget cap setting, list with performance (claims, redemptions, seats)
**Acceptance:** merchant creates both drop kinds without help text questions in usability test.

### [ ] T15.6 Mobile: My QR, drops, group drops
**PRD refs:** §5.2 (Drops & memberships), §5.3 · **Depends:** T15.3
- [ ] My QR screen (rotating, countdown, brightness up, sends location)
- [ ] Venue page: active drops + claim; group drop badges
- [ ] Wallet: claimed drops (memberships added in M20)
- [ ] Host schedule screen shows venue's group drops to attach
- [ ] Post-scan confirmation via push/feed ("Drop redeemed")
**Acceptance:** device + staff phone end-to-end redemption.

---

## M16 Merchant billing & founding programme

### [ ] T16.1 Seat charge engine
**PRD refs:** §8.3 · **Depends:** T15.2
- [ ] `onCheckin(checkin)`: determine event type (`drop_seat` once per user per drop; `group_drop_seat` per attendee; `new_member_visit` within attribution window — wired in M20), band fee from merchant's band, multiplier 1.5 if sponsored, `shadow` flag from founding clock
- [ ] Verified-seat preconditions: confidence high, account phone-verified and > 7 days old
- [ ] Idempotent by `checkin_id`
**Tests:** every band; sponsored multiplier; account age; idempotency; shadow flag.

### [ ] T16.2 Founding programme clock
**PRD refs:** §8.3 (Founding programme), BM §7.5 · **Depends:** T16.1
- [ ] On a founding merchant's first drop go-live: set `founding_drops_start_at`, `founding_free_until = +3 months`
- [ ] Month 1 → seats `shadow=true`; from month 2 → billable
- [ ] End of month 3: if verified seats < 30 → extend `founding_free_until` by 1 month (once) + notify
- [ ] At `founding_free_until`: start Growth at founding price (288/mo or 2,880/yr if pre-chosen) — requires card on file; else downgrade to Starter with notice
- [ ] `founding_counters.merchant_50` atomic
**Tests:** clock transitions with frozen time; guarantee extension.

### [ ] T16.3 Merchant Stripe billing
**PRD refs:** §8.3, §12.8 · **Depends:** T16.2
- [ ] Stripe customer per merchant; `POST /merchant/billing/setup-intent` (card on file)
- [ ] Merchant subscriptions (Growth/Pro monthly/annual, founding prices) via Stripe Subscriptions
- [ ] Monthly invoice job (1st, 03:00 HKT): aggregate unbilled non-shadow `seat_charges` → Stripe invoice items + finalize + charge; shadow lines shown on our invoice record as waived
- [ ] Payment failure → drops paused immediately; SaaS dunning 7 days → downgrade to Starter
- [ ] `/webhooks/stripe` handlers (signature verified)
**Tests:** invoice totals from fixture seats; failure path; webhook signature rejection.

### [ ] T16.4 Merchant invoices & disputes UI
**PRD refs:** §6.3 (Billing) · **Depends:** T16.3
- [ ] Invoices list/detail (lines grouped by event type, drop, date; shadow lines "waived"), card management, budget cap, founding status card (days left, guarantee progress "18/30")
- [ ] Dispute a seat (7 days) → admin queue
**Acceptance:** merchant sees an accurate shadow invoice in month 1.

### [ ] T16.5 Admin merchant finance
**PRD refs:** §10 · **Depends:** T16.4, T8.3
- [ ] Founding roster, disputes (accept → credit note / reject), per-seat ledger browser, billing health, band audit workspace (quarterly checklist per venue: declared band, evidence notes, change band with notice)
**Acceptance:** finance role can resolve a dispute end-to-end.

---

## M17 Consumer billing, entitlements, referrals

### [ ] T17.1 Product catalogue & entitlements engine
**PRD refs:** §8.1, §8.2 · **Depends:** T2.5
- [ ] Products from constants (all consumer SKUs, web + IAP ids)
- [ ] `recomputeEntitlement(userId)`: active subscriptions + grants (passes, host rewards) → highest plan; writes `entitlements`; caches invalidated
- [ ] Downgrade never kicks users out of existing rooms/spots (only blocks new joins)
**Tests:** overlap cases (pass during subscription, expiry, refund).

### [ ] T17.2 Web checkout (Stripe)
**PRD refs:** §8.2, §12.9 · **Depends:** T17.1
- [ ] `POST /billing/checkout {product, coupon?}` → Stripe Checkout (subscriptions for monthly/3m/6m/annual; one-time for passes and packs)
- [ ] Founding: atomic `consumer_500` reservation at checkout session creation (released on expiry), founding annual web-only
- [ ] `POST /billing/portal` → Stripe customer portal (cancel = instant at period end)
- [ ] Webhooks → subscriptions/grants/credits → recompute entitlement; receipt email via Resend
**Tests:** founding counter never exceeds 500 under concurrency; webhook fixtures.

### [ ] T17.3 In-app purchases (RevenueCat)
**PRD refs:** §8.2 · **Depends:** T17.1, T5.3
- [ ] RevenueCat project with App Store + Play products (IAP price points from constants), entitlements `plus`, `pro`; offerings (founding offering while counter < 500)
- [ ] Flutter `purchases_flutter` paywall (no web prices or links), restore purchases, manage subscription deep link
- [ ] `/webhooks/revenuecat` → subscriptions/grants/credits; app user id = our user id
**Tests:** webhook fixtures for purchase, renewal, cancellation, refund.

### [ ] T17.4 Plan-aware features
**PRD refs:** §8.1 · **Depends:** T17.1
- [ ] Caps (event/chat/merchant/crews), poke allowance, note length, tier value for Recommended sort, advanced filters (Plus/Pro or filter pass grant), auto-claim drops (Plus 1/wk, Pro 3/wk at saved venues — job when a drop is published), waitlist auto-join weights
**Tests:** each feature per plan.

### [ ] T17.5 Paywall & upgrade UI
**PRD refs:** §5, §6.2 · **Depends:** T17.3, T17.4
- [ ] Mobile upgrade sheet triggered by 402 (shows the cap hit and IAP options only)
- [ ] Web billing page (web prices, founding banner, current plan, portal link)
- [ ] Copy review: no web price anywhere in mobile (automated grep test in CI for "HK$128", "web", "cheaper" strings in `apps/mobile/lib`)
**Acceptance:** CI grep test passes.

### [ ] T17.6 Referral pokes
**PRD refs:** §3.4 (Referral pokes) · **Depends:** T2.3, T10.2, T11.1
- [ ] Referee +5 credits on phone verification (if `referred_by` set, phone never rewarded before)
- [ ] Referrer +5 credits when referee's first attendance finalises `attended`; monthly cap 10 rewarded referrals
- [ ] `GET /me/referrals`; mobile referral screen with share link `www.meshpoke.com/r/{code}`; web `/r/{code}` landing
**Tests:** cap enforcement; same phone re-registering gets nothing.

---

## M18 Authenticated web & host console

### [ ] T18.1 Spots district list (web)
**PRD refs:** §6.2 · **Depends:** T9.4, T6.4
- [ ] District picker, spot cards, apply/join, RSVP status, 48h confirm, 24h bail
**Acceptance:** a user can do the whole member flow on web except "I'm here".

### [ ] T18.2 Host console (web)
**PRD refs:** §6.2 · **Depends:** T18.1, T10.2
- [ ] My hosted spots, queue review (sorts, accept/decline + reasons), schedule (date + venue search from our venues + group drops), roll-call, member removal with reason
**Acceptance:** host flow parity with mobile (except venue pin creation).

### [ ] T18.3 Wallet & People-you-met (web)
**PRD refs:** §6.2 · **Depends:** T11.5, T15.6
- [ ] Read-only wallet (memberships later, claimed drops), People-you-met with free pokes
**Acceptance:** parity checks.

### [ ] T18.4 Web QA pass
**PRD refs:** §17 · **Depends:** T18.1–T18.3
- [ ] Playwright suites for member flow, host flow, billing, settings
**Acceptance:** suites green in CI.

---

## M19 Phase 1 hardening & launch

### [ ] T19.1 Analytics & metrics
**PRD refs:** §1.4, BM §11 · **Depends:** M9–M17
- [ ] PostHog events for funnels (sign-up → verify → first spot → attended; poke → poke back; drop claim → redemption), feature flags wired
- [ ] Admin metrics page: rebook rate, formation funnel, attendance rate, **free vs paid acceptance (fairness gate)**, check-ins per venue, conversion
**Acceptance:** dashboard shows live staging data.

### [ ] T19.2 Load & resilience testing
**PRD refs:** §15, §17 (Load) · **Depends:** T19.1
- [ ] k6 scripts: viewport bursts, WS fan-out, drop claim contention, scan bursts
- [ ] Verify memory limits on the shared box under load; tune pool sizes
**Acceptance:** NFR targets met (server-time p95) at Phase 1 scale.

### [ ] T19.3 Security review
**PRD refs:** §15 (Security) · **Depends:** T19.1
- [ ] Rate limits on all write endpoints; authz tests for every route (owner/merchant/admin); webhook signature tests; signed URL expiry; PII encryption; dependency audit
**Acceptance:** zero high findings.

### [ ] T19.4 Legal & store prep
**PRD refs:** §18 · **Depends:** T19.3
- [ ] ToS, Privacy Policy (PDPO, storage outside HK), consent texts versioned
- [ ] Apple Small Business Program enrolment; App Store listing (Social Networking, highest age rating, screenshots), privacy manifest; Play listing, Data Safety
- [ ] IAP products created in both stores and mapped in RevenueCat
**Acceptance:** checklist §18 legal + app store items ticked.

### [ ] T19.5 Production deploy
**PRD refs:** §2.3, §18 (Infrastructure) · **Depends:** T19.4
- [ ] Production Dokploy apps + env, Cloudflare DNS + CDN rules, Resend domain, mailboxes, backups + **restore drill**, Sentry alerts
**Acceptance:** restore drill completed and documented.

### [ ] T19.6 Field test with founding merchants
**PRD refs:** §18 (Product gates) · **Depends:** T19.5
- [ ] Run 5+ real event spots and 3 venues' drops; measure scan success, verification time, apply → decision time
- [ ] Photo-rule audit (zero criticals)
**Acceptance:** all product gates in PRD §18 pass.

### [ ] T19.7 Public launch (Phase 1)
**Depends:** T19.6
- [ ] Submit apps for review; release; enable founding pricing; start founding merchant clocks as drops go live
- [ ] Monitor fairness gate weekly; adjust sort weights via flag only if outside 10%
**Acceptance:** apps live in HK stores.

---

# PHASE 2 — MONETISE MERCHANTS (Month 5–8)

## M20 Memberships & ladders

### [ ] T20.1 Ladder config API
**PRD refs:** §3.9 (Membership), BM §7.2 · **Depends:** T19.7
- [ ] Templates (Café, Bar, Restaurant, Fine dining) in constants with default levels
- [ ] `GET/PUT /merchant/ladder`: levels (position, name, min_visits, min_months, discount_pct (no cap), perk_text), inactivity_days (30/60/90); tier limits (Starter templates only ≤3 levels; Growth/Pro ≤5 custom)
- [ ] Benefit-reduction detection → existing members keep level; notify members; reduction effective after 30 days (`effective_from`)
- [ ] Estimate endpoint (discount × band midpoint) + >20% info flag
**Tests:** tier limits; reduction protection.

### [ ] T20.2 Memberships API
**PRD refs:** §3.9, §3.10 · **Depends:** T20.1
- [ ] `POST/DELETE /venues/{id}/membership` (phone-verified, user merchant-spot cap, venue cap 25/100/∞ → waitlist)
- [ ] Founding circle assignment by merchant (2–25, excluded from caps)
- [ ] Waitlist release: Free 24h claim window; Plus/Pro auto-join saved venues with 2×/3× weight
- [ ] `attribution_until = joined_at + 60 days`
**Tests:** caps both sides; waitlist ordering weights.

### [ ] T20.3 Level engine & member visits
**PRD refs:** §3.9 · **Depends:** T20.2, T15.2
- [ ] Member visit scan updates `visits_count`, `last_visit_at`, recomputes level (visits + months thresholds)
- [ ] Nightly job: inactivity decay (drop one level if no visit within inactivity period), release after 60 days without visit
- [ ] Level-up notification (venue category)
**Tests:** level computation table; decay one level; release.

### [ ] T20.4 New-member attribution billing
**PRD refs:** §8.3, BM §7.3 · **Depends:** T20.3, T16.1
- [ ] In `onCheckin`: member_visit high-confidence within `attribution_until` and `attribution_visits_billed < 3` → `new_member_visit` seat charge, increment counter
**Tests:** 4th visit not billed; visit on day 61 not billed; low-confidence not billed.

### [ ] T20.5 Coupons & CRM
**PRD refs:** §6.3 (Members CRM) · **Depends:** T20.3
- [ ] Member coupons unlock at venue threshold (default 50, configurable); issue + redeem via scan
- [ ] CRM: aggregate (Starter), full member list with level, visits, last visit (Growth), export CSV (Pro)
**Tests:** threshold unlock; export only on Pro.

### [ ] T20.6 Merchant ladder builder UI
**PRD refs:** §6.3 (Ladder builder) · **Depends:** T20.1
- [ ] Template picker → level editor, inactivity period, live member-view preview, >20% info note, reduction warning dialog
**Acceptance:** usability test: merchant sets up a 4-level ladder in < 5 minutes.

### [ ] T20.7 Mobile wallet & membership UX
**PRD refs:** §5.2, §5.3 (Wallet, Venue page) · **Depends:** T20.3
- [ ] Join membership on venue page (cap handling, waitlist state), ladder display, progress bar ("2 more visits and 1 more month to Insider"), coupons, post-scan visit confirmation
- [ ] Web wallet read-only update
**Acceptance:** device test: join → 3 scans → level up.

---

# PHASE 3 — SCALE (Month 8–12)

## M21 Scale features

### [ ] T21.1 Pro consumer tier & Pro pass
**PRD refs:** §8.1 · **Depends:** M17
- [ ] Enable Pro products (web + IAP), Pro 7-day pass, founding Pro (counter shared with consumer_500), tier value 1.0, Pro caps
**Acceptance:** Pro purchase flows on both channels.

### [ ] T21.2 Packs & filter pass
**PRD refs:** §8.1 · **Depends:** M17
- [ ] Poke packs (5/15) → credits; 7-day filter pass grant; advanced keyword filters UI
**Acceptance:** credits spent after weekly allowance.

### [ ] T21.3 Host-reward Pro days
**PRD refs:** BM §5.7 · **Depends:** T21.1, T10.2
- [ ] Qualifying spot check at attendance finalisation (min headcount, ≥80% attended, avg rating ≥4) → 2-day `host_reward_pro` grant; cap 7 days/month; expire 60 days
**Tests:** cap and expiry.

### [ ] T21.4 Sponsored amplification
**PRD refs:** BM §7.3, §8 · **Depends:** M16
- [ ] Sponsored toggle on drops (Growth/Pro): district feed placement labelled "Sponsored"; promo push to opted-in users only; per-district per-day send caps; seats billed ×1.5
**Tests:** caps; opted-out users never receive; marker size unaffected.

### [ ] T21.5 Promotional push (venue offers)
**PRD refs:** §3.11 · **Depends:** T14.3
- [ ] Merchant "offer to members/savers" sends (rate-limited), consent-gated, per-merchant mute
**Tests:** consent gating.

### [ ] T21.6 Nearby perks (proximity)
**PRD refs:** §3.11, §4.4 · **Depends:** T21.5
- [ ] Opt-in flow with background-location explanation; native geofences for nearest 20 joined/saved venues (evaluate a maintained Flutter geofencing plugin at task time); refresh on significant location change
- [ ] On entry → `POST /me/location-ping` → server checks Pro-merchant venue, opt-in, mute, `proximity_log` (max 1/day) → push
- [ ] Play background-location declaration + iOS usage strings
**Tests:** daily cap; non-joined venue never triggers.

### [ ] T21.7 Pro merchant automations
**PRD refs:** §6.3 (Pro) · **Depends:** T20.5
- [ ] Birthday treat (requires user opt-in to share birth month with venues they join — default off), win-back after N days inactive, members-only event invites
**Tests:** automation triggers; opt-in respected.

### [ ] T21.8 Second district & finance dashboards
**PRD refs:** §16 (Phase 3), §10 · **Depends:** M19
- [ ] Enable FEHD import + city room for district 2; admin finance (MRR by lane, seat revenue by event type, reconciliation)
**Acceptance:** second district live.

---

# PHASE 4 — EXPAND (Year 2) — backlog

## M22 Expand backlog

- [ ] **T22.1 Annual plans (non-founding)** — Plus 788/yr, Pro 1,288/yr on web + IAP.
- [ ] **T22.2 Liveness verification** — vendor SDK, `liveness_state`, gate for poke/join/DM, non-HK numbers. Trigger-gated (BM §6.3).
- [ ] **T22.3 Automated band cross-checks** — post-visit spend question, 30-day median reassignment with notice.
- [ ] **T22.4 Traditional Chinese (zh-HK)** — translate ARB/JSON strings; Cantonese-friendly register.
- [ ] **T22.5 HK/Singapore server region** — migrate or replicate when cash allows; revisit latency targets.
- [ ] **T22.6 Multi-city & MoR** — multi-city config; Polar/Paddle for non-HK web sales; legal review of gender-based spot rules.

---

## 98. Cross-cutting test matrix (keep green)

| Area | Must-pass tests | Task |
| --- | --- | --- |
| Recommended sort | Worked example Amy 0.61 > Cara 0.57 > Ben 0.37; ties oldest | T9.3 |
| Photo rules | Full context × relationship matrix | T3.3 |
| Pokes | Monday reset boundary; poke back free; no refund on expiry | T11.1 |
| Caps | Each cap per plan returns 402 at limit+1 | T2.5, T17.4 |
| Attendance | 2-report threshold; roll-call; forgiveness | T10.2 |
| Billing | Each band; ×1.5 sponsored; attribution 3-in-60; low-confidence never billed; idempotent | T16.1, T20.4 |
| Founding | Shadow month 1; billable month 2; guarantee extension; counter ≤ 500 / ≤ 50 | T16.2, T17.2 |
| Mobile copy | No web prices or links in `apps/mobile/lib` | T17.5 |
| Safety | Unverified read-only; link lock; scam fixtures; block matrix | T7.2, T11.3, T13.1–T13.2 |
| Geo | GPS overlap edges; HK1980 → WGS84 conversion | T10.1, T4.3 |

---

## 99. Progress Log

Append one line per completed task (newest at the bottom).

| Date | Task | Summary | Deferred / notes |
| --- | --- | --- | --- |
| 2026-10-26 | T0.1 | Monorepo scaffold: pnpm workspace + turbo, ts strict base, eslint9 flat + prettier, README, 5 package skeletons; install+typecheck+lint green | .nvmrc pins 20, local runs Node 22 |
| 2026-10-26 | T0.2 | Dev stack: postgis 15-3.4 + redis 7 + mailpit + standalone GoTrue (v2.132.3) + db-init (auth schema, postgis ext, supabase_auth_admin role w/ search_path); .env.example; Zod config loader; acceptance verified (health/postgis/signup+token) | GoTrue v2.158+ broken standalone (mixed env prefixes, half-applied migrations) — pinned v2.132.3; autoconfirm spelling to verify at T2.1 |
| 2026-10-26 | T0.3 | API skeleton: Fastify 5 factory (app.ts/server.ts split), CORS allowlist + helmet + rate-limit (Redis store, health exempt) + sensible + Zod type provider + problem+json errors w/ request ids, swagger /docs dev-only + openapi.json export script, /v1/health (db+redis checks), pino + dotenv, Vitest + Testcontainers (PostGIS+Redis per run) — 3 integration tests green | WSL: testcontainers needs DOCKER_CONFIG shim (infra/test-docker-config) b/c Docker Desktop credsStore; pnpm override cookie@^1.0.2 (ESM-only cookie@2 breaks light-my-request require); dev env via dotenv not NODE_OPTIONS (--env-file blocked) |
| 2026-10-26 | T0.4 | Generated clients: packages/api-client (openapi-typescript + openapi-fetch wrapper w/ bearer hook); Dart dart-dio SDK at apps/mobile/meshpoke_api (pubName=meshpoke_api) via openapi-generator Docker image (no local Java); single pnpm api:openapi chains spec + TS + Dart | Dart SDK consumed as path dep when apps/mobile pubspec lands (T5.1); regenerate needs docker |
| 2026-10-26 | T0.5 | GitHub Actions CI (.github/workflows/ci.yml): node job (pnpm cache, typecheck/lint/test w/ Testcontainers/build) + flutter placeholder job; green on main run 40282383354 | hashFiles() is step-level only (job-level if broke workflow); CI caught ioredis default-import vs NodeNext — named import; ubuntu-latest→26 migration notice |
| 2026-10-26 | T0.6 | packages/shared: constants.ts (all business numbers — tiers/caps, web+IAP prices, poke rules, sort weights 0.2/0.5/0.3, spot windows, score, merchant bands/prices/rules, notify, geo, QR), time.ts (HKT fixed UTC+8, mostRecentMondayMidnightHKT, quiet hours), gen-dart.ts → apps/mobile/lib/core/constants.g.dart; 14 vitest green | Infinity encodes unlimited in TS; Dart gets double.infinity; gen script root = ../../.. from scripts dir |
| 2026-10-26 | T1.1 | Drizzle schema core.ts (users, profiles, keywords w/ citext, districts, venues, venue_reports, saved_venues) + geo.ts customTypes + migration 0000 (postgis+citext extensions, keyword caps trigger 10/3-level-8); schema-core.test.ts 4 tests; db:generate strips quoted geography typmods (drizzle-kit bug workaround) | drizzle-kit quotes customType dataType names — "geography(Point,4326)" broken, sed fix in scripts/db-generate.sh; users.id has NO FK to auth.users (tests run without auth schema) |
| 2026-10-26 | T1.2 | schema/spots.ts: 18 tables (spots..rebooks) + 20 enums; migration 0001 + hand-appended connections_pair_idx functional unique index (drizzle-kit cannot express), GIST on venues.location + districts.boundary into 0000; schema-spots.test.ts 5 tests (tables, §11.2 indexes, partial index def, pair dedupe, headcount check) | messages_room_idx uses DESC in index expr — drizzle sql` in .on() worked; dateRange stored as text (API constructs bounds) |
| 2026-10-26 | T1.3 | schema/merchant.ts (16 tables incl seat_charges unique checkin_id, drop_claims unique, founding_counters, invoices) + schema/platform.ts (10 tables: activity, prefs, mutes, proximity_log 1/day pk, push tokens, blocks, reports, moderation, safety_ratings private, audit_log); migration 0002; schema-merchant.test.ts 4 tests (full migrate <30s, 26 tables, uniqueness) | subscriptions.channel/product as varchar w/ app-level enum validation (drizzle enum churn not worth it) |
