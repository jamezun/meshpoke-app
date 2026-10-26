# Phase 0 Internal Release — Smoke Checklist (BUILD_PLAN T8.5)

5 internal testers each complete this list on a fresh install. Any ❌ = release blocker.

## Setup (founder, one-time)
- [ ] Cloudflare DNS + Dokploy apps per `infra/RUNBOOK.md` (staging live over HTTPS)
- [ ] Codemagic app connected; `codemagic.yaml` workflow green on a `v*` tag
- [ ] TestFlight build distributed; Play internal track build distributed
- [ ] `FEHD_DISTRICTS=Central and Western` set in staging api env (daily pg-boss import)
- [ ] Founding merchants: claim flow started in admin (`/admin` → merchant claims)

## Tester checklist (per tester, per platform)
1. [ ] Sign up (email) → verify email
2. [ ] Date of birth gate rejects < 18 (try 2025 birthday)
3. [ ] Phone verify (HK +852) — OTP arrives, wrong code rejected
4. [ ] Profile: industry + one-liner + 10 keywords (11th rejected; 4th level-8 keyword rejected)
5. [ ] Map loads (Central & Western), ~1.7k FEHD venues visible after geocode pass
6. [ ] Open a venue page → see licence info + activity counts
7. [ ] Join city room (中西區) → send a message → see it arrive (realtime)
8. [ ] Create a chat spot in a district → invite link opens share page on web
9. [ ] Add a missing place (venue) → appears pending moderation
10. [ ] Log out → log back in — session persists

## Sign-off
| Tester | iOS | Android | Notes |
| --- | --- | --- | --- |
| 1 | | | |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |
