# DineFirst 約飯先 — competitor study (2026-11-01)

Sources: dine-first.com (SPA — mined JS bundles for full product strings), App Store id6764727486 (full HK description), Play com.dinefirst.dinefirst, DDG search (IG/Telegram footprints). Reviews: **none publicly extractable** — app is brand-new (Play "正式登陸"; AS HK 2×5★). Analysis therefore draws on their own marketing claims + product mechanics exposed in the site bundle.

## What they are
- HK mystery-dinner app (約飯先, DF Growth Limited, Cheung Sha Wan). AS category Social Networking; Play category **Dating** (same split-brain we resolved: we're Social everywhere).
- Pitch: skip endless chatting on dating apps → straight to dinner. 免主持 輕社交, 4–6 per table, most join solo, 1.5h dinners.
- 神秘飯局: team-curated restaurants (TST / Mong Kok / Central), venue + table revealed 3–5 days before; report table number at door.
- Themed tables: singles by age band, 專業人士/高收入 networking, Christians only, TGIF after-work.
- Distribution: Instagram @dinefirst.hk (~5k followers, 27 posts), anonymous Telegram channel @dinefirsthk (2.9k subs — "朋友不會知道你加入"), claims 1500+ 飯腳 matched. Toronto branch (@dinefirst.ca, 447 followers).

## Monetization (from bundle strings)
- Subscription plans 約飯Plus / 約飯Pro (plan switch prorated at next billing date).
- 飯糰 credit packs ($20 each, max 5 purchase, consumed per dinner, accumulate).
- Referral: **40% lifetime revenue share** on referred friends ("自動賺取實付金額 40% 嘅終身回贈") — aggressive.
- Positioning copy: "speed dating $400/head, matchmaking $1000/head — ours is fairer"; typical dinner $100–150.

## Mechanics worth noting
- First-come-first-served booking; email ≠ seat ("收到此信件不代表保留名額").
- 候補遞補通知 = waitlist backfill notify (we have this).
- Blind-box exit window (退出盲盒) = bail window.
- Post-event follow-up email: food good? vibe? did you exchange IG?
- Cantonese icebreaker question bank (童年回憶 / 卡通片 / comfort food / 最伏電影 / superpower-for-chores / 全人類每日一件事…).
- AI 客服助手 ("你是 Dinefirst 客服助手。只用繁體中文。只輸出 JSON") — LLM somewhere in matching/icebreaker/support.
- Engagement monitoring: "我們一直密切關注那些能讓飯桌充滿歡笑的用戶".

## Pain points / structural gaps (ours to win)
1. **Central ops bottleneck** — THEY pick venue/time/themes; users book from a menu. Supply scales with their staffing, not with users (Timeleft trap). → MeshPoke: user-hosted spots, POI-seeded map, creator rails.
2. **Timing opacity** — "時間會變動，報名請查看最新列表" + email≠seat = confirmation anxiety. → ours: date-on-fill, 48h confirm, everything visible from forming.
3. **Mystery = lottery by design** — you can't vet table chemistry; no trust/track record surfaced. → ours: sketches, Show-up Score, keywords, trust signals in queue.
4. **Category confusion** (Dating vs Social) + 專業人士/高收入 themes flirt with exclusivity positioning we reject.
5. **No place anchoring** — no map, no districts, no venue pages/regulars; merchants invisible. → ours: venue flywheel, drops, ladders.
6. **Credits friction** — 飯糰 accumulate, blind-box exit windows; billing complexity (the Timeleft complaint pattern).
7. Anonymous Telegram as the community layer — demand for "nobody knows I'm here" is real; we handle via privacy-by-default profiles, but onboarding copy should reassure (private-by-default).

## What we adopted (this study, commit same day)
- **Bilingual vibe prompts** (12 EN/繁中, networking-safe) — their Cantonese icebreaker bank is field-proven fun; ours existed as schema but no UI/template list. Implemented: `VIBE_PROMPTS` shared constant + Dart `VibePrompts.all`, PATCH/GET `/me` prompts (≤3 {prompt,answer}), mobile profile editor prompt slots.
- Confirmed our existing coverage of: waitlist backfill, post-event people-you-met nudge (their follow-up email equivalent), themed tables (templates + creator keywords), flat billing (anti their 40%-referral credit tangle — deliberate non-adoption).

## Deliberately NOT adopted
- 40% lifetime referral (unit economics + spam incentive).
- Mystery venue mode — could be a future host toggle (district+price revealed at T-2d) but conflicts with our "know exactly where" fix; revisit if HK users show demand.
- LLM matching (black box; our keyword-vibe stays transparent).
- High-income/Christian identity-gated themes (positioning risk; creators can approximate with required keywords already).
