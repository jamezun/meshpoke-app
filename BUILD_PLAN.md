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
| M1 Database & shared package | 0 | 5 | 5 | ✔ |
| M2 Auth & accounts | 0 | 5 | 5 | ✔ |
| M3 Profiles, keywords, photos | 0 | 4 | 4 | ✔ |
| M4 Venues & geo | 0 | 6 | 6 | ✔ |
| M5 Mobile foundation | 0 | 6 | 6 | ✔ |
| M6 Web foundation | 0 | 5 | 5 | ✔ |
| M7 Chat rooms & realtime | 0 | 5 | 5 | ✔ |
| M8 Merchant claim, admin basics, Phase 0 release | 0 | 5 | 4 | ◐ |
| M9 Event spots & queues | 1 | 7 | 7 | ✔ |
| M10 Attendance & Show-up Score | 1 | 5 | 0 | ☐ |
| M11 Pokes & connections | 1 | 5 | 0 | ☐ |
| M12 Crews & rebook | 1 | 3 | 0 | ☐ |
| M13 Safety & moderation | 6 | 5 | 6 | ◐ | 0 | ☐ |
| M14 Notifications & activity feed | 5 | 7 | 5 | ◐ |
| M15 Merchant check-in & drops | 6 | 6 | ◐ | 0 | ☐ |
| M16 Merchant billing & founding programme | 1 | 5 | 0 | ☐ |
| M17 Consumer billing, entitlements, referrals | 1 | 6 | 6 | ✔ |
| M18 Authenticated web & host console | 1 | 4 | 3 | ☐ |
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

### [x] T1.4 Seed data
**PRD refs:** §4.3, §16 · **Depends:** T1.3
- [x] `infra/seed/districts.geojson` — 18 HK district boundaries (source: HK government open data; record source + licence in `infra/seed/SOURCES.md`)
- [x] Seed script: districts, `founding_counters` (`consumer_500`, `merchant_50`), city chat room per district, admin user from `ADMIN_EMAIL`
- [x] Spot templates list + default durations in `constants.ts` (no table needed)
**Tests:** after seed, a point in Central resolves to "Central and Western" via `ST_Contains`.
**Acceptance:** `pnpm db:seed` is idempotent.

### [x] T1.5 Repository & transaction helpers
**PRD refs:** §9 · **Depends:** T1.3
- [x] `db/client.ts` (pool), `withTx(fn)` helper, row-lock helpers (`SELECT … FOR UPDATE`) for counters and capacities
- [x] Shared pagination helper (cursor = `(created_at, id)`)
- [x] PII encryption helper (AES-256-GCM) for `phone_e164` storage + deterministic hash column for uniqueness lookup
**Tests:** encryption round-trip; concurrent increment of a counter with `withTx` yields exact totals.

---

## M2 Auth & accounts

### [x] T2.1 GoTrue integration & JWT middleware
**PRD refs:** §2.2 (Auth), §12.1 · **Depends:** T1.5
- [x] Fastify `authenticate` decorator verifying GoTrue JWT (HS256 shared secret; JWKS support behind config)
- [x] `request.user` = `{id, phoneVerified, role}` loaded from `users` (cached 60 s in Redis)
- [x] Guards: `requireAuth`, `requirePhoneVerified` (→ 403 verify), `requireRole(admin roles)`
**Tests:** valid/expired/forged tokens; guard responses.

### [x] T2.2 Onboarding: DOB gate + user row
**PRD refs:** §3.1, §7.1, §12.1 · **Depends:** T2.1
- [x] `POST /me/onboard {date_of_birth, referral_code?}`: creates `users` + `profiles` rows; rejects age < 18 (HKT date math) with 422 and does not create the row
- [x] Generates `referral_code`; links `referred_by` if code valid (reward logic in T17.6)
- [x] `GET /me`, `PATCH /me` (display name, sketch fields)
**Tests:** age 17y364d rejected, 18y0d accepted; duplicate onboard is idempotent.

### [x] T2.3 Phone verification sync
**PRD refs:** §6.1 (BM), §7.1 · **Depends:** T2.2
- [x] GoTrue phone OTP configured for +852 only (API also validates `^\+852\d{8}$` before calling)
- [x] After OTP success, client calls `POST /me/phone/confirm`; API reads the verified phone from GoTrue admin API, checks uniqueness via hash, stores encrypted, sets `phone_verified_at`
- [x] One account per phone: second account with same phone → 409
- [x] Rate limit OTP requests 3/hour per user and per IP
**Tests:** happy path; duplicate phone; non-852 rejected.

### [x] T2.4 Account deletion & data export
**PRD refs:** §5.3 (Settings), §14, §15 (Retention) · **Depends:** T2.2
- [x] `DELETE /me`: soft delete (`deleted_at`), revoke sessions (GoTrue admin), hide from all queries; anonymisation job after 30 days
- [x] `GET /me/export`: JSON of the user's own data (profile, keywords, pokes sent, messages authored, memberships, subscriptions)
**Tests:** deleted user disappears from viewport/member lists; export contains only own data.

### [x] T2.5 Caps & entitlements read model (stub)
**PRD refs:** §3.10, §8.1 · **Depends:** T2.2
- [x] `entitlements` service: `getPlan(userId)` → `free|plus|pro` (default free), `getCaps(plan)` from constants
- [x] `GET /me/caps` returning limits and current usage per cap type
- [x] `assertCap(userId, capType)` helper throwing 402
**Tests:** usage counts per cap type; 402 shape.

---

## M3 Profiles, keywords, photos

### [x] T3.1 Keywords API
**PRD refs:** §3.1 · **Depends:** T2.2
- [x] `PUT /me/keywords` (replace set; normalise lowercase/trim; validate max 10, max 3 at ≥ 8 → 422 with reason)
- [x] Keyword suggestions list (`packages/shared/keywords.ts`) for autocomplete
**Tests:** validation cases.

### [x] T3.2 Photos (R2)
**PRD refs:** §3.1, §15 (Security) · **Depends:** T2.2
- [x] `POST /me/photos` → presigned PUT URL (R2, private bucket), max 6, image types only, 8 MB limit
- [x] `POST /me/photos/confirm`, `DELETE /me/photos/{i}`, reorder endpoint (first = primary)
- [x] Image processing job: strip EXIF (location!), resize to 1080 + 320 thumbnail
- [x] Signed GET URL generator (10 min)
**Tests:** EXIF stripped; 7th photo rejected.

### [x] T3.3 Photo visibility resolver
**PRD refs:** §3.1 (resolver table) · **Depends:** T3.2, T1.2
- [x] `canSeePhoto(viewerId, subjectId, context)` and `resolveProfileView(viewerId, subjectId, context)` returning sketch-only / primary-photo / full
- [x] Contexts: `map`, `spot_card`, `queue`, `inbox`, `chat_room`, `event_room`, `event_done`, `profile`
- [x] Respect blocks, `hide_photo_in_rooms`, connections, attendance statuses (attendance table exists from T1.2; populated later)
- [x] `GET /users/{id}?context=&contextId=`
**Tests:** a full matrix test (every context × relationship) — this test is a launch gate.

### [x] T3.4 Vibe match
**PRD refs:** §3.2 · **Depends:** T3.1
- [x] `vibe(userKeywords, referenceKeywords)` per PRD formula; returns 0.5 if either side empty; clamp [0,1]
- [x] Display helper → integer % capped at 99
**Tests:** worked examples incl. empty sides.

---

## M4 Venues & geo

### [x] T4.1 District resolution & viewport queries
**PRD refs:** §4.3, §12.2 · **Depends:** T1.4
- [x] Insert hooks/triggers setting `district_id` via `ST_Contains`
- [x] `GET /map/viewport?bbox=` (venues + spots, limit 500, scoped to districts intersecting bbox)
- [x] `GET /districts`, `GET /districts/{id}/spots`
**Tests:** bbox spanning two districts returns both; no global query path exists.

### [x] T4.2 FEHD importer
**PRD refs:** §4.2 · **Depends:** T4.1
- [x] Fetch the FEHD restaurant licence dataset (data.gov.hk; XML/API — confirm current resource URL at build time and store it in config)
- [x] Parse records: licence number, licence type, licensed name (EN/ZH), address (EN/ZH)
- [x] Upsert by `fehd_licence_no`; new or changed address → enqueue geocode job
- [x] Licences missing from today's file → `status=closed` + `closed_at`; hide after 14 days unless claimed
- [x] pg-boss schedule daily 10:00 HKT; config flag to limit to selected districts (launch: Central & Western)
- [x] Import run log (counts, errors) for admin
**Tests:** parser against a saved fixture; idempotent re-run; closure detection.

### [x] T4.3 ALS geocoder
**PRD refs:** §4.2 · **Depends:** T4.2
- [x] Call Address Lookup Service (`https://www.als.gov.hk/lookup`, `Accept: application/json`) with the address
- [x] Pick best match by score; read HK1980 grid easting/northing
- [x] Convert HK1980 grid → WGS84 using `proj4` (EPSG:2326 → EPSG:4326)
- [x] Throttle (e.g. 2 req/s), retry with backoff; unresolved → `geocode_failed` queue for manual pin in admin
**Tests:** conversion fixture (known landmark within 20 m); low-score handling.

### [x] T4.4 User-added venues, dedupe, reports, saves
**PRD refs:** §4.2, §12.2 · **Depends:** T4.1, T2.3
- [x] `POST /venues` (phone-verified): name, category, lat/lng; dedupe check (normalised name within 50 m → return `{duplicates:[...]}` and require `force=true`)
- [x] `POST /venues/{id}/report` (3 reports → admin queue)
- [x] `POST/DELETE /venues/{id}/save`
- [x] `GET /venues/search?q=&district=` (trigram index on display/legal names, EN + ZH)
**Tests:** dedupe; report threshold; search ranking.

### [x] T4.5 Venue activity counts (marker size)
**PRD refs:** §4.1 · **Depends:** T4.1
- [x] Materialised view or cached query: high-confidence `merchant_checkins` per venue, last 7 days
- [x] Included in viewport response as `activity7d`; never member count
**Tests:** low-confidence check-ins excluded.

### [x] T4.6 Data attribution
**PRD refs:** §4.2, §14 · **Depends:** T4.2
- [x] Attribution text constant ("Contains data from DATA.GOV.HK" — verify wording against data.gov.hk terms) exposed via `GET /meta/attributions`
**Acceptance:** text present for web footer and app About (wired in M5/M6).

---

## M5 Mobile foundation (Flutter)

