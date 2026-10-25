# MeshPoke Product Requirements Document (PRD) — v2.0

**Status:** Approved for build · **Supersedes:** PRD v1.1 (stale — written against the pre-mesh dating model)
**Business model of record:** `Business_Model.md` v5 (this PRD implements it; pricing tables are copied, not re-derived)
**Positioning:** Networking-first. Not dating, not dinners. "Poke the mesh. Watch your network ripple." — *A live map for meeting people in real life.* (Canto: 「成個城市，就係你嘅人脈。」)

---

## Table of Contents

1. Product Overview
2. Architecture and Tech Stack
3. Core Product Mechanics (shared spec)
4. Map and Location System
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

---

## 1. Product Overview

### 1.1 Product Vision

MeshPoke is a **map-native social mesh**: a live map of Hong Kong where people form real-life groups — dinners, drinks, hikes, tennis, board games, industry minglers — at real venues, check in when they show up, and keep the crew together afterwards.

The unit of value is **the spot**: a forming group anchored to a place. The unit of connection is **the poke**: mutual pokes connect two people, unlocking 1:1 chat and full profiles. The retention loop is **the crew**: the group that says "do it again?" and rebooks in one tap.

We are networking-first. Romance isn't banned; it just isn't the frame. The App Store category is **Social Networking**. All copy says "connect," never "match."

**What we are not:** a dating app (no swipe, no looks-market ranking), a dinner-booking service (dinner is one template among many), a payments platform (MeshPoke never touches guest money), or a feed (no infinite scroll of posts).

### 1.2 Products in Scope

| Product | Platform | Purpose |
| --- | --- | --- |
| MeshPoke app | Flutter (iOS, Android) | The product: map, spots, pokes, crews, drops, memberships, check-in |
| Marketing site + authenticated web | React (Vercel) | Acquisition, pricing, support; lightweight account access (profile, pokes, chat, billing) |
| Merchant portal | React (web) | Venue claim, standing spots, drops, membership CRM, per-seat billing, QR tablet mode |
| Admin dashboard | React (web, RBAC) | Moderation, users, merchants, disputes, metrics |
| Backend API | Node.js (Fastify) + PostgreSQL 15 + PostGIS + Redis | All business logic, one API for all clients |

### 1.3 Target Users

