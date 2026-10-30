# App Store & Google Play launch kit (T19.4 drafts)

Everything here is draft copy + checklists. Store accounts, IAP products, and
submissions are **user actions** — see CHECKLIST at the bottom.

## App Store (iOS)

- **Name:** MeshPoke — Meet People Nearby
- **Subtitle:** A live map for meeting people in real life
- **Category:** Social Networking · **Age:** 17+ (user-generated content, unmoderated-ish chat)
- **Keywords:** meet friends network map dinner drinks sports hiking Hong Kong
- **Description (short):**
  > The map isn't for finding places. It's for finding people.
  >
  > MeshPoke shows spots forming right now near you — dinners, drinks, hikes, tennis, board games. Join one, or host your own. No swiping, no matching, no feeds: just a city full of crews forming in real time.
  >
  > • Join spots by vibe, not looks — pokes carry your sketch, never your face
  > • Show-up Score keeps no-shows out
  > • Crews rebook with one tap: meet once, do it again
  > • Real venues, verified check-ins, QR at the door
- **What's New (v1.0):** Founding launch — first 500 members lock founding pricing forever.
- **Privacy manifest:** NSLocationWhenInUseUsageDescription ("Shows spots and venues near you, and verifies your check-in"), NSLocationAlwaysAndWhenInUseUsageDescription ("Optional: nearby perks from venues you joined — venue-level only, never stored"), NSCameraUsageDescription ("Scan venue QR codes to check in"), NSPhotoLibraryUsageDescription ("Add a profile photo, shared only with your connections").
- **Review notes:** demo account + phone verification note (TestFlight number whitelisting), explanation that events are not paid through the app.

## Google Play

- **Name:** MeshPoke — Meet People Nearby
- **Category:** Social · **Content rating:** 18+
- **Data safety form (summary from Privacy Policy):** collects phone (app functionality/account), approximate location (app functionality, optional for perks), user content (messages/photos, app functionality), diagnostics (analytics); **no data sold**; deletable in-app.

## IAP products (create in both stores, map in RevenueCat)

| Product ID | Store | Price (HKD) |
|---|---|---|
| `mp_plus_monthly` | both | 148 |
| `mp_plus_7d` | both (non-renewing) | 68 |
| `mp_plus_3mo` | both | 328 |
| `mp_plus_6mo` | both | 558 |
| `mp_plus_annual` | both | 1,088 |
| `mp_plus_founding_monthly` | both | 98 |
| `mp_plus_founding_annual` | both | 1,028 |
| `mp_pro_monthly` | both | 228 |
| `mp_pro_7d` | both (non-renewing) | 108 |
| `mp_pro_3mo` | both | 558 |
| `mp_pro_6mo` | both | 898 |
| `mp_pro_annual` | both | 1,788 |
| `mp_pro_founding_monthly` | both | 168 |
| `mp_pro_founding_annual` | both | 1,698 |
| `mp_poke_pack_5` | both (consumable) | 48 |
| `mp_poke_pack_15` | both (consumable) | 98 |
| `mp_filter_pass_7d` | both (non-renewing) | 28 |

⚠ SKU IDs must match `RC_INTERNAL` in `apps/api/src/billing/revenuecat.ts` exactly (`mp_poke_pack_5`, not `mp_pokepack_5`). Founding monthly and founding annual are both sold in-app (founding counter is shared across channels).

(Store prices are the IAP column from shared `PRICES`. Coupon codes stay web-only.)

## CHECKLIST (user actions)

- [ ] Apple Developer Program enrolment — request Small Business Program (15% tier) at signup
- [ ] Create the 9 IAP products above in App Store Connect; screenshot prices for RevenueCat mapping
- [ ] Same 9 in Play Console (in-app products); fill Data safety form from the summary above
- [ ] Screenshots: 6.7" (iPhone 15 Pro Max) + 6.1" set: map w/ spots forming, spot detail w/ sketch queue, live check-in QR, crew rebook poll, wallet+drops, inbox poke w/ trust chips. Web fallback: simulator + `flutter screenshot`
- [ ] Privacy Policy + ToS URLs (host at meshpoke.com/legal/*, both stores require live URLs)
- [ ] App Privacy labels (iOS) generated from PRIVACY_POLICY.md
- [ ] Submit for review with the review-notes demo account