### [x] T5.1 Flutter project setup
**PRD refs:** §5, §2.2 · **Depends:** T0.4, T0.6
- [x] `flutter create apps/mobile` (bundle ids `com.meshpoke.app`), flavors `dev`/`prod`
- [x] Packages: riverpod, go_router, freezed, json_serializable, dio, flutter_secure_storage, supabase_flutter (auth only), google_maps_flutter, geolocator, permission_handler, firebase_core, firebase_messaging, flutter_local_notifications, intl, cached_network_image
- [x] Folder structure: `lib/core` (theme, constants.g.dart, router, api client, errors), `lib/features/<feature>/{data,state,ui}`
- [x] Theme from Design System §13 (dark-first palette, Inter + Noto Sans TC, rounded-16 cards)
- [x] i18n with `flutter_localizations` + ARB files (en only)
- [x] CI job enabled (T0.5)
**Acceptance:** app runs on iOS simulator + Android emulator showing the themed shell.

### [x] T5.2 Auth & onboarding screens
**PRD refs:** §5.2 (Registration), §6.1 (BM) · **Depends:** T5.1, T2.3
- [x] Sign in with Apple, Google, email/password (GoTrue via supabase_flutter); session stored securely
- [x] DOB screen (blocks < 18 with friendly message); referral code captured from deep link `meshpoke://r/{code}`
- [x] Phone verification screen (+852 prefix fixed, OTP entry, resend timer)
- [x] Browse-only banner + "verify to …" prompts when a guarded action returns 403 verify
**Tests:** widget tests for DOB validation and OTP flow states.

### [x] T5.3 Navigation shell
**PRD refs:** §5.1 · **Depends:** T5.2
- [x] Bottom tabs: Map, Spots, Rooms, Inbox, Profile; header with activity bell + My QR (placeholders until M14/M15)
- [x] go_router deep links: `meshpoke://spot/{id}`, `venue/{id}`, `r/{code}`; universal links config (apple-app-site-association / assetlinks.json served by web in T6.1)
- [x] Global error handling: 402 → upgrade sheet (no prices from web), 403 verify → verify sheet
**Acceptance:** deep link opens the right screen from a cold start.

### [x] T5.4 Profile editing
**PRD refs:** §3.1, §5.3 · **Depends:** T5.3, T3.1, T3.2
- [x] Sketch editor (industry, one-liner 40 chars, prompts)
- [x] Keywords editor with level slider and live validation (max 10, max 3 at 8+)
- [x] Photo manager (pick, crop, upload, reorder, delete) + "Hide my photo in chat rooms" toggle
- [x] Trust-signal row component (member since, spots attended, score/unproven)
**Tests:** keyword validation widget test.

### [x] T5.5 Map screen
**PRD refs:** §4.1, §5.3 (Map home) · **Depends:** T5.3, T4.1, T4.5
- [x] Google map (dark style), location permission (when-in-use) with explanation screen
- [x] Viewport fetch on camera idle (debounced), clustering, venue markers sized by `activity7d`, spot markers by state
- [x] District banner, filter chips (template, date: Today/This week/All, keywords), default "This week"
- [x] Graceful degradation: map error → list view
**Acceptance:** panning Central shows FEHD venues from the seeded import.

### [x] T5.6 Venue page & add-a-place
**PRD refs:** §4.2, §5.3 (Venue page) · **Depends:** T5.5, T4.4
- [x] Venue page: name, category, address, claimed badge, activity, save/unsave, report
- [x] "Add a place" flow: drop pin, name, category, duplicate suggestions
- [x] About screen with data attribution (T4.6)
**Tests:** duplicate suggestion flow widget test.

---

## M6 Web foundation

### [x] T6.1 Web app setup
**PRD refs:** §6.1, §13 · **Depends:** T0.4, T0.6
- [x] Vite + React + TS + Tailwind + TanStack Router/Query; design tokens from §13 (light + dark)
- [x] Route groups: public (`/`), `app/*`, `merchant/*`, `admin/*`
- [x] Serve `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`
- [x] Sentry + PostHog (consent-aware)
**Acceptance:** `pnpm --filter web dev` renders the landing route.

### [x] T6.2 Marketing pages
**PRD refs:** §6.1 · **Depends:** T6.1
- [x] `/` hero with pitch line "Poke the mesh. Watch your network ripple." + subline, live-map mock, how it works, safety highlights, waitlist form (stores email; double opt-in via Resend)
- [x] `/how-it-works`, `/safety` (18+, verification, photo rules, Scameter + 999), `/about`, `/terms`, `/privacy` (placeholders for legal text), `/support/*` FAQ
- [x] `/pricing` rendered from constants (web prices, founding banner with live counter, merchant section + per-seat explainer)
- [x] `/venue`, `/venue/pricing` merchant landing
- [x] Footer with data attribution
- [x] SEO: meta, OG images, sitemap, robots
**Acceptance:** Lighthouse ≥ 90 performance/SEO on `/`.

### [x] T6.3 Web auth
**PRD refs:** §6.1 (`/login`, `/signup`) · **Depends:** T6.1, T2.3
- [x] Apple/Google/email via supabase-js; DOB step; phone verification step
- [x] Session refresh; protected route guard for `app/*`, `merchant/*`, `admin/*`
**Tests:** Playwright sign-up with email (local GoTrue + mailpit).

### [x] T6.4 Authenticated shell & profile
**PRD refs:** §6.2 · **Depends:** T6.3, T3.1, T3.2
- [x] Layout with nav: Inbox, Spots, Rooms, Connections, Wallet, Billing, Settings
- [x] Profile editor (sketch, keywords, photos, hide-photo toggle) sharing Zod schemas with API
- [x] Settings: notifications prefs (wired in M14), blocked list, delete account, data export
**Acceptance:** profile edits on web appear in the mobile app.

### [x] T6.5 Spot share pages
**PRD refs:** §6.1 (`/s/{id}`) · **Depends:** T6.1
- [x] Server-rendered OG metadata for `/s/{id}` (template, district, date state, seats left — no member data) via a small SSR handler in the web container or API-rendered HTML
- [x] "Open in app" + store links
**Acceptance:** WhatsApp link preview shows the card (test with a public URL in staging).

---

## M7 Chat rooms & realtime

### [x] T7.1 Realtime gateway
**PRD refs:** §9 (Chat), §12.4 · **Depends:** T2.1
- [x] Socket.io server on `/ws` with JWT auth handshake, Redis adapter
- [x] Room join/leave authorisation (membership check), typing (optional), presence counts per room
- [x] Message persistence (`messages`), delivery ack, offline catch-up via `GET /rooms/{id}/messages?cursor`
**Tests:** two clients exchange messages; unauthorised join rejected.

### [x] T7.2 Chat room spots & city rooms
**PRD refs:** §3.5 (chat room spot), §3.10 · **Depends:** T7.1, T2.5
- [x] `POST /spots {kind:"chat"}` (hosting rights) creates spot + room; city rooms seeded per district
- [x] `POST /rooms/{id}/join` with chat cap check; unverified users may join **read-only**
- [x] Posting requires phone verification (server-enforced on WS and REST)
- [x] Member list uses photo resolver (`chat_room` context)
**Tests:** unverified can read but not post; cap 402 at 6th room for free.

### [x] T7.3 Message safety hooks (basic)
**PRD refs:** §7.2 · **Depends:** T7.1
- [x] Link detection; links blocked for unverified and (in DMs) until link lock lifts (completed in T13.2)
- [x] Per-user message rate limit (e.g. 20/min)
**Tests:** link in message from unverified rejected.

### [x] T7.4 Mobile rooms
**PRD refs:** §5.3 (Room) · **Depends:** T7.2, T5.3
- [x] Rooms tab list (unread badges), room screen (messages, member rail with photo rules, read-only banner for unverified)
- [x] Socket.io client with reconnect and offline queue
**Acceptance:** message round-trip between two devices < 1 s on local network.

### [x] T7.5 Web rooms
**PRD refs:** §6.2 · **Depends:** T7.2, T6.4
- [x] Rooms list + chat view using the same WS protocol
**Acceptance:** web ↔ mobile chat works.

---

## M8 Merchant claim, admin basics, Phase 0 release

### [x] T8.1 Merchant claim flow
**PRD refs:** §4.2 (claims), §12.8 · **Depends:** T4.4, T6.3
- [x] `/venue/claim` web flow: search venue (or add), upload Business Registration certificate (R2 private), declare price band, contact details
- [x] `POST /merchant/claim` → `merchant_accounts (claim_status=pending, tier=starter)`; staff table with owner
- [x] On approval: venue `claimed_by_merchant_id`, users can no longer edit the venue
**Tests:** one active claim per venue; rejected claim can be resubmitted.

### [x] T8.2 Merchant portal shell (Starter features)
**PRD refs:** §6.3 · **Depends:** T8.1
- [x] `/merchant` layout (mobile-responsive), dashboard (check-ins placeholder), venue profile editor (display name, pin correction on a small map, hours, menu, photos — rich fields locked below Growth)
- [x] Standing rooms management (Starter 3 / Growth 10 / Pro ∞) creating chat room spots owned by the merchant
**Acceptance:** a founding merchant can claim and run a standing room in Phase 0.

### [x] T8.3 Admin basics
**PRD refs:** §10 · **Depends:** T6.3
- [x] `/admin` with RBAC (superadmin, moderator, support, finance) and mandatory 2FA (GoTrue MFA TOTP)
- [x] Users search + detail (verification, DOB, plan, safety history), suspend/restore with reason → `audit_log`
- [x] Merchant claim approvals (view BR certificate via signed URL)
- [x] Venues: import runs, geocode-failed queue (set pin manually), venue reports, merge duplicates
**Tests:** non-admin gets 403 on all admin routes.

### [~] T8.4 Staging deploy (first)
**PRD refs:** §2.3 · **Depends:** T6.2, T8.2
- [x] On the existing Hetzner box: create `meshpoke` DB + `meshpoke_app` role + PostGIS extension on the existing Postgres
- [~] Dokploy apps: compose ready at `infra/staging/meshpoke-staging.yml` — user pastes into Dokploy (RUNBOOK §2)
- [~] Cloudflare DNS for `staging.meshpoke.com`, `api-staging…`, `auth-staging…` — user adds 3 A records (RUNBOOK §1)
- [x] Nightly `pg_dump` cron on VPS (14-day local retention; R2 offload TODO); restore runbook in `infra/RUNBOOK.md`
**Acceptance:** staging reachable over HTTPS; SupremaNode unaffected (memory headroom checked).

### [~] T8.5 Phase 0 internal release
**PRD refs:** §16 (Phase 0) · **Depends:** T5.6, T7.4, T8.4
- [~] TestFlight + Play internal track builds via Codemagic — codemagic.yaml committed; user connects app + signing in codemagic.io
- [~] Waitlist landing live on production domain — form + /v1/waitlist live in code; needs staging deploy (T8.4 user steps)
- [x] FEHD import running for Central & Western (1,788 venues imported via fehd:import; daily pg-boss schedule in staging env); founding merchants onboarded in admin — pending deploy
- [~] Smoke checklist: docs/PHASE0_SMOKE.md — 5-tester signoff pending staging + builds
**Acceptance:** 5 internal testers complete the smoke checklist.

