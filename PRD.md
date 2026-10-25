# MeshPoke Product Requirements Document (PRD) — v2.1

**Status:** Approved for build · **Supersedes:** PRD v2.0
**Business model of record:** `Business_Model.md` v6 (this PRD implements it; pricing tables are copied, not re-derived)
**Build plan:** `BUILD_PLAN.md` (task-by-task implementation order)
**Positioning:** Networking-first. Not dating, not dinners. *"Poke the mesh. Watch your network ripple."* — A live map for meeting people in real life.

**What changed from v2.0 (26 Oct 2026 decision log):**
1. Recommended sort = `0.2·tier + 0.5·vibe + 0.3·score` (additive) for application queues **and** poke inbox; absolute tier ordering removed everywhere.
2. Drops and per-seat fees ship in **Phase 1**; founding-merchant free Growth clock starts when drops go live.
3. Photo reveal rules rewritten per spot type (§3.1).
4. Founding monthly pricing available on web **and** in-app; founding annual is web-only.
5. Pokes: Monday 00:00 HKT reset, no refund on expiry, no Accept button — **"Poke back · Free"**.
6. Three billable merchant events: individual drop seat, group drop seat, new-member attribution visit (first 3 visits within 60 days).
7. Separate caps per room type (event / chat room / merchant spot / crew).
8. Promotional push opt-in, activity feed, per-merchant mute, opt-in proximity alerts (max 1/day).
9. Venue data from FEHD restaurant licence open data + user pins; **no Google Places import**. Google Maps for display only.
10. Infrastructure: reuse the existing Hetzner box (8 GB) — separate database on the existing Postgres + own GoTrue container.
11. Attendance: event spots default to attended, host roll-call + 2 peer reports mark no-shows, optional GPS "I'm here"; merchant visits use staff scan of the guest's rotating QR.
12. Gender fields and gender-based spot rules **removed**; all users 18+.
13. Unverified users are **read-only** in chat rooms.
14. Referral pokes; founding annual plans; Apple Small Business Program.
15. Membership ladders: visits + tenure, merchant templates and customisation, no discount cap.

---

## Table of Contents

1. Product Overview
2. Architecture and Tech Stack
3. Core Product Mechanics (shared spec)
4. Map, Venues and Location
5. Flutter Mobile Application
6. Web Application (marketing + authenticated + merchant portal)
7. Trust, Safety and Moderation
8. Monetization Implementation
9. Shared Backend Services
10. Admin Dashboard
11. Database Schema
12. API Specification
13. Design System
14. Hong Kong Market Localization
15. Non-Functional Requirements
16. Implementation Phases
17. Testing Strategy
18. Launch Readiness Checklist
19. Decision Log

---

## 1. Product Overview

### 1.1 Product Vision

MeshPoke is a **map-native social mesh**: a live map of Hong Kong where people form real-life groups — dinners, drinks, hikes, tennis, board games, industry minglers — at real venues, show up, and keep the crew together afterwards.

- The unit of value is **the spot**: event spots (a forming group anchored to a place), chat room spots (always-on communities) and merchant spots (venue memberships).
- The unit of connection is **the poke**: mutual pokes connect two people, unlocking 1:1 chat and full profiles.
- The retention loop is **the crew**: the group that says "do it again?" and rebooks in one tap.

We are networking-first. Romance isn't banned; it just isn't the frame. App Store category: **Social Networking**. All copy says "connect", never "match". All users are 18+.

**What we are not:** a dating app (no swipe, no looks-market ranking), a dinner-booking service, a payments platform (MeshPoke never touches guest money), or a feed (no infinite scroll of posts).

### 1.2 Products in Scope

| Product | Platform | Purpose |
| --- | --- | --- |
| MeshPoke app | Flutter (iOS, Android) | The product: map, spots, pokes, crews, drops, memberships, attendance, check-in |
| Marketing site + authenticated web | React (served by Dokploy) | Acquisition, pricing, support; desk companion (profile, inbox, chat, spots list, host console, billing) |
| Merchant portal | React (web, mobile-responsive) | Venue claim, standing rooms, drops (individual + group), membership ladders, CRM, per-seat billing, **staff scanner** (any phone), optional tablet mode |
| Admin dashboard | React (web, RBAC) | Moderation, users, merchants, venue data, disputes, metrics |
| Backend API | Node.js (Fastify) + PostgreSQL 15 + PostGIS + GoTrue + Redis | All business logic, one API for all clients |

### 1.3 Target Users

- **Primary:** HK professionals 22–40 (finance, tech, design, media), expats and locals, who want real-life connection without dating-app pressure or WhatsApp-group chaos.
- **Secondary:** university students (18+), newcomers to HK, hobby groups (hiking, racket sports, board games).
- **Merchants:** F&B and activity venues (cafés, bars, restaurants, sports facilities) in one walkable cluster first (Central–Sheung Wan–SoHo).

### 1.4 Success Metrics (from Business Model §11)

- Rebook-the-crew rate (north star: people return for their group)
- Formation health: spots formed → confirmed → attended funnel
- Free-tier application acceptance rate within 10% of paid (queue fairness gate)
- Verified merchant check-ins per venue per week (merchant value proof)
- Monthly conversion to paid (target 2.5%); founding merchant conversion at month 4 of drops (target ≥60%)

---

## 2. Architecture and Tech Stack

### 2.1 System Architecture

```
┌─────────────┐  ┌──────────────┐  ┌──────────────────┐
│ Flutter app │  │ React web    │  │ Merchant portal  │
│ (iOS/Andr.) │  │ (marketing + │  │ + staff scanner  │
│             │  │ authed+admin)│  │ (React, mobile)  │
└──────┬──────┘  └──────┬───────┘  └────────┬─────────┘
       │  HTTPS/WSS     │  HTTPS            │  HTTPS
       └────────┬───────┴───────────────────┘
                ▼
     Cloudflare (DNS, CDN, static cache)
                ▼
     Dokploy Traefik (TLS) on existing Hetzner VPS (8 GB)
                │
   ┌────────────┼──────────────┬──────────────────┐
   ▼            ▼              ▼                  ▼
GoTrue       App API        Admin routes       Webhooks
(auth,       (REST + WS)    (RBAC, same API)   (Stripe, RevenueCat)
 JWT)           │
   └────────────┴──────────────┴──────────────────┘
                │
   ┌────────────┼─────────────┬───────────────┐
   ▼            ▼             ▼               ▼
PostgreSQL 15  Redis 7      Cloudflare R2   External:
+ PostGIS      (WS adapter, (media, signed  Twilio (SMS OTP)
(meshpoke DB   rate limits, URLs, backups)  Resend (email)
 on existing   presence)                    FCM + APNs (push)
 Postgres)                                  Google Maps SDK (display)
                                            data.gov.hk FEHD + ALS (venues)
                                            RevenueCat, Stripe, PostHog, Sentry
```

### 2.2 Tech Stack Detail

| Layer | Technology | Notes |
| --- | --- | --- |
| Mobile | Flutter 3 (Dart), Riverpod, go_router, dio | `google_maps_flutter` (display), `mobile_scanner` (QR, native camera APIs), `qr_flutter` (user QR), `geolocator`, `purchases_flutter` (RevenueCat), `firebase_messaging`, `supabase_flutter` (GoTrue auth only) |
| Web | React 18 + TypeScript + Vite + Tailwind 3 + TanStack Router/Query | Marketing, authenticated web, merchant portal (incl. staff scanner via browser camera), admin |
| API | Node.js 20 + Fastify (TypeScript) + Zod | REST + WebSocket (Socket.io with Redis adapter); OpenAPI generated from Zod schemas → typed clients for web (TS) and mobile (Dart) |
| ORM / migrations | Drizzle ORM + drizzle-kit | PostGIS columns via custom types; raw SQL for geo queries |
| Jobs | pg-boss (Postgres-backed queue) | Scheduled + delayed jobs without extra infrastructure |
| DB | PostgreSQL 15 + PostGIS — **separate `meshpoke` database on the existing self-hosted Supabase Postgres** | Studio stays Tailscale-internal; PostgREST/Realtime never exposed; Fastify is the only public API |
| Auth | **GoTrue** (Supabase Auth) — own container `meshpoke-auth` pointed at the `meshpoke` DB | Apple/Google OAuth, email+password, phone OTP via Twilio; JWT (~1h) + refresh rotation; Fastify verifies JWT on every request |
| Cache | Redis 7 | Socket.io adapter, rate-limit counters, presence TTL |
| Media | Cloudflare R2 | Private photos (signed URLs, 10 min), venue images, encrypted DB backups |
| Maps | Google Maps SDK (mobile) — display only | **No Google Places API**; venue data is ours (§4) |
| Venue data | data.gov.hk FEHD restaurant licences (daily) + HK Address Lookup Service (geocoding) | HK1980 grid → WGS84 conversion in the importer |
| Payments | Stripe (web consumer checkout + merchant billing), Apple/Google IAP via RevenueCat | Dual-channel pricing (§8) |
| Push | FCM + APNs | Plus in-app activity feed |
| Email | Resend | Receipts, invoices, digests |
| SMS | Twilio (via GoTrue phone provider) | +852 only |
| Analytics / errors | PostHog (product analytics, feature flags) + Sentry (errors) | Sort weights are PostHog feature flags |
| CI/CD | GitHub Actions (API + web images) + Codemagic (Flutter builds incl. iOS) | Dokploy deploys from GitHub on push to `main` |
| Hosting | **Existing Hetzner VPS (8 GB)** running Dokploy, shared with SupremaNode | Cloudflare DNS + CDN; HK/Singapore region added when cash allows |

