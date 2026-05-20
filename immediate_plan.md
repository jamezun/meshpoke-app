# MeshPoke Immediate Action Plan

**Created:** April 28, 2026
**Status:** Ready to execute
**Dev tools:** GLM 5.1 Coding Plan + OpenRouter (for other models)

---

## Phase 0: Environment Setup (Day 1 — Today)

### Step 0.1 — Install Prerequisites

Check what you already have, install what's missing:

```bash
# Check existing installations
node --version     # Need v20+
flutter --version  # Need stable channel (3.x)
psql --version     # Need v15+
git --version      # Need 2.x
docker --version   # Optional but recommended
redis-cli --version # Need Redis 7+
```

**If missing, install:**

```bash
# Node.js (via nvm — best practice)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts

# Flutter
# Windows (WSL): download from https://docs.flutter.dev/get-started/install
# Then add to PATH

# PostgreSQL (via Docker — easiest, no system pollution)
# Docker Desktop for Windows: https://docker.com/products/docker-desktop

# Redis (via Docker — same reason)
```

### Step 0.2 — Start Local Services with Docker

```bash
# Create docker-compose.yml for dev databases
```

Create this file at your project root:
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: meshpoke_dev
      POSTGRES_USER: meshpoke
      POSTGRES_PASSWORD: meshpoke_dev_2026
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

```bash
docker compose -f docker-compose.dev.yml up -d

# Verify
docker ps
psql -h localhost -U meshpoke -d meshpoke_dev  # password: meshpoke_dev_2026
redis-cli ping  # should return PONG
```

### Step 0.3 — Create GitHub Repository

```bash
# Go to github.com → New Repository
# Name: meshpoke-app
# Visibility: Private
# Do NOT initialize with README (we'll push from local)

cd "/home/jamezun/Coding Project/Meshpoke App"

git init
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/meshpoke-app.git
```

Create `.gitignore`:
```gitignore
# Node
node_modules/
dist/
.env
.env.local
*.log

# Flutter
build/
.dart_tool/
.flutter-plugins
.flutter-plugins-dependencies
*.iml
.fvm/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Docker
pgdata/
redisdata/

# Secrets
.env
*.pem
*.key
google-services.json
GoogleService-Info.plist
```

```bash
git add .
git commit -m "Initial project structure with Business Plan, PRD, and DESIGN docs"
git push -u origin main
git checkout -b dev
```

---

## Phase 0.5: Service Registrations (Day 1-2)

### Step 0.4 — Google Cloud + Maps API

This is the single most important registration — you literally cannot build the map without it.

1. Go to **https://console.cloud.google.com**
2. Click **Create Project** → Name: `MeshPoke`
3. Go to **APIs & Services → Library** → Enable these 5 APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Maps JavaScript API
   - Geocoding API
   - Places API (New)
4. Go to **APIs & Services → Credentials → Create Credentials → API Key**
5. **Restrict the key:**
   - Application restrictions: "HTTP referrers" (for web) + "Android apps" + "iOS apps"
   - API restrictions: Restrict to the 5 APIs above
6. **Enable billing:** You MUST add a credit card, but Google gives **$200 free credits/month**
   - This covers ~28,000 map loads/month — more than enough for development
   - Set a budget alert at $50/month so you never get surprised

**Save the API key for your `.env` file.**

### Step 0.5 — OAuth Credentials (Social Login)

**Google OAuth:**
1. Same Google Cloud Console → **APIs & Services → Credentials**
2. **Create Credentials → OAuth client ID**
3. Application type: "Web application"
4. Name: `MeshPoke Dev`
5. Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`
6. Copy **Client ID** and **Client Secret** → save to `.env`

**Facebook Login + Instagram Login:**
1. Go to **https://developers.facebook.com/apps**
2. Click **Create App** → Type: "Consumer" → Name: `MeshPoke Dev`
3. Add product: **Facebook Login**
4. Settings → Valid OAuth Redirect URIs: `http://localhost:3000/api/auth/facebook/callback`
5. In the same app, add product: **Instagram Basic Display** (for "Login with Instagram")
   - Instagram Basic Display lets users authorize with their Instagram account instead of Facebook
   - Valid OAuth Redirect URIs: `http://localhost:3000/api/auth/instagram/callback`
   - Note: Meta is consolidating Instagram login under their platform, so both Facebook and Instagram login share the same App ID