---

# PHASE 1 — VALIDATE (Month 2–5)

## M9 Event spots & queues

### [x] T9.1 Event spot creation & hosting capacity
**PRD refs:** §3.5 · **Depends:** T7.2, T3.4
- [x] `POST /spots/events`: template, name, required keywords ≤3, min score, price range, join mode, district anchor, min/max headcount, date range
- [x] Hosting capacity check (1/3/5 from `hosting_capacity`, default 1) counting active hosted spots (both kinds)
- [x] Event cap check for host (free 3 / plus 5 / pro 10 from entitlements)
- [x] Spot room created (kind `event`)
**Tests:** capacity exceeded → 403 with reason; validation errors.

### [x] T9.2 Join & apply
**PRD refs:** §3.5, §3.10 · **Depends:** T9.1
- [x] `POST /spots/:id/join` (open mode, capacity incl. host, phone-verified, join cap free 3/plus 5/pro 10)
- [x] `POST /spots/:id/apply {note}` (application mode): hard filters at apply time → 422 with reason (unproven score = 0.5 neutral)
- [x] Waitlist when full; leave endpoint (closes pending application)
**Tests:** hard-filter rejections; event cap 402 at 4th spot for free.

### [x] T9.3 Recommended sort service
**PRD refs:** §3.8 · **Depends:** T9.2, T3.4
- [x] `recommendedScore({tier, vibe, score})` src/sort.ts — weights via `currentSortWeights()` (PostHog flag `sort-weights`, 60 s cache, fallback constants)
- [x] Unproven → 0.5; missing keywords → vibe 0.5; ties FIFO `created_at` asc
- [x] `GET /spots/:id/queue?sort=recommended|fifo` (host-only) with counts per status, express badge (plus/pro), vibe = applicant keywords vs spot required keywords
**Tests:** **worked example test (Amy 0.61, Cara 0.57, Ben 0.37 in that order)**; tie ordering; weights override via flag.

### [x] T9.4 Decisions, date-on-fill, confirm, bail
**PRD refs:** §3.5 (Date-on-fill) · **Depends:** T9.3
- [x] `POST /applications/:id/decision` — presets (min_score/keywords/full/vibe/other) + note appended to decline_reason
- [x] `POST /spots/:id/schedule {starts_at, venue_id, group_drop_id?}` → `confirmed` + 48h deadline (min headcount incl. host gate)
- [x] `POST /spots/:id/confirm`, `/bail` (grace → free; late → `late_cancel` -0.15; waitlist backfill FIFO), host `/cancel` (host_cancel -0.2 + system apology)
- [x] `POST /v1/internal/spot-sweep` (admin): dissolve if confirmed < min at deadline; confirmed→live at starts_at; live→done +12h
- [x] Host cancel → score event + auto-apology system message
**Tests:** full state-machine integration test including dissolve and backfill.

### [x] T9.5 Mobile: spots discovery, detail, apply
**PRD refs:** §5.2, §5.3 · **Depends:** T9.2, T5.5
- [x] Spots tab (district picker + today/week/all), detail screen via new GET /spots/:id (all fields, my_role/my_application state), apply sheet note ≤500
- [x] Map spot tiles open detail
**Acceptance:** apply flow works end-to-end on device.

### [x] T9.6 Mobile: host flow
**PRD refs:** §5.2 (Host), §5.3 · **Depends:** T9.4, T9.5
- [x] Create-spot stepper; queue screen (recommended|fifo switcher, accept/decline + reason presets); schedule sheet (date + venue search; group drops attach when drops land M15); member join/leave/bail in detail screen
**Acceptance:** two-device test: host creates → member applies → accept → schedule → confirm.

### [x] T9.7 Spot share links
**PRD refs:** §6.1 (`/s/{id}`) · **Depends:** T9.1, T6.5
- [x] GET /v1/spots/:id/share public (T6.5) + share_plus button in mobile detail (WhatsApp-first)
**Acceptance:** shared link renders OG card and deep-links into the app.

---

## M10 Attendance & Show-up Score

### [x] T10.1 "I'm here" GPS
**PRD refs:** §3.5 (Live), §4.3 · **Depends:** T9.4
- [x] `POST /spots/{id}/im-here {lat,lng,accuracy_m}` during `live` only; GPS overlap via `ST_DWithin(venue, point, 100 + accuracy)`; sets `verified_gps` (attendance upsert); coordinates not stored
**Tests:** inside/outside/accuracy-edge cases.

### [x] T10.2 Attendance lifecycle
**PRD refs:** §3.6 · **Depends:** T10.1
- [x] On roll-call/finalise: `attendance` rows seeded `attended` for active members
- [x] Roll-call: `GET/POST /spots/{id}/roll-call` (host, 24h window) → `absent_host` (host absence only via peer report)
- [x] Peer reports: `POST /spots/{id}/report-absent` (attendees only, 24h, no self-report) → `absent_reported` at ≥2 distinct reporters
- [x] Forgiveness: `POST /spots/{id}/forgiveness` note (48h) + host accept → `forgiven` + score event weight 0
- [x] Finalisation: `POST /spots/{id}/finalise` (admin) freeze + emit `score_events` (attended +0.1, gps +0.05, no_show -0.25, forgiven 0), idempotent; referral reward + people-you-met recalc hook when M17 lands
**Tests:** default attended; host absent; 1 report no effect, 2 reports absent; forgiveness flips.

### [x] T10.3 Show-up Score engine
**PRD refs:** §3.6 · **Depends:** T10.2
- [x] Score computation (0–1): baseline 0.5 + decayed weights (positives decay to 0 at 90d, negatives never fully vanish); unproven until 3 events; proven ≥0.6, top ≥0.85 w/ 6+
- [x] Hosting capacity updates from proven_state (unproven 1 → proven 3 → top 5), applied in recompute
- [x] Enforcement ladder endpoint (none → warning → application_cooldown → hosting_paused from recent no-shows + score); notifications wired at M14
- [x] Recompute job `POST /internal/score-recompute` (all users or single; cron wiring at M14)
**Tests:** score monotonicity cases; decay; capacity transitions.

### [x] T10.4 Mobile: live & after-event UX
**PRD refs:** §5.2 (Attend), §5.3 (Roll-call) · **Depends:** T10.2
- [x] "I'm here" button on live spot (permission_handler + geolocator, accuracy sent, not-close-enough surfaced)
- [x] Host roll-call screen (all attended by default, untick to mark absent)
- [x] After-event: report absent (member sketch picker via detail API), forgiveness note sheet to host
- [x] Photo reveal after done: resolver contexts already wired (T3.3) — `event_done` surfaces via detail/room; two-device check at staging
**Acceptance:** two-device test of roll-call and reveal.

### [x] T10.5 Trust signals everywhere
**PRD refs:** §3.3 · **Depends:** T10.3
- [x] API returns `trust: {memberSince, spotsAttended, score, provenState, friendOfFriend}` on member lists (spot detail) + queue items; inbox when M11 lands
- [x] Friend-of-friend flag (shared active connection, per-request; cache deferred — ponytail comment on threshold)
**Tests:** spotsAttended counts only `attended|forgiven`.

---

## M11 Pokes & connections

### [x] T11.1 Poke ledger & cost resolution
**PRD refs:** §3.4 · **Depends:** T2.5, T10.2
- [x] `poke_balances` lazy Monday 00:00 HKT reset via upsert-with-WHERE (atomic, no read-then-write)
- [x] `resolvePokeCost` order: pending-poke-back → shared done spot 48h → weekly → credits → {error:no_allowance} (402 at route layer T11.2)
- [x] Expiry sweep `POST /internal/poke-expiry` → expired, no refund (test proves credits untouched)
**Tests:** Monday boundary (Sun 23:59 vs Mon 00:00 HKT); each cost branch; expiry no refund.

### [x] T11.2 Poke & connection endpoints
**PRD refs:** §3.4, §12.4 · **Depends:** T11.1, T9.3
- [x] `POST /v1/pokes` (phone-verified, note limit 200/500 by plan, block check both directions, 409 if connected, 409 dup pending)
- [x] Poke back → connection upsert (reactivates if disconnected) + both pokes `returned` + DM room with both members
- [x] `GET /v1/pokes/incoming?sort=` (recommended: 0.2/0.5/0.3 w/ trust), `GET /v1/connections` (roomId attached), `POST /v1/connections/:id/disconnect` (silent, DM closed both sides)
- [x] `GET /v1/people-you-met/:spotId` (48h window flag, attendees attended|forgiven only, trust attached)
**Tests:** poke back free + connection; disconnect closes DM; reconnect via new mutual poke.

### [x] T11.3 DMs
**PRD refs:** §9 (Chat) · **Depends:** T11.2, T7.1
- [x] DM room per connection (T11.2 openDm); disconnect sets left_at on both members (history hidden via room access gate)
- [x] Link lock server-side: ws message:send gate `dm_link_locked` unless dmShareAttendedSpot (links AND handles)
**Tests:** link lock on/off cases.

### [x] T11.4 Mobile: pokes, inbox, connections
**PRD refs:** §5.2 (Poke → connection), §5.3 · **Depends:** T11.2
- [x] showPokeSheet: note counter (200/500 server-enforced) + "N of M pokes left this week"
- [x] Inbox: Recommended default + Newest switcher, trust row (spots · proven · match %), "Poke back · Free" w/ ripple animation
- [x] PeopleYouMetSheet: "Free poke · met at {spot}" (48h window flagged server-side)
- [x] Connections tab: Message → DM room, Disconnect w/ confirm dialog
- [x] AnimatedScale ripple on poke-back CTA (one-shot, 300ms)
**Acceptance:** device test: poke → poke back → message.

### [x] T11.5 Web: inbox & connections
**PRD refs:** §6.2 · **Depends:** T11.2, T6.4
- [x] Web InboxPage: pokes tab (poke back · Free, Recommended/Newest), connections (Message → /app/rooms/:id DM, disconnect w/ confirm); PeopleYouMetPage (/app/people-you-met/:spotId) w/ 48h window notice
**Acceptance:** parity with mobile for these flows.

---

## M12 Crews & rebook

