# Business Model & Pricing Model (v2 — with Keyword Layer)

## 1. One-line business model

**A map-native social mesh where users pay to host and reach, merchants pay to retain, discovery runs on self-declared keywords with levels — and the map's popularity signal stays activity-based, not pay-to-win.**

---

## 2. Revenue architecture (four lanes)

| Lane | Who pays | What they buy | Role |
|---|---|---|---|
| **A. Consumer subscription** | Power users / hosts | Spot creation, poke reach, keyword search depth, venue memberships | Growth + engagement |
| **B. Consumer credits** | Casual users | Extra spot credits, poke packs, keyword filter passes | Low-friction upsell |
| **C. Merchant SaaS** | Restaurants / venues | Member CRM, QR check-in, loyalty tools, analytics | **Stable core revenue** |
| **D. Sponsored placements** | Merchants / brands | Labeled event spots, founding-member slots | Secondary, must stay clearly labeled |

**Rule:** logo size and map prominence come **only from verified member activity** — never from payment. This protects trust in the map.

---

## 3. Keyword Layer (NEW — discovery relevance + trust)

### 3.1 How it works

Every user builds a **keyword profile** in their active mode. Each keyword carries a self-declared **level 1–10** (10 = highest expertise/depth).

| Mode | Example keywords | What level means |
|---|---|---|
| **Personal** | tennis, table tennis, piano, INFJ, 1986, HKU, hiking | Skill depth / how central it is to their life |
| **Business** | financial modeling, 700.HK, Nasdaq, hedge fund, gold mining, HK listed co., dealmaking | Expertise or depth of access to that resource/connection |