6. Copy **App ID** and **App Secret** → save to `.env` (shared for both Facebook and Instagram login)
7. Users will see two buttons: "Sign in with Facebook" and "Sign in with Instagram"

> **Why both?** Some users prefer Instagram over Facebook (especially younger demographics in Hong Kong). Instagram login also doubles as the account needed for the verified badge (Instagram 50+ followers check). When a user logs in with Instagram, the app can immediately check follower count — no separate linking step needed.

**LinkedIn Login:**
1. Go to **https://developer.linkedin.com**
2. Click **Create App** → Name: `MeshPoke Dev`
3. Add "Sign In with LinkedIn using OpenID Connect" product
4. Authorized redirect URLs: `http://localhost:3000/api/auth/linkedin/callback`
5. Copy **Client ID** and **Client Secret** → save to `.env`

### Step 0.6 — Twilio (Phone Verification)

1. Go to **https://twilio.com/try-twilio**
2. Sign up with email → verify your phone
3. Get a Twilio phone number (free trial assigns one)
4. Copy from dashboard: **Account SID**, **Auth Token**, **Phone Number**
5. Free trial gives **$15.50 in credits** (~500 SMS)
6. Save to `.env`

### Step 0.7 — Create .env File

```bash
# .env (NEVER commit this file)
# ============================================
# DATABASE
DATABASE_URL=postgresql://meshpoke:meshpoke_dev_2026@localhost:5432/meshpoke_dev
REDIS_URL=redis://localhost:6379

# AUTH
JWT_SECRET=change-me-to-a-random-64-char-string
JWT_EXPIRES_IN=7d

# GOOGLE MAPS
GOOGLE_MAPS_API_KEY=AIzaSy...your-key-here

# GOOGLE OAUTH
GOOGLE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-xxx

# FACEBOOK + INSTAGRAM (same Meta app)
FACEBOOK_APP_ID=123456789
FACEBOOK_APP_SECRET=abcdef123456
INSTAGRAM_APP_ID=123456789          # Same as Facebook App ID (shared Meta app)
INSTAGRAM_APP_SECRET=abcdef123456   # Same as Facebook App Secret

# LINKEDIN
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx

# TWILIO
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx

# OPENROUTER (for AI features if needed)
OPENROUTER_API_KEY=sk-or-xxx

# APP
APP_URL=http://localhost:3000
APP_PORT=3000
NODE_ENV=development
```

```bash
# Create the example file (committed)
cp .env .env.example
# Replace all real values with placeholders in .env.example
# .env stays gitignored
```

---

## Phase 1: Backend Foundation (Week 1-2)

### Step 1.1 — Initialize Backend Project

```bash
cd "/home/jamezun/Coding Project/Meshpoke App"
mkdir -p backend
cd backend

npm init -y
npm install express cors dotenv helmet morgan pg redis uuid bcryptjs jsonwebtoken
npm install -D nodemon jest supertest @types/node typescript ts-node
```

Create this structure:
```
backend/
├── src/
│   ├── index.ts              # Entry point
│   ├── config/
│   │   ├── database.ts       # PostgreSQL connection
│   │   ├── redis.ts          # Redis connection
│   │   └── env.ts            # Environment validation
│   ├── middleware/
│   │   ├── auth.ts           # JWT verification
│   │   ├── rateLimit.ts      # Rate limiting
│   │   └── errorHandler.ts   # Global error handler
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── location.routes.ts
│   │   ├── poke.routes.ts
│   │   ├── match.routes.ts
│   │   ├── chat.routes.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── location.service.ts
│   │   ├── poke.service.ts
│   │   ├── match.service.ts
│   │   └── chat.service.ts
│   └── utils/
│       ├── geo.ts            # PostGIS helpers
│       └── validators.ts
├── db/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seeds/
│       └── 001_dev_seed.sql
├── tsconfig.json
├── package.json
└── .env
```

