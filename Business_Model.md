# MeshPoke Business Model v6

26 Oct 2026 · James

HKD pricing · group formation · Show-up Score · per-seat merchant billing · membership ladders · verification ladder. Supersedes v5; incorporates the 26 Oct 2026 review. **This is the business model of record; PRD v2.1 implements it. Any conflict → this document wins.**

## 1. Pitch line and positioning

**Poke the mesh. Watch your network ripple.**
A live map for meeting people in real life.

**One-line business model:** a map-native social mesh where users pay for reach and comfort, merchants pay for verified foot traffic and retention tools, discovery runs on self-declared keywords — and the map's popularity signal stays activity-based, never pay-to-win.

### 1.1 Positioning: networking-first

MeshPoke is marketed as a **live networking map** — not a dating app, not a dinner-strangers app. Eating out is one venue type among many (drinks, hikes, board games, coffee chats, industry minglers); spots are **tools for meeting people**, not the product. Lower stakes than dating, more real than LinkedIn.

- **Primary:** *Poke the mesh. Watch your network ripple.* — one touch spreads outward: poke → spot → crew → friends-of-friends.
- **Subline:** *A live map for meeting people in real life.*

**Alternates:**
- *Poke in. Mesh up. Network IRL.* (app-store subtitle)
- *Pull one thread. Poke the mesh. Find your network.* (brand storytelling)
- *Poke once, mesh forever.* (social bios)
- *The city is a mesh. Your network is one poke away.*
- *Poke the mesh. Meet the people.*
- *LinkedIn introduced you. We'll get you a table.* (professional jab)

**Visual system:** the ripple is the brand motif — logo mark, a pulse animation when a poke is sent, and venue pins that ripple as check-ins arrive.

**Elevator (app store / investors):** MeshPoke is a live map for meeting people in real life: join a spot by shared vibe — a dinner, a hike, a board-game night, an industry mingle — connect with the ones who click, and one-tap rebook the crew. Networking without the LinkedIn feed; nobody can ever pay to be more visible on the map.

**Pitch pillars:** networking without dating pressure · vibe-first, not looks · live map, not dead feed · any-activity spots · rebook-the-crew compounding · merchants earn prominence through check-ins, never payments · safety by design (group, public, verified, 18+).

| vs | They are | We are |
| --- | --- | --- |
| LinkedIn | a feed of resumes and humblebrags | facetime — your network built in rooms, not comments |
| Timeleft | one curated stranger dinner on Wednesdays | any activity, any night, city-wide — and the crew rebooks |
| Dating apps | high-stakes looks market | zero-pressure mingling; romance isn't banned, it just isn't the frame |
| WhatsApp groups | where crews go to die quietly | the layer WhatsApp can't do: date polls, venue perks, attendance streaks, waitlist backfill, one-tap rebook |

**Practical consequences:** App Store category = **Social Networking** (not Dating). Spot templates: Dinner · Drinks · Coffee · Hike · Run · Tennis · Pickleball · Badminton · Board games · Industry mingle · Open sport — no dinner default. Copy says **"connect"**, never "match". Users who find dates or friends are wins, not violations. **All users are 18+.**

## 2. Revenue architecture

Five lanes; MeshPoke never holds or processes guest or event money.

| Lane | Who pays | What they buy | Role |
| --- | --- | --- | --- |
| **A. Consumer subscription** | Power users, socialites | Reach (pokes, applications), comfort (room caps, RSVPs, crews), convenience (waitlist, auto-claim drops) | Growth + engagement |
| **B. Consumer passes and credits** | Casual and bursty users | 7-day passes, poke packs, filter pass | Low-friction upsell |
| **C. Merchant SaaS** | Restaurants, venues | Membership ladder builder, CRM, check-in tools, drops, coupons, automations | Stable core revenue |
| **D. Per-seat fees** | Merchants | Verified guests MeshPoke delivers: individual drop seats, group drop seats, new-member attribution visits (§7.3) | Foot-traffic revenue; the stage-1 merchant value |
| **E. Sponsored placements** | Merchants, brands | Labelled drop amplification (paid per verified seat at 1.5× band rate, no flat fee), branded pins | Secondary; always labelled |

**Rule:** marker size and map prominence come **only from verified check-in activity** — never from payment. Per-seat fees and sponsored placements buy labelled distribution, never marker size or ranking.

## 3. Discovery layer: keywords and vibe profiles

### 3.1 Profile (sketch — faceless until the photo rules reveal more)

| Field | Detail |
| --- | --- |
| Industry | Dropdown: Finance / Tech / Design / Media / Medical / Legal / Education / Hospitality / Student / Other |
| Role one-liner | 40 chars, free text ("FX trader by day, board-game shark by night") |
| Keywords | One set of 10 per user, each with a self-declared level 1–10; max 3 at level 8+ |
| Vibe prompts | 3 short answers ("Perfect Friday night…", "Table topic I'll hijack…", "Ask me about…") |
| Date of birth | Required at sign-up; **18+ hard gate**; never displayed |
| Verification badges | HK phone-verified (required to poke, join spots, DM, post or host); optional work-email / LinkedIn industry badge; liveness badge added at a later stage (§6.3) |