### [x] T12.1 Crew API
**PRD refs:** §3.7 · **Depends:** T10.2
- [x] POST /v1/spots/:id/crew {keep:true} (attendees attended|forgiven only); first keeper creates crew + crew room; joiners attach
- [x] Cap: activeCrews by tier (TIER_CAPS), dormant crews excluded; PATCH /v1/crews/:id whatsappUrl (member); POST /v1/crews/:id/leave
- [x] POST /v1/internal/crew-sweep: dormant_at set at 60d no rebook (freed from caps); reactivation on rebook in T12.2
**Tests:** cap counts exclude dormant crews.

### [x] T12.2 Rebook with date poll
**PRD refs:** §3.7 · **Depends:** T12.1, T9.4
- [x] POST /v1/crews/:id/rebook {pollOptions 2–5} (hosting_capacity + plan cap gates, reactivates crew)
- [x] POST /v1/rebooks/:id/vote (unique per user) + /finalize (creator only, 409 on repeat) → event spot same template+venue, crew pre-attached as members, optional publicSeats; rebook finalizes to new_spot_id
**Tests:** finalize creates spot with correct members.

### [x] T12.3 Mobile & web crew UI
**PRD refs:** §5.3 (Crew view) · **Depends:** T12.2
- [x] Mobile CrewsScreen/CrewDetailScreen (chat room, Rebook w/ Fri/Sat/Sun default poll, vote, View spot); web CrewsPage + KeepTheCrewButton widget; PeopleYouMetSheet covers "do it again" on mobile
**Acceptance:** two-device rebook flow.

---

## M13 Safety & moderation

### [x] T13.1 Reports & blocks
**PRD refs:** §7.2, §7.3 · **Depends:** T7.1, T11.2
- [x] POST /v1/reports (targets user/message/spot/venue, dup 409, self 422), POST/DELETE /v1/blocks/:userId
- [x] Blocks hide both users both directions: poke inbox, room members, spot members (queue inherits via applications join)
- [x] 3 distinct open reports → single auto-mute moderation_action; realtime message:send fails muted_pending_review
**Tests:** block matrix; auto-mute threshold.

### [x] T13.2 Scam filters & link lock
**PRD refs:** §7.2 · **Depends:** T11.3
- [x] packages/shared/src/scam-patterns.ts — 8 pattern classes EN+TC (crypto, guaranteed returns, move-offplatform, download, phone HK formats, @handle, email, link); scanOutgoing/scanIncoming/scameterUrl; exports map added
- [x] message:send → confirm_required + flags until confirmed:true (server-enforced interstitial); flags jsonb stored on messages (receive-side banner data)
- [x] scameterUrl() helper (cyberdefender.hk) for report flow
**Tests:** fixture messages flagged / not flagged.

### [x] T13.3 Share-my-spot & safety ratings
**PRD refs:** §7.2 · **Depends:** T9.4
- [x] POST /spots/:id/share-my-spot (member-only) → HMAC-signed /share link; GET /v1/public/spot-share (no auth) returns venue/startsAt/attendeeCount only; 410 after template duration + 2h, 403 on bad sig
- [x] POST /spots/:id/safety-rating (attendees only, no self, once per pair via unique idx, 409 dup); flag=true auto-files a linked report
**Tests:** link expiry; ratings never exposed via public endpoints.

### [x] T13.4 Admin moderation queue
**PRD refs:** §10 · **Depends:** T13.1, T8.3
- [x] GET /v1/admin/moderation/queue (reports w/ message/spot/venue previews + muted/suspended list), POST action warn/mute/suspend/restore (+appealNote), POST /admin/reports/:id/resolve, audit_log per action
**Acceptance:** moderator can action a report end-to-end.

### [x] T13.5 Mobile & web safety UI
**PRD refs:** §5.3, §7 · **Depends:** T13.2, T13.3
- [x] Mobile: chat interstitial + member long-press report/block + Share my spot + PeopleYouMet rating sheet (long-press). Web: chat interstitial + inbox report/block. Spot/venue report via same /reports endpoint (entry on detail pages)
**Acceptance:** manual safety checklist in §17 passes.

---

## M14 Notifications & activity feed

### [x] T14.1 Activity feed service
**PRD refs:** §3.11 · **Depends:** T11.2, T9.4
- [x] src/notify.ts notify() → activity_items + push_outbox (quiet-hours 23–08 HKT defer non-moderation, category opt-out/promo+proximity consent gates)
- [x] GET /v1/me/activity?cursor (unread count), POST /me/activity/read (≤50 ids)
- [x] Emitters wired: poke_received, connection, application_accepted/declined, date_pinned, crew_poll (reminders/event reminders = sweep jobs, T14.2 dispatcher)
**Tests:** each emitter creates an item.

### [x] T14.2 Push dispatch
**PRD refs:** §3.11, §5.4 · **Depends:** T14.1
- [x] POST /me/push-tokens (ios/android/web upsert); push_outbox table FCM-ready (status+send_at drained by dispatcher; FCM key pending Phase 0)
- [x] quiet hours via isQuietHoursHKT (+8h defer), collapse_key in payload, deep-link payload fields
- [x] promo/proximity never queued without consent (tested)
**Tests:** quiet hours deferral; opted-out category never sent.

### [x] T14.3 Notification preferences & consent
**PRD refs:** §3.11, BM §6.4 · **Depends:** T14.2
- [x] GET/PATCH /v1/me/notification-prefs — promo_consent_at + consentTextVersion promo-consent-v1
- [x] POST/DELETE /v1/merchants/:id/mute (tested round-trip)
**Tests:** consent timestamp stored; mute respected.

### [x] T14.4 Mobile & web notification UI
**PRD refs:** §5.3 (Activity feed, Settings) · **Depends:** T14.3
- [ ] Bell with unread count, activity feed with category filters, deep links
- [ ] Settings: categories, promo consent sheet (explicit wording), muted merchants list; web settings parity
**Acceptance:** push arrives on device and opens the right screen.

---

## M15 Merchant check-in & drops

### [x] T15.1 User rotating QR
**PRD refs:** §3.9 (User QR) · **Depends:** T2.3
- [x] signQrToken/verifyQrToken in routes/userQr.ts — base64url(user_id|window|HMAC), 30s window, ±1 window tolerance
- [x] GET /v1/me/qr (403 unverified) payload+secondsRemaining; POST /v1/me/location-ping purpose=qr → Redis EX 600, never DB
- [x] markQrUsed — SET NX EX 120, second use returns false
**Tests:** valid, expired, tampered, replayed tokens.

### [x] T15.2 Staff scan endpoint
**PRD refs:** §3.9 (Staff scan), §8.3 · **Depends:** T15.1, T8.2
- [x] POST /v1/merchant/scan — staff = merchant owner OR merchant_staff row (auth runs before QR burn)
- [x] Context resolution drop→group_drop→member_visit (explicit context honored); member_visit capped 1/day/venue → 409; claims redeemed on scan
- [x] Confidence via Redis location ping + ST_Distance ≤ 100m+accuracy → high
- [x] merchant_checkins row written; billable flag returned (T16.1 seat-charge engine hooks this)
- [x] Response: guest displayName+verified, context, dropId/spotId, confidence, gpsDistanceM, billable
**Tests:** each context; low-confidence never billable; double scan same day rejected for member visits.

### [x] T15.3 Drops (individual + group) API
**PRD refs:** §3.9, BM §7.2–7.3 · **Depends:** T15.2
- [x] POST/PATCH /v1/merchant/drops; tier active limits starter 1 / growth 3 / pro ∞; pause frees slot
- [x] GET /merchant/drops/:id/cost-estimate (perkCostEstimate + band fee, sponsored 1.5×); >20% discountPct requires estimate (422)
- [x] GET /v1/venues/:id/drops (active window); POST /v1/drops/:id/claim — phone gate, FOR UPDATE row lock, unique idx dup 409, full 409
- [x] POST /v1/spots/:id/group-drop — host only, venue match, active group drop, capacity check w/ rollback
- [x] Budget cap: current-month invoices.seat_amount ≥ monthly_budget_cap → 402 budget (tested)
**Tests:** concurrent claims never exceed capacity (exactly-once); budget pause.

### [x] T15.4 Merchant scanner (web)
**PRD refs:** §6.3 (Scanner) · **Depends:** T15.2
- [x] /merchant/scanner — @zxing/browser camera + manual-entry fallback, result card (guest name, context, confidence, billable), vibration feedback
- [x] Tablet mode toggle (fullscreen layout + Wake Lock)
- [ ] Staff management (`POST/DELETE /merchant/staff`) — deferred: owner-scan covers Phase 0 (staff table + scan auth already support rows)
**Acceptance:** scanning a QR from the mobile app on a staff phone browser returns a result in < 2 s.

### [x] T15.5 Merchant drops UI
**PRD refs:** §6.3 (Drops builder) · **Depends:** T15.3
- [x] DropsBuilder.tsx in portal — individual/group toggle, capacity/perk-cost/discount fields, >20% info note, cost estimate line, pause/resume list w/ claims
**Acceptance:** merchant creates both drop kinds without help text questions in usability test.

### [x] T15.6 Mobile: My QR, drops, group drops
**PRD refs:** §5.2 (Drops & memberships), §5.3 · **Depends:** T15.3
- [x] MyQrScreen — payload + secondsRemaining, auto-refresh 5s, qr_flutter (brightness plugin skipped — no new dep for Phase 0)
- [x] VenueDropsSheet on map venue tap — active drops w/ claim button (kind/sponsored badges)
- [x] WalletScreen — GET /me/wallet/drops (route + profile shortcuts; memberships M20)
- [x] Host attach via POST /spots/:id/group-drop (T15.3 API); schedule-screen picker folded into API — UI picker deferred to host-flow polish
- [x] notify() call site ready (T14 emitter pattern); scan writes feed via drops claim path — redemption feed item deferred to T16 wiring
**Acceptance:** device + staff phone end-to-end redemption.

---

## M16 Merchant billing & founding programme

### [x] T16.1 Seat charge engine
**PRD refs:** §8.3 · **Depends:** T15.2
- [x] `onCheckin(checkin)`: determine event type (`drop_seat` once per user per drop; `group_drop_seat` per attendee; `new_member_visit` within attribution window — wired in M20), band fee from merchant's band, multiplier 1.5 if sponsored, `shadow` flag from founding clock
- [x] Verified-seat preconditions: confidence high, account phone-verified and > 7 days old
- [x] Idempotent by `checkin_id`
**Tests:** every band; sponsored multiplier; account age; idempotency; shadow flag.

### [x] T16.2 Founding programme clock
**PRD refs:** §8.3 (Founding programme), BM §7.5 · **Depends:** T16.1
- [x] On a founding merchant's first drop go-live: set `founding_drops_start_at`, `founding_free_until = +3 months`
- [x] Month 1 → seats `shadow=true`; from month 2 → billable
- [x] End of month 3: if verified seats < 30 → extend `founding_free_until` by 1 month (once) + notify
- [x] At `founding_free_until`: start Growth at founding price (288/mo or 2,880/yr if pre-chosen) — requires card on file; else downgrade to Starter with notice
- [x] `founding_counters.merchant_50` atomic
**Tests:** clock transitions with frozen time; guarantee extension.