### Step 1.2 — Create Database Schema

Copy the full schema from your PRD §7 into `backend/db/migrations/001_initial_schema.sql`.

**Build order for tables** (respecting foreign keys):
1. `users` (no dependencies)
2. `user_profiles` (→ users)
3. `user_verifications` (→ users)
4. `user_locations` (→ users)
5. `interest_tags` (no dependencies)
6. `user_interest_tags` (→ users, interest_tags)
7. `pokes` (→ users, merchant_accounts)
8. `matches` (→ users, pokes)
9. `chats` (→ matches)
10. `messages` (→ chats, users)
11. `archived_chats` (→ chats, users, matches)
12. `chatrooms` (→ users)
13. `chatroom_members` (→ chatrooms, users)
14. `blocks` (→ users)
15. `reports` (→ users, chats, messages)
16. `profile_boosts` (→ users)
17. `daily_streaks` (→ users)
18. `referrals` (→ users)
19. `referrer_tiers` (→ users)
20. `poke_quality_scores` (→ users)
21. `merchant_accounts` (no dependencies — but needed before pokes)
22. `merchant_promotions`, `merchant_coupons`, `merchant_packages` (→ merchant_accounts)
23. `merchant_transactions` (→ merchant_accounts, users)
24. `merchant_qr_codes` (→ merchant_accounts)
25. `merchant_qr_scans` (→ users, merchant_accounts)
26. `sponsored_poke_campaigns` (→ merchant_accounts)
27. `sponsored_poke_deliveries` (→ campaigns, users, pokes)
28. `admin_users` (no dependencies)
29. `audit_log` (→ admin_users)
30. `ip_history` (→ users)

### Step 1.3 — Build These API Endpoints First

**Priority order (build in this sequence):**

```
1. POST   /api/auth/register      → Phone + social login
2. POST   /api/auth/login         → Email/password fallback
3. POST   /api/auth/verify-phone  → Twilio SMS verification
4. GET    /api/auth/me            → Current user profile
5. POST   /api/users/profile      → Create/update profile
6. PUT    /api/location           → Update GPS position
7. GET    /api/location/nearby    → Get nearby users (MAP!)
8. PUT    /api/location/settings  → Visibility mode + timer
9. POST   /api/pokes              → Send a Poke
10. GET   /api/pokes/incoming     → Get received Pokes
11. GET   /api/pokes/outgoing     → Get sent Pokes
12. POST  /api/matches/:id/extend → Extend chat timer
13. GET   /api/chats              → List active chats
14. POST  /api/chats/:id/messages → Send message
```

**Test each endpoint with curl or Postman before moving to the next.**

```bash
# Quick test after starting server
curl http://localhost:3000/api/health
# Should return: { "status": "ok", "timestamp": "..." }
```

### Step 1.4 — Add PostGIS for Location Queries

```sql
-- Enable PostGIS extension (run once)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Key query: find nearby users
SELECT 
    u.id, u.username, up.first_name, up.age,
    u.latitude, u.longitude,
    ST_Distance(
        ST_MakePoint(u.longitude, u.latitude)::geography,
        ST_MakePoint($1, $2)::geography
    ) AS distance_meters
FROM user_locations u
JOIN user_profiles up ON u.user_id = up.user_id
WHERE u.is_ghost_mode = FALSE
    AND u.location_visibility != 'ghost'
    AND ST_DWithin(
        ST_MakePoint(u.longitude, u.latitude)::geography,
        ST_MakePoint($1, $2)::geography,
        $3  -- radius in meters
    )
ORDER BY distance_meters ASC;
```

---

## Phase 2: Web Landing Page (Week 3-4)

### Step 2.1 — Initialize React Web App

```bash
cd "/home/jamezun/Coding Project/Meshpoke App"
mkdir -p web
cd web

npx create-vite@latest . --template react-ts
npm install react-router-dom tailwindcss @tailwindcss/vite axios lucide-react
npm install -D @types/react
```