- Brand line: **"poke by vibe, not looks."**
- Keywords may become **peer-verified** (2+ endorsements, weighted by the endorser's own level). Verified vs self-declared is shown to viewers.
- **The platform never gates anyone by keyword.** Keywords rank and filter; creators may require up to 3 keywords for their own spots.
- **No gender field at launch.** Gender-based spot rules are out of scope until a legal review (§12).

### 3.2 Discovery (local-scoped, never global)

- Map and spot filters: "people here with **tennis ≥ 7**". Filters apply to map markers, room member lists and sketch cards.
- Vibe match % on spot cards and sketches ("87% — tennis, HKU"). When there is no keyword data to compare, vibe = **0.5 (neutral)**, never 0.
- Hosts tag spots; joiners see relevance-ranked spots.
- **No global user search.** Spot search is scoped to the map view or district (HK's 18).
- Default map view = "this week", so the map never looks empty at off-peak times.

### 3.3 Trust layer

- **Trust signals on every profile (free, never paywalled):** member since (e.g. "Joined Oct 2026"), spots attended (e.g. "12 spots attended"), and Show-up Score (or "unproven"). A scammer can fake a profile, but not months of account age plus in-person attendance.
- "Friend of friend" badge (degree 2) on profiles and room members — a lightweight signal, not a browsable graph.
- No degree-based search, no paywall on degree depth.

### 3.4 Why keywords, not a graph

- Every major dating app converged on interest filtering; graphs as *the product* are a graveyard (Shapr, Lunchclub consumer).
- Keywords give the map **relevance without breaking serendipity** — users still discover by proximity; keywords just rank.

### 3.5 Photo reveal rules

Faces are earned by context, never purchased.

| Context | What others see |
| --- | --- |
| Map, spot cards, application queues, poke inbox | Sketch only (no photo) |
| **Chat room spot** (standing / community room) | Primary photo visible to room members once they join — unless the user turns on **"Hide my photo in chat rooms"** (default off) |
| **Event spot** | Sketch only while forming / confirmed / live. **After the event is completed, attendees see each other's primary photo** (only people marked attended — no-shows get no reveal) |
| **Mutual poke (connected)** | Full profile: all photos + socials (Instagram / LinkedIn), from any context |

Photos are stored privately and served only through short-lived signed links.

## 4. Consumer pricing (HKD)

List prices start high (HK$128 Plus, HK$198 Pro) because lowering later reads as a gift while raising reads as a betrayal; the free tier does the job of a trial, and free-user data guides future adjustment.

### 4.1 Subscription tiers (web prices)

| | **Free** | **Plus** | **Pro** |
| --- | --- | --- | --- |
| **Monthly** | HK$0 | **HK$128** | **HK$198** |
| **7-day pass** | — | **HK$58** | **HK$98** |
| **3-month** | — | HK$288 (≈96/mo) | HK$488 (≈163/mo) |
| **6-month** | — | HK$488 (≈81/mo) | HK$788 (≈131/mo) |
| **Founding monthly** (first 500, locked while continuously subscribed) | — | **HK$88/mo** | **HK$148/mo** |
| **Founding annual** (web + in-app, within the founding 500) | — | **HK$888/yr** (≈74/mo) | **HK$1,488/yr** (≈124/mo) |
| Annual (non-founding) | — | Added at density (**HK$948/yr**, ≈79/mo) | Added at density (**HK$1,548/yr**, ≈129/mo) |
| Map, sketches, browsing | Unlimited | Unlimited | Unlimited |
| **Event spots** (active RSVPs; the spot's chat comes with it) | **3** | **5** | **10** |
| **Chat room spots** (standing / community rooms) | **5** | **10** | **20** |
| **Merchant spots** (venue memberships) | **10** | **30** | **Unlimited** |
| **Active crews** (dormant crews don't count) | **3** | **10** | **Unlimited** |
| Pokes / week to strangers (reset Monday 00:00 HKT; unaccepted expire in 7 days, not refunded) | 5 | 20 | 50 |
| **Poke back** (reply to someone who poked you) | **Free, unlimited** | Free | Free |
| Free post-spot pokes (people who attended with you, 48h) | Unlimited | Unlimited | Unlimited |
| Note length | 200 chars | 200 | 500 |
| Poke inbox and application queue | Recommended sort, no boost (§5.5) | +0.12 boost + express badge | +0.20 boost + express badge |
| Advanced keyword filters | — (or HK$18 filter pass) | Yes | Yes |
| Waitlist | 24h claim window | Auto-join 1 saved venue · 2× weight | Auto-join 3 saved venues · 3× weight |
| Auto-claim drops (saved venues) | — | 1/week | 3/week |
| Hosting event spots | 1 → 3 → 5, earned via Show-up Score, never by tier | Same | Same |
| Profile, prompts, photo rules, socials reveal, verification, safety tools | Identical for all tiers — never purchasable | Same | Same |

- The **Plus 7-day pass** gives full Plus for 7 days at ~45% of monthly (the same ratio as Bumble's weekly plans), capturing bursty intent — new job, new to HK, a free weekend — and nudging regulars to monthly. The **Pro 7-day pass (HK$98)** mirrors it for high-intent weeks.
- Founding pricing applies from each tier's own launch: Plus from Phase 1, Pro from Phase 3 (§11).
- Each room type has its own cap so one never blocks another; the upgrade pressure comes from event spots, chat rooms, pokes and auto-claim drops. **Merchant-spot caps are deliberately generous** because merchants pay for members; memberships with no visit for 60 days auto-release their slot.

### 4.2 À-la-carte packs and referral credits

| Item | Web price | Notes |
| --- | --- | --- |
| 5 pokes | HK$38 | Free-user top-up; deliberately close to the HK$58 pass |
| 15 pokes | HK$88 | Volume discount |
| 7-day keyword filter pass | HK$18 | Plus-level filters for a week |

**Referral pokes (free, no cash cost):**
- **New user** gets **5 pokes** when they phone-verify through a referral link.
- **Referrer** gets **5 pokes** when that friend **attends their first spot** (rewarding attendance, not sign-up, stops fake-account farming).
- **Cap:** 10 rewarded referrals per referrer per month (50 pokes). One reward per verified phone number, ever.

Packs exist for free users in practice — subscriber regen makes them redundant for Plus/Pro. Never double-charge.

### 4.3 Billing channels: web and in-app

Follows the TradingView model: plans can be bought on the MeshPoke website or in the iOS / Android apps, and a subscription bought on either works everywhere after login.

| Plan | Web | In-app (iOS / Android) |
| --- | --- | --- |
| Plus monthly | HK$128 | HK$148 |
| Pro monthly | HK$198 | HK$228 |
| Plus 7-day pass | HK$58 | HK$68 |
| Pro 7-day pass | HK$98 | HK$108 |
| Plus 3-month / 6-month | HK$288 / 488 | HK$328 / 558 |
| Pro 3-month / 6-month | HK$488 / 788 | HK$558 / 898 |
| Founding Plus / Pro monthly | HK$88 / 148 | HK$98 / 168 |
| Founding Plus / Pro annual | HK$888 / 1,488 | HK$1,028 / 1,698 |
| Plus / Pro annual (non-founding, at density) | HK$948 / 1,548 | HK$1,088 / 1,788 |
| 5 / 15 pokes | HK$38 / 88 | HK$48 / 98 |
| 7-day filter pass | HK$18 | HK$28 |

Rules:
- In-app purchase is always offered in the apps (HK is in Apple's in-app-only group); in-app prices are set so the net after store fees ≈ the web net.
- **Founding monthly and annual are sold on both web and in-app**, so the in-app paywall can sell an annual plan (most buyers never visit the website). Coupon codes stay web only.
- **Price ladder rule:** per month, annual < 6-month < 3-month < monthly on every channel, and founding annual < list annual. (The earlier list annual of HK$788 undercut the founding HK$888 — a promise-breaker for the founding 500 — so it was raised to HK$948.)
- **The app never mentions or links to the cheaper web price.** Web pricing is promoted outside the app: website, Instagram, WhatsApp, merchant QR standees.
- Merchant SaaS and per-seat fees are billed on the web only.
- **Enrol in the Apple App Store Small Business Program** (15% commission instead of 30% while under US$1M/yr) before the first paid launch. Google Play charges 15% on subscriptions by default.
- Verify against Apple's current multiplatform guideline (3.1.3(b)) before submission.

**Global payments:** Stripe is the only card processor while HK-only — Hong Kong has no VAT/sales tax, and in-app purchases run through Apple/Google (RevenueCat) regardless. When MeshPoke sells into its first non-HK market, add a merchant-of-record (Polar or Paddle) for those regions only. The entitlements layer is provider-agnostic (webhooks → entitlements service), so this is one more webhook route, not a rewrite.

**Web product scope:** the authenticated web is the desk companion, not just a billing page — spots district list (card view, no map) with apply, RSVP and 48h date confirm; a **host console** (queue review, date pinning, attendance roll-call, spot management); People-you-met and connections; chat; billing; plus public spot share pages (`/s/{id}`, no member data) for WhatsApp virality and SEO. Map browsing, venue pin placement, GPS "I'm here" and drop redemption stay mobile-only.

### 4.4 Free-tier guardrails (the anti-Tinder / anti-CMB stance)

- **We never meter the path to connection.** Browsing is unlimited; poke back is free; post-spot pokes are free for 48 hours. Only pokes to strangers are metered, because they are directed 1:1 outreach.
- Free caps (3 event spots, 5 chat rooms, 10 merchant spots, 3 crews, 5 stranger pokes/week) are playable weekly and scarce enough that Plus feels good.
- No suppression anywhere: free users appear in all inboxes, queues and rankings — **paid = faster, never hidden**.
- No personalised offers, ever. One published price per channel (§10).

## 5. Group formation, Show-up Score and crews

### 5.1 Spot types, states and creator-admin

There are three kinds of spot:

| Type | What it is | Photo rule (§3.5) |
| --- | --- | --- |
| **Event spot** | A one-off group meetup with a date (dinner, hike, tennis…) created by a user or a merchant | Faces after the event, to attendees only |
| **Chat room spot** | An always-on community room (a run club, a board-game regulars room, a merchant's standing room, a city room) | Faces on join (opt-out toggle) |
| **Merchant spot** | A venue's membership — the way users get member discounts and perks | Venue content only |

Event spot states: `forming → confirmed → live → done` (plus `dissolved` / `cancelled`). On `done`, the spot can spawn a **crew** (a separate entity, §5.6). **The spot is a tool for meeting people; dinner is not the product.**

Creator-admin (democratised Timeleft ops):
- Sets name, template, required keywords (≤3), min Show-up Score, price range (**informational only — MeshPoke never handles event payments**), location (district anchor while forming; **venue pin required on confirm**), min/max headcount and date range.
- Can attach a **group drop** offered by the venue (§7.3) when pinning the venue.
- Reviews applications as **sketches only**.
- Removals are logged and reportable; creator abuse → hosting rights revoked (capacity is trust-based: 1 new → 3 proven → 5 top).

### 5.2 Date-on-fill (anti-shrinkage core)

- A spot forms without a date; **when min headcount is reached, the creator pins the date**; all members confirm within a **48h window** or the spot auto-dissolves.
- **Overbook buffer:** creator may accept above min to absorb flakes; bail → waitlist backfill.
- **Graduated bail ladder:** bail >48h out = free · 24–48h out = 0.75 points · <24h out = 0.5 · no-show = 0 (§5.3 table). Every tier is forgiveness-eligible.

### 5.3 Attendance and Show-up Score (money-free anti-flake teeth)

**Attendance for event spots (low friction, no QR):**
- Every confirmed member is **marked attended by default** when the event ends.
- A member is recorded as a **no-show** if the **host marks them absent** in the end-of-event roll-call, **or enough other attendees report them absent** (within 24h): at least 2 and at least ⅓ of the group, so two people can't gang up on a third. A GPS "I'm here" tap overrides peer reports.
- **No roll-call, no unverified credit:** if the host skips roll-call, default-attended members without a GPS tap get no score event from that spot (peer-reported no-shows still count). This stops lazy hosts from inflating everyone's score.
- An optional **"I'm here" GPS tap** during the event gives a verified-attendance badge (GPS accepted when the location's accuracy radius overlaps the venue).
- Disputes go through flake forgiveness (below).

**Merchant check-ins (money involved, QR required):** individual drops, group drops and member visits are verified by the **guest showing a rotating QR in the app and staff scanning it** with the merchant portal on any phone (tablet mode optional). GPS must overlap the venue; if GPS fails but the QR is valid, the check-in is **low-confidence**: it counts for Show-up Score and membership progress but is **never billed**.

**Show-up Score — Reliability 2.0 (Bayesian):**

> **Score = (Σpoints + 3 × 0.5) / (n + 3)** over the **last 20 finalised events within 12 months**, where each finalised outcome contributes its point value and every account starts with a neutral prior (m = 3 pseudo-events at 0.5). A no-show costs the same whether you're new or a veteran — but one bad night never sinks a strong record, and ten clean events don't launder away a habit. The window is counted in events, not days: a three-month holiday no longer resets a Rock member to New.

**Point values (per finalised outcome):**

| Outcome | Points |
|---|---|
| Showed up | **1.0** |
| Bailed 24–48h before | **0.75** |
| Bailed <24h before | **0.5** |
| No-show | **0** |
| Host cancelled (finalised by apology responses) | **0.2–0.8** (silent members excluded; all silent = 0.5) |
| Host ghosted own confirmed spot | **0** + automatic 7-day hosting pause |
| Reschedule proposal rejected | **0.75** (tap, not a crush — spot keeps its time) |

- **Tiers:** **New** (n < 3 — chip only, no percentage shown) · **Reliable** (n ≥ 3, score ≥ 60%) · **Rock** (n ≥ 7, score ≥ 85% — seven perfect events is the minimum that reaches 85%) → hosting capacity 1 → 3 → 5. Earned, never purchasable.
- **Why Bayesian:** the old capped-additive model diluted — 10 shows + 1 no-show ranked the same as 100 shows + 1 no-show. The rate model fixes that: 10+1 ≈ 82%, 100+1 ≈ 98%. The prior m = 3 means a first no-show floors a new user at 37.5% (visible but recoverable in ~3 events) and time-to-Reliable is 7 events, not 23.
- **Enforcement (counts axis — catches bursts that rates miss):** 1 no-show/30d = warning banner; 2 no-shows/30d **or** score <40% (only with n ≥ 3) = 7-day **application cooldown** (open spots still joinable — you can still show up, just not book ahead); 3 no-shows/30d **or** score <30% = 14-day **pause** (no join/apply/host/drops/coupons/new memberships; existing rooms stay readable). Hosts: 2 late host-cancels/30d or one ghost = hosting pause. Self-clearing rolling windows — no admin unban path needed.
- **Flake forgiveness (unchanged):** member explains within 48h → creator accepts → **erased**, not counted (private log only). No cap in v1.
- **Host accountability:** cancel posts an auto-apology; each member taps **It's fine / Not ok** within 72h (silence = neutral, excluded — never counted against the host). Final weight = 0.2 + 0.6 × forgiven share. Hosts can also **reschedule with consent** (>48h out free; ≤48h needs a **majority** of members to accept by start−4h; outvoted members may leave free; if a majority becomes impossible or the deadline passes, the spot keeps its time and the host takes a 0.75 tap — one member can't veto alone) and **hand over the spot** (nominate or broadcast; first accepting member inherits hosting; if nobody takes it before start, the spot dissolves as a host cancel — stepping down is free, abandoning is not).
- **Two ledgers:** Show-up Score = reliability of *physical attendance*. Conduct (Clean/Muted/Suspended chip, no number, 30-day clean reset) = behaviour. One never touches the other. Appeals are **free** (1 per 30d, admin-reviewed) — pay-to-appeal is a dark pattern we will never ship.
- **Recognition (cosmetic, score-neutral):** 🔥 weekly-attendance streak chip; ❤️ hearts 5/day as reactions (flair at 10/50/100 received); 📍 **Venue Regular** badge at 3+ verified visits to one venue in 60d — the merchant flywheel's user-side engine. Rewards pay in privileges (hosting capacity, Rock-first queue sort), never points.
- **No deposits.** Date-on-fill prevents shrinkage instead of compensating it.

**Worked examples (May, member):**

| History | n | Σpts | Score | Chip |
|---|---|---|---|---|
| Fresh account | 0 | — | 50% | New |
| 1 show | 1 | 1.0 | (1+1.5)/4 = **62.5%** | New |
| 3 shows | 3 | 3.0 | (3+1.5)/6 = **75%** | Reliable ✓ |
| 7 shows | 7 | 7.0 | 8.5/10 = **85%** | Rock ✓ |
| …then bails 30h out | 8 | 7.75 | 9.25/11 = **84%** | Reliable (just under Rock's 85%) |
| …then bails 10h out | 9 | 8.25 | 9.75/12 = **81%** | Reliable |
| …then no-shows | 10 | 8.25 | 9.75/13 = **75%** | Reliable, warning banner |
| …explains, host forgives | — | — | erased | back to 81% |
| (dark path) 2nd no-show | 11 | 8.25 | 9.75/14 = **70%** | cooldown 7d |
| 3rd no-show | 12 | 8.25 | 9.75/15 = **65%** | paused 14d |

**Worked examples (Ho, host):** clean ×7 → 8.5/10 = **85% Rock**. Cancels a 6-member spot 10h out; 4 members tap *It's fine*, 1 taps *Not ok*, 1 silent (excluded) → weight 0.2+0.6×(4/5) = 0.68 → 9.18/11 = **83.5%**, Reliable; two more clean hosts → 11.18/13 = **86%**, Rock again. Same cancel with 5/6 forgiving → 0.70 → **83.6%**. If every member stays silent the weight is the neutral 0.5. Ghosts instead → 0-point event, 8.5/11 = **77%** + 7-day hosting pause. Hands over instead of cancelling → stays at **85%**.

### 5.4 Pokes and post-spot pokes

No separate connect or follow feature — everything runs on pokes.
- **Poke** = one high-signal outreach with an optional note. Stranger pokes use the weekly allowance (reset **Monday 00:00 HKT**); unaccepted pokes expire after 7 days and are **not refunded**.
- **Poke back** = the reply. There is no Accept button: the recipient sees **"Poke back · Free"**, which costs nothing and creates the connection. Ignoring a poke is silent.
- **Mutual pokes = connected.** Every CTA on that person's cards and profile then changes **Poke → Message**.
- **People you met:** when an event spot is done, everyone **marked attended** sees a "People you met" list for 48 hours. Each poke button reads **"Free poke · met at [spot] · 31h left"** and does not use the weekly allowance. After 48 hours, poking someone from that spot costs a normal poke. Chat-room co-presence does not qualify.
- **Connections list** (own profile, private): Message; **Disconnect** (confirmation required) is one-way and silent, closes the 1:1 thread for both sides, and does not remove anyone from People-you-met. Reconnect any time via a new mutual poke.

### 5.5 Application queues and poke inbox (sorted, never hidden)

- Application = sketch + Show-up Score + shared keywords, sent to the creator.
- **Hard filters first:** the host's minimum Show-up Score and required keywords decide who appears; the formula only ranks who is left.
- **Default sort = "Recommended":**

  **Recommended = 0.2 · tier + 0.5 · vibe + 0.3 · score** (additive)
  - tier: Free 0, Plus 0.6, Pro 1.0 → paid buys at most +0.2
  - vibe: keyword overlap (0–1); 0.5 when there is no keyword data
  - score: Show-up Score (0–1); **unproven = 0.5**, never 0
  - ties → oldest first

  | Applicant | Tier | Vibe | Score | Math | Recommended |
  | --- | --- | --- | --- | --- | --- |
  | Amy | Free | 0.8 | 0.7 | 0 + 0.40 + 0.21 | **0.61 ← top** |
  | Cara | Plus | 0.6 | unproven → 0.5 | 0.12 + 0.30 + 0.15 | 0.57 |
  | Ben | Pro | 0.1 | 0.4 | 0.20 + 0.05 + 0.12 | 0.37 |

  A free regular outranks a Pro who barely fits: "paid = faster, never hidden" is in the arithmetic.
- **The same formula runs the poke inbox**, with vibe = overlap with the inbox owner's keywords. Absolute Pro → Plus → Free ordering does not exist anywhere.
- Creators and inbox owners can switch to **vibe match, Show-up Score, or newest**.
- Express badges and total counts always visible; a free application can be below the fold, never off it.
- Creators **accept/decline with reason** (one-tap presets + free text).
- Applications persist until the spot confirms or closes — no daily reapply.
- Weights are flag-controlled for calibration. **Launch gate:** free-tier acceptance rate within 10% of paid; monitored continuously (§11).

### 5.6 Crews and rebook

A **crew** is the group of attendees who choose to stay together after a spot — a saved "regulars" group (e.g. the Thursday board-game table) that can rebook in one tap. It is the main retention loop: people come back for *their* group, not for strangers. In the data model a crew is its own entity, created when a spot ends; it is not a spot state.

1. After a spot, every attendee sees **"Do it again?" → Keep crew / Leave**. Leaving is silent.
2. Those who keep become a **crew** with a small persistent chat.
3. Any crew member with hosting rights can tap **Rebook**: same venue and template, with a date poll for the crew.
4. Optionally open empty seats to the public.
5. A crew goes dormant after 60 days with no rebook (dormant crews don't count toward the crew cap).

Crews can link a WhatsApp group, but date polls, venue perks, attendance streaks, waitlist backfill and rebook stay in-app.

### 5.7 Host rewards

- **2 days of Pro per qualifying spot hosted.** Qualifying = **≥4 attendees** (and ≥ min headcount), ≥80% of confirmed members attended, **≥50% of attendees GPS-tapped "I'm here"**, **at least one rating exists** with an average ≥4 stars, and **at least one attendee wasn't already connected to the host**. These gates stop a host and a friend farming free Pro with a pretend two-person spot.
- **Cap: 7 Pro days per month.** Earned days expire after 60 days.
- Optional merchant-funded host perks (e.g. a free drink for the host at the venue) — zero cost to MeshPoke.

## 6. Trust and safety (v1, all tiers, never paywalled)

Hong Kong loses tens of millions of HKD a month to romance and investment scams that start on dating apps, so safety ships in v1 — built from low-cost checks at launch, with paid liveness verification added later.

### 6.1 Sign-up and verification

- **Sign up with email, Sign in with Apple, or Sign in with Google.** These are for login and account recovery only, not trust. (Sign in with Apple is offered whenever Google sign-in is offered on iOS.)
- **Date of birth at sign-up; under-18s cannot create an account.** The app ships with the highest App Store / Play age rating available (verify whether 18+ is offered at submission).
- **HK phone verification (SMS code) is the identity anchor.** HK SIM cards require real-name registration, so a local number is tied to a real identity held by the carrier. Budget ~HK$1 per verification including resends (Twilio SMS via the auth server at launch; test WhatsApp one-time codes later as a cheaper channel).
- **HK (+852) numbers only at launch**; other countries later, once liveness checks are added. +852-only also blocks SMS-pumping fraud.
- **One account per verified number**, so banned users can't simply re-register.

| Without phone verification, users can | Phone verification required before they can |
| --- | --- |
| Browse the map, spots, venues and sketches | Poke anyone (including poke back) |
| Join and **read** chat rooms (read-only) | Post in chat rooms |
| | Apply to or join an event spot |
| | Join a merchant spot (membership) or claim a drop |
| | Send DMs or post links |
| | Host a spot |

### 6.2 Safety features

| Feature | What it does |
| --- | --- |
| Trust signals | Member since, spots attended and Show-up Score on every profile (§3.3) |
| Work-email / LinkedIn industry badge | Optional networking credibility without a résumé feed |
| Hide my photo in chat rooms | Opt-out from face reveal in chat room spots (§3.5) |
| Scam interstitials | Flag crypto, investment, "download this app" and move-to-Telegram patterns in DMs with a warning screen |
| Link lock | No off-platform links or contact handles in DMs before a first attended event together |
| Share-my-spot | Send venue, time and attendee count to a trusted friend |
| Private post-spot safety rating | Feeds trust signals and Show-up Score enforcement; never shown publicly |
| Report flow | One-tap report/block; links to HK Police Scameter for scam checks |
| Rate limits | Poke caps, 7-day expiry, trust-gated permissions for new accounts |

### 6.3 Liveness verification (later stage)

A vendor selfie-video check (with deepfake detection) confirming a real, live person — roughly HK$4–8 per first-time check. Not used at launch to keep costs low; manual pose-selfies are skipped because AI tools can fake them. **Add it when either trigger is hit:** scam reports start rising, or new signups grow past a few hundred a month. It then becomes a badge and the gate for poking, joining spots and DMs, and allows non-HK numbers.

### 6.4 Notifications and promotional consent

- **Activity feed** (bell icon, like Instagram's heart): every alert — pokes, application decisions, date confirmations, crew polls, drops, venue offers — is listed in-app whether or not a push was sent.
- **Promotional pushes** (venue offers, sponsored drops) are sent **only to users who explicitly opt in** via consent language in the app, with an in-app opt-out at any time (Apple guideline 4.5.4). Users can **mute any individual merchant**.
- **Nearby perks (proximity alerts), opt-in:** only for venues the user has **joined or saved**, framed as a user benefit ("Your member perk at Café X is 50 m away"). Requires "Always" location on iOS / background location on Android (subject to store review). **Maximum one proximity alert per user per day across all merchants**; per-merchant mute applies. Offered as a Pro-merchant feature — but never to users who haven't joined or saved that venue.
- Quiet hours 23:00–08:00 HKT for all non-urgent pushes.

## 7. Merchant pricing (HKD)

Merchants come first for foot traffic and stay for retention tools: per-seat fees sell verified new guests, SaaS tiers sell membership and CRM.

### 7.1 SaaS tiers

| | **Starter** | **Growth** | **Pro** |
| --- | --- | --- | --- |
| **Monthly** | Free | **HK$388** (founding 288, first 50, yr 1) | **HK$888** (founding 688, first 50, yr 1) |
| **Annual** | — | HK$3,880 (2 months free) · **founding annual HK$2,880** | HK$8,880 (2 months free) · founding annual HK$6,880 |
| Venue claim + profile + check-in stats | Yes | Yes | Yes |
| Standing chat room spots | 3 | 10 | Unlimited |
| Event spots | Unlimited | Unlimited | Unlimited |
| Founding circle (2–25, never expires) | Yes | Yes | Yes |
| Membership cap (venue side) | 25 | 100 | Unlimited |
| Membership ladder | Templates only, up to 3 levels | Full customisation, up to 5 levels | Full + automations (birthday treats, win-back offers, members-only event invites) |
| Individual drops | 1 active | Up to ~3 active/week | Unlimited, priority |
| Group drops | 1 active | Yes | Yes |
| Per-seat fees (§7.3) | Band rate | Band rate | Band rate |
| Sponsored amplification | — | Per seat at 1.5× band rate | Per seat at 1.5× band rate, priority placement |
| Nearby-perks proximity alerts (§6.4) | — | — | Yes |
| Check-in CRM | Aggregate only | Full history | Full + export |
| Map pin | Standard (activity-ranked) | Rich (menu/hours/photos) | Rich + branded |
| Staff scanner (any phone) / tablet mode | Yes | Yes | Yes, multi-staff |
| Multi-location / POS API | — | — | Yes |
| Support | Community | Email | Priority |

- **Standing spots are community supply, so generous; the paywall is on tools:** caps, ladder customisation, CRM, drops, amplification, automations.
- **Merchants never join user chat rooms.** They operate their own spots, founding-circle lobby and one business-labelled city room, and reach users through drops, offers and amplification.
- Benchmark: HK loyalty/CRM systems typically cost ~HK$1,000–2,100/month plus setup fees, so Growth at HK$388 with no setup fee is a strong wedge.
- No hardware needed: staff scan the guest's rotating QR with the merchant portal on any phone.

### 7.2 Membership and loyalty ladders

**Flywheel:** drops recruit strangers → membership keeps regulars → verified check-ins feed venue map size + CRM → merchant pays SaaS for retention tools → better perks keep members active.

**How membership works:**
- A phone-verified user joins a venue's membership for free from the venue page (counts toward their merchant-spot cap, §4.1).
- Each verified visit (staff QR scan, max once per day) counts toward the venue's ladder.
- The app always shows progress: *"2 more visits and 1 more month to Insider."*
- **Founding circle (social core):** merchant-assigned VIPs (min 2, max 25), never auto-expire.
- No visit for 60 days → the membership is released (slot freed on both sides).
- **Member coupons** unlock once a venue reaches its member threshold (default 50; merchant-configurable). Redeemed at the counter.
- **Marker size and ranking = verified check-in activity only** — never member count, tier or fees paid. Pins show activity ("42 check-ins this week"), never member totals.

**Ladders reward visits *and* time as a member** (example "Café" template):

| Level | Requirement | Example perk |
| --- | --- | --- |
| **Member** | Joined | Welcome perk (free drink on first visit) |
| **Regular** | 3 visits | 5% off |
| **Insider** | 8 visits + member for 3 months | 10% off + priority seating |
| **Inner circle** | 20 visits + member for 6 months | 15% off + members-only events + birthday treat |

- **To keep a level, visit at least once per inactivity period** (merchant sets 30, 60 or 90 days; default 60). Miss it and the member drops **one level**, not back to zero.

**Merchant control (templates + customisation, no discount cap):**
- **Templates:** Café · Bar · Restaurant · Fine dining — each a ready-made ladder.
- **Customisable:** number of levels (2–5), visits and months needed per level, discount and/or perk per level, inactivity period (30/60/90 days), founding-circle perks.
- **No cap on discounts.** When a level exceeds 20%, the portal shows an information note with the estimated cost per visit (*"25% off ≈ HK$20 per visit at your typical spend"*) — informational only; the merchant can publish anyway.
- **Member protection:** if a merchant reduces benefits, current members keep their level and get 30 days' notice before perks shrink; changes apply to future progress only.
- **Waitlist:** when a venue is at its membership cap, new joiners wait; a released slot goes to the waitlist (Free: 24h claim window; Plus/Pro auto-join saved venues with 2×/3× weight).

**Drops (acquisition campaigns):** count + offer + expiry ("25 spots, free coffee with any pastry, ends Friday"); claim → staff scans the guest's QR. **No discount cap.** The portal suggests perk-based offers by default (cheaper for the merchant than percentages) and shows the estimated cost per guest — offer cost plus per-seat fee — before publishing.

### 7.3 Per-seat fees (pay only for verified guests MeshPoke delivers)

Every billable event is one **verified seat**, charged at the venue's price band (~8% of typical per-person spend, as a fixed fee), so a café and a fine-dining room both pay a fair share without MeshPoke ever seeing a bill.

| Spend per person (HK$) | Fee per verified seat (HK$) | Example: table of 4 |
| --- | --- | --- |
| 0–50 | 3 | HK$12 |
| 51–100 | 6 | HK$24 |
| 101–200 | 12 | HK$48 |
| 201–500 | 25 | HK$100 |
| 501–1,000 | 50 | HK$200 |
| 1,000+ | 80 | HK$320 |

**Three billable events:**

| Event | What it is | Charged |
| --- | --- | --- |
| **1. Individual drop seat** | Merchant posts an offer; a user claims it, visits, staff scan the QR | Once per user per drop — **including existing members**. Sponsored drop seats at **1.5×** |
| **2. Group drop seat** | Merchant posts a group perk ("free drinks jug for MeshPoke tables of 4+"); an event spot attaches it and the group checks in | Every attendee whose QR is scanned |
| **3. New-member attribution visit** | A user joins the venue's membership through MeshPoke | Their **first 3 verified visits within 60 days** of joining, then never again |

**Never charged:** organic walk-ins, member visits after the 60-day window (covered by SaaS), user event spots at a venue without a group drop, low-confidence check-ins.

Rules:
- **Verified seat** = claim/attach first (for drops) + staff scan of the guest's rotating QR + GPS overlapping the venue + phone-verified account older than 7 days.
- **Volume control:** the merchant sets each drop's capacity and a **monthly budget cap**; drops pause when the cap is reached.
- **Band selection:** merchant declares a band at venue claim. Phase-1 v1: a **manual quarterly audit** against the venue's own menu and public price information, with band changes on notice. Automated cross-checks (post-visit spend question, 30-day median reassignment) come later.
- **Disputes:** merchant can dispute a seat within 7 days.
- **Sponsored sends** are capped per district per day so users aren't spammed.
- **Launch promo (shadow invoices):** for the first month of drops, merchants receive a full statement — e.g. *"20 verified guests · HK$240 · waived during launch promo (until [date])"* — then fees go live on a fixed date.

**Example monthly invoice — café in the HK$51–100 band (HK$6 per seat):**

| Line | Seats | Amount |
| --- | --- | --- |
| Individual drops | 40 | HK$240 |
| Group drops (3 tables × 6 people) | 18 | HK$108 |
| New members (10 members × 3 visits) | 30 | HK$180 |
| **Per-seat total** | **88** | **HK$528** |
| Growth subscription | | HK$388 |
| **Total** | | **HK$916** (≈HK$10 per guest delivered) |

### 7.4 Billing and money flows

- Guests pay the merchant directly at the counter. **MeshPoke never touches guest money** — no ticketing, deposits, escrow or stored value.
- At month end MeshPoke charges the merchant's **card on file** for SaaS + verified seats from its own check-in logs (invoice detail per event type and drop). No prepaid balances.
- Failed charge → drops pause until paid; SaaS dunning after 7 days.
- Merchants or creators may paste their own booking or payment link on a spot; MeshPoke only displays it.
- All discounts, perks and coupons are funded by merchant margin. MeshPoke never subsidises and takes no cut of the discount or the bill.

### 7.5 Founding merchant programme (cold start)

- **Phase 0:** first 10–15 venues per neighbourhood claim for free and use **Starter features** (standing chat rooms, check-in stats) while the consumer side seeds.
- **The 3-month free Growth period starts when drops go live (Phase 1)** — merchants get value before they pay.
  - **Month 1:** per-seat fees shadow-invoiced only (shown, waived).
  - **From month 2:** per-seat fees charged — merchants pay only when guests actually arrive.
  - **From month 4:** Growth at the founding rate of HK$288/month (or **founding annual HK$2,880**, 10 months' price for 12) for the rest of year 1, then list HK$388.
- **Performance guarantee:** if a venue gets fewer than 30 verified guests by the end of month 3, its free period extends by one month.
- Target ≥60% conversion at month 4. Venue claims verified with a Business Registration certificate. Founding pricing follows the HK 開台價 convention — early supporters keep their rate while subscribed.

### 7.6 Venue data (no third-party scraping)

- **Map display:** Google Maps (rendering only; no Google Places data stored).
- **Restaurants:** imported daily from the **FEHD restaurant licence open data** (data.gov.hk) and geocoded with the government's free **Address Lookup Service**; stored as unclaimed venues under the licensed name.
- **Everything else** (parks, trailheads, courts, rooftops, bars): pins added by users, with duplicate detection and "report wrong pin".
- **Merchants claim** their venue (Business Registration certificate) and correct the display name, pin and details.
- No scraping of OpenRice or other platforms.

## 8. Secondary revenue and what is never monetised

| Stream | Mechanic | Guardrail |
| --- | --- | --- |
| Sponsored drop amplification | Merchant features a drop (district feed / opted-in push) and pays **per verified seat at 1.5× band rate** — no flat fee | Labelled "Sponsored"; never affects marker size; sends capped per district per day; push only to opted-in users |
| Branded / rich pins | Pro-tier presentation richness | Richness only — same ranking rules for everyone |
| Event payments | **None, ever** — creators and merchants handle booking and payment off-platform | MeshPoke never holds funds; avoids SVF, escrow and payments licensing |

**Explicitly not monetised:** network-degree depth, map prominence, keyword levels, photo/socials reveals, verification and safety tools, hosting capacity, free-tier visibility, poke back, and any cut of merchant discounts or guest bills.

## 9. Unit economics (HKD, planning estimates)

At 20,000 MAU the model grosses ≈HK$163,700/month and nets ≈HK$153,300 after payment and store fees, at ~74% contribution margin, with merchants supplying ~60% of revenue. Break-even on a HK$10k/month budget is ~120 consumer payers or ~27 Growth merchants.

Assumptions: 2.5% paid conversion (4% = upside case); 80/20 Plus/Pro; effective ARPU after founding and term discounts ≈ HK$105 Plus, HK$165 Pro; **30% of consumer revenue billed on web** (~3% card fees) and 70% in-app (15% store commission, Small Business Program) → ~11.4% blended; merchant revenue billed on web (~3%); average per-seat fee HK$12.

### 9.1 Steady state (20,000 MAU, one city)

| Line | Gross HK$/month | Net of fees HK$/month |
| --- | --- | --- |
| Consumer subscriptions: 400 Plus × 105 + 100 Pro × 165 | 58,500 | 51,830 |
| 7-day passes + packs + filter passes | 7,000 | 6,200 |
| Merchant SaaS: 150 merchants (60% Growth, 15% Pro) | 54,900 | 53,250 |
| Individual drop seats: 45 merchants × 40 seats × HK$12 | 21,600 | 20,950 |
| Group drop seats: 30 merchants × 4 tables × 6 seats × HK$12 | 8,640 | 8,380 |
| New-member visits: 45 merchants × 5 members × 3 visits × HK$12 | 8,100 | 7,860 |
| Sponsored amplification | 5,000 | 4,850 |
| **Total** | **≈163,740** | **≈153,320** |

Operating costs at steady state ≈ HK$31,500/month: infra 6k (Hetzner VPS shared with existing services, R2, Cloudflare — per PRD §2.3) · trust & safety 12k · support 6k · liveness verification ~6.5k (≈1,000 new verified users × HK$4–8, assuming liveness has been switched on by this scale) · SMS phone verification ~1k (≈1,000 × HK$1). Payment and store fees are already deducted above. **Contribution ≈ HK$121,800/month (~74% of gross).**

At launch, liveness is off and SMS verification is the only per-user verification cost (a few hundred HKD a month), and the server is already paid for — keeping the bootstrap cost base minimal.

Upside case (4% conversion, 800 payers): consumer subscriptions + passes rise to ≈HK$104,800 and total gross to ≈HK$203,000.

### 9.2 Bootstrap floor (solo founder, HK$10k/month)

- **~120 consumer payers** at founding prices (≈HK$84 net each, web and in-app blended), or
- **~27 Growth merchants** at list (≈HK$376 net) / ~36 at founding (≈HK$279 net), or
- a mix such as **60 payers + 18 founding Growth merchants ≈ HK$10,100/month** — before any per-seat fees.

Merchant revenue is the floor: ~30 paying venues in one district covers the whole budget, and per-seat fees from Phase 1 bring cash in before Growth subscriptions start. Founding annual plans (consumer HK$888, merchant HK$2,880) pull cash forward.

## 10. Pricing principles

1. **Flat, transparent, boring.** One published price per channel (web, in-app), no personalised checkout offers. Boring receipts, no surprise renewals, instant cancel.
2. **Paid = faster, never hidden.** Paid tiers get at most +0.2 in Recommended sorting plus badges; users can always re-sort, and free users are never removed from view.
3. **Creation by trust, joining by payment.** Hosting capacity is earned via Show-up Score, never sold; comfort caps are the paid tiers; good hosting earns capped Pro days.
4. **Never meter the path to connection.** Browsing, poke back and post-spot pokes stay free; only pokes to strangers are metered.
5. **Keywords rank; they don't gate.** The platform never gates by keyword; creators may for their own spots.
6. **Merchant revenue is the floor, consumer the ceiling.** SaaS and per-seat fees pay the bills; subscriptions fund growth.
7. **Start high, adjust with data.** List prices launch at HK$128 / 198; founding prices lock while continuously subscribed (開台價).
8. **Map prominence is earned only.** Check-in-verified activity, never member count, tier or fees paid.
9. **MeshPoke never touches guest money.** Merchants collect; MeshPoke bills merchants monthly from its own verified check-in logs.
10. **Merchants decide their own generosity.** No discount caps — MeshPoke informs (estimated cost per visit), never restricts.

## 11. Rollout and key metrics

| Phase | Timeline | Focus | Pricing action |
| --- | --- | --- | --- |
| **0. Seed** | Month 0–2 | One walkable cluster (e.g. Central–Sheung Wan–SoHo); FEHD restaurant import; 10–15 founding merchants claimed on Starter running standing chat rooms; 20–30 founding hosts; keyword profiles + HK phone verification | Free everything |
| **1. Validate** | Month 2–5 | Event spots + attendance, queues, pokes + poke back + post-spot pokes, crews + rebook, Show-up Score, safety kit, **individual + group drops with per-seat fees** (founding 3-month Growth clock starts; 1-month shadow invoices, then live), staff scanner, referral pokes | **Plus HK$128 (founding 500 @ 88; founding annual 888) + 7-day pass HK$58**; per-seat band fees; web + in-app billing live |
| **2. Monetise merchants** | Month 5–8 | Membership ladders (templates + custom), new-member attribution fees, member coupons, CRM, founding Growth conversions at month 4 of drops, manual quarterly band audits | **Growth HK$388 (founding 288 / annual 2,880)** |
| **3. Scale** | Month 8–12 | Second district; Pro consumer tier; packs + filter pass; host rewards; sponsored amplification; promotional pushes + nearby-perks alerts; Pro merchant automations | **Pro HK$198 (founding 148) + Pro 7-day pass HK$98 + poke packs + HK$18 filter pass**; Pro merchant HK$888 |
| **4. Expand** | Year 2 | Multi-city; annual plans at density (Plus 788/yr, Pro 1,288/yr); price review from free-user and conversion data; vendor liveness once triggers are hit (§6.3); automated band cross-checks; HK/Singapore server region when cash allows; legal review of gender-based spot rules | — |

**Key metrics**

- **Consumer:** paid conversion %, web vs in-app billing share, poke → poke-back rate, post-spot poke → connection rate, 30-day retention, time-to-first-spot for new users (target ≤7 days), referral → first-attendance rate.
- **Crews:** crew formation rate, **rebook-the-crew rate (crews meeting 2+ times)**, dormant-crew rate.
- **Formation health:** confirmed-spot fill rate, attendance rate, no-show rate by tier, host-marked vs peer-reported no-shows, flake-forgiveness usage, auto-dissolve rate.
- **Hosts:** active hosts, host churn, host-reward days issued vs paid Pro conversion among hosts.
- **Merchant:** founding → paid conversion, verified seats per drop (individual / group), new-member attribution visits, cost per verified seat, member level progression, member repeat-visit rate, band reassignment rate, churn.
- **Trust:** report rate per 1k pokes, scam interstitial triggers per 1k DMs, safety ratings, promo opt-in and per-merchant mute rates, **free-tier acceptance rate vs paid (within 10%)**.

## 12. Risks and fixes

| Risk | Fix |
| --- | --- |
| Empty-map cold start | One walkable cluster; FEHD restaurant import (every licensed restaurant on day one); recurring merchant standing rooms; "this week" default view |
| Stingy free tier churns users (Tinder/CMB trap) | Browsing, poke back and post-spot pokes free; separate caps per room type; 5 stranger pokes/wk; no suppression |
| Billing rage (Timeleft/CMB pattern) | Flat published prices, boring receipts, instant cancel, no personalised offers |
| No-shows shrink events (Timeleft 6→2) | Date-on-fill + 48h confirm + overbook buffer + host roll-call + peer reports + Show-up Score |
| Paid ordering alienates free users and hosts | Additive formula (paid ≤ +0.2), hard filters first, user-switchable sort, visible counts, 10% fairness launch gate |
| Crews leak to WhatsApp | Allow WhatsApp links; keep polls, perks, streaks, backfill and rebook in-app |
| Romance / investment scams | HK phone verification (one account per number), 18+, trust signals, unverified read-only, scam interstitials, link lock before first attended event, Scameter in report flow; vendor liveness when triggers are hit |
| Women's safety | Public group meetings, faces only after events (attendees) or mutual poke, "hide my photo in chat rooms", share-my-spot, private safety ratings, fast report/block; seed women-led hosts. Gender-based spot rules deferred pending legal review (HK Sex Discrimination Ordinance) |
| Host burnout or churn | Capped Pro-day rewards, merchant-funded host perks, host churn tracked |
| Merchants game check-ins or price bands | Staff scan of rotating guest QR + GPS + 1/day; low-confidence check-ins never billed; manual quarterly band audit (automated later); 7-day disputes |
| Merchants under-scan regulars to avoid fees | Repeat member visits are never charged after the 60-day attribution window, so scanning regulars is always free |
| Merchant payment default | Card on file, monthly charge, drops pause on failure; no prepaid balances |
| Promotional push rejected by stores / annoys users | Explicit opt-in + in-app opt-out (Apple 4.5.4), per-merchant mute, proximity alerts only for joined/saved venues, max 1/day |
| Background-location review risk | Proximity alerts are opt-in, user-benefit framed, never required; app fully works with foreground location only |
| App Store compliance on web pricing | In-app purchase always offered; no in-app mention of web price; verify guideline 3.1.3(b); Small Business Program enrolled |
| Payments regulation | MeshPoke never holds guest funds — no ticketing, deposits, escrow or SVF |
| Marker size seen as pay-to-win | Never sold; check-in-verified only; member counts never displayed |
| Keyword inflation / spam | Max 10, max 3 at level 8+, peer-verification weighting, verified vs declared shown |
| Third-party data terms | No Google Places storage, no OpenRice scraping; government open data + user/merchant pins |
| Latency from a non-HK server | Cloudflare CDN for web and media; server-time targets; add HK/SG region when cash allows |
| Scope creep (global search, degree graphs) | Discovery stays district/spot-scoped until multi-city density |
| Stale competitor benchmarks | User-verified store checkouts only |

### Competitor price reference (HKD, verified Oct 2026 — user store checkouts)

| App | Monthly | 3-month | 6-month | Weekly |
| --- | --- | --- | --- | --- |
| Bumble Boost | 118 | 283 | 493 | 53 |
| Timeleft | 128 | ≈96/mo | — | — |
| **MeshPoke Plus (web)** | **128** | **288** | **488** | **58 (pass)** |
| **MeshPoke Pro (web)** | **198** | **488** | **788** | **98 (pass)** |
| Bumble Premium | 218 | 518 | 888 (+788/yr) | 108 |
| Bumble Premium+ | 298 | 688 | — | 158 |
| CMB Premium | 388 | 688 | 1,288 | — |
| CMB Platinum | 488 | 1,288 | 1,888 | — |

---

**Bottom line:** charge users for **reach and comfort**, never for being seen. Charge merchants for **verified guests and retention tools**, never prominence. Keep the map's signal **earned**, never touch guest money, and keep a free tier that never becomes a trap.