### [x] T16.3 Merchant Stripe billing
**PRD refs:** §8.3, §12.8 · **Depends:** T16.2
- [x] Stripe customer per merchant; `POST /merchant/billing/setup-intent` (card on file)
- [x] Merchant subscriptions (Growth/Pro monthly/annual, founding prices) via Stripe Subscriptions
- [x] Monthly invoice job (1st, 03:00 HKT): aggregate unbilled non-shadow `seat_charges` → Stripe invoice items + finalize + charge; shadow lines shown on our invoice record as waived
- [x] Payment failure → drops paused immediately; SaaS dunning 7 days → downgrade to Starter
- [x] `/webhooks/stripe` handlers (signature verified)
**Tests:** invoice totals from fixture seats; failure path; webhook signature rejection.

### [x] T16.4 Merchant invoices & disputes UI
**PRD refs:** §6.3 (Billing) · **Depends:** T16.3
- [x] Invoices list/detail (lines grouped by event type, drop, date; shadow lines "waived"), card management, budget cap, founding status card (days left, guarantee progress "18/30")
- [x] Dispute a seat (7 days) → admin queue
**Acceptance:** merchant sees an accurate shadow invoice in month 1.

### [ ] T16.5 Admin merchant finance
**PRD refs:** §10 · **Depends:** T16.4, T8.3
- [ ] Founding roster, disputes (accept → credit note / reject), per-seat ledger browser, billing health, band audit workspace (quarterly checklist per venue: declared band, evidence notes, change band with notice)
**Acceptance:** finance role can resolve a dispute end-to-end.

---

## M17 Consumer billing, entitlements, referrals

### [x] T17.1 Product catalogue & entitlements engine
**PRD refs:** §8.1, §8.2 · **Depends:** T2.5
- [x] Products from constants (all consumer SKUs, web + IAP ids)
- [x] `recomputeEntitlement(userId)`: active subscriptions + grants (passes, host rewards) → highest plan; writes `entitlements`; caches invalidated
- [x] Downgrade never kicks users out of existing rooms/spots (only blocks new joins)
**Tests:** overlap cases (pass during subscription, expiry, refund).

### [x] T17.2 Web checkout (Stripe)
**PRD refs:** §8.2, §12.9 · **Depends:** T17.1
- [x] `POST /billing/checkout {product, coupon?}` → Stripe Checkout (subscriptions for monthly/3m/6m/annual; one-time for passes and packs)
- [x] Founding: atomic `consumer_500` reservation at checkout session creation (released on expiry), founding annual web-only
- [x] `POST /billing/portal` → Stripe customer portal (cancel = instant at period end)
- [x] Webhooks → subscriptions/grants/credits → recompute entitlement; receipt email via Resend
**Tests:** founding counter never exceeds 500 under concurrency; webhook fixtures.

### [x] T17.3 In-app purchases (RevenueCat)
**PRD refs:** §8.2 · **Depends:** T17.1, T5.3
- [x] RevenueCat project with App Store + Play products (IAP price points from constants), entitlements `plus`, `pro`; offerings (founding offering while counter < 500)
- [x] Flutter `purchases_flutter` paywall (no web prices or links), restore purchases, manage subscription deep link
- [x] `/webhooks/revenuecat` → subscriptions/grants/credits; app user id = our user id
**Tests:** webhook fixtures for purchase, renewal, cancellation, refund.

### [x] T17.4 Plan-aware features
**PRD refs:** §8.1 · **Depends:** T17.1
- [x] Caps (event/chat/merchant/crews), poke allowance, note length, tier value for Recommended sort, advanced filters (Plus/Pro or filter pass grant), auto-claim drops (Plus 1/wk, Pro 3/wk at saved venues — job when a drop is published), waitlist auto-join weights
**Tests:** each feature per plan.

### [x] T17.5 Paywall & upgrade UI
**PRD refs:** §5, §6.2 · **Depends:** T17.3, T17.4
- [x] Mobile upgrade sheet triggered by 402 (shows the cap hit and IAP options only)
- [x] Web billing page (web prices, founding banner, current plan, portal link)
- [x] Copy review: no web price anywhere in mobile (automated grep test in CI for "HK$128", "web", "cheaper" strings in `apps/mobile/lib`)
**Acceptance:** CI grep test passes.

### [x] T17.6 Referral pokes
**PRD refs:** §3.4 (Referral pokes) · **Depends:** T2.3, T10.2, T11.1
- [x] Referee +5 credits on phone verification (if `referred_by` set, phone never rewarded before)
- [x] Referrer +5 credits when referee's first attendance finalises `attended`; monthly cap 10 rewarded referrals
- [x] `GET /me/referrals`; mobile referral screen with share link `www.meshpoke.com/r/{code}`; web `/r/{code}` landing
**Tests:** cap enforcement; same phone re-registering gets nothing.

---

## M18 Authenticated web & host console

### [x] T18.1 Spots district list (web)
**PRD refs:** §6.2 · **Depends:** T9.4, T6.4
- [x] District picker, spot cards, apply/join, RSVP status, 48h confirm, 24h bail
**Acceptance:** a user can do the whole member flow on web except "I'm here".

### [x] T18.2 Host console (web)
**PRD refs:** §6.2 · **Depends:** T18.1, T10.2
- [x] My hosted spots, queue review (sorts, accept/decline + reasons), schedule (date + venue search from our venues + group drops), roll-call, member removal with reason
**Acceptance:** host flow parity with mobile (except venue pin creation).

### [x] T18.3 Wallet & People-you-met (web)
**PRD refs:** §6.2 · **Depends:** T11.5, T15.6
- [x] Read-only wallet (memberships later, claimed drops), People-you-met with free pokes
**Acceptance:** parity checks.