```
web/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── ui/              # Design system: Button, Card, Input, etc.
│   │   ├── layout/          # Navigation, Footer, PageWrapper
│   │   └── sections/        # Hero, Features, Pricing, Safety, etc.
│   ├── pages/
│   │   ├── Home.tsx         # Landing page with registration
│   │   ├── About.tsx
│   │   ├── Pricing.tsx
│   │   ├── Safety.tsx
│   │   ├── Support.tsx
│   │   ├── Login.tsx
│   │   └── Register.tsx     # Pre-launch registration
│   ├── styles/
│   │   └── globals.css
│   └── lib/
│       ├── api.ts           # API client
│       └── constants.ts
├── public/
├── tailwind.config.ts       # Per DESIGN.md
├── vite.config.ts
└── index.html
```

### Step 2.2 — Build Pages in This Order

```
1. globals.css + tailwind.config.ts     → Design system foundation
2. UI components (Button, Card, Input)  → Reusable everywhere
3. Layout (Nav + Footer)                → All pages use this
4. Home / Hero page                     → The landing page
5. Register page                        → Pre-launch signups!
6. About / How It Works                 → Product explanation
7. Pricing page                         → Subscription tiers
8. Safety page                          → Trust building
9. Support pages                        → Help center
```

### Step 2.3 — Connect Registration to Backend

The registration form on the web landing page should:
1. Collect: username, email/phone, mode (dating/networking/both)
2. Call: `POST /api/auth/register`
3. Start Poke accumulation immediately
4. Generate referral link: `meshpoke.com/r/{username}`
5. Show: "You're earning 2 Pokes/day! Current total: X Pokes"

**This is your pre-launch page — it goes live ASAP.**

---

## Phase 3: Flutter Mobile App (Week 5-8)

### Step 3.1 — Initialize Flutter Project

```bash
cd "/home/jamezun/Coding Project/Meshpoke App"
flutter create meshpoke_app
cd meshpoke_app

# Add core dependencies
flutter pub add google_maps_flutter flutter_bloc dio go_router
flutter pub add firebase_core firebase_messaging
flutter pub add flutter_local_notifications permission_handler
flutter pub add cached_network_image image_picker
flutter pub add flutter_secure_storage intl
flutter pub add geolocator geocoding
flutter pub add uuid swipe_cards
```

```
meshpoke_app/
├── lib/
│   ├── main.dart
│   ├── app.dart                    # Root widget + routing
│   ├── config/
│   │   ├── theme.dart              # Per DESIGN.md colors
│   │   ├── routes.dart             # GoRouter config
│   │   └── constants.dart
│   ├── data/
│   │   ├── models/                 # User, Poke, Match, Chat, etc.
│   │   ├── repositories/           # API + local storage abstraction
│   │   ├── datasources/
│   │   │   ├── remote/             # API client
│   │   │   └── local/              # Secure storage, cache
│   │   └── services/
│   │       ├── location_service.dart
│   │       ├── auth_service.dart
│   │       └── notification_service.dart
│   ├── domain/
│   │   ├── entities/               # Clean architecture entities
│   │   └── usecases/               # Business logic
│   ├── presentation/
│   │   ├── blocs/                  # State management
│   │   │   ├── auth/
│   │   │   ├── map/
│   │   │   ├── poke/
│   │   │   ├── chat/
│   │   │   └── profile/
│   │   ├── pages/
│   │   │   ├── splash_page.dart
│   │   │   ├── login_page.dart
│   │   │   ├── register_page.dart
│   │   │   ├── phone_verify_page.dart
│   │   │   ├── profile_setup_page.dart
│   │   │   ├── map_page.dart       # THE CORE SCREEN
│   │   │   ├── swipe_page.dart
│   │   │   ├── poke_inbox_page.dart
│   │   │   ├── chat_list_page.dart
│   │   │   ├── chat_page.dart
│   │   │   ├── chatroom_list_page.dart
│   │   │   ├── profile_page.dart
│   │   │   ├── settings_page.dart
│   │   │   ├── streak_page.dart
│   │   │   └── scan_qr_page.dart
│   │   └── widgets/
│   │       ├── map/
│   │       │   ├── user_marker.dart
│   │       │   ├── merchant_pin.dart
│   │       │   └── activity_signal.dart
│   │       ├── poke/
│   │       ├── chat/
│   │       ├── profile/
│   │       └── common/
│   └── utils/
│       ├── geo_utils.dart
│       ├── date_utils.dart
│       └── validators.dart
├── android/
├── ios/
├── test/
├── pubspec.yaml
└── README.md
```

