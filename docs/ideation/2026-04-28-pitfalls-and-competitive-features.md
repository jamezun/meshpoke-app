# MeshPoke: Pitfalls & Competitive Feature Ideation

**Date:** 2026-04-28
**Status:** Finalized — Decisions incorporated into Business Plan v3.0 and PRD v1.1
**Scope:** Major pitfalls that could kill the app + must-add competitive features + monetization improvements

---

## Decisions Summary

### 🔴 Critical Pitfalls (Addressed)

| # | Pitfall | Decision | Implementation |
|---|---------|----------|----------------|
| 1 | Empty map on day one (cold-start death) | **Pre-launch campaign** with 4 stages: landing page, email sequence, closed beta, public launch. Poke accumulation incentive (2 Pokes/day pre-launch). Affiliate referral links. Target: 500+ pre-registered users. | Added to Business Plan §6.2, PRD §12 Pre-Launch Campaign |
| 2 | Women's safety perception | **3-mode location toggle** (Accurate/District/Ghost) + one-tap Ghost Now button. All modes free for all tiers — safety never paywalled. | Added to Business Plan §4.1.5, PRD §4 Flutter requirements |
| 3 | Google Maps API budget bomb | **Tiered map refresh rates**: Free=15min, Plus=5min, Premium=1min, Premium+=real-time. 93% reduction in free-tier API calls. Keep Google Maps. | Added to Business Plan §4.1.5, subscription table |
| 4 | Hong Kong distance filtering | **Keep distance-only (km)** for simplicity. District filtering deferred to Phase 2 if users request it. | No change — confirmed distance mode stays |
| 5 | Missing voice notes & video | **Phase 2:** Voice messages, image sending, video chat (WebRTC), Voice Verify (5-sec profile clip). | Added to Business Plan §4.1.6 chat section, PRD §12 Phase 2 |

### 🟡 Competitive Features Added

| # | Feature | Decision | Implementation |
|---|---------|----------|----------------|
| 6 | Daily check-in streaks | **Added.** Day 1-2 (+2 Pokes), Day 3-5 (+3), Day 6 (+5), Day 7 (+5+1 Super). Streak breaks reset. High streak = higher search ranking. Streak freeze for Premium/Premium+. | Added to Business Plan §4.1.5, PRD §12 Phase 1, new `daily_streaks` table |
| 7 | Social Wrapped → Affiliate referral links | **Replaced Social Wrapped.** Users get unique referral links + QR codes. Earn +5 to +15 Pokes per referral based on monthly tier. No follower minimum. | Added to Business Plan §6.3, PRD §12 Pre-Launch + Phase 1, new `referrals` + `referrer_tiers` tables |
| 8 | Friend Vouch | **Dropped.** Too complex for early stage. | Not implemented |
| 9 | Merchant QR scan-to-earn | **Added.** Merchants display QR codes. Users scan for bonus Pokes (Free: +3/3 scans per day, Plus: +5/5, Premium: +5/7, Premium+: +5+1 Super/unlimited). | Added to Business Plan §4.1.13, PRD §12 Phase 1, new `merchant_qr_scans` + `merchant_qr_codes` tables |
| 10 | Activity feed | **Dropped.** Per user preference. | Not implemented |
| 11 | Auto-generated merchant pins | **Added.** Food & beverage first (Phase 2A: Hong Kong's 16K+ restaurants). Co-working + gyms (Phase 2B). All retail (Phase 3, demand-driven). | Added to Business Plan §4.1.13, PRD §12 Phase 3 |
| 12 | First date partnerships | **Dropped.** Per user preference. | Not implemented |
| 13 | Sponsored Pokes | **Added.** Merchants send Pokes to users (blast/targeted/individual). Free/Plus can't turn off. Premium can turn off blast. Premium+ can turn off all. Max 1/user/day, 3/user/week. Pricing: $0.10/$0.25/$0.50 per delivery. | Added to Business Plan §5.4, PRD §12 Phase 2-3, new `sponsored_poke_campaigns` + `sponsored_poke_deliveries` tables, poke_type expanded with 'sponsored' |

### Design Decisions

| Topic | Decision |
|-------|----------|
| Fuzzy mode (between accurate & district) | **Dropped.** 3 modes is the magic number. District mode already serves as "fuzzy." |
| Social Wrapped | **Dropped.** Privacy concern — users don't want non-users knowing they use dating apps. Replaced with affiliate referral links. |
| Voice/video in chat | **Added to Phase 2:** Text, images, voice messages, video chat, Voice Verify clip |
| Streak → search ranking | **Added.** High streak = higher ranking in search results and swipe feeds |
| Merchant category focus | **Food & beverage first.** Highest frequency, social context, margins for coupons, 16K+ venues in HK |

---

## Files Updated

- `/home/jamezun/Coding Project/Meshpoke App/Business_Plan.md` → v3.0
- `/home/jamezun/Coding Project/Meshpoke App/PRD.md` → v1.1
- `/home/jamezun/Coding Project/Meshpoke App/docs/ideation/2026-04-28-pitfalls-and-competitive-features.md` → this file

---

*This ideation document is now finalized. All decisions have been incorporated into the Business Plan and PRD.*