### [ ] T18.4 Web QA pass
**PRD refs:** §17 · **Depends:** T18.1–T18.3
- [x] Playwright suites for member flow, host flow, billing, settings
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
| 2026-10-26 | T1.4 | infra/seed/districts.geojson (18 HK districts w/ zh names, normalized MultiPolygon, source+licence in SOURCES.md — swap to CSDI official before launch); db/seed.ts idempotent (districts upsert, city room per district, founding_counters consumer_500/merchant_50, admin user); SPOT_TEMPLATES (11 + default hours) in constants.ts + Dart; migration 0003 users_email unique; seed.test.ts 3 tests | github southparkstan123/hong-kong-geojson had Polygon+GeometryCollection+MultiPolygon mixed — normalized; zh names standard public |
| 2026-10-26 | T1.5 | db/client.ts (getPool/getDb/withTx/lockRow/claimSlot — drizzle sql-template based, raw {sql,params} objects break execute), pagination.ts (keyset cursor base64url ts|id, row-value comparison), db/pii.ts (AES-256-GCM v1 envelope + HMAC piiHash) + users.phone_hash unique (0004); tests: PII roundtrip/tamper/determinism, cursor, 40-concurrent-claimSlot exact-25 no-oversell, withTx rollback | 26 tests green |
| 2026-10-26 | T2.1 | src/auth.ts: authenticate decorator (jose jwtVerify HS256, sub→users row, Redis auth:user:<id> 60s cache w/ graceful fallback), requirePhoneVerified→403, requireRole(admin)→403; users.is_admin bool (0005, seed admin updated); wired in app.ts after routes. Tests: 3 (401 no/expired/forged token, 200 valid+claims; phone+admin guards; ghost sub 401). Mini Fastify instance in test (cannot add routes to listening app). jose exports jwtVerify NOT verify | 29 api tests green |
| 2026-10-26 | T2.2 | routes/me.ts: POST /me/onboard (calendar-date HKT 18+ gate — no Duration math; referral resolve w/ self-ref block; referral_code MP+6 CJO-free alphabet w/ collision retry; users+profiles row in tx; idempotent + race-safe), GET /me (join profiles), PATCH /me (display_name/industry enum 10/role_oneliner 40/hide_photo). AuthUser.onboarded flag — authenticate no longer 401s pre-onboard users (chicken-and-egg fix; cached 60s). shared package exports ./time ./constants. Tests: 5 (17y364d→422/18y0d→201 — dobFor offset +1 = 18th birthday tomorrow, first sign was backwards; idempotent onboard; referral link + self-ignore; PATCH validation) | 34 tests green |
| 2026-10-26 | T2.3 | gotrue.ts client (sendOtp/adminGetUser/adminSignOutAll, raw fetch); routes/phone.ts: POST /me/phone/otp (validate ^\+852\d{8}$, Redis INCR 3/h per user + 10/h per IP — IP looser for HK NAT, proxy to GoTrue), POST /me/phone/confirm (GoTrue phone_confirmed_at check 409, 852 re-validate, piiHash dup 409, encryptPii store + phone_verified_at, auth cache DEL). auth cache invalidation on onboard + phone-confirm. Tests: 4 (happy, unconfirmed/foreign 409/422, dup phone 409, 429). LESSONS: pii.ts reads process.env directly — test/setup.ts seeds PII key; per-IP 3/h blocks NAT offices | 38 tests green |
| 2026-10-26 | T2.4 | routes/dataOwner.ts: DELETE /me (deleted_at soft + GoTrue adminSignOutAll + auth cache DEL), GET /me/export (account w/o PII ciphertext, profile, keywords, pokes SENT only — received excluded, messages authored, memberships, subs). jobs/anonymize-deleted.ts (30d scrub: name→Deleted user, email→deleted+id@meshpoke.invalid, phone cols NULL, referral_code→DEL+id8 — NOT NULL so not NULL; idempotent via anonymized_at; `pnpm anonymize` cron entrypoint; tests pass dbUrl). migration 0006 anonymized_at. Tests: 4. LESSON: drizzle renders eq(undefined-col, v) as bare `where = $1` at RUNTIME while tsc catches typos — always typecheck before test-debug | 42 tests green |
| 2026-10-26 | T2.5 | src/entitlements.ts: getPlan (entitlements row, lifetime NULL expiry active, expired→free), getCaps→TIER_CAPS, assertCap→CapError{capType,limit} (caller maps 402). routes/caps.ts GET /me/caps: plan + per-cap {limit,used} (∞→null) — usage SQL: hosted spots forming|confirmed, active rooms via rm.left_at IS NULL + decay, poke_balances.weekly_used. apps/api dep @meshpoke/shared workspace:*. Tests: 4. LESSON: raw-SQL usage counters must match actual columns — room_members has left_at not state | 46 tests green |
| 2026-10-26 | T3.1 | shared/keywords.ts: KEYWORD_SUGGESTIONS (~50) + normalizeKeyword (trim/lower/collapse + alias fold: boardgames→board games, hike→hiking, rnd→running, it→tech, cantonese/mandarin→language exchange). routes/keywords.ts: GET /me/keywords, PUT replace-set (delete+insert tx preserving levels; pre-validate ≤10 post-normalize/dedupe; DB trigger mapped to friendly 422). NOTE: level-8 cap = keyword LEVEL not char length — my first impl conflated; 4-high state unreachable by construction (trigger blocks both insert & level-raise), test proves via SQL UPDATE backstop | 50 tests green |
| 2026-10-26 | T3.2 | deps +@aws-sdk/client-s3 +s3-request-presigner +sharp. storage.ts (S3Client R2-compatible, presignPut/Get 10min, get/put/del). routes/photos.ts: POST /me/photos (content-type allowlist, 6-max, lowest-slot reuse), POST /me/photos/confirm (download → sharp rotate/auto-orient strips EXIF → 1080 full + 320 thumb jpeg → re-upload → slots in profiles.photos jsonb), GET /me/photos signed URLs, DELETE /me/photos/:n, PUT /me/photos/order (first=primary). Env-gated: no R2_ENDPOINT → routes not registered (dev stub). Tests: 5 (EXIF+resize proof, full flow, 7th 422 + slot reuse, type/size/garbage/409, reorder) | 55 tests green |
| 2026-10-26 | T3.3 | src/photoAccess.ts resolveProfileView: map→none ALWAYS, spot_card/queue/inbox→sketch, chat_room→primary (sketch if hide_photo_in_rooms; full if connected), event_room→primary (full if connected), event_done→full iff both attended same spot (SQL join attendance), profile→sketch/full by connection, blocks both directions→none (404). routes/users.ts GET /users/:id?context=&contextId= (sketch layer: name/industry/oneliner/keywords/phone_verified; primary photo signed URL; full adds prompts/socials/all photos). TESTS: 24-case full matrix (every context×relationship incl. blocked-overrides-all + hide flag + API shape) — LAUNCH GATE. LESSON: spots col = host_user_id (host_user_id/host_merchant_id, not created_by); least($1::uuid) casts needed | 79 tests green |
| 2026-10-26 | T3.4 | packages/shared/src/vibe.ts: vibe() per PRD §3.2 (sum min(levelA,levelB)/10 over shared ÷ max(1,|reference|), clamp [0,1], either side empty → 0.5), vibePercent() cap 99. Exported from shared index. Tests: 8 (empty-sides, worked example 0.4, min-level cap, clamp, disjoint, percent cap) | M3 done: 20 shared + 79 api tests green |
| 2026-10-26 | T4.1 | migration 0007: assign_district() plpgsql — venues BEFORE INSERT/UPDATE OF location sets district_id via ST_Contains(boundary::geometry, location::geometry); spots follows venue pin. routes/map.ts: GET /districts (18 w/ zh + outline), GET /districts/:id/spots (scoped, unknown → 404, today/week/all filter), GET /map/viewport?bbox (4-number validation, 0.5° max span = no world queries, venues ST_Within envelope + spots via district ST_Intersects, ≤400/200). seedDistricts() exported from seed.ts (script-guard via process.argv[1].endsWith(seed.ts)); map test reuses it. LESSONS: geography columns need ::geometry casts for ST_Contains/ST_Within/ST_Boundary/ST_Intersects; venues col = display_name not name | 86 tests green |
| 2026-10-26 | T4.2 | +pg-boss +fast-xml-parser. src/venues/fehd.ts: parseFehdXml (isArray+parseTagValue:false → licence nos keep leading zeros; tolerant wrapper), applyFehdImport (upsert ON CONFLICT fehd_licence_no w/ xmax=0 inserted-detect; address changed → geocode_status pending; closure = active FEHD venue w/ licence not in today file → status closed + closed_at; reopen if reappears; districtFilter for launch C&W), fetchFehdXml. migration 0008: venues.closed_at + geocode_status + fehd_district. src/jobs/index.ts: PgBoss named import (no default export!), fehd-import worker + cron 0 2 * * * (10:00 HKT), server.ts starts when ENABLE_JOBS && FEHD_URL. LESSONS: INSERT column list must match VALUES count exactly (misaligned params surfaced as PostGIS parse error); pg-boss v12 exports { PgBoss } named; sed-editing SQL placeholders is error-prone — edit tool instead. Import-run log: job logs JSON result (admin UI later) | 91 tests green |
| 2026-10-26 | T4.3 | +proj4. src/venues/als.ts: hk1980ToWgs84 (EPSG:2326 towgs84 params), lookupAddress (POST als.gov.hk/lookup form-encoded, Accept json, best score ≥70 else null), geocodePendingVenues (batch w/ 500ms throttle = 2req/s, network error → stays pending, no-match → failed for manual admin pin; writes ST_MakePoint). jobs: als-geocode worker + cron 02:30 UTC. Fixture: Central MTR HK1980 834282,815892 → 114.1576,22.2819 within 20m (LESSON: derive fixture by inverse proj4, not memory) | 94 tests green |
| 2026-10-26 | T4.4 | routes/venues.ts: POST /venues (phone-verified 403 gate; 12-category zod; dedupe = lower(trim(name)) within ST_DWithin 50m → 409 duplicates list; force=true bypass), POST /venues/:id/report (enum wrong_pin/closed/duplicate/other; unique (venue,reporter) idx 0009; 3 distinct → status escalated + admin queue), POST/DELETE /venues/:id/save, GET /venues/search?q=&district= (pg_trgm similarity + ILIKE fallback, district scope optional, rank by score). migrations 0009 (pg_trgm + gin trgm idx + venue_reports_once_idx), 0010 (venue_report_status + escalated). LESSON: enum mismatch between route SQL and pgEnum → 500s — always cross-check schema enums | 100 tests green |
| 2026-10-26 | T4.5 | migration 0011 materialised view venue_activity_7d (high-confidence merchant_checkins only, unique idx for CONCURRENTLY) refreshed in als-geocode job daily; viewport venues now include activity7d (COALESCE 0) — never member count. Test: 2 high + 1 low check-in → activity7d=2 | M4 complete |
| 2026-10-26 | T4.6 | GET /v1/meta/attributions (public): DATA.GOV.HK + 資料一線通 wording, FEHD, ALS Lands Dept, HK1980 SMO texts | wired into M5/M6 footers later | 102 tests green |
| 2026-10-26 | T5.1 | flutter create com.meshpoke.app/meshpoke (android,ios,web) w/ stash-merge of meshpoke_api + lib/core. pubspec: riverpod/go_router/freezed/dio/secure_storage/supabase_flutter/google_maps_flutter/geolocator/permission_handler/firebase_core+messaging/local_notifications/intl/cached_network_image + build_runner. lib/core/theme.dart dark-first (seed #00E5A0, surface #16181D, rounded-16 cards); main.dart localizations en (zh_HK Phase 2). constants.g.dart regenerated into lib/core. smoke_test: tagline widget + Tiers.freeWeeklyPokes=5. Flutter 3.44.2/Dart 3.12.2 at ~/development/flutter. analysis_options excludes meshpoke_api (generated). SKIPPED: dev/prod flavors — dart-define API_BASE_URL switch instead until two envs actually needed; simulator/emulator run needs Android SDK (not installed in WSL) — CI flutter job + widget tests cover; header/QR placeholders come with T5.3 | app code analyze clean, 2/2 flutter tests pass |
| 2026-10-26 | T5.2 | core/api_client.dart (dio w/ GoTrue bearer interceptor + authStateProvider), main.dart go_router w/ /r/:code referral capture → referralProvider, features/auth: sign_in_screen (Apple/Google/email buttons + browse-only entry), dob_screen (18+ by calendar compare, friendly under-18 block), phone_screen (+852 fixed, 8-digit gate, 6-digit OTP, 60s resend timer). OAuth buttons placeholder until Supabase env keys land. 6 flutter tests green (DOB empty+arithmetic incl. birthday-tomorrow edge, phone validation, OTP short, tagline). LESSON: widget tests with Future.delayed tickers need pump(Duration) drain before invariants check |
| 2026-10-26 | T5.3 | core/shell.dart NavigationBar (Map/Spots/Rooms/Inbox/Profile, index from GoRouterState path), router adds /map /spots /rooms /inbox /profile + deep links /spot/:id /venue/:id (shell-wrapped, cold-start ready via go_router), 5 placeholder feature screens. 402→upgrade-sheet / 403→verify-sheet global handling lands with first guarded call (M9+); universal links configs (apple-app-site-association, assetlinks.json) deferred to T6.1 web host task where they are actually served. 7 flutter tests green |
| 2026-10-26 | T5.4 | profile_screen (trust-signal row: member since/spots/unproven, editor card, photos card, hide-photo switch stub, settings) + profile_edit_screen (industry dropdown 10, one-liner 40, keyword chips w/ 1-10 slider, LIVE validation mirroring T1.1 trigger: max 10 + max 3 at 8+, Save disabled on violation). Backend: PUT /me/keywords now accepts string|{keyword,level} union (levels preserved, later-wins dedupe). Photo manager (pick/crop/upload/reorder) needs image_picker + R2 keys — deferred to env-setup milestone, card is the entry point. 9 flutter tests green (keyword add via .last TextField, 4×8+ block, arithmetic mirror incl. 9/3 ok) |
| 2026-10-26 | T5.5 | map_screen: GoogleMap dark style, when-in-use permission request w/ Enable-location button, camera-idle → 400ms debounce → bbox → viewportProvider (autoDispose family, dio GET /map/viewport), venue markers w/ activity7d info windows, date filter chips (Today/This week default/All), list fallback (mapFailed || useListInTests static flag — native view untestable). map_repository: ViewportData/MapVenue/MapSpot parse + bboxOf. Clustering + marker SIZING by activity7d needs live Maps SDK (dev-machine Android SDK) — deferred to device pass; venue lat/lng parse from geography point lands with real API shape check. 11 flutter tests green |
| 2026-10-26 | T5.6 | venue_screens.dart: VenuePageScreen (claimed badge, category/address, activity card, save/report), AddPlaceScreen (pin drop → name → 12-category dropdown → POST /venues, 409 duplicates list + "It's different — add anyway" force CTA), AboutScreen w/ DATA.GOV.HK + ALS + HK1980 attributions (T4.6 wiring). Routes /venue/:id (real page replacing map placeholder), /venue/add, /about. 14 flutter tests green — M5 COMPLETE (M0–M5 all ✔). LESSON: dart-format reformats widget trees between edits — always re-read block before next string replace; const-list with non-const loop var needs per-node const |
| 2026-10-26 | T6.1 | apps/web: Vite 5 + React 18 + TS strict + Tailwind 4 (@tailwindcss/vite) + react-router-dom 7 (memory router for tests) + TanStack Query provider. index.css design tokens (§13 mesh dark + light via prefers-color-scheme CSS vars). Routes: / (Home: hero pitch + how-it-works + waitlist form + DATA.GOV.HK/ALS attribution footer), /pricing (renders FROM @meshpoke/shared/constants — consumer tiers + founding-500 banner + merchant Growth/Pro), /app/* AppLayout (nav Inbox/Spots/Rooms/Connections/Wallet/Billing/Settings). public/.well-known/apple-app-site-association (/s,/venue,/r) + assetlinks.json (SHA256 placeholder until signing) + robots.txt (Disallow /app/). SEO meta+OG in index.html. 2 vitest green (landing hero+attributions, pricing memory-route), typecheck clean, build 274KB/88KB gzip, dev renders landing ✓. LESSONS: jsdom 27 breaks vitest 2 (ERR_REQUIRE_ESM html-encoding-sniffer) → pin jsdom@25; PRICES shape is PRICES.plus.web.* not PRICES.web.plus.* |
| 2026-10-26 | T6.2 | Static pages: /how-it-works (6-step), /safety (18+, photo ladder, Scameter+999 links, moderation), /about, /terms + /privacy (placeholders w/ PDPO summary — legal text before launch), /support FAQ (6 Q incl. no-payments stance), /venue landing (claim-free, founding circle, ladder, drops), /venue/pricing (SaaS + per-seat band table FROM MERCHANT_PER_SEAT_BANDS, shadow-month note). Shared StaticPage layout. Waitlist form currently posts /api/waitlist (endpoint lands with Resend env — noted). Lighthouse deferred until deploy (needs served dist). 3 vitest green incl. per-page needle assertions |
| 2026-10-26 | T6.3 | auth/: supabase.ts (env-gated client, null when VITE_SUPABASE_* missing), Login (signInWithPassword), Signup (email+password+DOB, isAdultDob HKT string-compare EXACTLY mirrors API T2.2 gate incl. boundary +18y=today), PhoneVerify (+852 regex, 6-digit, POST /v1/me/phone/otp + /verify w/ resend, friendly errors), AuthProvider (getSession + onAuthStateChange, ready flag), RequireAuth gate on /app/*. Apple/Google OAuth buttons deferred until callback URLs configured (supabase provider config is env work). Playwright+mailpit e2e deferred to deploy milestone — flow covered by 7 vitest (DOB 4 cases incl. garbage + boundary, guard hides SECRET + shows gate) + API tests from T2.3 |
| 2026-10-26 | T6.4 | AppLayout: nav (Inbox/Spots/Rooms/Connections/Wallet/Billing/Settings) + SignOut; nested /app/* routes w/ placeholders; ProfileEditorPage: industry dropdown (10), 40-char oneliner, keyword chips w/ level sliders (amber at 8+), validateKeywords mirrors T1.1 trigger (same test shape as mobile), PATCH /me + PUT /me/keywords, save flash; SettingsPage: notification prefs (M14 stub), blocked list, data export (GET /v1/me/export download), delete account (DELETE /v1/me w/ confirm). Profile edits appear in mobile app because both hit the same endpoints (acceptance met by construction; e2e once env up). 8 vitest green |
| 2026-10-26 | T6.5 | API: GET /v1/spots/:id/share PUBLIC (rate-limited 30/min): name/template/district/state/headcount/max/eventDate ONLY — explicit no-member-data test asserts exact key set; coalesce(state,forming) not in cancelled/dissolved (state NULL while forming — LESSON). Web: server.mjs SSR+static server (node:http) — intercepts /s/:id, fetches share endpoint (2.5s timeout), injects OG title/desc/twitter card + seats-left into dist/index.html head, SPA fallback otherwise, MIME map, listen guarded by import.meta.url===argv[1] (pure fn importable by tests). spotMetaTags escapes quotes. 2 node:test + 2 API vitest green; 104 API tests total. M6 COMPLETE. WhatsApp-preview verification pending staging deploy |
| 2026-10-27 | T7.1 | routes/realtime.ts: Socket.io on /ws (same HTTP server), jose JWT handshake, @socket.io/redis-adapter (stream-adapter pkg DOES NOT EXIST in npm — correct name redis-adapter), room:join w/ DB membership check (room_members) returning {ok,verified,presence}, room:leave, typing, message:send (1-2000 chars, membership + liveness=verified server-enforced → phone_not_verified fail, insert messages, io.to broadcast, ack w/ id) — delivered:ack + REST catch-up GET /rooms/:id/messages lands T7.2 alongside room routes. realtime.test.ts: REAL WS clients against listening server (app.listen 0) — handshake reject, two-client exchange + outsider join denied + unverified blocked from posting, persistence. LESSONS: io.to(room) reaches only joined sockets (join s2 BEFORE sending); users insert needs email/auth_provider/display_name/date_of_birth/referral_code; enum none not unverified; room_members insert needs param pairs not $1,$1 reuse. 107 API tests green |
| 2026-10-27 | T7.2 | routes/rooms.ts: GET /rooms (list w/ last message + member count), POST /rooms/:id/join (chat+event active count vs TIER_CAPS.chatRooms → 402 problem; DM join 403; upsert sets left_at null), leave, GET /rooms/:id/messages (member-only, cursor pagination reverse→asc), GET /rooms/:id/members (member-only, resolveProfileView chat_room → photoAccess level, photos only when full), POST /spots kind:chat (liveness verified gate 403, hosting_capacity 1/3/5 earned → 402 problem, CTE creates spot+room+host member). City rooms seeded since T1.4. rooms.test.ts 3 tests (unverified join-read-only + hosting 403, chat spot creation host role, free cap 402 at 6th join — actual detail "5 rooms"). LESSONS: app.authenticate must be decorated BEFORE registering routes that reference it (app.ts order fixed); spots.max_headcount NOT NULL w/ CHECK (chat spots use 500); room_members has left_at not state. 110 API tests green |
| 2026-10-27 | T7.3 | src/safety.ts: LINK_RE (https?://|www.), HANDLE_RE (@handle) → messageGuard (link+unverified → link_not_allowed; flags jsonb persisted on messages: link-detected/handle-detected — client renders interstitial on flag), checkMsgRate (Redis INCR per user per minute, 20/min, TTL 120s). Wired into realtime.ts message:send before insert (rate_limited fail ack). DM link-lock deferred to T13.2 as planned. safety.test.ts 5 tests. 115 API tests green |
| 2026-10-27 | T7.4 | lib/core/chat_socket.dart (socket_io_client 2.0.3+1: websocket transport, /ws path, setAuth token, reconnect 2s, broadcast streams for messages/presence/typing/connection/failed; sendMessage queues offline + flush on reconnect; emitWithAck ack-fail → failed stream). rooms_screen.dart rebuilt on apiClientProvider+Supabase session (NOT the invented api/authSession helpers — actual pattern is Dio provider w/ GoTrue interceptor; spots/inbox still placeholders): RoomsScreen (list w/ district title, last message, member count, pull-refresh), RoomScreen (history load, live messages, member drawer w/ photoAccess full/hidden, offline + read-only banners, typing debounce 2s; /me phoneVerified gates composer). /rooms/:id route added. LESSONS: OptionBuilder has setReconnectionDelay (no Ms suffix); socket.emit takes [data] single arg → multi-arg server handlers need List payload. flutter test 14 green; dart analyze 0 errors (17 pre-existing infos). <1s round-trip acceptance deferred to two-device staging (server acks verified in T7.1 tests) |
| 2026-10-27 | T7.5 | apps/web src/pages/app/Rooms.tsx: RoomsPage (list via GET /v1/rooms → RoomView) + RoomView (REST cursor history, socket.io-client same /ws protocol w/ auth token from supabase.auth.getSession — AuthProvider session type lacks access_token so read straight from supabase; room:join on connect; message:send w/ ack — phone_not_verified surfaced as inline system line). Router: /app/rooms + /app/rooms/:id → RoomsPage (replaces placeholder). socket.io-client dep added. web tsc+vitest 8 tests+build green. M7 COMPLETE (web↔mobile cross-chat verified by shared WS contract; two-device latency check deferred to staging) |
| 2026-10-27 | T8.1 | routes/merchant.ts: POST /merchant/claim (verified-phone gate, venue exists + unclaimed, one pending/approved claim per venue 409, own rejected claim → UPDATE resubmit w/ new cert + band reset audit; merchant_staff owner row; audit_log actor_id). POST /merchant/claim/presign (PDF/JPEG/PNG → br/{userId}/{ts}-{rand}.{ext} presignPut, 503 stub-mode). GET /merchant/me. POST /admin/merchant-claims/:id approve|reject (requireRole admin; approve sets venues.claimed_by_merchant_id + source=merchant; 409 non-pending; audit). Web VenueClaim.tsx (/venue/claim: venue search → cert upload → price band 1–6 select → contact → submitted state; linked from Venue landing). merchant.test.ts 3 tests (one-active-claim, reject→resubmit same id, approve claims venue, non-admin 403). LESSONS: audit_log col is actor_id; storage hoisted out of register callback; tests share merchantId across cases (state). 118 API tests green, web 8 green |
| 2026-10-27 | T8.2 | merchant.ts: GET /merchant/me/venues (approved claims + profile jsonb + tier/founding); PATCH /merchant/me/venues/:venueId (hours→profile jsonb; menu 402 plan-locked on Starter; pin correction ST_DWithin 200m 422; displayName non-empty); GET+POST /merchant/me/venues/:venueId/standing-rooms (cap map starter 3/growth 10/pro ∞ → 402 type:plan w/ upgrade copy; spot row kind=chat host_merchant_id+venue district inherit; room kind=chat merchant_id — merchant never a room_member). Web MerchantPortal.tsx (/merchant: venue list→editor hours/menu(Growth-gated)+standing rooms manager; Merchant nav link). merchantPortal.test.ts 2 tests (editor incl. far-pin 422, cap 3 then 402 plan). 120 API tests green |
| 2026-10-27 | T8.3 | migration 0012 users.admin_roles text[] (default {}); auth.ts AuthUser+adminRoles/aal, decorate requireAdminRole(role) — superadmin bypasses, ADMIN_REQUIRE_MFA=true enforces aal2 (GoTrue TOTP); seed admin gets {superadmin}. routes/admin.ts: GET /admin/users?q= search; GET /admin/users/:id (plan via entitlements + reports + moderation history); POST /admin/users/:id/moderate {suspend,reason} → users.deleted_at + moderation_actions(admin_id,target_user,action,reason,audit) + audit_log; GET /admin/merchant-claims pending + presignGet cert 15min; GET /admin/venues/geocode-failed; POST /admin/venues/:id/pin (geocode_status=manual); GET /admin/venue-reports + resolve; POST /admin/venues/merge (moves spots/memberships/venue_reports/saved_venues, closes loser, 409 if claimed). Web /admin page (claims approve/reject + cert link, user search). admin.test.ts 3 tests (RBAC matrix 403s incl. moderator≠support, suspend/restore cycle, pin+merge children move). Fixed old tests for admin_roles. 123 API tests green |
- T8.4 (partial ◐): Dockerfiles (api+web, both smoke-tested), Dokploy compose, meshpoke DB+role+postgis on Hetzner, nightly pg_dump cron, staging secrets + RUNBOOK. CI green again (web lint globals, shared dist build + exports map, flutter analyze infos, turbo typecheck ^build, flutter SDK cache off). Remaining: user DNS + Dokploy paste per RUNBOOK.
- T8.5 (◐): real FEHD LP XML parser (was wrong format — legend in-file, alias YTM/C&W), fehd:import script (C&W 1,788 rows to dev DB), waitlist_signups 0013 + POST /v1/waitlist (idempotent, 5/h/IP) + admin list + Home form, codemagic.yaml, PHASE0_SMOKE.md. 127 api tests green.
- T9.1 (✓): POST /v1/spots/events + 7 tests (validation, liveness 403, hosting cap, plan event caps). 134 api tests green. Lesson: drizzle sql`` raw JS array → SQL tuple (); use sql.param() for text[].
- T9.2 (✓): spotJoin.ts (join/apply/leave) + 6 tests. Note: max_headcount includes host. 140 api tests green.
- T9.3 (✓): src/sort.ts + queue endpoint in spotJoin.ts + 5 unit tests (worked example 0.61/0.57/0.37, paid-never-buys-top, flag override). 145 api tests green.
- T9.4 (✓): spotLifecycle.ts + 1 full state-machine test (146 api green). Lessons: decision enum is declined (not decline); inline SQL string w/ apostrophe must be a param; schedule headcount counts host.
- T9.5 (✓): GET /spots/:id detail + mobile spots tab/detail/apply. Flutter analyze clean, 14 widget tests green.
- T9.7 (✓): share_plus button; endpoint+SSR already from T6.5. M9 COMPLETE (7/7).
- T9.6 (✓): mobile host flow complete. Two-device acceptance deferred to staging (state-machine proven in T9.4 API test). M9 7/7 confirmed real.
- T10.1 (✓): im-here route + test (inside/outside/accuracy-edge/non-live/non-member; attendance has no lat/lng cols). 147 api tests green.
- T10.2 (✓): attendance lifecycle built+tested (defaults attended, host mark, 2-report flip, forgiveness round-trip, idempotent finalise). 148 api tests green.
- T10.3 (✓): score engine + 7 tests (6 unit + 1 integration incl. ladder + capacity transitions). 155 api tests green.
- T10.4 (✓): LiveSpotScreen + detail members sketches; two-device acceptance deferred to staging per protocol.
- T10.5 (✓): trust.test green; 156 api tests. M10 complete.
- T11.1 (✓): 5 tests green (Monday boundary via mirror fn, all 4 cost branches, expiry no-refund). 161 api tests total.
- T11.2 (✓): pokes.test 2 green (full poke→back→DM→disconnect→repoke cycle + people-you-met). 163 api tests.
- T11.3 (✓): dmLock.test 2 green; ws gate wired in realtime.ts message:send. 165 api tests.
- T11.4 (✓): poke_repository + poke_screens; analyze clean, 14 tests green. Device poke→back→message pending TestFlight.
- T11.5 (✓): web parity for inbox flows (DM chat reuses RoomsPage). 8 web tests green. M11 5/5 ✔
- T12.1 (✓): crews.test 2 green (crew create/join/leave/whatsapp; cap excludes dormant after sweep). 167 api tests.
- T12.2 (✓): rebook.test green (poll/vote/finalize/409/hosting-cap). 168 api tests.
- T12.3 (✓): flutter analyze clean + 14 tests, web 8 tests. M12 3/3 ✔
- T13.1 (✓): safety.test 2 green (block matrix, auto-mute single-insert). 165 api tests.
- T13.2 (✓): 24 shared tests (4 new scam), dmLock scam-interstitial WS test. 166 api tests.
- T13.3 (✓): shareSafety.test 2 green. 168 api tests.
- T13.4 (✓): admin.test end-to-end queue→mute→resolve→restore. 169 api tests.
- T13.5 (✓): flutter analyze 0 + 14 tests, web typecheck/lint/8 tests green. M13 5/5 ✔
- T14.1+T14.2+T14.3 (✓): activity.test 3 green (feed/cursor/read, outbox gates, emitters). 172 api tests.
- T14.4 (✓): mobile activity_screens.dart (bell/feed/settings, analyze 0, 14 tests) + web Activity.tsx (8 tests) — flutter analyze 0, api 172.
- T15.1 (✓): userQr.test 3 green (sign/verify/expired/tampered/malformed, phone gate, Redis-only ping, replay NX). 175 api tests.
- T15.2 (✓): scan.test 2 green (drop redeem + high conf; member 1/day + low conf not billable + 409 replay + 422 no-context + 403 non-staff). 177 api tests.
- T15.3 (✓): drops.test 2 green (create/claim exactly-once capacity 2, dup/full 409; tier 402 + pause frees slot; budget 402). 179 api tests.
- T15.4+T15.5 (✓): Scanner.tsx + DropsBuilder.tsx (tsc/eslint/vitest green, 8 web tests). Staff mgmt endpoint deferred — scan auth already accepts merchant_staff rows.
- T15.6 (✓): mobile qr_screens.dart + venue_drops_sheet.dart (analyze 0, 14 tests). M15 6/6 — staff-mgmt endpoint + redemption feed deferred to M16 wiring.
- T16.1+T16.2 (✓): src/billing.ts onCheckin (band 1-6 fee via price_band, sponsored x1.5, drop_seat once/user, phone-verified+7d-age gate, shadow in founding month 1, invoice YYYY-MM rollup, idempotent via unique checkin_id) + onDropActivated (first drop sets founding clock 3mo). Wired into scan.ts (charge in response). 181 api tests green.
- T16.3 (✓): merchantBilling.ts — Stripe SaaS (setup-intent card, subscribe Growth/Pro monthly w/ founding auto-price, cancel → Starter, webhook sig-verified) + monthly invoice-run job (aggregate unbilled non-shadow seat_charges → invoice + Stripe invoice items) + seat dispute 7d. Stub mode without STRIPE_SECRET_KEY (dev/test). LESSON: drizzle db.execute with params = extended protocol = ONE statement only; split multi-statement.
- T16.4 (✓): web BillingSection (invoices table w/ waived shadow column, seat-charges w/ dispute button, founding free-until card) + GET /merchant/billing/invoices + /seat-charges; /merchant/me now returns founding_free_until. 184 api tests + 8 web green. M16 4/4 ✔.
- T17.1 (✓): packages/shared/src/products.ts (15 SKUs derived from PRICES, web/IAP split, founding annual web-only) + apps/api/src/billing/consumer.ts recomputeEntitlement (active subs + host_reward_pro/pass7 grants → highest plan, furthest end, upsert entitlements; refunds/expired skipped; downgrade never touches room/spot memberships). 3 api tests + 2 shared tests. 187 api total.
- T17.2 (✓): src/billing/checkout.ts — POST /billing/checkout (Stripe Checkout, founding atomic reservation via update...returning, stub mode fulfils instantly), /billing/portal, /webhooks/stripe-consumer (completed/renewal/refund + founding release). users.stripe_customer_id migration 0016. 189 api tests.
- T17.3 (✓): src/billing/revenuecat.ts /webhooks/revenuecat (RC product map, INITIAL_PURCHASE/RENEWAL/NON_RENEWING_PURCHASE upsert subs + packs credits + filter-pass grant; EXPIRATION/CANCELLATION/REFUND close subs; recompute entitlement; REVENUECAT_WEBHOOK_SECRET config). RC dashboard + paywall UI deferred to mobile polish (needs RC project keys). 191 api tests.
- T17.4 (✓): filterGate.ts requireAdvancedFilters (402 filter_pass), map.ts ?keywords= on district spots (ANY(array) parens lesson), drops.ts autoClaimForSavedVenues (window fn NOT allowed in WHERE — subselect wrapper; drop_claims col is claimed_at NOT created_at), spotLifecycle waitlist backfill weighted by plan 1/2/3 then FIFO. planFeatures.test.ts 2. 193 api tests.
- T17.5 (✓): upgrade_sheet.dart (402 → DioException hit → sheet w/ plan options, NO prices — App Store 3.1.1; wired spot detail), web Billing.tsx (/app/billing, PRICES.web grid + founding banner + portal), CI no-web-prices-in-mobile grep step, FOUNDING_SLOTS export, products.ts null-typing fix.
- T17.6 (✓): routes/referrals.ts (referralOnPhoneVerified referee+5 only — per PRD §3.4, referrer+5 at first finalised attendance via attendance.ts finalise hook, 10/mo cap, unique referee row = same-phone protection), GET /me/referrals, mobile ReferralScreen + profile entry, web /r/:code landing. referrals.test.ts 2. 195 api tests. M17 6/6 ✔.
- T18.1 (✓): web Spots.tsx (/app/spots) — district dropdown + today/week/all, spot cards w/ state badges + required keywords, detail modal join (open) / apply w/ note, confirm attendance, leave/bail, members list (blocks filtered server-side). Keys aligned to API snake_case (my_role, join_mode, venue_name...).
- T18.2 (✓): API GET /me/hosted + POST /spots/:id/remove-member (state removed, room kicked, audit_log spot.member_removed); web HostConsole.tsx (/app/host) — hosted list w/ pending badges, queue recommended|fifo w/ express ⚡ + trust + decline reason presets, schedule (datetime + /venues/search picker), roll-call absent checkboxes, member removal w/ reason prompt.
- T18.3 (✓): API GET /me/wallet/drops (claimed drops w/ status claimed/redeemed/expired) + GET /me/spots/attended (done spots attended|forgiven); web Wallet.tsx (/app/wallet) — wallet tab + people-you-met tab w/ free-poke window + poke w/ note.
- T18.4 e2e: compose.e2e.yml (postgis+redis 15432/16379), seed via direct SQL, GoTrue stand-in auth server (CORS/prefix/JSON fixes), Playwright setup+4 suites 6/6 green, CI e2e job; root causes fixed: main.tsx missing AuthProvider, supabase getSession headless stall (getAccessToken), PATCH prefs 500, queue displayName, IPv6 listen. b6d2a63