### Step 3.2 — Build Screens in This Order

```
Week 5: Auth + Profile
  1. splash_page.dart          → App loading + auto-login check
  2. login_page.dart           → Social login buttons
  3. register_page.dart        → Create account
  4. phone_verify_page.dart    → Twilio SMS code entry
  5. profile_setup_page.dart   → Mode select + mandatory fields + photo

Week 6: MAP (the core!)
  6. map_page.dart             → Google Maps + user markers
  7. user_marker.dart          → Profile circle with activity signal ring
  8. profile_popup.dart        → Tap marker → mini profile card
  9. location_visibility.dart  → Accurate/District/Ghost toggle
  10. ghost_now_button.dart    → One-tap instant ghost

Week 7: Poke + Match
  11. poke_inbox_page.dart     → Incoming/outgoing Pokes
  12. poke_action.dart         → Poke / Super Poke / Poke with Note
  13. match_animation.dart     → "It's a Match!" overlay
  14. swipe_page.dart          → Card-based discovery

Week 8: Chat + Streaks + QR
  15. chat_list_page.dart      → Active conversations
  16. chat_page.dart           → Text messaging (add image/voice later)
  17. streak_widget.dart       → Daily check-in UI
  18. scan_qr_page.dart        → Merchant QR scanner
  19. settings_page.dart       → Account, privacy, visibility mode
```

### Step 3.3 — Test on Simulators

```bash
# iOS Simulator
open -a Simulator
flutter run

# Android Emulator
flutter emulators --launch <emulator_name>
flutter run

# DO NOT test on physical device yet (no Apple Developer account)
# Simulators are sufficient for all development
```

---

## Phase 4: Pre-Launch Campaign (Week 9-10)

### Step 4.1 — Landing Page Goes Live

At this point your web landing page should be deployed:

```bash
# Deploy to Vercel (free tier)
cd web
npx vercel
# or Netlify
npx netlify deploy --prod
```

### Step 4.2 — Email Sequence Setup

Set up Resend (free: 100 emails/day):
1. Register at **https://resend.com**
2. Verify your domain (or use their free subdomain)
3. Create email templates:
   - Welcome email (immediate on registration)
   - Profile builder reminder (Day 3)
   - Density preview (Day 7)
   - Phone verification prompt (Day 14)
   - Launch notification (launch day)

### Step 4.3 — Start Collecting Registrations

Your landing page should now be live at `meshpoke.com` (or a temporary Vercel URL).

Post to:
- Reddit: r/HongKong, r/dating, r/SideProject
- Facebook: Hong Kong Expats, HK Singles groups
- Instagram/TikTok: 30-sec demo of map concept
- University campus posters at HKU, CUHK, HKUST
- Personal WhatsApp/Telegram groups

Track: `GET /api/admin/analytics/growth` → daily registration count.

### Step 4.4 — Register Apple Developer + Google Play

**Now is the right time** — the approval process takes 1-2 weeks:

| Service | URL | Cost | What to Do |
|---------|-----|------|-----------|
| Apple Developer | https://developer.apple.com/programs/enroll | $99/yr | Enroll as individual. Takes 24-48 hours to verify. |
| Google Play Console | https://play.google.com/console | $25 one-time | Register, pay fee, instant access. |

---

## Phase 5: Closed Beta + Polish (Week 11-12)

### Step 5.1 — Closed Beta with Top 100