**Hybrid web policy:** marketing pages public; authenticated web covers profile editing, poke inbox (view + poke back), chat read/reply, spots district list + apply + RSVP/date confirm, host console (queue review, date pinning, attendance roll-call), People-you-met + connections, memberships wallet (read-only), subscription management with web prices; public spot share pages (`/s/{id}`). Map browsing, spot creation with venue pin, GPS "I'm here", showing the user QR for merchant scans, and drop claiming are mobile-only with "open in app" deep links.

### 2.3 Infrastructure and Deployment (Dokploy on the existing Hetzner box)

**Local-first, deploy last.** Build and test against the local stack (`docker-compose.dev.yml`: Postgres+PostGIS, GoTrue, Redis, API); production deploy is a final-step task.

| Concern | Decision |
| --- | --- |
| VPS | **Existing Hetzner VPS (8 GB)** already running Dokploy and SupremaNode, reachable over Tailscale (`hetzner-vps`). No new server until load or latency demands it; then add an HK/Singapore region. |
| Database | Create database `meshpoke` (with PostGIS extension) on the **existing** self-hosted Supabase Postgres; dedicated DB role `meshpoke_app` with access to that database only. No second Postgres stack. |
| Apps (Dokploy compose) | `meshpoke-api` (Fastify + WS + pg-boss workers), `meshpoke-web` (React static via nginx: marketing + app + merchant + admin), `meshpoke-auth` (GoTrue container configured for the `meshpoke` DB), `meshpoke-redis` (Redis 7, ~128 MB limit). Set memory limits per container so SupremaNode is never starved. |
| Networking | Apps share the Dokploy Docker network; Postgres and Redis expose **no** public ports. Only Traefik owns 80/443. |
| Routing | `www.meshpoke.com` → web; `api.meshpoke.com` → API; `auth.meshpoke.com/auth/v1/*` → GoTrue; admin + merchant portal at `/admin`, `/merchant`. Traefik + Let's Encrypt TLS. |
| CDN | Cloudflare proxies `www` (static assets cached at edge) and serves R2 media via a custom domain; API not cached. |
| Deploys | GitHub App webhook → Dokploy on push to `main`; Codemagic → TestFlight / Play internal testing. |
| Email | Inbound: Cloudflare Email Routing (`info@`, `legal@`, `privacy@`, `support@`) → founder inbox. Outbound: Resend with SPF/DKIM on `meshpoke.com`. |
| Backups | Nightly `pg_dump` of `meshpoke` to R2 (encrypted), 30-day retention; restore drill before public launch. |
| Secrets | One `.env` per Dokploy app mirroring `.env.example`; PII field-encryption key; never committed. |
| Admin access | Dokploy and Supabase Studio only via Tailscale HTTPS — never public. |

Budget impact at launch: **HK$0 extra hosting** (server already paid); R2 and Cloudflare free tiers; Twilio ~HK$1 per verification.

---

## 3. Core Product Mechanics (shared spec)

Implemented once in the backend and surfaced in all clients. Section numbers reference Business_Model.md v6.

### 3.1 Profile Sketch and Photo Rules

| Field | Spec |
| --- | --- |
| Industry | Dropdown: Finance / Tech / Design / Media / Medical / Legal / Education / Hospitality / Student / Other |
| Role one-liner | 40 chars free text |
| Keywords | One set of 10 per user, each self-declared level 1–10; **max 3 at level 8+** (server-enforced) |
| Vibe prompts | 3 short answers: "Perfect Friday night…", "Table topic I'll hijack…", "Ask me about…" |
| Date of birth | Required at sign-up; **age < 18 → account creation blocked**; never displayed |
| Photos | Up to 6; first = primary. Private in R2, served via 10-minute signed URLs |
| Hide my photo in chat rooms | Boolean, default `false` |
| Verification badges | HK phone-verified; optional work-email / LinkedIn industry badge; liveness badge later (§7.4) |

**No gender field.** (Removed in v2.1; deferred pending legal review.)

**Photo visibility resolver** (single server function `canSeePhoto(viewer, subject, context)`):

| Context | Rule |
| --- | --- |
| Map, spot cards, application queues, poke inbox, People-you-met list (before event done) | Sketch only |
| Chat room spot member list / messages | Primary photo if both are members of the room **and** `subject.hide_photo_in_rooms = false` |
| Event spot (forming / confirmed / live) | Sketch only |
| Event spot `done` | Primary photo visible between users who are **both** `attendance.status ∈ {attended, forgiven}` for that spot |
| Connected (mutual poke) | All photos + socials, in every context |
| Blocked either way | Nothing beyond display name |

### 3.2 Discovery (local-scoped, never global)