- **Primary:** HK professionals 22–40 (finance, tech, design, media), expats and locals, who want real-life connection without dating-app pressure or WhatsApp-group chaos.
- **Secondary:** students (HKU/CUHK/HKUST clusters), newcomers to HK, hobby groups (hiking = HK's #1 social activity; racket sports validated by TennisGo HK).
- **Merchants:** F&B and activity venues (cafés, bars, restaurants, sports facilities) in one walkable cluster first (Central–Sheung Wan–SoHo).

### 1.4 Success Metrics (from Business Model §11)

- Rebook-the-crew rate (north star: people return for their group)
- Formation health: spots formed → confirmed → checked-in funnel
- Free-tier application acceptance rate (must not decay — queue fairness)
- Verified check-ins per venue per week (merchant value proof)
- Monthly conversion to paid (target 2.5%); merchant retention at month 4 (target ≥60%)

---

## 2. Architecture and Tech Stack

### 2.1 System Architecture

```
┌─────────────┐  ┌──────────────┐  ┌───────────────┐
│ Flutter app │  │ React web    │  │ Merchant      │
│ (iOS/Andr.) │  │ (marketing + │  │ portal (React)│
│             │  │ authed)      │  │               │
└──────┬──────┘  └──────┬───────┘  └──────┬────────┘
       │  HTTPS/WSS     │  HTTPS          │  HTTPS
       └────────┬───────┴─────────────────┘
                ▼
        Nginx / load balancer
                │
   ┌────────────┼─────────────┬──────────────────┐
   ▼            ▼             ▼                  ▼
Auth svc    App API       Admin API         Webhook svc
(JWT/OAuth) (REST + WS)   (RBAC)            (Stripe, RevenueCat,
   │            │             │               Google/Apple)
   └────────────┴─────────────┴──────────────────┘
                │
   ┌────────────┼─────────────┬──────────────┐
   ▼            ▼             ▼              ▼
PostgreSQL   Redis         R2 (media)    External:
15 + PostGIS (cache,       + signed     Twilio (SMS),
            sessions,      URLs         Resend (email),
            pub/sub)                    FCM+APNs (push),
                                        Google Maps/Places,
                                        RevenueCat, Stripe,
                                        PostHog (analytics)
```

### 2.2 Tech Stack Detail

| Layer | Technology | Notes |
| --- | --- | --- |
| Mobile | Flutter 3 (Dart) | Single codebase iOS + Android; `google_maps_flutter` for the map |
| Web | React 18 + TypeScript + Vite + Tailwind 3 | Marketing, authenticated, merchant portal, admin |
| API | Node.js + Fastify (TypeScript) | REST + WebSocket (Socket.io over Redis adapter) |
| DB | PostgreSQL 15 + PostGIS | Districts (18 HK polygons), spot geo queries, geofence checks |
| Cache | Redis 7 | Sessions, presence TTL, pub/sub, rate-limit counters |
| Media | Cloudflare R2 | Profile photos (private, signed URLs), venue images |
| Auth | JWT (15 min) + refresh; OAuth (Apple/Google); email+password fallback | Phone verification via Twilio SMS (+852) gates actions, not login |
| Maps | Google Maps SDK (mobile $0 loads) + one-time Google Places import | See §4; semantic layer is ours (PostGIS), picture is rented |
| Payments | Stripe (web checkout + merchant billing), Apple/Google IAP via RevenueCat | Dual-channel pricing, §8; RevenueCat unifies entitlements |
| Push | FCM + APNs | Spot confirmations, queue decisions, drops, pokes |
| Email | Resend | Receipts, verification, digests |
| SMS | Twilio | +852 phone verification |
| Analytics | PostHog | Funnel, retention, feature flags |
| CI/CD | Codemagic (mobile, incl. iOS builds — no Mac needed), Vercel (web), GitHub Actions (API) | |
| Hosting | Vercel (web), Neon/managed PG (or self-host on Hetzner), Cloudflare CDN | |

**Hybrid web policy (unchanged):** marketing pages public; authenticated web covers profile editing, poke inbox (view + poke back), chat read/reply, subscription management with **web checkout prices**; anything requiring GPS/map/swipe-grade UI (map browsing, spot creation with venue pin, QR check-in, drops redemption) is mobile-only with a clear "open in app" deep link.


---

## 3. Core Product Mechanics (shared spec)

These mechanics are implemented once in the backend and surfaced in both apps. Section numbers reference Business_Model.md v5.

### 3.1 Profile Sketch (faceless by default)

| Field | Spec |
| --- | --- |
| Industry | Dropdown: Finance / Tech / Design / Media / Medical / Legal / Education / Hospitality / Student / Other |
| Role one-liner | 40 chars free text ("FX trader by day, board-game shark by night") |
| Keywords | One set of 10 per user, each self-declared level 1–10; **max 3 at level 8+** |
| Vibe prompts | 3 short answers: "Perfect Friday night…", "Table topic I'll hijack…", "Ask me about…" |
| Gender (v1) | Self-declared, not displayed on sketch; used only for spot gender-rule eligibility (women-only, gender-balanced, host-set male/female caps) |
| Verification badges | HK phone-verified (required for poke/apply/host/DM); optional work-email or LinkedIn industry badge; liveness badge later (§7.4) |

**Photo ladder (unchanged from v1.1, restated):**
1. Map and sketch cards: **faceless** — avatar/initials + sketch fields only. Photos never appear on the map or in application queues.
2. Spot room members: **faces visible after joining** a spot (co-presence context; primary photo only — galleries stay behind mutual poke).
3. Full profile + photos + socials (Instagram/LinkedIn handles): **after mutual poke (connection)** or after a verified mutual check-in at the same spot.
4. Photos are never purchasable, never browseable outside these states, stored privately in R2 with signed URLs.

### 3.2 Discovery (local-scoped, never global)

- Filters: "people here with **tennis ≥ 7**" — apply to map markers, room member lists, sketch cards.
- Vibe match % on spot cards and sketches ("87% — tennis, HKU") — v1 formula: normalized keyword-level overlap weighted by min(level) × shared-count ÷ 10, capped at 99% (calibration knob for ML later).
- Hosts tag spots with ≤3 required keywords; joiners see relevance-ranked spots.
- **No global user search.** Spot search scoped to map viewport or district (HK's 18). No global feeds.
- Default map view = **"This week"** so the map never looks empty at off-peak times; toggles: Today / This week / All upcoming.

### 3.3 Trust Signals (free on every profile, never paywalled)

- Member since ("Joined Oct 2026"), verified check-in count ("12 spots attended"), Show-up Score (or "unproven").
- "Friend of friend" badge (degree 2) on profiles and room member lists — lightweight signal, not a browsable graph.
- No degree-based search; no paywall on degree depth.

### 3.4 The Poke System (replaces swipe)

- A poke = one high-signal outreach: target's sketch + optional note (**200 chars Free/Plus, 500 Pro**).
- **Weekly regenerating allowance to strangers: 5 Free / 20 Plus / 50 Pro** (Monday 00:00 HKT regen; unused do not roll over).
- Unaccepted pokes **expire after 7 days** (refund to sender's allowance on expiry).
- **Receiving, accepting, and connecting are always free and unlimited.**
- **Mutual poke = connection** → 1:1 chat + full profiles + socials. Either side can disconnect any time, silently.
- **Post-spot pokes:** after a spot is done, everyone who verified-checked-in together sees a **"People you met"** list for **48h**; each poke is labelled "Free poke · met at [spot] · 31h left" and bypasses the allowance. Chatroom co-presence does not qualify — only verified check-in.
- **Poke packs (top-up, no subscription):** 5 / HK$38, 15 / HK$88 (web); IAP equivalents §8.
- Scam walls on notes: text-only, links never auto-render, handle-shaped text from no-shared-history senders triggers an interstitial (§7).

### 3.5 Spot Lifecycle (group formation)

States: **`forming → confirmed → live → done`**. On `done`, the spot can spawn a **crew** (§3.7). A spot is a tool for meeting people; dinner is not the product.

**Templates:** Dinner · Drinks · Coffee · Hike · Run · Tennis · Pickleball · Badminton · Board games · Industry mingle · Open sport.

**Creator-admin settings** (creator = any user with hosting rights; hosting capacity earned via Show-up Score: 1 new → 3 proven → 5 top; never purchasable):
- Name, required keywords (≤3), min Show-up Score, price range (**informational only — MeshPoke never handles event payments**), location (**district anchor while forming; venue pin required on confirm** — QR check-in needs a real place), min/max headcount, date range, gender composition: open (default), women-only, gender-balanced, or explicit male/female caps (max_men/max_women).
- Reviews applications as **sketches only** (photo ladder intact: no photo browsing in queues).
- Removals logged and reportable; creator abuse → hosting rights revoked.
- Creator may attach a booking/payment link to their own spot — displayed only, never processed.

**Date-on-fill (anti-shrinkage core):**
1. Spot forms **without a fixed date** (only a date range).
2. When min headcount is reached, **creator pins the date**.
3. All members confirm within **48h** or the spot auto-dissolves.
4. **Overbook buffer:** creator may accept above min to absorb flakes; bail → waitlist backfill.
5. **24h bail grace** before event time; later bails = no-show record.

**Check-in (`live` state):** GPS geofence ~100 m (server-verified) **+ rotating venue QR** = verified check-in. This is the ground truth for Show-up Score, post-spot pokes, per-seat fees, and map prominence.

### 3.6 Show-up Score (money-free anti-flake teeth)

- Inputs: no-show / late-cancel rate, check-in streak, verification rate. Ground truth = verified check-in.
- New users show **"unproven"** — a state, not a penalty.
- Visible to creators on applications; creators may set minimums; **90-day decay**; enforcement ladder for repeat offenders.
- **Flake forgiveness:** member explains within 48h → creator accepts → record voided (private log). No cap in v1.
- **Symmetry:** a creator's own last-minute cancel hits the creator's score + auto-apology to members.
- **No deposits, ever** (no SVF licensing; date-on-fill prevents shrinkage instead of compensating it).

### 3.7 Crews and Rebook (retention loop)

A crew is a separate entity (not a spot state) — the attendees who choose to stay together after a spot.

1. On spot `done`: every attendee sees **"Do it again?" → Keep crew / Leave** (leaving is silent).
2. Keepers get a small **persistent crew chat**.
3. Any member with hosting rights taps **Rebook**: same venue + template + date poll for the crew.
4. Optionally open empty seats to the public (crew spot = public spot with reserved seats).
5. Crew goes **dormant after 60 days** without a rebook.
6. Crews may link a WhatsApp group; date polls, venue perks, check-in streaks, waitlist backfill and rebook stay in-app.

### 3.8 Application Queues and Poke Inbox (sorted, never hidden)

- Application = sketch + Show-up Score + shared keywords, sent to creator.
- **Default sort = "Recommended":** weighted blend of tier boost (Pro > Plus > Free) × vibe match × Show-up Score. Boost is **weighted, never absolute** — a strong free application can outrank a weak paid one. (v1 weights: 0.5 tier + 0.3 vibe + 0.2 score — calibration knob, flag-controlled.)
- Switchable sorts: vibe match / Show-up Score / newest.
- Express badges and total counts always visible; free applications can be below the fold, never off it.
- Creator **accepts/declines with reason** (one-tap presets + free text).
- Applications persist until spot confirms or closes — **no daily reapply**.
- Monitored: free-tier acceptance rate must not decay over time (fairness metric).

### 3.9 Drops, Memberships and Venue Perks (consumer side)

- **Drop** = merchant-published offer ("25 spots, 15% off, ends Friday"): claim → **QR redeem, proximity-gated**; max ~3 active drops per venue per week.
- **Membership** (loyalty, not a subscription): join at a venue; **discount ladder** merchant-configured (e.g. 3 visits → 10% · 5 → 15% · 10 → 20% or free item); visit = QR check-in, GPS-verified, max 1/day; cash ceiling ~15%; ladder decays one step after 60 days idle.
- **Member coupons** unlock when a venue crosses its member threshold (default 50, configurable).
- **Seats kept by activity:** 60 days without check-in → seat auto-released to waitlist (Free: 24h claim window; Plus/Pro: auto-join saved venues at 2×/3× weight).
- **Founding circle** = merchant-assigned VIPs (2–25), never expires.
- Auto-claim drops at saved venues: Plus 1/week, Pro 3/week.

---

## 4. Map and Location System

**Decision (research doc `2026-10-25-bump-map-analysis.md` §7): Google Maps SDK + PostGIS — "own the layer, rent the picture."**

### 4.1 Base Map and Markers

- `google_maps_flutter` renders Google's streets + Traditional Chinese labels ($0 mobile loads; HK/TC POI quality is the best available).
- **Our spots render as custom clustered markers, sized by verified check-in activity only** — never member count, never tier, never fees paid. Pins show activity ("42 check-ins this week"), never member totals.
- Venue pins: standard (Starter) / rich with menu, hours, photos (Growth) / rich + branded (Pro merchant) — **richness only; same ranking rules for everyone**.
- Default view: "This week" (§3.2). Cluster behavior: zoom-out clusters by district; zoom-in shows individual spots + venues.

### 4.2 POI Seed Layer (map is never empty on day 1)

- One-time **Google Places import** for the launch cluster (Central–Sheung Wan–SoHo): store `place_id` + minimal snapshot (name, category, coords, address), refreshed per Google ToS.
- Any user can create a spot anchored to any POI — no merchant permission needed.
- Merchants **claim** venues (free): claim verified with a Hong Kong Business Registration certificate. Claim unlocks profile editing, check-in stats, membership ladder, drops, CRM (paid tools above Starter).

### 4.3 Geo Data Model (PostGIS)

- **Districts:** 18 HK district polygons; spot/venue queries scoped by viewport + district — **never global**.
- Near-me: `ST_DWithin` radius queries for "spots near me" fallback.
- Geofence verification: check-in accepted only when user GPS is within ~100 m of the venue pin (server-side check, client claims never trusted).
- Presence: **venue-granular with TTL** ("12 people at The Pontiac now") — raw coordinates are never stored beyond the check-in verification call, never broadcast, never shown on the map as user dots.

### 4.4 Privacy, Battery and Platform Behavior

- **No home/work detection. No always-on precise location. No ambient signals** (battery/speed/dwell of other users). We are not Zenly.
- Foreground-only location for map + check-in; native geofencing APIs for optional "remind me near saved venues"; background location never required.
- Routing is **delegated via deep links** to Google/Apple Maps — we never build navigation.
- Exit path (documented, not planned): all social meaning lives in our PostGIS; base map is a swappable viewport — MapLibre + self-hosted OSM tiles on R2 if brand styling measurably moves retention, Google pricing shifts, or mainland China expansion becomes real.


---

## 5. Flutter Mobile Application

### 5.1 App Structure

Bottom tab navigation (5 tabs):

| Tab | Contents |
| --- | --- |
| **Map** (default) | Live map home: spot markers sized by verified check-ins, "this week" default view, district banner, filter chips (activity template, date, vibe, keywords, women-only) |
| **Spots** | List/card feed of forming + confirmed + standing spots scoped to current district or map viewport (never global) |
| **Rooms** | Joined spot rooms + crew chats (unread badges); merchant standing rooms if membership/drop claimed |
| **Inbox** | Pokes received (with notes), application updates (accepted/waitlist/declined), system notices |
| **Profile** | Sketch editor, keywords + levels, prompts, photo ladder status, Show-up Score, memberships/wallet, plan + billing, settings |

Global: QR check-in scanner (modal from any tab), notification center, "People you met" (48h post-spot window).

### 5.2 Key User Flows

**Registration & verification:**
1. Sign up: Apple / Google / email — browse-only state until phone verification.
2. Enter +852 number → Twilio SMS code → verified badge. One account per number.
3. Complete sketch: industry (dropdown), role one-liner (40 chars), 10 keywords with levels 1–10 (max 3 at level 8+), 3 vibe prompts. Photos optional now (hidden until ladder reveals).
4. Interests onboarding: pick 3+ keywords to seed discovery. Land on Map.

**Discover & join a spot:**
1. Map → tap marker or Spots tab → spot card (name, template, host sketch, required keywords, headcount state, price range, Show-up minimum).
2. Apply (if application required) → optional 200-char note → status "pending" (queue position + counts visible).
3. Or direct-join (open spots within capacity).
4. Accepted → room unlocked (member faces visible — the room is the community; joining is the reveal) → add to calendar (system calendar intent).

**Host a spot (creator-admin):**
1. "+" on Map or Spots → template (Dinner · Drinks · Coffee · Hike · Run · Tennis · Pickleball · Badminton · Board games · Industry mingle · Open sport) → name, ≤3 required keywords, min Show-up Score, price range (informational), min/max headcount, district anchor (forming) → publish.
2. Review applications: Recommended sort (tier boost × vibe match × score, switchable to score/newest/nearest), accept/decline with reason presets, overbook buffer toggle.
3. Min headcount reached → **date-on-fill**: pin a date → members confirm within 48h or the spot auto-dissolves → confirmed state requires venue pin (search Google Places within district or pick from map).
4. Event day: room pinned → QR check-in opens (host displays rotating QR; or merchant tablet if at a venue) → check-ins verified → spot live → done.

**Check-in (the trust moment):**
1. GPS must be within ~100m of venue (server-verified).
2. Scan rotating QR (regenerates per period; 1 check-in per user per spot per day).
3. Both pass → verified check-in: face photo unlocks in room, Show-up Score accrues, "People you met" list opens for 48h of free pokes, merchant gets a verified seat (if a drop/membership claim).

**Poke → connection:**
1. See someone in a room, on a spot card, or via People-you-met → view sketch → Poke with optional note (200/500 chars).
2. Recipient sees poke in Inbox with sender's trust signals (member since, verified check-ins, Show-up Score). Accept (free, always) → **connection**: 1:1 DM opens, full profiles + photos + socials revealed. Decline/expire silently (7-day expiry, no notification of expiry).

**Crew & rebook:**
1. Spot done → "Keep the crew?" → Keep (members join crew chat) or Leave.
2. Crew chat persists; any crew member can tap **Rebook**: one-tap re-create of the same template/venue with date poll → confirmed date → open seats published to public spots feed or crew-only.
3. Crew goes dormant after 60 days of inactivity (silently archived).

**Claim a drop / use membership:**
1. Rooms tab or Map → drop card ("Free welcome drink, members of Café X") → Claim (capacity-limited, plan limits apply) → QR at venue → verified seat.
2. Membership wallet: venue membership card, tier, ladder progress (X check-ins to next tier), active coupons.

### 5.3 Screen Specifications

| Screen | Key elements |
| --- | --- |
| Map home | Google map, clustered markers (size = verified check-ins, never member count/tier), district banner (e.g. "Central & Western"), filter chips, "this week" toggle, FAB "+ create spot", QR scanner icon |
| Spot detail | Header (template icon + name), host sketch + trust, members (face cards; verified badge on check-in), date state (forming: "needs 2 more" / confirmed: date + venue), required keywords, price range, Apply/Join CTA, gender-rule badges (women-only / gender-balanced / M-F caps) |
| Spot creation | Stepper: template → basics (name, keywords, score min, price, headcount) → district anchor → (post-confirm) venue pin + date |
| Application queue (host view) | Applicant cards sorted Recommended (switchable), accept/decline (+reason presets), counts summary, waitlist section |
| Room (spot chat) | Messages, member rail (faces — revealed on join; verified badge after QR check-in), host-admin tools (remove member — logged, reason; pin message; close room), room decays ~2 weeks after spot done |
| 1:1 chat (connection) | Text-first (photos/links after first verified meet — link lock), report/block inline, disconnect (silent) |
| Inbox | Pokes (note preview + trust signals), application status cards, drop notifications |
| People you met | Post-spot 48h list of co-checked-in members → free poke CTAs |
| Profile (mine) | Sketch, keywords with levels + verified ticks, prompts, Show-up Score + factors, photo ladder state, memberships & coupons, plan/billing |
| Profile (other) | Pre-connection: sketch (+ primary photo if co-members of a room). Post-connection: full — photos, socials (IG/LinkedIn), history (check-in count, crews in common) |
| Venue profile | Merchant page: rich pin content (menu/hours/photos on Growth+), membership offer, ladder, active drops, verified check-in stats, claimed badge |
| Drop feed | District-scoped active drops (claimed state, capacity), "Sponsored" label where amplified |
| Crew view | Members, chat, Rebook CTA + date poll, "invite to next spot" |
| Settings | Phone number, privacy (presence granularity), blocked list, plan management (deep link to web billing or IAP), delete account |

### 5.4 Push Notification Types

| Event | Copy direction |
| --- | --- |
| Spot confirmed (date pinned) | "📅 Your {spot} dinner is ON — confirm by {48h deadline}" |
| Application accepted / waitlisted / declined | One tap through to room / spot |
| Date-confirm reminder (24h before dissolve) | Urgency without guilt ("Confirm now or your spot opens up") |
| New poke | "{name} poked you" — no pressure framing |
| Post-spot window opened | "You met 5 new people — poke them free for 48h" |
| Drop available (saved venue) | Plan-gated auto-claim notices |
| Crew rebook poll | "{crew} is rebooking — vote for Friday" |
| Verification nudges | Phone verify prompts (browse-only reminders, max 2/wk) |

### 5.5 Platform-Specific Requirements

- iOS 15+, Android 8+; permissions: location (when-in-use; background never required), camera (QR), notifications, contacts (optional invite), calendar (optional add).
- QR scanner uses native camera APIs (no bundled scanner lib if platform APIs suffice).
- Deep links: `meshpoke://spot/{id}`, `meshpoke://venue/{id}`, universal links for web→app handoff.
- App Store: Social Networking category; **no dating keywords** in metadata; 17+ rating (user-generated content, unmoderated chat).
- Google Play: same; Data Safety form declares location (precise, in-use), contacts optional.


---

## 6. Web Application

### 6.1 Pages and Routes

| Route | Type | Contents |
| --- | --- | --- |
| `/` | Public | Hero: live-map demo animation (mock), tagline, "Poke the mesh" CTA → app download + waitlist email |
| `/how-it-works` | Public | 3-step story: spots form on the map → check in → keep the crew; anti-dating-app positioning; safety highlights |
| `/pricing` | Public | Consumer tiers + packs + 7-day pass + founding-500 banner; **web prices**; merchant tiers below fold |
| `/safety` | Public | Verification, trust signals, women-only spots, scam defenses, emergency resources |
| `/support/*` | Public | Guide, troubleshooting, security & privacy, safety & reporting (FAQ format) |
| `/about` | Public | Founder story, HK-first manifesto |
| `/venue` → `/venue/claim`, `/venue/pricing` | Public | Merchant landing: claim flow, Growth/Pro value, per-seat fee explainer |
| `/login`, `/signup` | Public | Apple/Google/email → browse-only account |
| `/app/*` | Authenticated | Lightweight account: profile editor, inbox (view/poke back), chats (read/reply), memberships, billing (web checkout), settings |
| `/merchant/*` | Authenticated (merchant) | Portal: dashboard, spots, drops, membership CRM, per-seat ledger, QR tablet mode, billing |
| `/admin/*` | Authenticated (RBAC) | Admin dashboard (see §10) |

### 6.2 Authenticated Web Experience (Mobile-app Complement)

Included: profile/sketch editing (better on big screen), keyword management, poke inbox + poke-back with notes, 1:1 chat read/reply, crew chat read/reply, membership wallet + coupon management, subscription management with **web Stripe checkout** (HK$128/198 etc.), account settings, data export.

Excluded (mobile-only, with "open in app" deep-link cards): map browsing, spot creation/venue pin, QR check-in, GPS verification, drop redemption at venue.

### 6.3 Merchant Portal (Web)

- **Dashboard:** verified check-ins (today/week/month), active spots, drop performance, per-seat fees owed, membership stats.
- **Standing spots:** create/manage always-on rooms (Starter 3 / Growth 10 / Pro unlimited), founding-circle lobby, business-labeled city room (1 per merchant).
- **Drops builder:** discount type (ladder step / one-off coupon), capacity, schedule, optional sponsored amplification (per-seat 1.5× band rate, budget cap, district/day send caps).
- **Membership CRM:** member list (aggregate on Starter, full history + export on Pro), tiers, ladder progress, 60-day inactivity flags, coupon issuing.
- **QR tablet mode:** full-screen rotating QR + live check-in counter (the "front door" experience).
- **Billing:** card on file, monthly invoice (SaaS + per-seat lines with venue + date + drop attribution), shadow invoices during promos, 7-day dispute window, drops pause on payment failure.

---

## 7. Trust, Safety and Moderation

### 7.1 Identity Ladder

| Stage | Unlocked by | Gains |
| --- | --- | --- |
| Browse-only | Any signup | Map, spots, sketches, join/read rooms, post (no links) |
| Phone-verified | +852 SMS code (Twilio), one account per number | Poke, apply/join spots, host, DM, post links (after first verified meet for link lock lift) |
| Joined a spot | Room membership (co-presence context) | Primary photo (face) visible to room members |
| Check-in verified | GPS ~100m + rotating QR | Verified badge, score accrual, People-you-met, drops redemption |
| Connected | Mutual poke | Full profile, photos, socials, 1:1 DM |
| Liveness (later) | Vendor selfie-video (HK$4–8/check) | Only when triggers hit: rising scam reports OR signups > few hundred/mo (Business Model §6.3) |

Optional badges: work-email / LinkedIn industry badge (networking credibility, not identity).

### 7.2 Safety Features (from Business Model §6.2)

- **Trust signals on every profile:** member-since, verified check-in count, Show-up Score (or "unproven") — identical on all plans, never purchasable.
- **Scam interstitials:** crypto/investment/"download this app"/move-to-Telegram patterns in DMs trigger warning screen.
- **Link lock:** no links or contact handles in DMs before a first verified meet.
- **Gender-composition spots:** women-only, gender-balanced, or host-set male/female caps.
- **Share-my-spot:** venue, time, attendee count to a trusted contact (live 2h window).
- **Private post-spot safety rating:** feeds score enforcement, never public.
- **One-tap report/block** everywhere; HK Police Scameter link in scam-report flow.

### 7.3 Moderation (preventive → interactive → reactive)

| Layer | Mechanism |
| --- | --- |
| Preventive | Phone verification (identity cost), trust-gated permissions (unproven: no links/images/handles), rate limits, scam pattern filters |
| Interactive | Host-admin powers in rooms (logged + reportable), member removal with reason, gender-composition spots, ~2-week room decay |
| Reactive | 3 reports → auto-mute pending review; warn → mute → suspend ladder wired to Show-up Score; full audit log; PDPO-compliant data requests |

**Gender-rule enforcement v1:** self-declared gender at registration (no document check at launch; enforcement improves with liveness stage). Gender is never displayed on profiles; used only for spot gender-rule eligibility.

---

## 8. Monetization Implementation

### 8.1 Consumer Plans (entitlement matrix)

| | Free | Plus | Pro |
| --- | --- | --- | --- |
| Web monthly / IAP monthly | HK$0 | 128 / 148 | 198 / 228 |
| 7-day pass (web/IAP) | — | 58 / 68 | 98 / 108 |
| 3-mo, 6-mo (web) | — | 288, 488 | 488, 788 |
| Founding (first 500, locked while continuously subscribed) | — | 88 | 148 |
| Rooms | 5 | 10 | 20 |
| Active RSVPs | 3 | 5 | 10 |
| Stranger pokes/week (regen; expire 7d unaccepted) | 5 | 20 | 50 |
| Post-spot pokes (48h, verified co-check-ins) | Free | Free | Free |
| Note length | 200 | 200 | 500 |
| Inbox/queue position | Recommended baseline | Boost + express badge | Larger boost + express |
| Waitlist | 24h claim | Auto-join 1 venue · 2× | Auto-join 3 · 3× |
| Auto-claim drops (saved venues) | — | 1/wk | 3/wk |
| Hosting capacity | 1→3→5 by Show-up Score, never by tier | same | same |

Packs (no subscription): 5 pokes HK$38 / 15 pokes HK$88 (IAP 48/98); 7-day keyword filter pass HK$18.

**Entitlement source of truth:** RevenueCat (IAP) + Stripe Billing (web) → webhook sync → backend `entitlements` service. One plan active per user; highest wins on overlaps; packs are ledger debits not entitlements.

### 8.2 Dual-Channel Pricing Rules (App Store guideline 3.1.3(b))

1. In-app purchase always offered (Apple/Google IAP via RevenueCat) at IAP price points (148/228 etc.).
2. Web checkout (Stripe) at lower web prices (128/198 etc.).
3. **Never mention web prices inside the app** — no "cheaper on web" copy, links, or hints; violations risk rejection.
4. Receipt emails state plan, price, renewal date, cancel URL. Instant cancel. No personalized offers, ever.

### 8.3 Merchant Billing

- SaaS: Starter free; Growth 388/mo (3,880/yr); Pro 888/mo (8,880/yr); founding 288/688 year 1.
- Per-seat drop fees: bands (0–50→$3 · 51–100→$6 · 101–200→$12 · 201–500→$25 · 501–1k→$50 · 1k+→$80 per verified seat); sponsored amplification = 1.5× band rate per verified seat, no flat fee; sends capped per district/day.
- Verified seat definition: drop claimed + GPS+QR verified + account age >7 days.
- Monthly invoice: SaaS + per-seat line items (venue, date, drop attribution). Shadow invoices during promo (shown, waived). Card on file; failure → drops pause, SaaS dunning 7 days.
- Band selection v1: merchant-declared price band + manual quarterly audit (vs OpenRice/Google menus); automated spend-survey cross-check later.

---

## 9. Shared Backend Services

| Service | Responsibilities |
| --- | --- |
| **Auth** | OAuth (Apple/Google), email+password, JWT issue/refresh, device sessions, phone verification state machine (send/verify/retry/rate-limit) |
| **User/Profile** | Sketch CRUD, keywords + levels (max 10, max 3 at 8+), prompts, photos (R2 signed), photo-ladder visibility resolution, socials (revealed at connection) |
| **Map/Places** | POI seed (one-time Google Places import, `place_id` binding + minimal snapshot), venue search proxy, district resolution (PostGIS point-in-polygon), viewport-scoped spot queries (never global) |
| **Spots** | State machine forming→confirmed→live→done (+cancelled/dissolved), date-on-fill timer (48h confirm window), headcount + overbook buffer, waitlist backfill, hosting-capacity checks (trust ladder 1/3/5), templates |
| **Applications** | Queue per spot, Recommended sort (weights v1: 0.5 tier-boost × 0.3 vibe-match × 0.2 score), accept/decline+reason, express badges, counts |
| **Check-in** | GPS geofence (~100m server-verified) + rotating QR validation, 1/user/spot/day, verified-check-in events → room face unlock, score feed, People-you-met (48h), merchant seat ledger |
| **Score** | Show-up Score computation (no-show/late-cancel rate, check-in streak, verification rate), 90-day decay, unproven state, flake-forgiveness flow (48h explain → host accepts → void, private log), host-cancellation symmetry + auto-apology, enforcement ladder |
| **Poke/Connection** | Weekly regen allocation (5/20/50 + packs), 7-day expiry, notes (200/500), post-spot free pokes (48h), connection = mutual → chat + profile unlock, socials reveal |
| **Chat** | Spot rooms (WS), crew chats, 1:1 DMs; sketch-only visibility pre-check-in; link-lock enforcement; ~2wk spot-room decay; 60d crew dormancy |
| **Crews** | Spawn on spot done (Keep/Leave), member list, rebook (template+venue clone, date poll), public open-seats publishing |
| **Drops/Membership** | Drop CRUD + capacity + claim state, membership tiers (founding circle 2–25 + paid cap 25/100/∞), ladder steps, 60-day inactivity release, coupons, per-seat fee ledger + verified-seat attribution |
| **Billing** | Stripe webhooks (consumer web + merchants + card-on-file dunning), RevenueCat webhooks (IAP), entitlement merge, invoice builder (SaaS + per-seat + shadow), founding-500 lock, disputes pass-through |
| **Notification** | FCM/APNs dispatch, digest rules (quiet hours 23:00–08:00 HKT), deep links |
| **Moderation** | Reports (3→auto-mute), action ladder, audit log, Scameter links, PDPO tooling (data access requests) |

---

## 10. Admin Dashboard

- **Auth:** RBAC roles (superadmin, moderator, support, finance). 2FA mandatory.
- **Users:** search (phone/email/user id), verify state, score, entitlements, safety history, suspend/restore with reason (audited).
- **Moderation queue:** reports triage, auto-muted content review, warn/mute/suspend actions, appeal handling.
- **Merchants:** claim approvals (BR certificate check), band audit workspace (quarterly), per-seat ledger review, dispute resolution (7-day window), billing health.
- **Spots:** formation health funnel, spot takedowns (ToS violations).
- **Finance:** MRR by lane, founding-500 counter, founding-merchant counter, per-seat revenue, fee reconciliation (Stripe/RevenueCat/Apple/Google).
- **Metrics:** Business Model §11 KPIs live (rebook rate, formation funnel, queue fairness, verified check-ins/venue/week, conversion, D1/D7/D30 retention).


---

## 11. Database Schema (PostgreSQL 15 + PostGIS)

### 11.1 Core Tables

```sql
-- Identity
users(id, email_hash, auth_provider, display_name, gender_self, birthday(18+ check),
      phone_verified bool, phone_e164 unique, liveness_state enum(none,pending,verified),
      signup_district, created_at, deleted_at)
phone_verifications(id, user_id, phone_e164, code_hash, attempts, expires_at, verified_at)
oauth_accounts(id, user_id, provider, provider_uid)

-- Profile
profiles(id, user_id, industry enum(10), role_oneliner varchar(40),
         prompts jsonb[3], photos jsonb[] private, socials jsonb, photo_ladder_state)
keywords(id, user_id, keyword, level smallint CHECK(level BETWEEN 1 AND 10))
  -- constraint: max 10 rows/user, max 3 with level >= 8

-- Places / map
poi_places(id, google_place_id unique, name, snapshot jsonb, location geography(Point),
           district_id, imported_at)
districts(id, name_en, name_zh, boundary geography(Polygon))  -- HK 18
venues(id, poi_place_id, claimed bool, merchant_id, profile jsonb, pin_tier enum(standard,rich,branded))

-- Spots
spots(id, host_id, template enum(11), name, required_keywords text[<=3],
      min_score numeric, price_range text,        -- informational
      district_id, venue_id NULL,                  -- venue pinned at confirm
      state enum(forming,confirmed,live,done,cancelled,dissolved),
      min_headcount, max_headcount, overbook_buffer,
      event_date, confirm_deadline,                -- date-on-fill
      gender_rule enum(open, women_only, balanced, capped), max_men smallint NULL, max_women smallint NULL, created_at)
spot_members(id, spot_id, user_id, role enum(host,member,waitlist), joined_at, state,
             confirm_state enum(pending,confirmed,bailed), bail_at)
applications(id, spot_id, user_id, note varchar(500), status enum(pending,accepted,waitlisted,declined),
             decline_reason, decided_at, sort_debug jsonb)
checkins(id, spot_id, venue_id, user_id, gps_ok bool, qr_token, verified bool, checked_at)
  -- unique(user_id, spot_id, date), GPS ~100m server-verified

-- Trust
score_events(id, user_id, type enum(no_show,late_cancel,checkin,verified,forgiven,host_cancel,...),
             weight, meta jsonb, created_at)
showup_scores(user_id pk, score numeric, factors jsonb, proven_state enum(unproven,proven,top),
              updated_at)                          -- 90-day decay job
hosting_capacity(user_id pk, current enum(1,3,5), earned_at)

-- Pokes / connections
pokes(id, from_user, to_user, note varchar(500), source enum(map,room,people_you_met,profile),
      spot_id NULL, created_at, expires_at +7d, status enum(pending,accepted,declined,expired))
connections(id, user_a, user_b, created_at, active bool)   -- mutual poke; unique pair
poke_ledger(user_id pk, weekly_regen_cap, current_balance, last_regen_at,
            post_spot_free_until, packs jsonb)

-- Chat
rooms(id, type enum(spot,crew,merchant_standing,city), spot_id NULL, crew_id NULL,
      merchant_id NULL, visibility, decay_at, created_at)
messages(id, room_id, user_id, body text, attachments jsonb, created_at)
room_members(room_id, user_id, role enum(host,member,merchant), muted bool, joined_at, left_at)

-- Crews
crews(id, origin_spot_id, name, dormant_at NULL, created_at)
crew_members(crew_id, user_id, joined_at, left_at)
rebooks(id, crew_id, template, venue_id, poll jsonb, new_spot_id, created_by)

-- Merchants
merchant_accounts(id, user_id owner, venue_id, business_reg_cert, tier enum(starter,growth,pro),
                  founding bool, billing_state, price_band smallint, band_audited_at)
memberships(id, venue_id, user_id, kind enum(founding_circle,paid), tier smallint, joined_at,
            last_activity_at, released_at NULL)    -- cap 25/100/∞; 60d release job
ladder_steps(id, venue_id, step smallint, checkins_required, discount_pct, perk text)
drops(id, venue_id, type enum(ladder,coupon), offer jsonb, capacity, claimed_count,
      starts_at, ends_at, sponsored bool, budget_cap, status)
drop_claims(id, drop_id, user_id, claimed_at, redeemed_at, verified_seat bool)
coupons(id, venue_id, user_id, offer jsonb, expires_at, used_at)
per_seat_ledger(id, venue_id, drop_id NULL, spot_id NULL, user_id, seat_fee, band,
                verified_at, invoice_id NULL, disputed_at NULL)

-- Billing / entitlements
subscriptions(id, user_id, channel enum(stripe_web,revenuecat_apple,revenuecat_google),
              plan enum(plus,pro,pass7,none), price_paid, currency, period,
              founding_locked bool, status, provider_ref, renews_at, cancelled_at)
entitlements(user_id pk, plan enum(free,plus,pro), features jsonb, source, updated_at)
invoices(id, merchant_id, period, saas_amount, per_seat_amount, shadow bool,
         paid_at, stripe_invoice_ref)

-- Safety / moderation
reports(id, reporter_id, target_type, target_id, reason enum, details, status, created_at)
moderation_actions(id, admin_id, target_user, action enum(warn,mute,suspend,restore,remove_content),
                   reason, audit jsonb, created_at)
safety_ratings(id, spot_id, rater_id, rated_user_id, rating, created_at)  -- private
```

### 11.2 Indexes (key)

- `spots(state, district_id, event_date)`, `spots(venue_id)`, PostGIS GIST on `venues.location`, `poi_places.location`, `districts.boundary`
- `applications(spot_id, status, created_at)`, `spot_members(spot_id, user_id)` unique
- `pokes(to_user, status, created_at)`, `pokes(expires_at)` for expiry sweep
- `messages(room_id, created_at DESC)`, `per_seat_ledger(venue_id, invoice_id)`, `drop_claims(drop_id, user_id)` unique
- `subscriptions(user_id, status)`, `entitlements(user_id)` pk
- `showup_scores(proven_state)` for host minimums checks

### 11.3 Jobs

- Weekly poke regen (Sun 00:00 HKT); poke expiry sweep (7d); People-you-met closer (48h)
- Spot confirm-deadline sweep (48h dissolve); waitlist backfill on bail (24h grace)
- Room decay (~2wk after done); crew dormancy (60d); membership release (60d inactivity)
- Score 90-day decay; score recompute on events
- Monthly invoice build (SaaS + per-seat); dunning (card fail → 7d → SaaS pause); shadow-invoice flag
- QR token rotation (per period, per venue/spot)

---

## 12. API Specification (REST + WS)

Base: `https://api.meshpoke.hk/v1` · Auth: `Authorization: Bearer <JWT>` · Errors: RFC 7807 problem+json

### 12.1 Authentication
```
POST /auth/oauth/{apple|google}        POST /auth/email/signup   POST /auth/login
POST /auth/refresh                     POST /auth/logout
POST /auth/phone/request  → Twilio send (rate-limited 3/h)
POST /auth/phone/verify   → verified badge; gates poke/apply/host/DM
```

### 12.2 Users & Profile
```
GET/PATCH /me                (sketch, prompts)
PUT   /me/keywords           (max 10; max 3 at level 8+ → 422 with reason)
POST  /me/photos             (R2 presigned; private by default)
GET   /me/score              GET /me/capacity           POST /me/socials-verify
GET   /users/{id}/sketch     GET /users/{id}/full       (403 until connected)
GET   /users/{id}            (visibility resolved by photo ladder)
```

### 12.3 Map, Districts, Venues
```
GET /map/viewport?bbox=...&filters=   (spots+venues in bbox; hard cap 18 districts, no global)
GET /districts                        GET /districts/{id}/spots?state=forming|confirmed&week=...
GET /venues/search?q=                 (Google Places proxy, district-scoped)
GET /venues/{id}                      POST /venues/{id}/claim   (merchant flow)
```

### 12.4 Spots & Applications
```
POST /spots                 (template, name, keywords<=3, min_score, price_range, district,
                             headcounts, gender_rule + caps; capacity check → 402/403)
GET  /spots/{id}            GET /spots/{id}/members  (sketches; faces post-check-in)
POST /spots/{id}/apply      {note}   → queue (Recommended sort server-side)
POST /spots/{id}/join       (open spots)
POST /spots/{id}/date       (host; date-on-fill → confirm window 48h)
POST /spots/{id}/confirm    (member confirm; auto-dissolve on deadline)
POST /spots/{id}/venue      (host; pins venue at confirm)
POST /spots/{id}/members/{uid}/remove   (host; reason → audit log)
POST /spots/{id}/checkin/scan           (qr_token → GPS verify → verified check-in)
GET  /spots/{id}/queue      (host: Recommended + switchable sorts, counts)
POST /applications/{id}/decision        (accept/decline+reason; waitlist)
```

### 12.5 Pokes, Connections, Chat
```
GET  /pokes/incoming        POST /pokes {to, note, source}
POST /pokes/{id}/accept     (free, always)  → connection created
GET  /people-you-met/{spot_id}             (48h free-poke window)
WS   /ws/chat               (rooms: spot/crew/merchant; DMs post-connection; link-lock enforced server-side)
GET  /rooms   GET /rooms/{id}/messages     POST /rooms/{id}/messages
POST /rooms/{id}/report     POST /rooms/{id}/leave
```

### 12.6 Crews
```
POST /spots/{id}/done/keep-crew          GET  /crews  GET /crews/{id}
POST /crews/{id}/rebook                  {template, venue_id, poll_dates[]}
POST /crews/{id}/rebook/{id}/vote        POST /crews/{id}/leave
```

### 12.7 Drops & Memberships
```
GET  /drops?district=     POST /drops/{id}/claim     POST /drops/{id}/redeem (QR at venue)
GET  /me/memberships      GET /venues/{id}/membership/ladder
GET  /me/wallet/coupons
```

### 12.8 Merchant (portal)
```
POST /merchant/claim      {venue_id, BR cert}      GET  /merchant/dashboard
POST /merchant/standing-spots   POST /merchant/drops   POST /merchant/ladder
GET  /merchant/members  (aggregate|full by tier)   GET  /merchant/per-seat-ledger
POST /merchant/qr-session        (tablet mode rotating QR)
GET  /merchant/invoices         POST /merchant/invoices/{id}/dispute
```

### 12.9 Billing & Webhooks
```
POST /webhooks/stripe        (checkout, subscriptions, invoices, dunning)
POST /webhooks/revenuecat    (IAP receipts, renewals, cancellations)
GET  /me/subscriptions       POST /me/subscriptions/cancel
POST /me/packs               (pokes 5/15, filter pass; IAP via app or web Stripe)
```

### 12.10 Admin (RBAC)
```
GET/POST /admin/users/*    GET/POST /admin/reports/*   GET/POST /admin/moderation/*
GET/POST /admin/merchants/claims   POST /admin/merchants/band-audit
GET /admin/metrics          GET /admin/finance/*
```


---

## 13. Design System

**Voice:** Direct, warm, Hong Kong. "Connect," never "match." No dating-app tropes, no gamified scarcity copy ("only 3 likes left!").

**Palette (dark-first):**
- Base: Ink `#111318` (app bg), Charcoal `#1C1F26` (cards), Cloud `#F5F6F8` (text)
- Accent: Coral `#FF6B6B` (poke CTA, brand), Secondary: Mint `#4ECDC4` (verified check-ins, success), Amber `#FFB84D` (forming/waitlist states), Signal Red `#E63946` (report/safety only)
- Map markers: our spots = Coral clusters sized by verified check-ins; venues = neutral pins (rich/branded content on Growth+)

**Typography:** Inter (Latin) + Noto Sans TC (Chinese) / SF Pro on iOS fallback. Scale 12/14/16/20/28/36. Numeric tabular for counts (headcount, queue positions).

**Components:** rounded-16 cards, 2px strokes, sketch cards (faceless) vs member cards (post-check-in faces), status pills (forming/confirmed/live/done), trust-signal rows (member-since · check-ins · score), express badge (Plus/Pro queue/inbox), template icons (11 templates, single line-art set).

**Motif:** the ripple — poke CTAs emit a subtle one-shot ripple animation; map check-in pulses. Used sparingly (motion budget: nothing loops).

**Light mode:** supported on web; mobile dark-first.

## 14. Hong Kong Market Localization

- **Language:** English primary; Traditional Chinese (HK) Phase 2 — all strings externalized from day 1 (`zh-HK` locale, Cantonese-friendly register, not mainland phrasing).
- **Payments:** HKD only at launch. Stripe (web checkout, merchant billing; Apple Pay via Stripe) + Apple/Google IAP via RevenueCat. No FPS/Alipay/WeChat Pay (per-seat fees are B2B card-on-file; consumer extras are IAP/web).
- **Compliance:** PDPO (privacy policy, data access/rectification requests, breach response), no sensitive data processing, 18+ rating, Terms of Service with venue-safety disclaimer (users attend at own risk; MeshPoke is not a booking agent or payment processor).
- **Districts:** the 18 HK districts ship as first-class objects (district anchors, scoping, filters) — never "city-wide" anything.
- **Merchant prices:** 開台價 conventions (388/888; founding 288/688 year 1).
- **Emergency resources:** safety pages link HK Police Scameter + 999 guidance.
- **Map data:** Google Places/Maps ToS respected — place_id binding + minimal snapshot, refresh policy documented.

## 15. Non-Functional Requirements

| Area | Target |
| --- | --- |
| Map interactivity | First interactive frame < 2.5s on mid-range Android; marker clustering smooth at 60fps |
| API latency | p95 < 300ms reads, < 600ms writes; queue/Recommended sort p95 < 800ms |
| Chat | Message delivery p95 < 500ms (WS); offline queue + resend |
| Check-in | GPS + QR verify round-trip < 2s; works on venue Wi-Fi (no GPS fallback indoors: QR is the source of truth, GPS is the anti-fraud gate) |
| Scale targets | Phase 1: 5k users, 500 DAU, 100 spots/wk; Phase 4: 100k users, 20k MAU — PostGIS + Redis horizontal paths documented |
| Battery | No background location ever; map use only when app foreground; geofencing native events only |
| Privacy | Photos private-by-default; socials at connection; presence venue-granular TTL; no raw coordinate history; PDPO export/delete |
| Availability | 99.9% API; 99.5% chat (WS); graceful degradation: map fails → list view |
| Security | JWT rotation, refresh reuse detection, rate limits (phone 3/h, pokes/min, messages/min), R2 signed URLs expiring 10min, webhooks signature-verified, admin 2FA |
| Data retention | Check-in events retained for score integrity; raw QR tokens rotated; pokes/expired content purged on schedule; deleted accounts → 30-day soft delete then anonymize |

## 16. Implementation Phases

Mirrors Business Model §11 (pricing actions) with build order:

| Phase | Timeline | Build scope (this PRD) |
| --- | --- | --- |
| **0. Seed** | Month 0–2 | Landing + waitlist, map home (Google SDK + POI seed import for 1 cluster), sketch profiles + phone verification, founding merchants claimed (free Growth), standing spots + QR tablet mode, basic rooms. Manual everything (founder-led ops). |
| **1. Validate** | Month 2–5 | Spot lifecycle + date-on-fill + queues, check-in (GPS+QR), Show-up Score telemetry, pokes + People-you-met + connections + DMs, crews + rebook, safety kit (reports, link lock, women-only), consumer billing (Plus + 7-day pass; web Stripe + IAP via RevenueCat), PostHog funnels. |
| **2. Monetise merchants** | Month 5–8 | Membership ladder + caps + 60d release, drops + claims + per-seat ledger + shadow-invoice promo, Growth conversions, admin: claim approvals, band-audit workspace, dispute flow. |
| **3. Scale** | Month 8–12 | Second district, Pro consumer tier, poke packs + filter pass, host-reward days, sponsored amplification (budget caps, district/day send caps), admin: finance + metrics dashboards. |
| **4. Expand** | Year 2 | Annual plans, price-review tooling (conversion data), liveness vendor integration (trigger-gated), automated price-band cross-check, multi-city architecture (district-first pays off), MapLibre exit-path evaluation. |

## 17. Testing Strategy

| Layer | Tooling / approach |
| --- | --- |
| Unit | Business-logic services: score computation, queue Recommended sort, poke ledger regen/expiry, capacity checks, band fee math, date-on-fill transitions, ladder progress |
| Integration (API) | Fastify inject + test DB: auth + phone verify state machine, spot state machine (every transition + 48h dissolve), webhook handlers (Stripe/RevenueCat signed fixtures), per-seat ledger attribution |
| E2E (mobile) | Flutter integration tests + a device-farm pass (Codemagic): registration → host → apply → confirm → QR check-in → People-you-met → poke → connect flow |
| E2E (web) | Playwright: pricing page, checkout (Stripe test mode), merchant claim + drop creation + tablet QR |
| Map/geo | PostGIS fixtures for the 18 districts; geofence boundary tests (inside 100m, outside, GPS spoof tolerance = QR gate) |
| Moderation/safety | Fixture-based: scam-pattern interstitials, 3-reports auto-mute, enforcement ladder, link-lock states |
| Load | k6: map viewport bursts (fireworks night), WS chat fan-out, drop claim contention (capacity race — exactly-once claims) |
| Manual UX checklist | Per-release: photo ladder visibility matrix, queue fairness (Free acceptance), copy review (no dating language, no scarcity manipulation) |

## 18. Launch Readiness Checklist

**Legal/compliance:** ToS + Privacy Policy live (PDPO), 18+ enforcement, venue-safety disclaimer, Scameter links, data-request tooling, Stripe/RevenueCat accounts verified, Business Registration checks for merchants (claim flow).

**App stores:** screenshots (map, spot, crew), description (networking-first; no dating keywords), 17+ questionnaire, IAP products configured (148/228, packs 48/98, pass 68), Data Safety / privacy manifests (location in-use, camera, notifications).

**Operational:** founding-500 + founding-merchant counters live, admin moderation queue staffed (founder), QR tablet mode tested on a real venue tablet, on-call for launch cluster, PostHog funnels + alerts (formation funnel, queue fairness, report rate).

**Product gates (go/no-go before public launch):** phone verification flow < 2 min median; spot apply→decision < 24h median; QR check-in success > 95% in field test; zero criticals in photo-ladder visibility audit; free-tier application acceptance within 10% of paid tier (fairness gate).

---

## Founder Decisions (26 Oct 2026 — resolves v2.0 open questions)

1. **Gender composition** — COLLECT self-declared gender at registration (never displayed). Hosts control composition per spot: open (default), women-only, gender-balanced, or explicit male/female caps (max_men/max_women). Enforced in application queue + direct join.
2. **Standing spots on map** — smaller neutral pin clustered into the venue marker; venue marker size driven by verified check-ins only ("earned check-ins" = real verified foot traffic, never member count or merchant tier).
3. **Recommended sort weights** — PENDING final confirmation; v1 stands until then: 0.5 tier-boost × 0.3 vibe-match × 0.2 score (application queue), inbox Pro→Plus→Free.
4. **1:1 chat naming** — "Chat" / "Messages" (never "match").
5. **7-day pass** — both tiers: Plus HK$58/68, Pro HK$98/108 (web/IAP).
6. **Photo reveal** — faces (primary photo only) on room join; galleries + socials only after mutual poke.
7. **Liveness** — trigger-gated and deferred; revisit when scam-report or signup-volume triggers hit.

---

*PRD v2.0 implements Business_Model.md v5. Any conflict → Business Model wins; fix the PRD.*