1. Query top 100 most-complete profiles from database
2. Send them early access: TestFlight (iOS) + Internal Testing track (Android)
3. Collect feedback via in-app form or email
4. Fix critical bugs only — don't add features

### Step 5.2 — App Store Preparation

**iOS (App Store):**
- [ ] Screenshots: 6.7" iPhone, 6.5" iPhone, 12.9" iPad
- [ ] App description (focus on: verified, map-based, Hong Kong)
- [ ] Privacy policy URL (your web `/privacy` page)
- [ ] Age rating: 17+ (dating app)
- [ ] Build archive: `flutter build ipa`
- [ ] Upload via Xcode → App Store Connect

**Android (Google Play):**
- [ ] Screenshots: phone, 7-inch tablet, 10-inch tablet
- [ ] Same description as iOS
- [ ] Privacy policy URL
- [ ] Content rating: IARC questionnaire (likely 18+)
- [ ] Build: `flutter build appbundle`
- [ ] Upload to Google Play Console → Production track

### Step 5.3 — Day-Before-Launch Checklist

- [ ] All 500+ pre-registered users have verified phone numbers
- [ ] Top 100 beta testers are active on the map
- [ ] Launch email is written and ready to send
- [ ] Push notification tested on both platforms
- [ ] Google Maps API budget alert set at $50/month
- [ ] Error monitoring active (Sentry free tier)
- [ ] Support email tested: support@meshpoke.com
- [ ] Landing page updated with download links
- [ ] Social media accounts post "MeshPoke is LIVE"

---

## Phase 6: Public Launch (Week 13)

### Launch Day Sequence

```
8:00 AM  → Send launch email to all 500+ registered users
8:05 AM  → Post on Instagram, TikTok, Facebook
8:10 AM  → Post on Reddit
8:15 AM  → App Store + Play Store listings go live
9:00 AM  → Monitor error rates, crash rates, API response times
12:00 PM → Check: how many users opened the app?
6:00 PM  → Check: how many Pokes sent? How many matches?
10:00 PM → Daily standdown: note issues for tomorrow
```

### First 7 Days Post-Launch

```
Daily:
  - Check error rates (Sentry dashboard)
  - Check API response times
  - Check new registrations + active users
  - Respond to all user support emails within 4 hours
  - Fix any critical bugs (crashes, payment failures)

Weekly:
  - Review Day-1 and Day-7 retention numbers
  - Check Google Maps API spend
  - Review all user reports and moderate
  - Post social media content
```

---

## Cost Summary

| Item | Cost | When |
|------|------|------|
| GLM 5.1 Coding Plan | Your current plan | Ongoing |
| OpenRouter (other models) | Pay-per-use | As needed |
| Docker, Node, Flutter, PostgreSQL, Redis | $0 | Now |
| GitHub private repo | $0 (free tier) | Now |
| Google Maps API | $0 (free $200 credits/mo) | Now |
| Google/Facebook/LinkedIn OAuth | $0 | Now |
| Twilio trial | $0 ($15.50 free credits) | Now |
| Resend email | $0 (100/day free) | Week 9 |
| Vercel hosting (web) | $0 (free tier) | Week 9 |
| Apple Developer | $99/yr | Week 9-10 |
| Google Play | $25 one-time | Week 9-10 |
| Domain name | ~$15/yr | Week 9 |
| **Total to start coding today: $0** | | |
| **Total before launch: ~$140** | | |

---

## Quick Reference: File Locations

| File | Purpose |
|------|---------|
| `/home/jamezun/Coding Project/Meshpoke App/Business_Plan.md` | Business plan v3.0 |
| `/home/jamezun/Coding Project/Meshpoke App/PRD.md` | Product requirements v1.1 |
| `/home/jamezun/Coding Project/Meshpoke App/DESIGN.md` | Design system (Zapier-inspired) |
| `/home/jamezun/Coding Project/Meshpoke App/docs/ideation/` | Ideation artifacts |
| `/home/jamezun/Coding Project/Meshpoke App/immediate_plan.md` | This file |

---

*Next step: Open your terminal and start with Step 0.1. Good luck.* 🚀