- Filters: "people here with **tennis ≥ 7**" — apply to map markers, room member lists, sketch cards.
- **Vibe match** (0–1): for a spot, overlap between the user's keywords and the spot's tagged/required keywords; for a person, overlap between two users' keywords. v1 formula: `sum over shared keywords of min(levelA, levelB) / 10`, divided by `max(1, number of keywords on the reference side)`, clamped to [0, 1]. **If either side has no keywords → 0.5.** Displayed as % (capped at 99%).
- **No global user search.** Spot search scoped to map viewport or district (HK's 18).
- Default map view = **"This week"**; toggles: Today / This week / All upcoming.

### 3.3 Trust Signals (free on every profile, never paywalled)

- Member since ("Joined Oct 2026"), spots attended ("12 spots attended"), Show-up Score (or "unproven").
- "Friend of friend" badge (degree 2, via connections) on profiles and room member lists — not browsable.

### 3.4 The Poke System

- A poke = target + optional note (**200 chars Free/Plus, 500 Pro**). Text only; links never auto-render.
- **Stranger pokes use the weekly allowance: 5 Free / 20 Plus / 50 Pro**, reset **Monday 00:00 HKT** (computed lazily on read: balance resets if `last_reset_at` < most recent Monday 00:00 HKT). Unused do not roll over. Pack and referral pokes are a separate non-expiring balance, spent after the weekly allowance.
- Unaccepted pokes **expire after 7 days**. **No refund** on expiry.
- **Poke back:** if B has a pending poke from A, B's CTA on A reads **"Poke back · Free"**; it costs nothing, never touches B's allowance, and creates the connection immediately. There is no Accept button; ignoring is silent; expiry is silent.
- **Mutual poke = connection** → 1:1 chat + full profiles + socials. CTA changes **Poke → Message**. Either side can disconnect any time, silently.
- **Post-spot pokes:** after an event spot is `done`, attendees (status `attended` or `forgiven`) see **"People you met"** for **48h**; each poke is labelled "Free poke · met at [spot] · 31h left" and costs nothing. Chat-room co-presence does not qualify.
- **Referral pokes:** referee +5 on phone verification via referral link; referrer +5 when the referee is first marked `attended`; max 10 rewarded referrals per referrer per calendar month; one reward per phone number ever.
- **Poke packs:** 5 / HK$38, 15 / HK$88 (web); IAP HK$48 / 98.
- Scam walls on notes and DMs (§7).

### 3.5 Spot Types and Event Spot Lifecycle

| Type | Created by | Has a date | Has a room | Cap counted against (§3.10) |
| --- | --- | --- | --- | --- |
| Event spot | Any user with hosting rights, or a merchant | Yes (date-on-fill) | Yes (the spot room) | Event spots |
| Chat room spot | Merchants (standing rooms), users with hosting rights (community rooms), system (1 city room per district) | No | Yes | Chat room spots |
| Merchant spot | A claimed venue's membership | No | No (venue page) | Merchant spots |

**Event spot states:** `forming → confirmed → live → done` (+ `dissolved`, `cancelled`). On `done`, the spot can spawn a **crew** (§3.7).

**Templates:** Dinner · Drinks · Coffee · Hike · Run · Tennis · Pickleball · Badminton · Board games · Industry mingle · Open sport.

**Creator-admin settings** (hosting capacity = max concurrent active event spots hosted: 1 unproven → 3 proven → 5 top, earned via Show-up Score; never purchasable):
- Name, template, required keywords (≤3), min Show-up Score, price range (informational), district anchor while forming, **venue pin required on confirm**, min/max headcount, date range, open (direct join) or application-only.
- Optional **group drop** attached at venue pin time (only group drops the venue currently offers; §3.9).
- Reviews applications as sketches only. Removals logged with reason and reportable. Creator may attach an external booking/payment link — displayed only.

**Date-on-fill:**
1. Spot forms with a date range only.
2. Min headcount reached → creator pins date + venue.
3. Members confirm within **48h** or the spot auto-dissolves.
4. Overbook buffer allowed; a bail triggers waitlist backfill.
5. **24h bail grace** before event start; later bails = `late_cancel` score event.

**Live:** from event start time to start + template default duration (editable). During `live`, attendees may tap **"I'm here"** (GPS accepted when the reported accuracy circle overlaps a 100 m radius around the venue pin).

### 3.6 Attendance and Show-up Score

**Event spot attendance (no QR):**
1. At `live → done`, every confirmed member gets `attendance.status = attended` (default), `verified_gps = true` if they tapped "I'm here".
2. **Host roll-call** (available for 24h after done): host can untick members → `absent_host`.
3. **Peer reports** (24h window): any attendee can report another as absent; at **≥2 distinct reporters** → `absent_reported`.
4. A member marked absent can submit a **flake-forgiveness** explanation within 48h → host accepts → `forgiven` (counts as attended for photo reveal and score; logged privately).
5. Attendance finalises at done + 24h (pg-boss job); score events are emitted then. People-you-met opens at `done` for members still `attended`, and closes for anyone later marked absent.

**Merchant check-ins (QR):** used for drop redemption, group drops and member visits — see §3.9.

**Show-up Score** (0–1, displayed as a 0–100 badge or "unproven"):
- Inputs: attendance outcomes (attended / absent / late-cancel / forgiven), attendance streak, verified-GPS rate, host-cancellation events.
- **Unproven** until 3 finalised event outcomes; ranking treats unproven as **0.5**.
- 90-day decay (older events weighted less); enforcement ladder: repeated no-shows → warning → temporary application cooldown → hosting rights paused.
- **Symmetry:** host last-minute cancel → score event on host + auto-apology message to members.

### 3.7 Crews and Rebook

A crew is a separate entity (not a spot state).
1. On spot `done`: every attendee sees **"Do it again?" → Keep crew / Leave** (silent).
2. Keepers get a persistent crew chat.
3. Any member with hosting rights taps **Rebook**: clone template + venue + date poll (2–5 options) → creates a new event spot with crew members pre-invited.
4. Optionally open remaining seats to the public.
5. Crew dormant after 60 days without a rebook (dormant crews don't count toward caps; any rebook reactivates).
6. Crews may link a WhatsApp group (URL stored, shown to members).

### 3.8 Recommended Sort (application queue and poke inbox)

```
Recommended = 0.2 · tier + 0.5 · vibe + 0.3 · score
  tier  : Free 0, Plus 0.6, Pro 1.0          (paid buys at most +0.2)
  vibe  : 0–1 per §3.2; 0.5 when no keyword data
  score : Show-up Score 0–1; unproven = 0.5
  ties  : oldest first
```

- **Hard filters first** (application queue): host's min Show-up Score and required keywords exclude applicants before ranking.
- **Poke inbox** uses the same formula with vibe = overlap between sender and inbox owner.
- Switchable sorts: Recommended / vibe / score / newest. Express badges (Plus/Pro) and total counts always visible.
- Weights live in a PostHog feature flag (`recommended_weights`) with the above as default; server reads with 60 s cache.
- Applications persist until the spot confirms or closes; accept/decline with reason presets + free text.
- **Fairness metric:** free vs paid acceptance rate tracked daily; launch gate = within 10%.

Worked example (must be a unit test): Amy Free 0.8/0.7 → **0.61**; Cara Plus 0.6/unproven → **0.57**; Ben Pro 0.1/0.4 → **0.37**.

### 3.9 Drops, Memberships and Merchant Check-ins

**User QR:** each phone-verified user has a rotating QR in the app: `base64url(user_id | window | HMAC(secret, user_id|window))` with 30 s windows; server accepts current ±1 window; single-use per scan (replay cache in Redis, 2 min).

**Staff scan:** merchant staff open the merchant portal **Scanner** on any phone (browser camera) or tablet mode, choose the context (drop / group drop / member visit, auto-detected when possible) and scan. Server verifies token, venue, GPS overlap of the guest's latest reported location (guest app sends location with QR display), 1 member visit per user per venue per day.
- GPS overlaps → `confidence = high` → billable if a billable event applies.
- GPS missing/failed but token valid → `confidence = low` → counts for membership progress and score, **never billed**.

**Individual drop:** merchant-published offer (title, offer text, capacity, start/end, optional sponsored flag). User claims (phone-verified, capacity-limited, plan rules for auto-claim) → shows QR at venue → staff scan → **drop seat** (billable once per user per drop, including existing members).

**Group drop:** merchant-published group perk (title, perk, min group size, capacity in tables, validity). A host attaches it when pinning the venue for an event spot. At the venue, staff scan each attendee's QR (or scan the host's QR and tick attendees present) → each scanned attendee = **group drop seat** (billable).

**Membership (merchant spot):**
- Join from venue page (phone-verified; counts toward user's merchant-spot cap; venue cap 25 / 100 / unlimited by merchant tier; waitlist when full).
- `joined_via_meshpoke = true` for every membership created in-app (all of them in v1).
- **New-member attribution:** the member's first **3** high-confidence visits within **60 days** of joining are billable; after that, never.
- **Ladder levels** (from venue's ladder config): each level = `min_visits`, `min_months_member`, `discount_pct` (no cap), `perk_text`. Level = highest level whose thresholds are met. **Inactivity period** (30/60/90 days, default 60): no visit within the period → drop one level (job). No visit for 60 days → membership released.
- **Founding circle:** merchant-assigned VIPs (2–25), never expire, no cap impact.
- **Member coupons** unlock when the venue crosses its member threshold (default 50).
- Ladder edits that reduce benefits: existing members keep current level; members notified; reductions take effect after 30 days.

**Merchant-side estimates (portal):** when creating a drop or ladder level, show estimated cost per guest = offer value estimate (from band midpoint × discount %, or merchant-entered perk cost) + per-seat fee; show info note when a discount exceeds 20%.

### 3.10 Room Types and Caps

| Cap | Free | Plus | Pro | Counted |
| --- | --- | --- | --- | --- |
| Event spots (active RSVPs incl. hosting; the spot room comes with it) | 3 | 5 | 10 | Spots in `forming/confirmed/live` where user is member/host |
| Chat room spots | 5 | 10 | 20 | Rooms of type `chat` joined |
| Merchant spots | 10 | 30 | Unlimited | Active memberships (founding-circle seats excluded) |
| Active crews | 3 | 10 | Unlimited | Crews not dormant where user is member |

- Exceeding a cap returns `402` with `{cap, limit, upgrade: true}`; the client shows an upgrade sheet (never a web-price hint in-app).
- Downgrades never kick users out; they block new joins until under the cap.
- City rooms (system, 1 per district) count as chat room spots.

### 3.11 Notifications and Activity Feed

- **Activity feed** (bell): every user-relevant event is written to `activity_items` regardless of push.
- **Push categories:** `social` (pokes, poke backs, connections), `spots` (applications, date pins, confirmations, reminders, crew polls), `venue` (drops at saved/joined venues, membership level changes), `promo` (sponsored drops, venue offers), `proximity`.
- `promo` and `proximity` are **off by default**; enabled only via explicit in-app consent screens; toggles in Settings; **per-merchant mute** list.
- **Proximity (nearby perks):** opt-in + OS "Always"/background location; native geofences registered only for joined/saved venues (iOS max 20 regions → nearest 20, refreshed on significant location change). Server enforces **max 1 proximity push per user per day** and per-merchant mute; only Pro merchants' venues are eligible.
- Quiet hours 23:00–08:00 HKT for non-urgent pushes (feed still updates).

---

## 4. Map, Venues and Location

**Decision: Google Maps for display; venue data is ours.**

### 4.1 Base Map and Markers

- `google_maps_flutter` renders the base map (Traditional Chinese + English labels).
- **Venue markers sized by verified merchant check-ins (last 7 days)** — never member count, tier or fees. Pins show activity ("42 check-ins this week").
- **Event spot markers** use state styling (forming / confirmed / live) with headcount badge; standing chat rooms render as a small neutral pin clustered into the venue marker.
- Venue pin richness: standard (Starter) / rich (Growth) / rich + branded (Pro merchant) — **richness only; ranking rules identical**.
- Clustering: zoom-out clusters by district; zoom-in shows individual venues and spots.

### 4.2 Venue Data Sources

| Source | What | How |
| --- | --- | --- |
| **FEHD restaurant licences** (data.gov.hk, daily 09:00) | Every licensed General / Light Refreshment / Marine restaurant: licence no., licensed name, address, licence type | Daily importer (pg-boss 10:00 HKT): upsert by licence number; new address → geocode via **ALS** (`https://www.als.gov.hk/lookup`), convert HK1980 grid → WGS84; licences that disappear → `status = closed` (hidden after 14 days unless claimed) |
| **User-added pins** | Parks, trailheads, courts, rooftops, bars, anything not in FEHD | Phone-verified users add name + category + pin; duplicate check: same normalised name within 50 m → suggest existing |
| **Merchant claims** | Display name, corrected pin, hours, menu, photos | Claim with Business Registration certificate (admin approval); claimed venues can't be edited by users |
| **Reports** | "Wrong pin", "Closed", "Duplicate" | 3 reports → admin queue |

- Launch cluster seeding: run the FEHD import for Central & Western district first; admin bulk-adds founding merchants.
- Attribution "Contains data from DATA.GOV.HK" in the app About page and web footer (verify exact wording in the data.gov.hk terms).
- **No Google Places API calls and no storage of Google content.** No scraping of third-party platforms.

### 4.3 Geo Data Model (PostGIS)

- **Districts:** 18 HK district polygons (seed GeoJSON); venues and spots get `district_id` via point-in-polygon on insert.
- Viewport queries: `ST_Intersects(location, ST_MakeEnvelope(...))` with district scoping — never global.
- Near-me fallback: `ST_DWithin`.
- GPS overlap test: `ST_DWithin(venue.location, user_point, 100 + accuracy_m)`.
- Presence: venue-granular counts with TTL ("12 people at The Pontiac now") — raw coordinates are never stored beyond the verification call, never broadcast, never shown as user dots.

### 4.4 Privacy, Battery and Platform Behavior

- No home/work detection. No ambient signals of other users. We are not Zenly.
- **Foreground location** for map, "I'm here" and QR display — the app is fully functional with foreground-only permission.
- **Background location is optional** and requested only when the user turns on Nearby perks (§3.11), with a clear explanation screen.
- Routing delegated via deep links to Google/Apple Maps.
- Exit path: base map is a swappable viewport (MapLibre + self-hosted tiles) because all social meaning lives in our PostGIS.

---

## 5. Flutter Mobile Application

### 5.1 App Structure

Bottom tab navigation (5 tabs) + global header (activity bell, QR button):

| Tab | Contents |
| --- | --- |
| **Map** (default) | Live map: venue markers sized by check-ins, event spot markers, "This week" default, district banner, filter chips (template, date, keywords) |
| **Spots** | List of event spots + chat room spots scoped to district/viewport (never global) |
| **Rooms** | Joined event spot rooms, chat rooms, crew chats, DMs (unread badges) |
| **Inbox** | Pokes received (Recommended sort, "Poke back · Free"), application updates, People-you-met |
| **Profile** | Sketch editor, keywords, prompts, photos + "hide my photo in chat rooms", Show-up Score, connections, memberships wallet (levels + progress), plan + billing, referral link, settings |

Global: **My QR** (full-screen rotating QR for merchant scans), activity feed, "I'm here" button on live spots.

### 5.2 Key User Flows

**Registration & verification**
1. Sign up: Apple / Google / email → **date of birth** (block if < 18) → browse-only.
2. Phone verification (+852 SMS via GoTrue) → verified badge; one account per number; referral pokes credited if via referral link.
3. Sketch: industry, one-liner, 10 keywords with levels (max 3 at 8+), 3 prompts; photos optional.
4. Land on Map.

**Discover & join an event spot**
1. Map marker or Spots tab → spot card (template, host sketch + trust signals, required keywords, headcount state, price range, Show-up minimum, group drop badge if attached).
2. Apply (optional note) → pending (queue counts visible) — or direct join for open spots. Cap check (§3.10).
3. Accepted → spot room (sketches only until the event is done).

**Host an event spot**
1. "+" → template → basics → district anchor → publish.
2. Review queue (Recommended default; switch sorts), accept/decline with reason, overbook toggle.
3. Min headcount → pin date + venue (venue search = our venues table; optional group drop from the venue) → 48h confirm window.
4. Event day: room pinned; members may tap "I'm here".
5. After: roll-call screen (untick no-shows) within 24h; crew prompt.

**Attend & after the event**
1. Spot ends → status `done` → "Do it again?" (Keep crew / Leave) → People-you-met list with free pokes (48h) → attendees' primary photos revealed.
2. Report someone absent (24h); if reported/marked absent, receive explanation prompt (flake forgiveness).

**Poke → connection**
1. Poke from a sketch (note optional; allowance shown).
2. Recipient's Inbox shows the poke with sender trust signals and **"Poke back · Free"**.
3. Poke back → connected → full profile + Message. Connections list: Message / Disconnect (confirm).

**Drops & memberships**
1. Venue page → join membership (cap check) / claim drop.
2. At the venue → tap **My QR** → staff scan → confirmation ("Drop redeemed", "Visit 3 of 8 to Insider").
3. Wallet: memberships, level, progress, active coupons, claimed drops.

**Notifications consent**
- After the first venue join or drop claim: consent sheet for venue offers (`promo`); Nearby perks offered separately from the venue page / settings with location explanation.

### 5.3 Screen Specifications

| Screen | Key elements |
| --- | --- |
| Map home | Google map, clustered venue markers (size = check-ins), spot markers, district banner, filters, "This week", FAB "+", My QR |
| Spot detail | Template icon + name, host sketch + trust signals, member list (sketches; photos after done for attendees), date state, required keywords, price range, group drop badge, Apply/Join CTA |
| Spot creation | Stepper: template → basics → district anchor → (on fill) date + venue + optional group drop |
| Application queue (host) | Applicant sketch cards, sort switcher, accept/decline + reason, counts, waitlist |
| Roll-call (host) | Member list, all ticked by default, untick = absent, submit within 24h |
| Room (event/chat) | Messages, member rail (photos per §3.1), host tools (remove w/ reason, pin, close), unverified users see read-only banner |
| 1:1 chat | Text-first, link lock until first attended event together, report/block, disconnect |
| Inbox | Pokes (Recommended sort, note preview, trust signals, "Poke back · Free"), application status, People-you-met |
| Activity feed | Chronological alerts with filters (social / spots / venue / offers) |
| Venue page | Name, pin richness, hours/menu (claimed), check-in activity, membership offer + ladder levels, active drops, group drops, join / claim CTAs, mute merchant |
| My QR | Full-screen rotating QR + countdown; sends location on open |
| Wallet | Memberships with level + progress bar, coupons, claimed drops |
| Profile (mine) | Sketch, keywords, prompts, photos, hide-photo toggle, Show-up Score + factors, connections, referral link + rewards, plan/billing |
| Profile (other) | Per §3.1 resolver |
| Settings | Phone, notifications (categories, promo consent, Nearby perks, muted merchants), blocked list, plan (IAP management), delete account, about/data attribution |

### 5.4 Push Notification Types

| Event | Category | Copy direction |
| --- | --- | --- |
| New poke / poke back / connected | social | "{name} poked you — poke back free" |
| Application accepted / waitlisted / declined | spots | Tap through to spot |
| Date pinned / confirm reminder (24h before dissolve) | spots | "Your {spot} is ON — confirm by {deadline}" |
| Event starting soon (2h) | spots | Reminder + "I'm here" prompt at start |
| Post-spot window opened | spots | "You met 5 new people — poke them free for 48h" |
| Crew rebook poll | spots | "{crew} is rebooking — vote" |
| Drop at saved/joined venue, level up | venue | Informational |
| Sponsored drop / venue offer | promo (opt-in) | Labelled "Sponsored" |
| Nearby perk | proximity (opt-in) | "Your member perk at {venue} is 50 m away" (max 1/day) |
| Verification nudge | system | Max 2/week while browse-only |

### 5.5 Platform-Specific Requirements

- iOS 15+, Android 8+ (API 26).
- Permissions: location when-in-use (required for map, I'm here, QR); location always/background (optional, Nearby perks only); camera (only if user scans a QR, e.g. host scanning in group-drop fallback); notifications; contacts optional (invite); calendar optional.
- Deep links: `meshpoke://spot/{id}`, `meshpoke://venue/{id}`, `meshpoke://r/{referral}`, universal links from `www.meshpoke.com`.
- App Store: Social Networking; no dating keywords; highest age rating available (18+ if offered); in-app account deletion; Sign in with Apple; UGC tools (report, block, filter, contact).
- Google Play: Data Safety (precise location in-use; background location only for Nearby perks with prominent disclosure); background location declaration form.

---

## 6. Web Application

### 6.1 Pages and Routes

| Route | Type | Contents |
| --- | --- | --- |
| `/` | Public | Hero (pitch line + live-map mock), how it works, safety highlights, app download + waitlist |
| `/how-it-works` | Public | Spots → show up → keep the crew; networking-first positioning |
| `/pricing` | Public | Consumer tiers + passes + packs + founding banner (web prices, founding annual); merchant tiers + per-seat explainer |
| `/safety` | Public | Verification, 18+, trust signals, photo rules, scam defences, Scameter + 999 guidance |
| `/support/*`, `/about`, `/terms`, `/privacy` | Public | FAQ, founder story, legal |
| `/venue`, `/venue/claim`, `/venue/pricing` | Public | Merchant landing, claim flow, per-seat fee + ladder explainer |
| `/r/{code}` | Public | Referral landing → app download / sign-up |
| `/login`, `/signup` | Public | Apple/Google/email (+ DOB gate) |
| `/app/*` | Authenticated | Profile, inbox (poke back), chat, spots district list + apply + confirm, host console (queue, date pin, roll-call), People-you-met, connections, wallet (read-only), billing (Stripe), settings, data export |
| `/s/{id}` | Public | Spot share page (OG card: template, district, date state, seats left) — no member data |
| `/merchant/*` | Authenticated (merchant) | Dashboard, venue profile, standing rooms, drops (individual + group), ladder builder, members CRM, scanner, invoices, settings |
| `/admin/*` | Authenticated (RBAC) | §10 |

### 6.2 Authenticated Web Experience

Included: profile/sketch editing, keywords, photos + hide-photo toggle, poke inbox with Poke back, chats (rooms, crews, DMs), spots district list (apply, RSVP, 48h confirm, 24h bail), host console (queue, date pinning with venue search, roll-call, member removal), People-you-met + connections, wallet (read-only), subscriptions with Stripe web checkout (incl. founding annual), referral link, settings, data export.

Excluded (mobile-only, with "open in app"): map browsing, venue pin placement for new user venues, "I'm here", My QR, drop claiming.

### 6.3 Merchant Portal (Web, mobile-responsive)

- **Dashboard:** verified check-ins (today/week/month), seats by event type, drop performance, estimated month-to-date fees, membership stats, founding-programme status (days left, guarantee progress "18/30 guests").
- **Venue profile:** display name, pin correction, hours, menu, photos (rich pins on Growth+), price band (declared).
- **Standing rooms:** create/manage chat room spots (Starter 3 / Growth 10 / Pro unlimited).
- **Drops builder:** individual drops (offer, capacity, schedule, sponsored toggle on Growth+) and group drops (perk, min group size, table capacity, validity); perk-first suggestions; estimated cost per guest; monthly budget cap.
- **Ladder builder:** choose template (Café/Bar/Restaurant/Fine dining) → edit levels (Starter ≤3, Growth/Pro ≤5): min visits, min months, discount %, perk; inactivity period; >20% info note; preview of member view; reduction warning (30-day notice).
- **Members CRM:** aggregate (Starter), full list with levels, visits, last visit (Growth), export + automations (Pro: birthday treat, win-back after N days, members-only event invites).
- **Scanner:** full-screen camera scanner (any phone browser) with context picker and result screen (name sketch, event type, billable yes/no); **tablet mode** optional. Multi-staff logins on Pro.
- **Billing:** card on file (Stripe), monthly invoice (SaaS + seat lines by event type, drop, date), shadow invoices during promo, dispute a seat (7 days), payment failure banner (drops paused).

---

## 7. Trust, Safety and Moderation

### 7.1 Identity Ladder

| Stage | Unlocked by | Gains |
| --- | --- | --- |
| Browse-only | Sign-up + DOB ≥ 18 | Map, spots, venues, sketches; join chat rooms **read-only** |
| Phone-verified | +852 SMS code, one account per number | Poke / poke back, post in rooms, apply/join event spots, join memberships, claim drops, host, DM (links after first attended event together) |
| Event attended | Attendance finalised `attended`/`forgiven` | Photo reveal with fellow attendees, People-you-met, link lock lifted with those people |
| Connected | Mutual poke | Full profile, photos, socials, 1:1 DM |
| Liveness (later) | Vendor selfie-video (HK$4–8/check) | Only when triggers hit (Business Model §6.3) |

### 7.2 Safety Features

- Trust signals on every profile, identical across plans.
- Hide my photo in chat rooms.
- Scam interstitials: crypto / investment / "download this app" / move-to-Telegram/WhatsApp patterns in notes and DMs → warning screen before sending and on receipt.
- Link lock: no links or contact handles (phone numbers, @handles, emails) in DMs until the two users have attended an event together.
- Share-my-spot: venue, time and attendee count to a trusted contact via share sheet (2h live link).
- Private post-spot safety rating (1–5 + optional flag), never public.
- One-tap report/block everywhere; HK Police Scameter link in the scam report flow.

### 7.3 Moderation (preventive → interactive → reactive)

| Layer | Mechanism |
| --- | --- |
| Preventive | 18+ gate, phone verification, read-only until verified, trust-gated permissions, rate limits (pokes/min, messages/min, OTP 3/h), scam pattern filters |
| Interactive | Host powers in rooms (logged), roll-call, member removal with reason, ~2-week room decay after done |
| Reactive | 3 reports → auto-mute pending review; warn → mute → suspend ladder; audit log; PDPO data requests |

### 7.4 Liveness (later stage)

Trigger-gated: scam reports rising or sign-ups > a few hundred/month. Vendor SDK in mobile; `liveness_state` on users; becomes the gate for poke/join/DM and allows non-HK numbers.

---

## 8. Monetization Implementation

### 8.1 Consumer Plans (entitlement matrix)

| | Free | Plus | Pro |
| --- | --- | --- | --- |
| Web monthly / IAP monthly | HK$0 | 128 / 148 | 198 / 228 |
| 7-day pass (web / IAP) | — | 58 / 68 | 98 / 108 |
| 3-mo, 6-mo (web / IAP) | — | 288, 488 / 328, 558 | 488, 788 / 558, 898 |
| Founding monthly (first 500; web / IAP) | — | 88 / 98 | 148 / 168 |
| Founding annual (web only) | — | 888 | 1,488 |
| Event spots | 3 | 5 | 10 |
| Chat room spots | 5 | 10 | 20 |
| Merchant spots | 10 | 30 | Unlimited |
| Active crews | 3 | 10 | Unlimited |
| Stranger pokes / week (reset Mon 00:00 HKT, no refund) | 5 | 20 | 50 |
| Poke back | Free | Free | Free |
| Post-spot pokes (48h, attendees) | Free | Free | Free |
| Note length | 200 | 200 | 500 |
| Recommended-sort tier value | 0 | 0.6 | 1.0 |
| Advanced keyword filters | Filter pass | Yes | Yes |
| Waitlist | 24h claim | Auto-join 1 venue · 2× | Auto-join 3 · 3× |
| Auto-claim drops (saved venues) | — | 1/wk | 3/wk |
| Hosting capacity | 1→3→5 by Show-up Score | same | same |

Packs (no subscription): 5 pokes HK$38 / 15 pokes HK$88 (IAP 48 / 98); 7-day filter pass HK$18 (IAP 28). Referral pokes per §3.4. Host-reward Pro days (2 per qualifying spot, max 7/month, expire 60 days) — Phase 3.

**Entitlement source of truth:** RevenueCat (IAP) + Stripe Billing (web) → webhooks → `entitlements` service. Highest active plan wins; passes and host-reward days are time-boxed grants; packs and referral pokes are ledger credits. Founding counter = first 500 founding purchases across both channels (atomic counter); founding price locked while the subscription stays active.

### 8.2 Dual-Channel Pricing Rules

1. In-app purchase always offered (RevenueCat) at IAP price points.
2. Web checkout (Stripe) at web prices; founding annual and coupon codes web only.
3. **Never mention web prices inside the app** — no copy, links or hints.
4. Receipt emails state plan, price, renewal date, cancel URL. Instant cancel. No personalised offers.
5. **Apple Small Business Program** enrolled before the first paid release; Google 15% subscription rate applies by default.

### 8.3 Merchant Billing

- **SaaS:** Starter free; Growth HK$388/mo or HK$3,880/yr; Pro HK$888/mo or HK$8,880/yr. Founding (first 50): Growth 288/mo or 2,880/yr, Pro 688/mo or 6,880/yr, for year 1.
- **Per-seat fees** by declared band: 0–50 → $3 · 51–100 → $6 · 101–200 → $12 · 201–500 → $25 · 501–1,000 → $50 · 1,000+ → $80.
- **Billable events:** `drop_seat` (once per user per drop), `group_drop_seat` (per scanned attendee), `new_member_visit` (first 3 high-confidence visits within 60 days of joining). Sponsored drop seats × 1.5. Low-confidence check-ins never billed.
- **Verified seat:** claim/attach first + staff scan of valid rotating QR + GPS overlap + account phone-verified and older than 7 days.
- **Budget cap** per merchant per month; drops pause at cap.
- **Founding programme:** Phase 0 Starter features free; free Growth for 3 months starting at the merchant's first drop go-live (Phase 1); month 1 seats shadow-invoiced (`shadow = true`); from month 2 seats billed; month 4 → Growth at founding rate. Guarantee: < 30 verified seats by end of month 3 → +1 free month (automatic).
- **Monthly invoice** (1st of month, HKT): SaaS + seat lines; Stripe charge on card on file; failure → drops paused immediately, SaaS dunning 7 days → downgrade to Starter.
- **Band v1:** merchant-declared + manual quarterly audit in admin.

---

## 9. Shared Backend Services

| Service | Responsibilities |
| --- | --- |
| **Auth** | GoTrue config (Apple/Google OAuth, email, phone OTP via Twilio, +852 only), JWT verification middleware, DOB gate, phone-verified sync (`phone_verified_at`), one-account-per-phone |
| **User/Profile** | Sketch CRUD, keywords (max 10, max 3 at 8+), prompts, photos (R2 presigned), hide-photo flag, photo visibility resolver (§3.1), socials (revealed at connection) |
| **Venues** | FEHD importer + ALS geocoder, user pins + dedupe, reports, claims, district resolution, viewport queries, check-in activity counts for marker size |
| **Spots** | Event spot state machine, date-on-fill timers, headcount + overbook, waitlist backfill, hosting capacity, templates, chat room spots, cap enforcement (§3.10) |
| **Applications** | Queue per spot, hard filters, Recommended sort (flag weights), accept/decline + reason, counts |
| **Attendance** | "I'm here" GPS, default-attended at done, roll-call, peer reports (≥2), forgiveness, finalisation job, score events, People-you-met window |
| **Score** | Show-up Score computation, unproven state, 90-day decay, enforcement ladder, host-cancel symmetry |
| **Poke/Connection** | Weekly allowance (lazy Monday reset), pack/referral credits, 7-day expiry (no refund), poke back (free, creates connection), post-spot free pokes, connections, disconnect |
| **Chat** | Event spot rooms, chat rooms, crew chats, DMs over WS; read-only for unverified; link lock; scam filter; room decay; 60-day crew dormancy |
| **Crews** | Spawn on done, keep/leave, rebook with date poll, open seats |
| **Merchant check-in** | User QR tokens (HMAC, 30 s), staff scan verification, GPS overlap, confidence, 1 visit/day, replay protection |
| **Drops / Memberships** | Individual + group drops, claims, capacity, auto-claim, memberships, venue caps + waitlist, ladder config + level computation + inactivity decay, coupons, founding circle, attribution window |
| **Billing** | Stripe + RevenueCat webhooks, entitlements, founding counters, per-seat ledger, invoice builder (shadow flag), founding programme clock + guarantee, budget caps, dunning |
| **Referral** | Codes, attribution on sign-up, reward on verify / first attendance, monthly cap |
| **Notification** | Activity feed, push dispatch (categories, consent, quiet hours, mutes), proximity daily cap, email digests |
| **Moderation** | Reports, auto-mute, action ladder, audit log, scam patterns, PDPO tooling |

---

## 10. Admin Dashboard

- **Auth:** RBAC roles (superadmin, moderator, support, finance); 2FA mandatory.
- **Users:** search (phone/email/id), verification state, DOB check, score, entitlements, safety history, suspend/restore with reason (audited).
- **Moderation queue:** reports triage, auto-muted content, warn/mute/suspend, appeals.
- **Venues:** FEHD import runs (counts, errors, geocode failures queue for manual pin), user-pin reports (wrong pin / duplicate / closed), merge duplicates.
- **Merchants:** claim approvals (BR certificate), founding-programme roster (clock, guarantee status), band audit workspace (quarterly checklist), per-seat ledger, disputes, billing health.
- **Spots:** formation funnel, takedowns.
- **Finance:** MRR by lane, founding-500 and founding-50 counters, seat revenue by event type, reconciliation (Stripe / RevenueCat).
- **Metrics:** Business Model §11 KPIs (rebook rate, formation funnel, attendance, fairness gate, check-ins per venue, conversion, retention). PostHog for deep dives.

---

## 11. Database Schema (PostgreSQL 15 + PostGIS, `meshpoke` database)

### 11.1 Core Tables

```sql
-- Identity
users(id uuid pk = auth.users.id, email, auth_provider, display_name, date_of_birth date,
      phone_e164 unique null, phone_verified_at null,
      liveness_state enum(none,pending,verified) default 'none',
      referral_code unique, referred_by null, created_at, deleted_at null)
  -- CHECK age >= 18 enforced in API at sign-up; no gender column

-- Profile
profiles(user_id pk, industry enum(10), role_oneliner varchar(40), prompts jsonb,
         photos jsonb, hide_photo_in_rooms bool default false, socials jsonb,
         work_badge enum(none,email,linkedin) default 'none')
keywords(id, user_id, keyword citext, level smallint CHECK (level BETWEEN 1 AND 10),
         unique(user_id, keyword))
  -- trigger: max 10 rows per user, max 3 with level >= 8

-- Geography / venues
districts(id, name_en, name_zh, boundary geography(MultiPolygon))       -- HK 18
venues(id, source enum(fehd,user,merchant), fehd_licence_no unique null,
       licence_type null, legal_name null, display_name, category enum(...),
       address_en null, address_zh null, location geography(Point), district_id,
       status enum(active,closed,hidden), created_by null, claimed_by_merchant_id null,
       profile jsonb, pin_tier enum(standard,rich,branded) default 'standard',
       last_imported_at null, created_at)
venue_reports(id, venue_id, reporter_id, kind enum(wrong_pin,closed,duplicate,other),
              details, status, created_at)
saved_venues(user_id, venue_id, created_at, pk(user_id, venue_id))

-- Spots
spots(id, kind enum(event,chat), host_user_id null, host_merchant_id null,
      template enum(11) null, name, required_keywords text[] CHECK (cardinality <= 3),
      min_score numeric null, price_range text null, join_mode enum(open,application),
      district_id, venue_id null, group_drop_id null,
      state enum(forming,confirmed,live,done,dissolved,cancelled) null,  -- event only
      min_headcount, max_headcount, overbook_buffer, date_range tstzrange null,
      starts_at null, ends_at null, confirm_deadline null,
      external_link null, created_at)
spot_members(spot_id, user_id, role enum(host,member,waitlist), state enum(active,left,removed),
             confirm_state enum(pending,confirmed,bailed) null, bailed_at null,
             joined_at, pk(spot_id, user_id))
applications(id, spot_id, user_id, note varchar(500), status enum(pending,accepted,waitlisted,declined,closed),
             decline_reason null, decided_at null, created_at)
attendance(spot_id, user_id, status enum(attended,absent_host,absent_reported,forgiven),
           verified_gps bool default false, im_here_at null, finalized_at null,
           forgiveness_note null, pk(spot_id, user_id))
absence_reports(spot_id, reporter_id, subject_id, created_at, pk(spot_id, reporter_id, subject_id))

-- Trust
score_events(id, user_id, spot_id null, type enum(attended,no_show,late_cancel,forgiven,host_cancel,verified_gps),
             weight numeric, created_at)
showup_scores(user_id pk, score numeric, events_count int, proven_state enum(unproven,proven,top), factors jsonb, updated_at)
hosting_capacity(user_id pk, max_active smallint, updated_at)

-- Pokes / connections
pokes(id, from_user, to_user, note varchar(500), source enum(map,room,people_you_met,profile,inbox),
      spot_id null, cost_type enum(weekly,credit,free_post_spot,free_poke_back),
      status enum(pending,returned,expired), created_at, expires_at)
connections(id, user_a, user_b, created_at, active bool, disconnected_at null, disconnected_by null)
  -- unique(least(user_a,user_b), greatest(user_a,user_b))
poke_balances(user_id pk, weekly_used int, last_reset_at timestamptz, credits int default 0)
referrals(id, referrer_id, referee_id unique, verified_reward_at null, attended_reward_at null, created_at)

-- Chat
rooms(id, kind enum(event,chat,crew,dm,city), spot_id null, crew_id null, merchant_id null,
      district_id null, decay_at null, created_at)
room_members(room_id, user_id, role enum(host,member,merchant), muted bool, joined_at, left_at null)
messages(id, room_id, user_id, body text, flags jsonb, created_at)

-- Crews
crews(id, origin_spot_id, name, whatsapp_url null, dormant_at null, created_at)
crew_members(crew_id, user_id, joined_at, left_at null)
rebooks(id, crew_id, poll_options jsonb, votes jsonb, new_spot_id null, created_by, created_at)

-- Merchants
merchant_accounts(id, owner_user_id, venue_id, business_reg_cert_key, claim_status enum(pending,approved,rejected),
                  tier enum(starter,growth,pro), founding bool, price_band smallint CHECK (price_band BETWEEN 1 AND 6),
                  band_audited_at null, founding_drops_start_at null, founding_free_until null,
                  monthly_budget_cap int null, stripe_customer_id null, billing_state, created_at)
merchant_staff(merchant_id, user_id, role enum(owner,staff), pk(merchant_id, user_id))
ladder_configs(venue_id pk, template enum(cafe,bar,restaurant,fine_dining,custom), inactivity_days smallint, updated_at)
ladder_levels(id, venue_id, position smallint, name, min_visits int, min_months int,
              discount_pct numeric null, perk_text null, effective_from timestamptz)
memberships(id, venue_id, user_id, kind enum(member,founding_circle), level_position smallint,
            visits_count int, joined_at, last_visit_at null, joined_via_meshpoke bool default true,
            attribution_until timestamptz, attribution_visits_billed smallint default 0,
            status enum(active,released,waitlisted), released_at null)
coupons(id, venue_id, user_id, offer jsonb, expires_at, used_at null)
drops(id, venue_id, kind enum(individual,group), title, offer_text, perk_cost_estimate null,
      capacity int, claimed_count int, min_group_size null, sponsored bool default false,
      starts_at, ends_at, status enum(draft,active,paused,ended), created_at)
drop_claims(id, drop_id, user_id, spot_id null, claimed_at, redeemed_at null, unique(drop_id, user_id))
merchant_checkins(id, venue_id, user_id, scanned_by, context enum(drop,group_drop,member_visit),
                  drop_id null, spot_id null, confidence enum(high,low), gps_distance_m null, created_at)
seat_charges(id, merchant_id, venue_id, checkin_id unique, event_type enum(drop_seat,group_drop_seat,new_member_visit),
             band smallint, base_fee int, multiplier numeric default 1, amount int,
             shadow bool, invoice_id null, disputed_at null, dispute_status null, created_at)

-- Billing / entitlements
subscriptions(id, user_id, channel enum(stripe_web,revenuecat_apple,revenuecat_google),
              product enum(plus_month,pro_month,plus_3m,plus_6m,pro_3m,pro_6m,plus_pass7,pro_pass7,
                           founding_plus_month,founding_pro_month,founding_plus_year,founding_pro_year),
              price_paid int, status, provider_ref, current_period_end, cancelled_at null)
entitlements(user_id pk, plan enum(free,plus,pro), source, expires_at null, updated_at)
grants(id, user_id, kind enum(host_reward_pro,pass7,filter_pass), starts_at, ends_at)
founding_counters(key pk, used int, max int)            -- consumer_500, merchant_50
merchant_subscriptions(id, merchant_id, product, price, status, stripe_ref, current_period_end)
invoices(id, merchant_id, period, saas_amount, seat_amount, shadow_amount, total, status, stripe_invoice_ref, paid_at null)

-- Notifications
activity_items(id, user_id, category enum(social,spots,venue,promo,proximity,system), type, payload jsonb, read_at null, created_at)
notification_prefs(user_id pk, promo_opt_in bool default false, promo_consent_at null,
                   proximity_opt_in bool default false, quiet_hours bool default true, categories jsonb)
merchant_mutes(user_id, merchant_id, created_at, pk(user_id, merchant_id))
proximity_log(user_id, sent_on date, venue_id, pk(user_id, sent_on))
push_tokens(id, user_id, platform, token, updated_at)

-- Safety / moderation
blocks(blocker_id, blocked_id, created_at, pk(blocker_id, blocked_id))
reports(id, reporter_id, target_type, target_id, reason, details, status, created_at)
moderation_actions(id, admin_id, target_user, action, reason, audit jsonb, created_at)
safety_ratings(id, spot_id, rater_id, rated_user_id, rating smallint, flag bool, created_at)
audit_log(id, actor_id, action, target, meta jsonb, created_at)
```

### 11.2 Key Indexes

- GIST on `venues.location`, `districts.boundary`; `venues(district_id, status)`; `venues(fehd_licence_no)`.
- `spots(kind, state, district_id, starts_at)`, `spots(venue_id)`.
- `applications(spot_id, status, created_at)`; `pokes(to_user, status, created_at)`; `pokes(expires_at) where status='pending'`.
- `messages(room_id, created_at desc)`; `merchant_checkins(venue_id, created_at)`; `seat_charges(merchant_id, invoice_id)`.
- `memberships(user_id, status)`, `memberships(venue_id, status)`; `activity_items(user_id, created_at desc)`.

### 11.3 Jobs (pg-boss)

| Job | Schedule |
| --- | --- |
| FEHD import + geocode | Daily 10:00 HKT |
| Poke expiry sweep (7d) | Hourly |
| Spot confirm-deadline (48h dissolve), live/done transitions | Every minute |
| Attendance finalisation (done + 24h) → score events, referral rewards | Every 15 min |
| People-you-met window close (48h) | Hourly |
| Score recompute + 90-day decay | Nightly |
| Room decay (~2 weeks after done), crew dormancy (60d) | Nightly |
| Membership level inactivity decay, release (60d no visit), attribution window expiry | Nightly |
| Founding clock: shadow → live seats (month 2), guarantee check + extension (end of month 3), Growth start (month 4) | Nightly |
| Monthly invoices + Stripe charge | 1st of month 03:00 HKT |
| Dunning | Daily |
| Weekly poke reset | Lazy on read (no job) |

---

## 12. API Specification (REST + WS)

Base: `https://api.meshpoke.com/v1` · Auth: `Authorization: Bearer <GoTrue JWT>` · Errors: RFC 7807 problem+json · Caps: `402` with `{cap, limit}` · Verification required: `403` with `{require: "phone"}`.

### 12.1 Auth & account
```
(GoTrue)  OAuth Apple/Google · email+password · phone OTP (+852)
POST /me/onboard              {date_of_birth, referral_code?}   → 422 if under 18
GET  /me  PATCH /me           sketch, prompts, hide_photo_in_rooms
PUT  /me/keywords             (max 10; max 3 at 8+ → 422)
POST /me/photos               presigned R2 upload   DELETE /me/photos/{i}
GET  /me/score  GET /me/caps  GET /me/entitlements
GET  /me/qr                   rotating QR payload (client refreshes every 30 s)
DELETE /me                    account deletion (soft delete 30 days)
GET  /users/{id}              visibility resolved per §3.1
```

### 12.2 Map & venues
```
GET  /map/viewport?bbox=&filters=      venues + spots in bbox (district-scoped)
GET  /districts  GET /districts/{id}/spots
GET  /venues/search?q=&district=       our venues table only
GET  /venues/{id}
POST /venues                           user-added pin {name, category, lat, lng} → dedupe suggestions
POST /venues/{id}/report               {kind, details}
POST /venues/{id}/save   DELETE /venues/{id}/save
```

### 12.3 Spots, applications, attendance
```
POST /spots                       event or chat spot (cap + capacity checks)
GET  /spots/{id}  GET /spots/{id}/members
POST /spots/{id}/apply {note}  POST /spots/{id}/join  POST /spots/{id}/leave
GET  /spots/{id}/queue?sort=recommended|vibe|score|newest   (host)
POST /applications/{id}/decision {accept|decline|waitlist, reason}
POST /spots/{id}/schedule {starts_at, venue_id, group_drop_id?}   (host; date-on-fill)
POST /spots/{id}/confirm   POST /spots/{id}/bail
POST /spots/{id}/im-here {lat, lng, accuracy_m}
GET  /spots/{id}/roll-call   POST /spots/{id}/roll-call {absent_user_ids[]}   (host, 24h)
POST /spots/{id}/report-absent {user_id}
POST /spots/{id}/forgiveness {note}   POST /spots/{id}/forgiveness/{user_id}/accept (host)
POST /spots/{id}/members/{uid}/remove {reason}
GET  /s/{id}/share                 public OG data (no member data)
```

### 12.4 Pokes, connections, chat
```
GET  /pokes/incoming?sort=recommended|vibe|score|newest
POST /pokes {to, note, source, spot_id?}     (server decides cost: poke back / post-spot / weekly / credit)
GET  /connections   POST /connections/{id}/disconnect
GET  /people-you-met/{spot_id}
WS   /ws   (rooms, crews, DMs; read-only enforcement; link lock; scam flags)
GET  /rooms  GET /rooms/{id}/messages  POST /rooms/{id}/messages  POST /rooms/{id}/join  POST /rooms/{id}/leave
POST /reports  POST /blocks/{user_id}  DELETE /blocks/{user_id}
```

### 12.5 Crews
```
POST /spots/{id}/crew {keep: true|false}
GET  /crews  GET /crews/{id}  POST /crews/{id}/leave  PATCH /crews/{id} {whatsapp_url}
POST /crews/{id}/rebook {poll_options[]}  POST /rebooks/{id}/vote {option}  POST /rebooks/{id}/finalize
```

### 12.6 Drops, memberships, wallet
```
GET  /venues/{id}/drops   POST /drops/{id}/claim
POST /venues/{id}/membership   DELETE /venues/{id}/membership
GET  /me/wallet               memberships (level, progress), coupons, claimed drops
GET  /venues/{id}/ladder
```

### 12.7 Notifications & referrals
```
GET  /me/activity?cursor=   POST /me/activity/read
GET  /me/notification-prefs   PATCH /me/notification-prefs   (promo consent records timestamp)
POST /me/push-tokens
POST /me/location-ping {lat, lng}     (geofence entry → server decides proximity push, max 1/day)
POST /merchants/{id}/mute  DELETE /merchants/{id}/mute
GET  /me/referrals
```

### 12.8 Merchant portal
```
POST /merchant/claim {venue_id, br_cert_upload}   GET /merchant/me
GET  /merchant/dashboard
PATCH /merchant/venue {display_name, location, hours, menu, photos, price_band}
POST /merchant/rooms  PATCH/DELETE /merchant/rooms/{id}
POST /merchant/drops  PATCH /merchant/drops/{id}  POST /merchant/drops/{id}/pause
GET/PUT /merchant/ladder   GET /merchant/ladder/estimate?discount=&band=
GET  /merchant/members?cursor=   GET /merchant/members/export (Pro)
POST /merchant/automations (Pro)
POST /merchant/scan {qr_payload, context?, drop_id?, spot_id?}   → {user_sketch, event_type, billable, confidence}
POST /merchant/staff  DELETE /merchant/staff/{user_id}
GET  /merchant/invoices  GET /merchant/invoices/{id}  POST /merchant/seats/{id}/dispute
POST /merchant/billing/setup-intent   PATCH /merchant/billing {monthly_budget_cap}
POST /merchant/subscription {product}
```

### 12.9 Billing & webhooks
```
POST /webhooks/stripe       (checkout, subscriptions, invoices, payment failures)
POST /webhooks/revenuecat   (IAP purchases, renewals, cancellations, refunds)
POST /billing/checkout {product, coupon?}   → Stripe Checkout URL (web)
GET  /me/subscriptions   POST /billing/portal   → Stripe customer portal
```

### 12.10 Admin (RBAC)
```
/admin/users/*  /admin/reports/*  /admin/moderation/*  /admin/venues/* (imports, reports, merge)
/admin/merchants/* (claims, founding, band-audit, disputes)  /admin/metrics  /admin/finance/*
```

---

## 13. Design System

**Voice:** Direct, warm, Hong Kong. "Connect," never "match." No scarcity manipulation ("only 3 likes left!"). Free actions say so: **"Poke back · Free"**, "Free poke · met at {spot}".

**Palette (dark-first):** Ink `#111318` (bg), Charcoal `#1C1F26` (cards), Cloud `#F5F6F8` (text); Coral `#FF6B6B` (poke CTA, brand), Mint `#4ECDC4` (verified / attended / success), Amber `#FFB84D` (forming / waitlist), Signal Red `#E63946` (report / safety only).

**Typography:** Inter (Latin) + Noto Sans TC (Chinese); scale 12/14/16/20/28/36; tabular numerals for counts.

**Components:** rounded-16 cards, sketch cards (faceless) vs member cards (photo per rules), status pills (forming/confirmed/live/done), trust-signal row, express badge, template icons (11, line-art), level progress bar, QR card with countdown, consent sheets.

**Motif:** the ripple — one-shot ripple on poke CTAs; check-in pulse on venue pins. Nothing loops.

**Light mode:** web supported; mobile dark-first.

## 14. Hong Kong Market Localization

- **Language:** English primary; Traditional Chinese (`zh-HK`) Phase 2 — all strings externalised from day 1.
- **Payments:** HKD only. Stripe (web + merchants; Apple Pay via Stripe) + Apple/Google IAP via RevenueCat. No FPS/Alipay/WeChat Pay at launch.
- **Compliance:** PDPO (privacy policy incl. storage outside HK, data access/correction via `privacy@`, breach response); **18+ only**; ToS with venue-safety disclaimer (MeshPoke is not a booking agent or payment processor); promotional consent records.
- **Districts:** 18 HK districts as first-class objects.
- **Venue data:** FEHD restaurant licences + ALS from data.gov.hk under its terms of use, with attribution; no Google Places storage; no scraping.
- **Merchant prices:** 開台價 conventions (388/888; founding 288/688 year 1).
- **Emergency resources:** HK Police Scameter + 999 guidance on safety pages.
- **App stores:** Apple Small Business Program enrolment; highest available age rating.

## 15. Non-Functional Requirements

| Area | Target |
| --- | --- |
| Map | First interactive frame < 2.5 s on mid-range Android; clustering at 60 fps |
| API latency | **Server time** p95 < 300 ms reads, < 600 ms writes, Recommended sort < 800 ms. End-to-end from HK p95 < 900 ms while the server is outside HK (revisit when an HK/SG region is added) |
| Chat | Message delivery p95 < 800 ms end-to-end from HK; offline queue + resend |
| Merchant scan | Scan → result < 2 s end-to-end |
| Scale | Phase 1: 5k users, 500 DAU, 100 spots/wk on the shared 8 GB box; Phase 4: 100k users, 20k MAU (move to dedicated/regional server) |
| Battery | No background location unless Nearby perks opted in; native geofences only |
| Privacy | Photos private; socials at connection; venue-granular presence with TTL; no raw coordinate history; PDPO export/delete |
| Availability | 99.5% API; graceful degradation: map fails → list view |
| Security | JWT verification, rate limits, signed URLs (10 min), webhook signature checks, admin 2FA, QR HMAC + replay cache, PII encryption at rest for phone numbers |
| Resource limits | Container memory limits so MeshPoke never starves SupremaNode on the shared box |
| Retention | Attendance and check-in events kept for score/billing integrity; expired pokes purged after 90 days; deleted accounts soft-deleted 30 days then anonymised |

## 16. Implementation Phases

| Phase | Timeline | Build scope |
| --- | --- | --- |
| **0. Seed** | Month 0–2 | Monorepo + local stack; schema; auth (DOB, phone); profiles + keywords + photos; venues (FEHD import, user pins, claims); map; chat room spots + city rooms; merchant claim + standing rooms (Starter); landing + waitlist; admin basics (users, claims, reports, venues) |
| **1. Validate** | Month 2–5 | Event spots + date-on-fill + queues (Recommended sort); attendance (I'm here, roll-call, peer reports, forgiveness); Show-up Score; pokes + poke back + post-spot pokes + connections + DMs; crews + rebook; safety kit; activity feed + core pushes; **user QR + merchant scanner; individual + group drops; per-seat ledger; founding clock + shadow invoices; merchant Stripe billing**; consumer billing (Plus + Plus pass + founding monthly/annual; Stripe + RevenueCat); referral pokes; authenticated web; PostHog + Sentry |
| **2. Monetise merchants** | Month 5–8 | Membership ladders (templates + builder), levels + inactivity decay, venue caps + waitlist, new-member attribution billing, coupons, CRM, Growth conversions, band-audit workspace, disputes |
| **3. Scale** | Month 8–12 | Second district; Pro consumer tier + Pro pass; packs + filter pass; host-reward Pro days; sponsored amplification; promo pushes with consent; Nearby perks (geofences, 1/day); Pro merchant automations; finance dashboards |
| **4. Expand** | Year 2 | Annual plans, price-review tooling, liveness vendor (trigger-gated), automated band cross-checks, zh-HK, HK/SG region, multi-city |

**Monorepo layout:** `apps/api` (Fastify), `apps/web` (React: marketing, app, merchant, admin), `apps/mobile` (Flutter), `packages/shared` (Zod schemas, constants: caps, prices, bands, templates, districts, sort weights), `packages/api-client` (generated TS client), `infra/` (docker-compose.dev.yml, Dokploy compose files, seed data, CI).

## 17. Testing Strategy

| Layer | Tooling / approach |
| --- | --- |
| Unit | Vitest (API/web), `flutter test`: Recommended sort (worked example), vibe formula, score computation, poke cost resolution (weekly/credit/free), Monday reset, cap checks, photo resolver matrix, ladder level computation, attribution window, seat fee math, founding clock |
| Integration (API) | Fastify inject + test Postgres (Testcontainers): auth/DOB/phone gating, spot state machine incl. 48h dissolve, attendance finalisation, poke back → connection, merchant scan → seat charge, webhooks with signed fixtures, invoice builder |
| E2E (mobile) | Flutter integration tests: sign-up → verify → host → apply → confirm → I'm here → done → People-you-met → poke back → connect; venue join → My QR → scan (mock) → level progress |
| E2E (web) | Playwright: pricing, Stripe checkout (test mode), host console, merchant claim → drop → scanner → invoice |
| Geo | PostGIS fixtures for 18 districts; GPS overlap boundaries; ALS HK1980 → WGS84 conversion fixtures |
| Safety | Scam pattern fixtures, link lock states, read-only unverified, 3-report auto-mute |
| Load | k6: viewport bursts, WS fan-out, drop claim contention (exactly-once), scan bursts |
| Manual checklist | Photo rules per context, fairness (free acceptance), copy review (no dating language, no in-app web prices), consent screens |

## 18. Launch Readiness Checklist

**Legal/compliance:** ToS + Privacy Policy (PDPO, storage outside HK), 18+ enforcement, venue-safety disclaimer, promotional consent logging, data.gov.hk attribution, Scameter links, data-request tooling, Stripe + RevenueCat verified, BR checks in claim flow.

**Infrastructure:** `meshpoke.com` on Cloudflare; `www` / `api` / `auth` live with TLS; `meshpoke` DB + role on existing Postgres; container memory limits; mailboxes routing; Resend verified; nightly backups with tested restore; Dokploy deploys green; PostHog + Sentry wired.

**App stores:** Apple Small Business Program enrolled; screenshots (map, spot, crew); networking-first description; highest age rating; IAP products configured (Plus 148, Pro 228, passes 68/108, 3-mo/6-mo, founding 98/168, packs 48/98, filter pass 28); privacy manifests; Play Data Safety + background-location declaration (Nearby perks).

**Operational:** founding counters live; FEHD import healthy for launch district; founding merchants onboarded with scanner tested on staff phones; moderation queue staffed; funnels + alerts (formation, attendance, fairness, report rate).

**Product gates (go/no-go):** phone verification < 2 min median; apply → decision < 24h median; merchant scan success > 95% in field test; zero criticals in photo-rule audit; free-tier acceptance within 10% of paid.

## 19. Decision Log

| Date | Decision |
| --- | --- |
| 26 Oct 2026 | Recommended sort additive 0.2/0.5/0.3; tier 0/0.6/1.0; unproven 0.5; vibe neutral 0.5; ties oldest; same for inbox |
| 26 Oct 2026 | Drops + per-seat fees in Phase 1; founding Growth clock starts at drop go-live |
| 26 Oct 2026 | Photo rules: chat rooms on join (opt-out), event spots after done for attendees, full profile on mutual poke |
| 26 Oct 2026 | Founding monthly on web + in-app; founding annual web only |
| 26 Oct 2026 | Monday 00:00 HKT reset; no refund; "Poke back · Free"; no Accept button |
| 26 Oct 2026 | Billable events: drop seat, group drop seat, new-member visits (first 3 in 60 days) |
| 26 Oct 2026 | Caps per room type: event 3/5/10, chat 5/10/20, merchant 10/30/∞, crews 3/10/∞ |
| 26 Oct 2026 | Promo push opt-in, activity feed, per-merchant mute, proximity alerts for joined/saved venues only, max 1/day, Pro merchants |
| 26 Oct 2026 | Venue data: FEHD + ALS + user pins + merchant claims; Google Maps display only; no scraping |
| 26 Oct 2026 | Reuse existing Hetzner 8 GB box; separate DB + own GoTrue |
| 26 Oct 2026 | Attendance default-attended + host roll-call + 2 peer reports + optional GPS; merchant visits via staff scan of user QR |
| 26 Oct 2026 | No gender features; 18+ only; unverified read-only in rooms |
| 26 Oct 2026 | Referral pokes 5 + 5 (on first attendance), cap 10/month; founding annual plans; Apple SBP |
| 26 Oct 2026 | Ladders: visits + tenure, templates + customisation, no discount cap, >20% info note |

---

*PRD v2.1 implements Business_Model.md v6. Any conflict → Business Model wins; fix the PRD.*
