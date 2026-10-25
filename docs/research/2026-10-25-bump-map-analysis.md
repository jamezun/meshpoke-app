# Bump (amo) — Map System Analysis for PRD

*Research date: 25 Oct 2026 · Sources: Google Play (`co.amo.android.location`), App Store (id6471519217), help.bumpmaps.com, Crunchbase*

⚠️ **Correction to earlier research:** the "Bump = call roulette, 12 reviews" note in our competitor file was a *different* app (id 6466275621, "Bump: Never Lose Touch"). **This** Bump is the real threat-class product: **Bump by amo — the Zenly team's successor app.**

---

## 1. What Bump is (verified)

| Fact | Detail |
|---|---|
| Developer | **amo** — founded Feb 2023 by **Antoine Martin** (Zenly co-founder/CEO) + Zenly team, after Snap shut down Zenly |
| Lineage | Zenly: the original location-sharing social map, "loved by 100s of millions", acquired by Snap 2017 ($200M+) |
| Positioning | **"Map of your people and places"** — friends-only live location + place graph |
| Traction | 7.2K ratings, **4.8★**, **Apple Editors' Choice**, #39 US Social Networking (free), 30+ languages |
| Size | 405.6 MB (notable — see §3) |
| Model | Free, VC-funded, no visible monetization yet |
| Ops maturity | Intercom help center: 55-article handbook, 24 safety articles |

## 2. How the map works (product mechanics — verified from help center + store copy)

**People layer (closed graph, friends-only):**
- Real-time friend pins: who they're **with**, **battery level**, **speed**, **how long they've been somewhere** (dwell detection)
- Now-listening (Spotify integration), shake-phones-together to log a hangout ("BUMP!")
- **Personal places auto-detected: home / work / school.** Pins visible to self only; friends see a *badge* ("at home") — state, not coordinates; non-friends see nothing. **Requires location permission "Always Allow" + Precise.**

**Place layer:**
- POI suggestions nearby (cafés, restaurants, bars), search + save to personal map
- **Automatic visit detection** — clustering your raw GPS trail into visited POIs, seamless pin-creation
- Per-place **public leaderboard** — "check where friends go and find the **regulars**"

**Gamification:** Scratch Map — passive coverage map of everywhere you've been; compete to uncover your area. Chat starts directly from map pins. Live-ETA sharing to lock screens.

**Navigation:** **delegated, not built** — "get the route with your map app or call a car straight there" (deep links to Google/Apple Maps + ride-hail).

## 3. Tech stack: Google Maps API or their own?

**High-confidence inference: proprietary/custom stack inherited from Zenly — NOT Google Maps SDK.**

Evidence:
1. Zenly famously built its **own map engine**: vector tiles generated from **OpenStreetMap data**, custom renderers, custom map styling — widely covered in their engineering talks. The team's core asset *is* that stack.
2. **405 MB app size** — consistent with shipping a custom map engine, style assets, and tile caches; a Google-Maps-SDK app is typically far smaller (SDK is a system service on Android).
3. Feature depth that Google's SDK doesn't provide: scratch-map tile pipeline, visit-detection clustering, custom pin rendering with dwell states.
4. **Routing delegated via deep links** — classic pattern when you own the social map layer but refuse to build navigation.
5. Domain bumpmaps.com, package `co.amo.android.location` — location *is* the company's identity.

*Not publicly confirmed by amo; label as inference in the PRD. What IS confirmed: their location pipeline is "precise, real-time, and battery friendly" (Zenly's known adaptive-GPS heritage: motion sensors modulate ping rate) and requires Always+Precise location.*

## 4. Bump vs MeshPoke — two different maps

| | Bump (amo) | MeshPoke |
|---|---|---|
| Graph | **Closed** — people you already know | **Open mesh** — strangers → crew |
| Question answered | "Where are my friends?" | "Who's out to meet, near me?" |
| Location sharing | Always-on, precise, continuous | **Never broadcast**; presence at venue granularity, ephemeral |
| Social objects | Friends' pins + places | **Spots** (forming/confirmed/live) anchored to POIs |
| Venue layer | Leaderboards/regulars (implicit) | Merchants, memberships, check-in CRM (core revenue) |
| Identity | Ambient intimacy (battery, music, co-presence) | Ladder: sketch → verified check-in → connection |
| Monetization | None yet | Subs + packs + merchant SaaS |

**Their validation of us:** place leaderboards and "find the regulars" = proof the venue-regular mechanic matters (our membership/founding-circle model is the deeper version). Editors' Choice + 4.8★ = proof map-native social works commercially.

**Their moat is not our problem:** Bump optimizes intimacy for existing friend groups. It structurally cannot introduce strangers (that's a different trust model entirely). Our serendipity layer is the unclaimed ground.

## 5. What we copy vs reject

| Copy | Reject |
|---|---|
| **Delegated navigation** — deep-link to Google/Apple Maps, never build routing | **Always-on precise location** — strangers-facing app broadcasting live coordinates = safety disaster + PDPO liability |
| **Delegated ride-hail** (deep link) | **Home/work/school auto-detection** — we never detect or store personal places; not needed, pure liability |
| **Visit-detection concept** → ours is *lighter*: GPS geofence + QR = verified check-in (ground truth for score + merchant CRM) | **Battery/music/speed ambient signals** — presence over profiles; our ladder philosophy is opposite |
| **Battery-friendly cadence** → native geofencing APIs only (iOS region monitoring / Android geofencing) | **Custom map engine** — a $200M-acquisition team's flex; wrong spend for us (see §6) |
| Scratch-map-style gamification — *later, not launch* | Friends-only closed graph — dead end for meeting new people |

## 6. PRD-ready: MeshPoke map system spec

1. **Rendering:** Google Maps SDK (Flutter `google_maps_flutter`) at launch. Why: HK POI quality + Traditional Chinese labels, zero tile infrastructure, **mobile map loads are free** (SDK native maps no-charge); our pre-launch budget stays ~$140. Styling/branding demands → evaluate Mapbox GL or MapLibre+OSM (Bump's route) at Phase 4 scale. `ponytail: custom tiles only if brand styling measurably moves retention`
2. **POI seed (Layer 0):** one-time **Google Places API** import for launch districts; user spots anchor to `place_id`; venue claims bind merchant → place.
3. **Geo backend:** **PostGIS** — district polygons (HK 18) for the district floor; spot queries scoped to viewport + district, never global; radius search for "near me"; geofence checks server-verified.
4. **Check-in pipeline (ground truth):** GPS proximity (~75–100 m geofence) **+ venue QR scan** → verified check-in. GPS alone = "unverified present"; QR completes it. Feeds Show-up Score, marker size, merchant CRM, ladder decay.
5. **Location model:** foreground GPS on app-open only; background **only inside live-event geofences** (event window ±). Users are never live-tracked; presence shown at **venue granularity** ("checked in at The Ave"), auto-expires. No personal-place detection, ever.
6. **Marker layer:** spots as markers, cluster at low zoom; marker size/rank = verified check-in activity only (inviolable rule); sponsored = labeled, no size boost.
7. **Routing:** deep-link `geo:`/URL schemes to Google/Apple Maps + ride-hail apps (copy Bump's delegation pattern).
8. **Battery:** no custom location pipeline — native geofencing + significant-location-change APIs; adaptive ping rate unnecessary at our scale.

**One-line summary for PRD:** *We buy the base map (Google), own the semantic layer (spots/venues/check-ins on PostGIS), borrow Bump's delegation patterns, and reject its ambient-intimacy location model — presence is earned at venues, never broadcast.*