**Constraints (anti-spam):**
- Max **10 keywords per mode** — scarcity keeps profiles meaningful.
- Max **3 keywords at level 8+** — prevents "level 10 everything" inflation.
- Keyword claims are **self-declared by default**; a keyword becomes **peer-verified** when 2+ contacts endorse it (endorsements weighted by the endorser's own level in that keyword).

### 3.2 Discovery integration (scoped to local — NOT global search)

- **Map & spot filters:** "Show me people near me / in this spot with **tennis ≥ 7**" or **financial modeling ≥ 8**. Filters apply to map markers, spot member lists, and swipe feeds.
- **Vibe/keyword match %:** shared-keyword percentage shown on spot cards and profile popups ("87% match — tennis, HKU").
- **Spot tags:** hosts tag their spots with keywords; joiners see relevance-ranked spots.
- **NOT included:** global user-base keyword search (no "find anyone in the world who knows Tesla's board"). Discovery stays **location- and spot-scoped** — that is the product.

### 3.3 Trust layer: connection degrees (scoped)

- Profiles and spot members show a **"friend of friend" badge** (degree 2) when a mutual contact exists — a lightweight trust signal, not a browsable graph.
- **No degree-based search and no paywall on degree depth at launch.** Revisit only after local density is proven.

### 3.4 Why keywords, not a graph (research-grounded)

- Bumble/Hinge/Tinder validate interest **filtering** as a match-quality layer — every major app has converged on it.
- Standalone consumer networking apps built on degree graphs (Shapr, Lunchclub consumer) have not survived. As a *layer* it adds value; as the *product* it's a graveyard.
- Keywords + levels give the map **relevance without breaking serendipity**: users still discover by proximity; keywords just rank and filter who they see.

---

## 4. Consumer pricing

### 4.1 Subscription tiers

| | **Free** | **Plus** | **Pro** |
|---|---|---|---|
| **Price** | $0 | **$4.99/mo** or $49/yr | **$9.99/mo** or $99/yr |
| Active social spots | 0 | 1 | 3 |
| Pokes / day | 5 | 25 | 100 |
| Venue memberships | 1 | 3 | 10 |
| Chat history | 7 days | 30 days | 90 days |
| **Keyword filters** | **1 keyword, any level** | **3 simultaneous filters** | **Unlimited filters + level ranges** |
| **Keyword-match alerts** | — | **—"someone tennis ≥8 joined a nearby spot"** | **Full: who's searching your keywords** |
| **Peer-verified keywords** | **1** | **3** | **10** |
| Host analytics | — | Basic | Full |
| Priority joining | — | — | Yes |
| Open-to-poke toggle | Yes | Yes | Yes |
| Verified badge | — | — | Yes |

### 4.2 Credit packs (à la carte)

| Pack | Price | Unit economics |
|---|---|---|
| 5 spot credits | **$1.99** | ~$0.40/credit |
| 20 spot credits | **$6.99** | ~$0.35/credit |
| 20 poke boosts | **$0.99** | Impulse buy |
| 100 poke boosts | **$3.99** | Volume discount |
| **7-day keyword filter pass** | **$1.49** | Unlocks Plus-level filters for a week — for users who won't subscribe |

**Why credits matter:** they capture users who won't subscribe but will pay occasionally — and they let you throttle spam without hard-blocking free users.

### 4.3 Free tier guardrails (protect liquidity + safety)

- Join public spots, browse venues, 5 pokes/day, 1 venue membership, 1 keyword filter.
- No spot creation (paid-only, as designed).
- **Earned credits:** high-reputation users get 1 free spot credit/month (rewards good behavior, seeds supply).

---

## 5. Merchant pricing

*(unchanged — keyword layer touches merchants only via optional spot tags and analytics)*

| | **Starter** | **Growth** | **Pro** |
|---|---|---|---|
| **Price** | **Free** | **$39/mo** or $390/yr | **$99/mo** or $990/yr |
| Venue profile + map pin | ✓ | ✓ | ✓ |
| Member cap (adjustable) | 5–25 | 5–25 | 5–25 (+ per-location caps) |
| Seat auto-release | 60-day idle rule | ✓ (configurable 30–90) | ✓ |
| QR check-in | Basic | ✓ | ✓ |
| Discount ladder config | Fixed | Custom | Custom |
| Discount drops (count + expiry) | 1 active | ✓ | ✓ (unlimited) |
| Member CRM | — | ✓ | ✓ |
| Retention analytics | — | ✓ | Advanced |
| Event spots / mo | — | 3 | Unlimited |
| **Spot keyword tags** | — | **✓** | **✓ (A/B tested tags)** |
| **Keyword-driven demand analytics** | — | — | **✓ (which keywords bring members to your venue)** |
| Reserved founding seats | — | ~20% of cap (min 2) | ~20% of cap (min 2) |
| POS / API integration | — | — | ✓ |
| Multi-location | — | — | ✓ |
| Support | Community | Email | Priority |

**Why merchants pay:** identifiable repeat customers, retention data, member management, event hosting — **not** logo size.

### 5.2 Membership & discount mechanics

**The flywheel:** drops recruit strangers → membership keeps regulars → verified check-ins feed venue map size + CRM data → merchant pays SaaS for retention tools → better perks keep members active.

**Member seats**
- Cap **5–25, same price every tier** — merchant trades exclusivity ↔ reach by strategy, never by payment.
- Seats are **kept by activity**: no check-in for 60 days → auto-released to waitlist (no dead names; CRM data stays live).
- **Founding seats ≈ 20% of cap (min 2):** merchant-assigned VIPs, never auto-expire.
- Consumer holds: Free 1 · Plus 3 · Pro 10 memberships.

**Discount ladder (members-only loyalty)**
- Steps configured by merchant, e.g. `3 visits → 10% · 5 → 15% · 10 → 20% or free item`.
- Visit = QR check-in, GPS-proximity-verified, max 1/day counts.
- **Cash discount ceiling ~15%** — beyond that, perks (free item, priority, event access) protect merchant margin.
- Ladder decays one step after 60 days idle.

**Discount drops (campaigns, open to anyone)**
- Merchant publishes count + discount + expiry ("25 spots, 15% off, ends Friday").
- Claim → QR redeem at venue (proximity-gated); unclaimed/expired vanish automatically. Max ~3 active/week per venue.
- **Acquisition layer:** strangers sample the venue → some apply for membership.

**Money flows**
- All discounts funded by merchant margin. **MeshPoke never subsidizes and never takes a cut** (no payment processing, no SVF licensing, no adversarial rev-share).
- MeshPoke earns: SaaS tiers + labeled drop amplification + event spots.
- Marker size grows **only** from verified check-ins — never from payment.

### 5.1 Founding merchant program (cold start)

- First 10–15 venues per neighborhood: **free Growth for 6 months**.
- In exchange: QR check-in adoption, member feedback, case study rights.
- Converts to paid at month 7 — target **≥60% conversion**.

---

## 6. Secondary revenue

| Stream | Mechanic | Guardrail |
|---|---|---|
| **Sponsored event spots** | Merchant pays for a labeled event room on the map | Clearly marked "Sponsored"; never affects logo size |
| **Founding-member sponsorship** | Merchant reserves 2 of 10 slots for high-value customers | Must be tied to real check-in activity |
| **Discount drop amplification** | Merchant pays to feature a drop (district feed / push), labeled | Clearly marked "Sponsored"; does not affect marker size; ~3 drops/venue/week free anyway |
| **Booking/event fees** | Later phase — small fee on ticketed venue events | Not core; avoid early |

**Explicitly NOT monetized:** network-degree depth, map prominence/marker size, keyword levels themselves (levels are earned/peer-verified, never purchased — buying levels would destroy the discovery signal). **No cut is taken from merchant discounts** — MeshPoke is never the payment path for offers.

---

## 7. Unit economics (illustrative, steady state)

### Assumptions (one city)

- 20,000 MAU
- 4% paid conversion → **800 paid users**, avg **$6/mo** → **$4,800/mo**
- 150 merchants, 60% on Growth ($39) + 15% on Pro ($99) → **~$5,700/mo**
- Credits + sponsored + **keyword filter passes** → **~$1,700/mo**

**Total MRR ≈ $12,200**

### Cost structure (monthly)

| Cost | Estimate |
|---|---|
| Maps / hosting / infra | $800 |
| Payment fees (~3%) | $370 |
| Moderation / trust & safety | $1,500 |
| Support | $800 |
| **Gross margin** | **~70%** |

**Break-even** at roughly **$6–8k MRR** for a lean team in one city.

---

## 8. Pricing principles (why this works)

1. **Pay for reach, not for visibility.** Hosting and pokes are the paid actions; map prominence is earned.
2. **Pay for search depth, not for signal quality.** Keyword *filters* and *alerts* are paid; keyword *levels* are earned and peer-verified — never sold.
3. **Scarcity stays real.** The member cap (5–25) is adjustable but never purchasable — bigger caps are never a pricing tier.
4. **Two-sided lock-in.** Users protect spot tiers; merchants protect member data. Both churn less.
5. **Credits beat paywalls** for casual users — lower friction, better spam control.
6. **Merchant revenue is the floor.** Consumer revenue is the ceiling. Don't depend on consumer subs alone.
7. **Keywords rank; they don't gate.** Everyone appears on the map; keywords decide relevance order — never who is allowed to be seen.

---

## 9. Rollout sequence

| Phase | Timeline | Focus | Pricing action |
|---|---|---|---|
| **0. Seed** | Month 0–2 | 1 neighborhood / campus / event; 10–15 free merchants; 20–30 founding hosts; **keyword profiles seeded during onboarding** | Free everything |
| **1. Validate** | Month 2–5 | QR check-in, member-cap scarcity, poke consent flow; **keyword filters + vibe match % (1 filter free)** | Introduce Plus at $4.99 |
| **2. Monetize merchants** | Month 5–8 | Convert founding merchants to Growth; **spot keyword tags** | $39/mo Growth |
| **3. Scale** | Month 8–12 | Second neighborhood; Pro tier; credits; **keyword alerts, peer-verified keywords, filter passes** | $9.99 Pro + credit packs |
| **4. Expand** | Year 2 | Multi-city; POS/API; sponsored events; **evaluate degree-trust expansion with real density data** | Pro merchant $99 |

---

## 10. Key metrics to track

- **Consumer:** paid conversion %, poke acceptance rate, spot creation retention (30-day), venue membership upgrade rate, **keyword filter usage rate, keyword-filtered poke acceptance vs. unfiltered (relevance lift)**.
- **Merchant:** founding→paid conversion, member repeat-visit rate, check-in volume, churn, **keyword-tagged spot attendance lift**.
- **Trust:** report rate per 1k pokes, fake-activity rate, map density per neighborhood, **keyword endorsement authenticity (endorsement rings, reciprocal-endorsement clusters)**.

---

## 11. Risks & pricing fixes

| Risk | Fix |
|---|---|
| Paid-only spot creation starves supply | Founding hosts, earned credits, event-based seeding |
| Poke spam / harassment | Consent toggle, rate limits, credit cost per poke beyond free tier |
| Merchants resist discount escalation | Cap cash discounts at ~15%; shift high tiers to perks |
| **Tiered/unlimited member caps demanded by big merchants** | Cap stays 5–25 same-price; sell **locations, not members** (multi-location Pro) |
| **Members game the ladder (check-in farms)** | GPS proximity + 1/day + anomaly flags; decay punishes idleness |
| Logo size seen as pay-to-win | Never sell it; tie to verified check-ins + retention |
| Low local density | Launch event-first, one hyper-local cluster at a time |
| **Keyword level inflation ("everyone's level 10")** | Max 3 keywords at level 8+; peer-verification weighting; verified-vs-declared shown to viewers |
| **Scope creep into LinkedIn clone (global degree search)** | Discovery stays location/spot-scoped; degree search explicitly out of scope until multi-city density exists |
| **Keyword spam on spots (irrelevant tags for visibility)** | Host analytics show tag performance; stale tags decay in ranking |
| **Empty keyword results (thin density early)** | Filters show "widen radius / lower level" suggestions instead of empty states |

---

**Bottom line:** Charge users for **hosting, reach, and search depth**; charge merchants for **retention tools and member data**; use **credits** to smooth casual monetization; keep the **map's popularity signal earned** and **keyword levels unsold**. Keywords make the map *smarter* without changing what the product is.
