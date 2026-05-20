# MeshPoke Product Requirements Document (PRD)

**Version 1.0 | April 2026**

**Covers:** Web Application (React + Node.js + PostgreSQL + Tailwind CSS) & Mobile Application (Flutter for iOS + Android)

**Target Market:** Hong Kong (Initial Launch)

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Architecture and Tech Stack](#2-architecture-and-tech-stack)
3. [Web Application Requirements](#3-web-application-requirements)
4. [Flutter Mobile Application Requirements](#4-flutter-mobile-application-requirements)
5. [Shared Backend Requirements](#5-shared-backend-requirements)
6. [Admin Dashboard Requirements](#6-admin-dashboard-requirements)
7. [Database Schema](#7-database-schema)
8. [API Specification](#8-api-specification)
9. [Design System Implementation](#9-design-system-implementation)
10. [Hong Kong Market Localization](#10-hong-kong-localization)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Implementation Phases](#12-implementation-phases)
13. [Testing Strategy](#13-testing-strategy)
14. [Launch Readiness Checklist](#14-launch-readiness-checklist)

---

## 1. Product Overview

### 1.1 Product Vision

MeshPoke is a location-based social platform combining dating, professional networking, and real-time community interaction. Users discover verified people nearby on a live map, connect through the Poke system, and build meaningful relationships — romantic or professional.

### 1.2 Products in Scope

| Product | Platform | Tech Stack | Purpose |
|---------|----------|------------|---------|
| MeshPoke Website | Web (Responsive) | React, Node.js, PostgreSQL, Tailwind CSS | **Hybrid:** marketing pages (public) + authenticated web experience (profile, chat, Pokes, subscriptions, settings) + admin dashboard. Map discovery and swipe mode are mobile-only. |
| MeshPoke App | iOS + Android | Flutter, Dart | Core product: map discovery, Poke system, chat, profiles |
| Admin Dashboard | Web (Internal) | React, Node.js, PostgreSQL | Platform management, user administration, moderation, analytics |
| Backend API | Cloud | Node.js, PostgreSQL, Redis | Shared API serving both web and mobile clients |

### 1.3 Target Users

- **Primary:** Hong Kong residents aged 18-40 seeking dating or professional networking
- **Secondary:** Businesses (restaurants, bars, co-working spaces) seeking local promotion
- **Internal:** Platform administrators and moderators

---

## 2. Architecture and Tech Stack

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    CLIENTS                           │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Flutter  │  │ React Website│  │ React Admin   │  │
│  │ iOS/Andr │  │ (Marketing)  │  │ Dashboard     │  │
│  └────┬─────┘  └──────┬───────┘  └───────┬───────┘  │
│       │               │                   │          │
└───────┼───────────────┼───────────────────┼──────────┘
        │               │                   │
        ▼               ▼                   ▼
┌─────────────────────────────────────────────────────┐
│              API GATEWAY / LOAD BALANCER             │
│              (Nginx / AWS ALB)                       │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│  Auth Service│ │ App API  │ │ Admin API    │
│  (JWT/OAuth) │ │ (REST +  │ │ (REST, RBAC) │
│              │ │  WS)     │ │              │
└──────┬───────┘ └────┬─────┘ └──────┬───────┘
       │              │              │
       └──────────────┼──────────────┘
                      ▼
        ┌─────────────────────────┐
        │       PostgreSQL        │
        │   (Primary Database)    │
        └────────────┬────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
  ┌──────────┐ ┌──────────┐ ┌──────────┐
  │  Redis   │ │  S3/GCS  │ │ 3rd Party│
  │ (Cache + │ │ (Media   │ │ Services │
  │  Sessions│ │  Storage)│ │ (Maps,   │
  │  + Queue)│ │          │ │  Facial, │
  └──────────┘ └──────────┘ │  Push)   │
                             └──────────┘
```

### 2.2 Tech Stack Detail

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Web Frontend** | React 18+ with TypeScript | Component-based, large ecosystem, SSR-ready |
| **Web Styling** | Tailwind CSS 3+ | Utility-first, DESIGN.md alignment, rapid development |
| **Web Build** | Vite | Fast HMR, optimized production builds |
| **Mobile Frontend** | Flutter 3.x with Dart | Cross-platform (iOS + Android) from single codebase |
| **Backend API** | Node.js with Express/Fastify | JavaScript full-stack consistency, high I/O performance |
| **Database** | PostgreSQL 15+ | Relational integrity, JSON support, geospatial (PostGIS) |
| **Cache/Queue** | Redis 7+ | Session management, rate limiting, real-time pub/sub |
| **Authentication** | JWT + OAuth 2.0 (Passport.js) | Social login integration, stateless auth |
| **File Storage** | AWS S3 or Cloudflare R2 | Profile photos, media, cost-effective |
| **Real-time** | WebSocket (Socket.io) | Live map updates, chat, notifications |
| **Maps** | Google Maps SDK + Static Maps API | Core product requirement |
| **Facial Verification** | Jumio / Onfido / Veriff | Third-party biometric verification |
| **Push Notifications** | Firebase Cloud Messaging (FCM) + APNs | Cross-platform push delivery |
| **Email** | SendGrid / AWS SES | Transactional and marketing emails |
| **Payments** | Stripe + local HK payment methods | Subscription billing, in-app purchases |
| **CI/CD** | GitHub Actions | Automated testing, build, and deployment |
| **Hosting** | AWS / GCP (serverless-first) | Auto-scaling, cost optimization within budget |

---

## 3. Web Application Requirements

The MeshPoke website serves a **hybrid purpose**: public marketing pages for unauthenticated visitors, and a lightweight authenticated experience for registered users. The core map discovery, swipe mode, GPS tracking, and push notifications remain **mobile-only** (Flutter app) because native location APIs, background tracking, and push delivery are fundamentally superior on mobile devices. iOS Safari does not support Web Push, and browser Geolocation API has poor accuracy with no background capability.

However, offering chat, profile management, Poke responses, and subscription management on the web removes the download barrier for onboarding, enables viral sharing (chatroom links, profile links), and captures desktop usage during work hours — a significant use case in Hong Kong's office culture.

**Web Onboarding Funnel:**
```
Web visitor → Signs up on website → Builds profile →
Prompted: "Your profile is ready! Download MeshPoke to discover
people near you on the live map." → Downloads app →
Already has a profile → Starts discovering immediately
```
This removes two high-friction steps (cold App Store visit + in-app registration) and yields a pre-registered user much more likely to complete the download.

**Feature Availability Matrix:**

| Capability | Mobile App (Flutter) | Website (React) |
|---|---|---|
| Browse marketing pages | — | ✅ Full |
| Sign up / Register | ✅ Primary | ✅ Supported |
| Login | ✅ Primary | ✅ Supported |
| View / edit profile | ✅ Full | ✅ Full |
| Live map discovery | ✅ Primary | ❌ Not on web |
| Poke / Super Poke | ✅ Full (send + receive) | ✅ View incoming Pokes, Poke back |
| Swipe mode | ✅ Primary | ❌ Not on web |
| Chat (read + reply) | ✅ Primary | ✅ Supported |
| Chatrooms | ✅ Full (create + join + chat) | ✅ Read + reply only |
| Subscription management | ✅ Full | ✅ Full |
| Settings / Privacy | ✅ Full | ✅ Full |
| Admin Dashboard | — | ✅ Full (web only) |
| Push notifications | ✅ Native (FCM + APNs) | ❌ Not on web |
| Travel Mode | ✅ Full | ❌ Not on web |
| Incognito Mode | ✅ Full | ❌ Not on web |
| Profile Boost | ✅ Full | ✅ Activate + view status |
| Facial Verification | ✅ Camera-based | ✅ Upload selfie |

### 3.1 Pages and Routes

| Route | Page | Auth | Purpose |
|-------|------|------|--------|
| `/` | Home / Hero | Public | Landing page with value proposition, CTAs, social proof |
| `/about` | How It Works | Public | Step-by-step walkthrough, dual-mode explanation, feature showcase |
| `/plans` | Plans & Pricing | Public | Subscription tier comparison, billing durations, merchant plans, FAQ |
| `/safety` | Safety | Public | Verification, anti-scam, privacy controls, emergency resources |
| `/support/guide` | Guide to Use | Public | Getting started tutorials, feature walkthroughs, video guides |
| `/support/troubleshoot` | Troubleshoots | Public | Issue resolution guides organized by category |
| `/support/security-privacy` | Security & Privacy | Public | Data handling, encryption, compliance, account security |
| `/support/safety-reporting` | Safety & Reporting | Public | Reporting tools, community guidelines, legal resources |
| `/login` | Login | Public | User login (social + email) |
| `/register` | Register | Public | Account creation + profile setup |
| `/dashboard` | User Dashboard | User | Activity overview, download prompt, quick actions |
| `/profile` | My Profile | User | Full profile editor, photo management, verification |
| `/pokes` | Pokes | User | View incoming/outgoing Pokes, Poke back |
| `/chats` | Chat List | User | Active chats, chatrooms, archived chats |
| `/chats/:id` | Chat Conversation | User | Individual chat interface (read + reply) |
| `/chatrooms/:id` | Chatroom | User | Chatroom read + reply |
| `/subscription` | Subscription | User | Plan management, billing, payment methods |
| `/settings` | Settings | User | Account, privacy, notifications, mode |
| `/admin` | Admin Dashboard | Admin | User management, moderation, analytics |
| `/admin/login` | Admin Login | Admin | Admin authentication with MFA |
| `/terms` | Terms of Service | Public | Legal |
| `/privacy` | Privacy Policy | Public | Legal |
| `/cookies` | Cookie Policy | Public | Legal |

### 3.2 Home / Hero Page

**Route:** `/`

**Sections:**
1. **Hero Banner**
   - Headline: Tagline communicating verified, location-based social discovery
   - Subheadline: Brief value proposition (2-3 sentences)
   - Primary CTA: "Download on App Store" + "Get it on Google Play" buttons
   - Background: Animated map visualization showing user markers appearing/disappearing
   - Design: Degular Display headline at 56-80px, Zapier Orange CTAs, cream (`#fffefb`) background

2. **Social Proof Bar**
   - Stats: "X verified users", "X matches made", "X+ cities" (animated counters)
   - Design: Sand (`#eceae3`) background band, Inter 48px weight 500 for numbers

3. **How It Works (Quick)**
   - 4-step visual: Sign Up → Get Verified → Discover on Map → Connect
   - Design: 4-column card grid, cream background, sand-bordered cards

4. **Key Features Showcase**
   - Interactive feature cards: Live Map, Dual Mode, Poke System, Verification
   - Each card: icon/illustration, title (Inter 24px weight 600), description (Inter 16px weight 400)
   - Design: 2x2 grid on desktop, stacked on mobile

5. **Trust Differentiator**
   - Highlight IP/ISP transparency, multi-layer verification, disappearing timer
   - Visual comparison: MeshPoke vs. "Other Apps" on trust metrics
   - Design: Split layout, feature checklist with orange check marks

6. **CTA Section**
   - Final download prompt with both store badges
   - "Start connecting with verified people nearby" messaging
   - Design: Centered layout, orange CTA button

**Responsive Behavior:**
- Desktop: Full hero with side-by-side layout for feature sections
- Tablet: Stacked sections, 2-column grids
- Mobile: Single column, reduced hero text size, stacked cards

### 3.3 About / How It Works Page

**Route:** `/about`

**Sections:**
1. **Step-by-step walkthrough**
   - Step 1: Create Account (social login options shown)
   - Step 2: Get Verified (phone + social + optional facial recognition)
   - Step 3: Set Your Mode (Dating / Networking toggle)
   - Step 4: Discover on Map (live map preview with markers)
   - Step 5: Poke Someone (Poke vs. Super Poke explanation)
   - Step 6: Match & Chat (24-hour timer explanation)
   - Step 7: Meet in Person (safety tips link)
   - Design: Vertical timeline or horizontal stepper with illustrations

2. **Dual Mode Explainer**
   - Side-by-side cards: Dating Mode vs. Networking Mode
   - Required fields for each mode listed clearly
   - Visual toggle animation

3. **Live Map Feature**
   - Interactive embedded map demo (static screenshot with annotations for initial launch)
   - Annotations showing: profile markers, poke buttons, distance info, verified badges

4. **Why MeshPoke**
   - Comparison table: MeshPoke vs. Tinder vs. Bumble vs. LinkedIn
   - Highlight: verification, map, dual mode, poke system, IP/ISP, chatrooms
   - Design: Sand-bordered table with orange highlights on MeshPoke advantages

### 3.4 Plans & Pricing Page

**Route:** `/plans`

**Sections:**

1. **Subscription Tier Comparison Table**

| Feature | Free | Plus | Premium | Premium+ |
|---------|------|------|-----|-------|
| Map Browsing | ✓ | ✓ | ✓ | ✓ |
| Profile Visibility | Standard | Priority | High Priority | Top Priority |
| Regular Pokes/Day | 5 | 25 | Unlimited | Unlimited |
| Super Pokes/Month | 0 | 3 | 10 | Unlimited |
| Poke with Note | No | No | Yes (200 chars per Poke) | Yes (500 chars + ranked higher in inbox) |
| Chatroom Join Limit | 3 | 10 | 25 | Unlimited |
| Chatroom Creation | 0 | 2/month | 10/month | Unlimited |
| Chatroom Max Members | — | 25 | 50 | 100 |
| Disappearing Timer | 1-60 min | 1-6 hours | 1-12 hours | 1 min-24 hours |
| Map Radius Filter | 5 km | 25 km | 50 km | 100 km |
| Swipe Mode | ✓ | ✓ | ✓ | ✓ |
| Swipe Filters | Basic | Basic | Advanced | All + AI Match |
| Incognito Mode | — | — | ✓ | ✓ |
| Travel Mode | — | — | — | ✓ |
| Chat Activation Extend | — | 1/week | Unlimited | Unlimited + Rematch |
| Facial Verification Badge | — | Available | Included | Included + Priority |
| Ad Experience | Full ads | Reduced | Optional | Optional |
| Profile Boosts/Month | 0 | 1 | 3 | 7 |
| Chat Inactivity Expiry | 7 days | 7 days | 14 days | 30 days |

2. **Billing Duration Selector**
   - Toggle/tabs for: 1 Week | 1 Month | 3 Months | 6 Months | 12 Months
   - Each tier shows discounted price for selected duration
   - Savings badge displayed (e.g., "Save 15%", "Save 40%")
   - Recommended duration highlighted (6 months)

   **Pricing Table:**

   | Duration | Plus | Premium | Premium+ |
   |----------|------|-----|-------|
   | 1 Week | $2.99 | $5.99 | $9.99 |
   | 1 Month | $9.99/mo | $19.99/mo | $34.99/mo |
   | 3 Months | $8.49/mo (billed $25.47) | $16.99/mo (billed $50.97) | $29.99/mo (billed $89.97) |
   | 6 Months | $7.49/mo (billed $44.94) | $14.99/mo (billed $89.94) | $26.49/mo (billed $158.94) |
   | 12 Months | $5.99/mo (billed $71.88) | $11.99/mo (billed $143.88) | $22.99/mo (billed $275.88) |

   **HKD equivalents** displayed alongside (conversion rate: USD × 7.8):
   | Duration | Plus (HKD) | Premium (HKD) | Premium+ (HKD) |
   |----------|-----------|-----------|-------------|
   | 1 Week | ~HK$23 | ~HK$47 | ~HK$78 |
   | 1 Month | ~HK$78/mo | ~HK$156/mo | ~HK$273/mo |
   | 3 Months | ~HK$66/mo | ~HK$132/mo | ~HK$234/mo |
   | 6 Months | ~HK$58/mo | ~HK$117/mo | ~HK$207/mo |
   | 12 Months | ~HK$47/mo | ~HK$93/mo | ~HK$179/mo |

3. **Merchant Account Plans**
   - Monthly: USD 29.99/month (~HK$234) — Map pin, promotions, coupons (5/mo), packages (2/mo), basic analytics, **12% commission**
   - Quarterly: USD 24.99/month billed quarterly (~HK$195/mo) — Map pin, promotions, coupons (15/mo), packages (5/mo), advanced analytics, priority placement, **10% commission**
   - Annual: USD 19.99/month billed annually (~HK$156/mo) — Map pin, promotions, coupons (unlimited), packages (unlimited), full analytics, priority placement, custom pin direction, **8% commission**
   - **Tiered commission: 12% (Monthly) / 10% (Quarterly) / 8% (Annual)** — longer commitment earns lower commission rate, creating double incentive to go annual

4. **Plan FAQ**
   - Can I change plans mid-cycle?
   - How do cancellations work?
   - Is there a free trial for paid plans?
   - What payment methods are accepted?
   - Refund policy?

**Design:**
- Tab-based billing duration selector using inset box-shadow underline (per DESIGN.md)
- Orange CTA buttons on each plan card: "Get Plus", "Get Premium", "Get Premium+"
- Free tier card: sand border, no CTA (already included)
- Paid tier cards: subtle orange top-border accent for visual hierarchy
- "Most Popular" badge on Premium tier
- "Best Value" badge on 12-month duration

### 3.5 Safety Page

**Route:** `/safety`

**Sections:**

1. **Our Commitment to Your Safety**
   - Hero statement about user safety as top priority
   - Overview of MeshPoke's multi-layered safety approach

2. **Verification & Trust**
   - Multi-layer verification system: social login, phone verification, facial recognition
   - IP/ISP transparency: how it works, why it matters, what you see on profiles
   - Verified badge requirements explained
   - Statistics: verification rates, fake account detection rates

3. **Anti-Scam Measures**
   - IP/ISP display as the primary anti-scam tool
   - How to spot discrepancies between claimed location and ISP
   - Travel Mode transparency (Virtual Location tag)
   - Reporting suspicious profiles

4. **Location Privacy**
   - Disappearing timer explanation
   - Ghost Mode for immediate removal
   - Location fuzzing (50m minimum radius display)
   - Incognito Mode overview
   - Background location update behavior

5. **Safe Meeting Tips**
   - Always meet in public places
   - Tell a friend your plans
   - Hong Kong-specific: well-lit MTR stations, popular café districts
   - Trust your instincts — block and report if uncomfortable

6. **Emergency Resources (Hong Kong)**
   - Hong Kong Police: 999 (Emergency), 2527 7177 (Non-emergency)
   - Anti-fraud hotline: 18222
   - Social Welfare Department: 2343 2255
   - Suicide prevention: Samaritans of Hong Kong — 2389 2222
   - Women's hotline: 2385 0003 (Harriet B. Nayar)
   - Consumer Council: 2929 2222

7. **Unmatched Chat Visibility**
   - Explanation: when you unmatch, the chat remains visible for 7 days in read-only mode
   - Purpose: enables reporting of inappropriate content even after disconnecting
   - How to access: "Archived Chats" section in app
   - Active reports retain chat data for up to 90 days for investigation

### 3.6 Support — Guide to Use

**Route:** `/support/guide`

**Content Sections:**

1. **Getting Started**
   - Creating your account (step-by-step with screenshots)
   - Social login options (Facebook, Instagram, LinkedIn, Gmail, Apple)
   - Profile setup: mandatory fields for Dating Mode and Networking Mode
   - Setting your discovery preferences

2. **Verification**
   - Phone number verification walkthrough
   - Social account linking (Instagram 50+ followers or LinkedIn 50+ connections)
   - Facial recognition verification (how it works, what to expect)
   - Understanding your verified badge

3. **Map Discovery**
   - How the live map works
   - Understanding profile markers (verified badges, mode indicators, distance)
   - Configuring your map radius
   - Disappearing timer settings
   - Ghost Mode activation

4. **Poke System**
   - Regular Poke: sending, 24-hour expiration, re-Poke cooldown
   - Super Poke: priority placement, no expiration, monthly allocation
   - Match: mutual Poke detection, chatbox activation
   - 24-hour chat activation timer: both must send a message

5. **Swipe Mode**
   - Card-based discovery interface
   - Sorting algorithm: boosted → paid tier → distance
   - Re-entry after 1 week for swiped profiles
   - Filters: mode, verification, age range, distance

6. **Chat & Messaging**
   - Opening a chat after match
   - 24-hour activation timer
   - Extending expiring chats (by tier)
   - Rematching expired conversations
   - Archiving and unmatching
   - Unmatched chat visibility for reporting

7. **Chatrooms**
   - Creating location-based chatrooms
   - Joining nearby chatrooms
   - Moderation tools for creators
   - Limits by subscription tier

8. **Travel Mode (Premium+)**
   - Activating virtual relocation
   - "Virtual Location" and "Traveling" indicators
   - IP/ISP still shows true connection origin
   - Radius filter up to 100 km

9. **Account Settings**
   - Privacy controls
   - Notification preferences
   - Mode switching (Dating ↔ Networking ↔ Both)
   - Blocking and unblocking users
   - Account deletion

**Format:** Accordion/expandable sections with screenshots and animated GIFs. Search bar at top for keyword lookup.

### 3.7 Support — Troubleshoots

**Route:** `/support/troubleshoot`

**Content Categories:**

1. **Login & Authentication**
   - Can't log in with social account
   - Password reset not received
   - Account locked or suspended
   - Apple Sign In issues
   - "Account not found" error

2. **Location & GPS**
   - Location not updating on map
   - GPS accuracy issues
   - Background location permissions (iOS/Android)
   - Map not loading
   - "Location services disabled" error

3. **Notifications**
   - Not receiving push notifications
   - Email notifications not arriving
   - Notification settings reset
   - Poke notifications delayed

4. **Payments & Subscriptions**
   - Payment declined
   - Plan not activating after purchase
   - Refund request process
   - Plan change not taking effect
   - Canceling subscription
   - HK payment methods: Alipay HK, WeChat Pay HK, FPS not working

5. **Verification Issues**
   - Phone verification SMS not received
   - Social account linking failed
   - Facial recognition verification failed
   - Verified badge not appearing
   - Instagram followers/LinkedIn connections not detected

6. **Map & Performance**
   - Map loading slowly
   - Profile markers not appearing
   - App crashing on map open
   - High battery usage
   - App running slowly

7. **Chat & Messaging**
   - Messages not sending
   - Chat disappeared after match
   - 24-hour timer expired unexpectedly
   - Can't extend chat
   - Archived chats not visible
   - Can't unmatch

8. **Device Compatibility**
   - Minimum OS requirements (iOS 15+, Android 10+)
   - Tablet support
   - Known device-specific issues

**Format:** Searchable FAQ with category filters. Each article: problem description → cause → step-by-step solution.

### 3.8 Support — Security & Privacy

**Route:** `/support/security-privacy`

**Content Sections:**

1. **Data Encryption**
   - TLS 1.3 for all data in transit
   - AES-256 encryption for data at rest
   - End-to-end encryption for chat messages
   - How we protect your data on our servers

2. **What We Collect and Why**
   - Account data: email, name, phone number (for verification)
   - Profile data: photos, bio, preferences (for discovery)
   - Location data: GPS coordinates (for map display, with fuzzing)
   - Device data: IP address, ISP name (for trust/transparency)
   - Usage data: app interactions, session duration (for service improvement)
   - Payment data: handled by Stripe (we never store card numbers)

3. **Location Data Policy**
   - How location is used: map display, distance calculation, chatroom proximity
   - Disappearing timer: data retention periods
   - Location fuzzing: 50m minimum radius
   - Background location: behavior and opt-out
   - Location data deletion: upon account deletion or Ghost Mode

4. **IP Address Handling**
   - Why we display ISP and city-level location
   - What is shown: ISP name + city/region (never exact IP)
   - What is NOT shown: exact IP address, street address, coordinates
   - Anti-scam purpose and effectiveness
   - Opt-out: disabling map visibility also disables IP display requirement

5. **Facial Recognition Data**
   - Processed by third-party (Jumio/Onfido/Veriff)
   - Not stored on MeshPoke servers
   - No biometric templates retained
   - Used solely for profile photo verification
   - Data deleted after verification result returned

6. **Account Security**
   - Strong password requirements
   - Multi-factor authentication availability
   - Session management
   - Suspicious login detection
   - What to do if your account is compromised

7. **Your Rights (PDPO — Hong Kong)**
   - Right to access your personal data
   - Right to correct inaccurate data
   - Right to request data deletion
   - Right to data portability (export)
   - How to exercise these rights (support email + in-app request)
   - Response timeline: within 40 days per PDPO requirements

8. **Cookie Policy**
   - Essential cookies: authentication, security
   - Analytics cookies: usage patterns (anonymized)
   - Marketing cookies: opt-in only
   - How to manage cookie preferences
   - Third-party cookies: Google Maps, Stripe, analytics

9. **Children and Minors**
   - MeshPoke is strictly 18+
   - Age verification during registration
   - Reporting underage users
   - Account deletion for minors

**Format:** Long-form articles with expandable sections. PDF download option for privacy policy.

### 3.9 Support — Safety & Reporting

**Route:** `/support/safety-reporting`

**Content Sections:**

1. **Recognizing Suspicious Profiles**
   - Red flags: blank profile, stock photos, ISP doesn't match claimed location
   - Behavioral warning signs: asking for money, refusing to video call, evasive answers
   - How to verify someone is genuine: check verified badge, ISP info, facial verification status

2. **Reporting Tools**
   - How to report a profile (in-app: profile → ⋯ → Report)
   - How to report a message (in-app: message → long press → Report)
   - How to report from archived/unmatched chats
   - Report categories: harassment, scam/fraud, fake profile, inappropriate content, underage user, other
   - Anonymous reporting option

3. **What Happens After You Report**
   - Immediate: reported content hidden from your view
   - Within 1 hour: initial review by automated system
   - Within 24 hours: human moderation review
   - Within 72 hours: investigation outcome notification to reporter
   - Possible outcomes: warning, temporary suspension, permanent ban, no action
   - Reporter receives status updates via in-app notification

4. **Catfishing & Scam Guide**
   - Common scam patterns: romance scams, investment scams, phishing links
   - How IP/ISP display helps identify scammers
   - What to do if you suspect a scam: stop communicating, report, screenshot evidence
   - Hong Kong Anti-Deception Coordination Centre: 18222

5. **Community Guidelines**
   - Be authentic: use real photos, real information
   - Be respectful: no harassment, hate speech, or abuse
   - Be safe: meet in public, tell a friend
   - Be honest: don't misrepresent your identity or location
   - Be legal: no illegal content, solicitation, or exploitation

6. **Consequences for Violations**
   - First offense (minor): warning + content removal
   - Repeated minor offenses: temporary suspension (3-30 days)
   - Serious offense (harassment, threats): permanent ban
   - Illegal activity: ban + law enforcement report
   - Appeal process: email support within 14 days of action

7. **Hong Kong Legal Resources**
   - Hong Kong Police Force: 999 (emergency), 2527 7177 (non-emergency)
   - Cyber Security and Technology Crime Bureau: 2860 5012
   - Anti-Deception Coordination Centre: 18222
   - Social Welfare Department — Family and Child Protective Services: 2343 2255
   - The Samaritans — Suicide Prevention: 2389 2222
   - RainLily — Sexual Violence Crisis Centre: 2375 5322
   - Consumer Council: 2929 2222
   - Personal Data (Privacy) Commissioner: 2827 2827

8. **Mental Health & Support**
   - Rejection is normal — don't take it personally
   - If you feel unsafe or harassed, report and block immediately
   - Hong Kong mental health resources
   - Taking breaks from dating apps is healthy

**Format:** Mix of article content, step-by-step guides with screenshots, and resource cards for emergency contacts.

### 3.10 Shared Web Components

**Navigation Bar:**
- Sticky header on cream background (`#fffefb`)
- MeshPoke logo (left-aligned)
- Navigation links: Home, About, Plans, Safety, Support (dropdown)
- Orange CTA button: "Download App" (right-aligned)
- Language toggle: EN / 繁 (Phase 2)
- Mobile: hamburger menu

**Footer:**
- Dark background (`#201515`)
- 4-column layout:
  - Column 1: Logo, tagline, social media links
  - Column 2: Product (About, Plans, Safety, Download)
  - Column 3: Support (Guide, Troubleshoot, Security & Privacy, Safety & Reporting)
  - Column 4: Legal (Terms, Privacy, Cookies, Contact)
- App Store + Google Play badges
- © 2026 MeshPoke. All rights reserved.

**Design Tokens (from DESIGN.md):**
- All components use warm cream palette (`#fffefb`, `#eceae3`)
- Sand borders (`#c5c0b1`) for structural elements
- Zapier Orange (`#ff4f00`) for CTAs and accents only
- Typography: Degular Display for hero headlines, Inter for all UI text
- No box-shadow elevation — border-based design
- 8px base spacing system

### 3.11 Authenticated Web Experience

After login, users access a lightweight but functional web experience. The navigation shifts from marketing-oriented to app-oriented, while a persistent banner encourages downloading the mobile app for the full experience.

**Authenticated Navigation:**
- Sticky header on cream background (`#fffefb`)
- MeshPoke logo (left-aligned, links to Dashboard)
- Navigation links: Dashboard, Profile, Pokes, Chats, Subscription, Settings
- User avatar + name (right-aligned, dropdown: Profile, Settings, Log Out)
- Persistent download banner: *"Using MeshPoke on the web? Download the app for live map discovery, swipe mode, and push notifications!"* with App Store + Google Play badges
- Banner dismissable per session, reappears on next login

#### 3.11.1 Dashboard Page

**Route:** `/dashboard`

**Sections:**
1. **Welcome Banner**
   - "Welcome back, [First Name]!" with profile photo
   - Subscription tier badge
   - Verification status summary

2. **Activity Overview**
   - Cards showing: Pokes received (count), Active chats (count), New matches (count)
   - Each card links to its respective page

3. **Download CTA (prominent)**
   - Large card: "Your profile is ready! Download MeshPoke to discover people nearby on the live map."
   - App Store + Google Play badges
   - Feature highlights: Map Discovery, Swipe Mode, Push Notifications, Travel Mode

4. **Quick Actions**
   - Edit Profile → /profile
   - Manage Subscription → /subscription
   - View Chats → /chats
   - Settings → /settings

#### 3.11.2 Profile Page

**Route:** `/profile`

**Full profile editor:**
- Profile photo management: upload (drag-and-drop + file picker), reorder (drag), delete
  - Minimum 1 photo, maximum 6
  - Preview grid showing current photos with edit overlay
- Basic info: first name, last name, date of birth, gender, bio
- Mode toggle: Dating / Networking / Both
- **Dating Mode fields:** gender preference, relationship goal, interests (tag picker), lifestyle habits, height, education, occupation, drinking, smoking
- **Networking Mode fields:** current employer, job title, industry, years of experience, professional skills (tag picker), career objectives, LinkedIn URL
- Verification status panel:
  - Phone verification: status + "Verify Now" button
  - Social accounts: linked providers + follower/connection counts + "Link Account" button
  - Facial verification: status + "Verify with Selfie" button (upload selfie image)
- Profile preview: "How others see you" side-by-side card view
- Save button with confirmation toast

#### 3.11.3 Pokes Page

**Route:** `/pokes`

**Tab layout:**
- Tab 1: Incoming Pokes
- Tab 2: Outgoing Pokes

**Incoming Pokes Tab:**
- Super Pokes section (top, gold border accent)
  - Poke cards: sender profile photo (48dp circle), name, age, mode badge, verified badge
  - Time received or "Does not expire" for Super Pokes
  - Action buttons: "Poke Back" (orange CTA), "Remove" (ghost button)
  - Clicking sender name/photo → opens their public profile view
- Regular Pokes section
  - Same card layout with countdown timer ("Expires in Xh Xm")
  - Action buttons: "Poke Back", "Remove"

**Outgoing Pokes Tab:**
- Active Pokes: recipient info, time sent, status (Pending / Viewed)
- Expired Pokes: grayed out, cooldown countdown ("Can re-Poke in Xd")
- Cannot initiate new discovery-based Pokes from web (no map/swipe)

#### 3.11.4 Chat List Page

**Route:** `/chats`

**Sections:**
1. **Active Chats**
   - Chat list items: recipient profile photo (48dp circle), name, mode badge, last message preview (truncated), timestamp, unread badge (orange circle with count)
   - New matches with 24h timer: countdown bar + "Both must send a message within Xh to keep this chat alive"
   - Click → opens `/chats/:id`

2. **Chatrooms**
   - Chatroom list items: chatroom name, location anchor, member count, last message preview
   - Click → opens `/chatrooms/:id`
   - Note: cannot browse/discover or create chatrooms from web

3. **Archived Chats** (expandable)
   - Chat items with "Read-only" badge and "Expires in Xd Xh" countdown
   - Orange "Report" button on each item
   - Click → opens archived chat in read-only mode

#### 3.11.5 Chat Conversation Page

**Route:** `/chats/:id`

**Layout:**
- Header: recipient profile photo, name, mode badge, verified badge, IP/ISP line
- Header menu (⋯): Unmatch, Report, Block
- Message area:
  - Sent messages: orange background (`#ff4f00`), right-aligned
  - Received messages: cream/sand background (`#eceae3`), left-aligned
  - System messages: centered, gray text (e.g., "Match created", "Chat will expire in 6h")
  - Image messages: thumbnail with lightbox expand
  - Timestamps on each message (hover to reveal exact time)
  - Auto-scroll to latest message on load
- Input bar (bottom, sticky):
  - Text input with send button
  - Image attachment button (upload)
  - Disabled if chat is archived (read-only)

**24-hour Timer Display (new matches):**
- Prominent countdown bar at top of chat: "Both users must send a message within [X] to keep this chat alive"
- User's own message status: "✓ You've sent your first message" or "⚠ Send a message to keep this chat alive"
- Extend button (if tier allows): "Extend +24h" (orange CTA)

#### 3.11.6 Chatroom Page

**Route:** `/chatrooms/:id`

**Layout:**
- Header: chatroom name, location anchor, member count, creator info
- Message area: same styling as individual chat
- Input bar: text input + send button (read + reply only)
- Cannot create new chatrooms or discover/join chatrooms from web

#### 3.11.7 Subscription Page

**Route:** `/subscription`

**Sections:**
1. **Current Plan**
   - Plan tier badge and name
   - Billing duration (e.g., "6-month plan")
   - Monthly price + total billed
   - Next billing date
   - Status: Active / Cancelling / Grace Period

2. **Change Plan**
   - Tier selector: Plus / Premium / Premium+
   - Duration selector: 1 Week / 1 Month / 3 Months / 6 Months / 12 Months
   - Price display with savings badge
   - HKD equivalent shown
   - "Subscribe" or "Change Plan" CTA

3. **Payment Methods**
   - Saved payment methods list
   - Add new: Credit/Debit Card, Alipay HK, WeChat Pay HK
   - Set default payment method

4. **Billing History**
   - Table: Date, Description, Amount, Status (Paid/Failed/Refunded)
   - Download invoice PDF

5. **Cancel Subscription**
   - Cancel button with confirmation flow
   - Retention offer: "Stay with 1 month free" (if eligible)
   - Cancellation effective at end of current billing period

#### 3.11.8 Settings Page

**Route:** `/settings`

**Sections:**
1. **Account**
   - Email (change with verification)
   - Password (change with current password)
   - Linked social accounts (view, unlink)
   - Login history (last 10 logins with IP, device, timestamp)

2. **Privacy**
   - Blocked users list (unblock)
   - Data export request (download your data as JSON)
   - Account deletion (with 30-day grace period explanation)

3. **Notifications**
   - Email notifications: toggle per type (Pokes, matches, messages, subscription)
   - Push notification settings: link to mobile app settings

4. **Mode**
   - Switch between Dating / Networking / Both
   - Explanation of each mode

5. **Danger Zone**
   - "Delete Account" button (red, confirmation required, 30-day grace)

### 3.12 Web Registration Flow

**Route:** `/register`

**Steps:**
1. **Sign Up Method**
   - Social login buttons: Facebook, Instagram, LinkedIn, Google, Apple
   - Email + password option

2. **Basic Info**
   - First name, last name, date of birth (age verification: must be 18+)
   - Email (pre-filled from social login)

3. **Phone Verification (Compulsory)**
   - Enter phone number (+852 default for HK)
   - SMS OTP verification (must complete to continue)
   - Cannot skip — required for account activation

3. **Mode Selection**
   - Dating Mode / Networking Mode / Both
   - Brief explanation of each

4. **Profile Setup**
   - Dating fields or Networking fields (or both) depending on mode
   - Photo upload (minimum 1)
   - Bio

5. **Completion + Download Prompt**
   - "Your profile is ready! 🎉"
   - "Download MeshPoke to discover people near you on the live map."
   - App Store + Google Play badges
   - "Or continue on web" link → `/dashboard`
   - This is the key conversion moment: user is already registered, reducing mobile app onboarding to just a login

---

## 4. Flutter Mobile Application Requirements

### 4.1 App Structure

**Navigation: Bottom Tab Bar (5 tabs)**

| Tab | Icon | Screen | Description |
|-----|------|--------|-------------|
| Map | 📍 | MapScreen | Full-screen Google Maps with user markers |
| Swipe | 🔥 | SwipeScreen | Card-based discovery feed |
| Pokes | 💬 | PokesScreen | Incoming/outgoing Pokes and Matches |
| Chat | 💭 | ChatListScreen | Active chats and chatrooms |
| Profile | 👤 | ProfileScreen | User profile, settings, subscription |

### 4.2 User Flows

#### 4.2.1 Registration & Onboarding

```
App Launch
    │
    ├── [Check Auth Token]
    │       │
    │       ├── Valid → Main App (Tab: Map)
    │       └── Invalid/None → Welcome Screen
    │
    ▼
Welcome Screen
    │
    ├── "Sign up with Facebook" → OAuth → Profile Setup
    ├── "Sign up with LinkedIn" → OAuth → Profile Setup
    ├── "Sign up with Gmail" → OAuth → Profile Setup
    ├── "Sign up with Apple" → OAuth → Profile Setup
    │
    ▼
Mode Selection
    │
    ├── Dating Mode → Dating Profile Form (required fields)
    ├── Networking Mode → Networking Profile Form (required fields)
    ├── Both → Both Forms sequentially
    │
    ▼
Profile Photo Upload (minimum 1, maximum 6)
    │
    ▼
Verification Prompt
    │
    ├── Phone Number Verification (SMS/Call) → REQUIRED for visibility
    ├── Social Account Linking (Instagram 50+ OR LinkedIn 50+) → REQUIRED for badge
    ├── Facial Recognition → OPTIONAL (incentivized)
    │
    ▼
Mandatory Fields Check
    │
    ├── All complete → Map becomes visible, user appears on map
    └── Incomplete → Prompted to complete before visibility
    │
    ▼
Tutorial Overlay (first-time only)
    │
    ▼
Main App (Tab: Map)
```

#### 4.2.2 Map Discovery & Interaction

```
Map Screen
    │
    ├── User markers displayed at GPS locations
    │   ├── Circular profile photo markers
    │   ├── Verified badge overlay
    │   ├── Mode indicator (Dating: ❤️ / Networking: 💼)
    │   └── Online/offline status ring
    │
    ├── Tap marker → Profile Popup
    │   ├── First name, age / professional title
    │   ├── Mode (Dating/Networking)
    │   ├── Verified badge status
    │   ├── IP/ISP: "Connected via: [ISP] — [City, Region]"
    │   ├── Distance from viewer
    │   ├── Action buttons:
    │   │   ├── Poke (regular)
    │   │   ├── Super Poke (if available)
    │   │   └── View Full Profile →
    │   └── Close popup
    │
    ├── Full Profile View
    │   ├── All profile fields (mode-dependent)
    │   ├── Photo gallery (swipeable)
    │   ├── IP/ISP display
    │   ├── Verification details
    │   ├── Poke / Super Poke buttons
    │   ├── Report / Block buttons
    │   └── Back to Map
    │
    ├── Map Controls
    │   ├── Radius slider (tier-dependent: 5-100 km)
    │   ├── Disappearing timer selector
    │   ├── Ghost Mode toggle
    │   ├── Location centering button
    │   └── Layer toggle (satellite/default)
    │
    └── Background Location Behavior
        ├── App open: continuous GPS updates
        ├── App closed: updates until timer expires
        └── Timer expired: marker removed, no tracking
```

#### 4.2.3 Poke & Match Flow

```
User A taps "Poke" on User B's profile
    │
    ├── Check: Has User A already Poked User B?
    │   ├── Yes, within last 24h → "Already Poked" toast
    │   ├── Yes, expired, within cooldown week → "Cooldown: X days remaining"
    │   └── No (or cooldown passed) → Send Poke
    │
    ▼
Poke Sent
    │
    ├── User B receives push notification: "User A Poked you!"
    │
    ├── Check: Did User B already Poke User A?
    │   ├── Yes → MATCH CREATED
    │   │   │
    │   │   ▼
    │   │   Both users receive: "It's a Match! 🎉"
    │   │       │
    │   │       ▼
    │   │   Chatbox opens between users
    │   │       │
    │   │       ▼
    │   │   24-Hour Activation Timer starts
    │   │       │
    │   │       ├── User A sends message → Timer partial (waiting for B)
    │   │       ├── User B sends message → Timer clears → Chat activated
    │   │       ├── Neither sends within 24h → Chat expires → Match dissolved
    │   │       │
    │   │       ▼
    │   │   Chat Activated (both sent first message)
    │   │       │
    │   │       ▼
    │   │   Inactivity Timer: 7-day rolling window
    │   │       ├── Activity within 7 days → Timer resets
    │   │       ├── No activity for 7 days → Chat expires → Match dissolved
    │   │       │   (Inactivity period varies by tier: 7/7/14/30 days)
    │   │       │
    │   │       ▼
    │   │   If expiring (24h activation timer):
    │   │       ├── Extend available? (by tier) → Extend → +24h
    │   │       └── No extend → Chat archived
    │   │
    │   └── No → Poke sits in User B's incoming Pokes list
    │       ├── Regular Poke: visible for 24h then expires
    │       └── Super Poke: visible indefinitely, prioritized
    │
    ▼
User B can:
    ├── Poke back → Check if creates Match (see above)
    ├── Ignore → Poke expires (regular) or stays (Super)
    ├── Remove → Poke dismissed
    └── Report → Report flow initiated

**Poke with Note Flow (Premium / Premium+ only):**
```
User A taps "Poke with Note" on User B's profile
    │
    ▼
Note composer opens
    ├── Premium: up to 200 characters
    └── Premium+: up to 500 characters
    │
    ▼
Poke sent with note attached
    │
    ├── User B receives notification: "User A Poked you with a note!"
    ├── In Poke inbox, note preview is shown inline
    ├── Premium+ notes appear ranked higher in inbox
    │
    ▼
User B can:
    ├── Poke back (with or without own note) → Match created
    ├── Ignore → Poke expires (regular) or stays (Super)
    ├── Remove → Poke dismissed
    └── Report → Report flow initiated
    │
    ▼
No DM bypass — recipient MUST Poke back to create a Match
and open the chat. The note provides context but does not
open a conversation channel on its own.
```
```

#### 4.2.4 Unmatch & Archived Chat Flow

```
User in active chat
    │
    ├── User taps "Unmatch"
    │   │
    │   ▼
    ├── Confirmation dialog: "Unmatch? You won't be able to rematch unless both Poke again."
    │   │
    │   ▼
    ├── Unmatch confirmed
    │   │
    │   ▼
    ├── Chat moved to "Archived Chats" (read-only)
    │   ├── Both users can see the chat in Archived section
    │   ├── Prominent "Report" button at top of archived chat
    │   ├── No new messages can be sent
    │   ├── Archived for 7 days, then permanently deleted
    │   │
    │   └── Exception: if Report is filed on archived chat
    │       ├── Chat data retained for up to 90 days for investigation
    │       └── User notified of report status updates
    │
    └── Chat expiration (24h timer, both didn't message)
        │
        ▼
    Same archival behavior: chat visible read-only for 7 days
        ├── Purpose: user can report if interaction was problematic
        └── "Report" button always accessible in expired chats
```

#### 4.2.5 Subscription & Billing Flow

```
Profile → Subscription / Plans
    │
    ▼
Current Plan Display
    │
    ├── "Upgrade" button (if Free/Plus)
    ├── "Manage" button (if Premium/Premium+)
    │
    ▼
Plan Selection Screen
    │
    ├── Tier selection: Plus | Premium | Premium+
    │       │
    │       ▼
    ├── Duration selection: 1 Week | 1 Month | 3 Months | 6 Months | 12 Months
    │   ├── Price shown for each duration
    │   ├── Savings percentage badge ("Save 15%", "Save 25%", "Save 40%")
    │   └── Total billed amount displayed
    │       │
    │       ▼
    ├── Payment Method
    │   ├── Credit/Debit Card (Visa, Mastercard, UnionPay)
    │   ├── Apple Pay (iOS) / Google Pay (Android)
    │   ├── Alipay HK
    │   ├── WeChat Pay HK
    │   ├── FPS (Faster Payment System)
    │   └── In-app purchase (App Store / Google Play)
    │       │
    │       ▼
    ├── Payment Processing (Stripe / Platform IAP)
    │       │
    │       ▼
    ├── Confirmation Screen
    │   ├── Plan details, billing cycle, next billing date
    │   ├── "Manage Subscription" link
    │   └── "Cancel" link (with retention offer)
    │       │
    │       ▼
    └── Features activated immediately
```

### 4.3 Screen Specifications

#### 4.3.1 Map Screen

**Primary Display:** Full-screen Google Maps
- **User markers:** Circular profile photos, 48dp diameter
  - Verified badge: orange checkmark overlay, top-right
  - Mode indicator: small icon bottom-left (heart/briefcase)
  - **Activity signal ring (always visible):**
    - Green pulsing ring: active now (last activity < 30 min) — most responsive
    - Solid green dot: active today (last activity < 24h) — likely to respond
    - Gray dot: active this week (last activity < 7 days) — slower response
    - Dimmed marker: rarely active (last activity > 7 days) — still visible but less prominent
  - **Interest tags (Phase 2):** Small tag icons below marker (e.g., 🎵☕🏃)
  - **Vibe match badge (Phase 2):** If 2+ shared interests with viewer, orange "X% Vibe" badge appears
- **Merchant markers:** Square icons with business logo, distinct visual style
- **Map controls (floating):**
  - Top: mode filter toggle (Dating/Networking/Both)
  - Bottom-right: center-on-user button, zoom controls
  - Bottom-left: radius slider, timer selector
  - Top-right: Ghost Mode toggle, notification bell (with badge count)
  - **Smart radius suggestion (inline):** When density is low, a non-intrusive banner appears: "Only 3 people nearby. Expand to 10km?" with one-tap adjust

**Profile Popup (tap on marker):**
- Bottom sheet (modal bottom sheet, ~40% screen height)
- Profile photo (56dp circle), first name, age
- Mode badge, verified badge
- Activity status line: "🟢 Active now" / "🟢 Active today" / "⬜ Active 3 days ago"
- IP/ISP line: "Connected via: HKBN — Hong Kong"
- Distance: "1.2 km away"
- **Interest tags (Phase 2):** Row of tag chips (e.g., 🎵 Music ☕ Coffee 🏃 Running), shared interests highlighted in orange
- **Vibe match (Phase 2):** "87% Vibe Match (3 shared interests)" if 2+ overlap
- Action row: Poke button, Super Poke button (if available), Poke with Note button (Premium/Premium+: attach personal message), View Profile →
- Close handle at top

**Density Heatmap Overlay (Phase 2):**
- When >50 markers would overlap in visible area, auto-switch to heatmap mode
- Color zones: red/orange (30+ users), yellow (10-30), blue/green (1-10)
- Zone label: "32 people near Lan Kwai Fong"
- Tap zone → zoom in to reveal individual markers
- Toggle button to switch between heatmap and marker views
- Creates FOMO and drives exploration of popular areas

#### 4.3.2 Swipe Screen

**Card Stack Display:**
- Full-screen card showing one user at a time
- Card content:
  - Photo gallery (swipeable horizontally), max 6 photos
  - First name, age, distance, mode badge
  - Verified badge
  - IP/ISP line
  - Bio excerpt (expandable)
  - Key profile fields (interests, job title, etc.)
  - **Interest tags (Phase 2):** Row of tag chips with icons (e.g., 🎵 Music ☕ Coffee 🏃 Running)
  - **Vibe match (Phase 2):** If 2+ shared interests, orange "X% Vibe Match" badge on card
  - **Activity status:** Small indicator — 🟢 Active now / 🟢 Active today / ⬜ Active recently
- Actions below card:
  - ✕ (Pass / Left Swipe)
  - ⚡ Super Poke (if available, premium only)
  - 👆 Poke
  - 📝 Poke with Note (Premium/Premium+: attach a personal message to your Poke)
- Swipe gesture support: left = pass, right = poke
- Undo last swipe (Plus+): 1 undo/week (Plus), 3/day (Premium), unlimited (Premium+)

**Sorting:** Boosted users → Paid tier (Premium+ > Premium > Plus > Free) → Activity recency (active now → active today → active this week) → Distance

#### 4.3.3 Pokes Screen

**Tab Layout:**
- Tab 1: Incoming Pokes (received)
- Tab 2: Outgoing Pokes (sent)
- Tab 3: Matches

**Incoming Pokes Tab:**
- Poke with Note section (top, highlighted with note icon) — Premium+ sender notes ranked first
  - Poke items: profile photo, name, timestamp, note preview (truncated), "Poke Back" / "Remove" buttons
  - Premium+ notes show "⭐ Ranked" badge
- Super Pokes section (pinned, with gold border)
  - Super Poke items: profile photo, name, timestamp, "Poke Back" / "Remove" buttons
  - Never expire — persistent display
- Regular Pokes section
  - Poke items: profile photo, name, time remaining (countdown), "Poke Back" / "Remove"
  - Expired Pokes shown grayed out for 24h before removal

**Outgoing Pokes Tab:**
- Active Pokes: showing recipient, time remaining, status (pending/viewed)
- Expired Pokes: grayed out, cooldown timer showing when re-Poke available

**Matches Tab:**
- Active chats: profile photo, name, last message preview, timestamp
- New matches (chat not yet opened): "New Match!" badge, 24h timer countdown
- Expired matches: grayed out, extend/rematch options (tier-dependent)

#### 4.3.4 Chat Screen

**Chat List:**
- Active Chats section
  - Chat items: profile photo, name, mode badge, last message, timestamp, unread badge
  - 24h timer indicator for new/unactivated matches (countdown)
- Chatrooms section
  - Chatroom items: chatroom icon, name, location anchor, member count, last message
- Archived Chats section (expandable)
  - Read-only indicator
  - "Report" button on each archived chat
  - 7-day countdown until permanent deletion

**Individual Chat:**
- Header: profile photo, name, mode badge, verified badge, IP/ISP line
- Message bubbles: sent (orange right-aligned), received (cream left-aligned)
- Input bar: text field, photo attachment, send button
- If new match with 24h timer: prominent countdown bar at top
  - "Both must send a message within [X] to keep this chat alive"
- Unmatch button in header menu (⋯)
- Report button in header menu

#### 4.3.5 Profile Screen

**Profile Header:**
- Profile photo (96dp circle) with edit overlay
- Name, age, location (city only)
- Verified badge (if earned)
- Subscription tier badge
- Mode indicators (Dating/Networking)

**Profile Sections:**
- Edit Profile → Full profile editing form
- Verification → Verification status and actions
- Subscription → Current plan, upgrade/manage, billing
- Privacy & Safety → Ghost Mode, Incognito Mode, Travel Mode, blocked users
- Settings → Notifications, language, theme
- Support → Help center, report a problem, contact us
- About → App version, terms, privacy policy, licenses
- Log Out
- Delete Account (with confirmation and 30-day grace period)

### 4.4 Push Notification Types

| Notification | Trigger | Action on Tap |
|-------------|---------|---------------|
| New Poke | Incoming Poke received | Open Pokes screen |
| Super Poke | Incoming Super Poke | Open Pokes screen (Super section) |
| New Match | Mutual Poke detected | Open Chat with new match |
| Chat Timer Warning | 6h remaining on activation timer | Open Chat |
| Chat Expiring | 1h remaining on activation timer | Open Chat |
| New Message | Chat message received | Open specific Chat |
| Chatroom Activity | New message in joined chatroom | Open Chatroom |
| Poke Expiring | 1h remaining on sent Poke | Open Pokes (Outgoing) |
| Subscription Renewal | 3 days before renewal | Open Subscription management |
| Verification Approved | Verification completed | Open Profile |
| Report Update | Report status changed | Open Report status view |
| Profile Boost Active | Boost activated | Open Map (centered on user) |

### 4.5 Platform-Specific Requirements

**iOS:**
- Apple Sign In required (App Store guideline 4.8)
- In-App Purchase for subscriptions (App Store guideline 3.1.1)
- Location permissions: "When in Use" and "Always" (with justification)
- APNs for push notifications
- Face ID/Touch ID for app lock (optional feature)

**Android:**
- Google Play Billing for in-app purchases
- FCM for push notifications
- Background location permission (with clear justification)
- Biometric prompt for app lock (optional)

---

## 5. Shared Backend Requirements

### 5.1 Authentication Service

- **OAuth 2.0** integration for Facebook, Instagram, LinkedIn, Google, Apple
- **JWT tokens** for session management (access token: 15min, refresh token: 7 days)
- **Phone verification:** SMS OTP via Twilio or equivalent
- **Rate limiting:** 5 login attempts per 15 minutes per IP
- **Session management:** one active session per device, max 3 devices per user

### 5.2 User Service

- CRUD operations for user profiles
- Profile completeness validation before map visibility
- Mode switching (Dating ↔ Networking ↔ Both)
- Block/unblock management
- Report creation and tracking

### 5.3 Location Service

- **Real-time GPS updates** via WebSocket connection
- **Location fuzzing:** server-side 50m randomization before storage/display
- **Disappearing timer:** background job to remove markers after timer expiry
- **Radius filtering:** server-side distance calculation using PostGIS
- **Background location:** accept periodic location pings when app is backgrounded

### 5.4 Poke Service

- **Regular Poke creation** with 24h expiration TTL
- **Super Poke creation** with no expiration, priority sorting
- **Match detection:** on Poke creation, check if recipient has active Poke to sender
- **Cooldown tracking:** 7-day cooldown per (sender, recipient) pair
- **Rate limiting:** tier-based daily Poke limits (5/25/∞/∞)

### 5.5 Chat Service

- **Chat creation** on Match event
- **24-hour activation timer:** background job to expire chats if both users don't send a first message within 24h
- **7-day inactivity expiry:** once chat is activated (both users have sent first message), the chat remains active as long as there is activity within the tier-dependent inactivity window (Free/Plus: 7 days, Premium: 14 days, Premium+: 30 days). If no messages are sent within this period, the chat expires and the Match is dissolved.
- **Message storage** with end-to-end encryption
- **Extend and rematch** operations (tier-gated)
- **Poke with Note:** Premium users can attach a 200-character personal message to any Poke, giving the recipient context. Premium+ users get 500-character notes and their Pokes with Notes are ranked higher in the recipient's Poke inbox. The recipient still must Poke back to create a Match — no DM bypass.
- **Unmatch processing:** move chat to archived, start 7-day retention timer
- **Archived chat management:** permanent deletion after 7 days (unless active report)
- **Report retention:** extend chat data retention to 90 days for reported conversations

### 5.6 Notification Service

- **Push notification dispatch** via FCM (Android) and APNs (iOS)
- **Email notifications** for critical events via SendGrid/SES
- **Notification preferences:** user-configurable per type
- **Batch processing:** consolidate multiple notifications of same type within 5 minutes

### 5.7 Subscription Service

- **Plan management:** create, update, cancel subscriptions
- **Billing cycle management:** 1 week, 1 month, 3 months, 6 months, 12 months
- **Auto-renewal handling** with receipt validation (Apple/Google)
- **Grace period:** 3 days for payment failures before feature downgrade
- **Tier gating:** middleware to check subscription level before allowing features
- **Payment methods:** Stripe (card, Alipay HK, WeChat Pay HK, FPS) + platform IAP

### 5.8 Verification Service

- **Phone verification (compulsory):** SMS OTP during registration, max 3 attempts, 10-minute expiry. All users must complete phone verification before account activation.
- **Social account linking:** OAuth token exchange, follower/connection count verification. Required for verified badge (Instagram 50+ followers OR LinkedIn 50+ connections).
- **Facial recognition:** API call to Jumio/Onfido/Veriff, webhook for result. Optional but incentivized.
- **Badge management:** verified badge = phone (compulsory) + social account (verified). Update verified status, handle verification expiry.

### 5.9 Moderation Service

- **Report intake:** receive and categorize user reports
- **Automated triage:** keyword/behavioral flagging for immediate action
- **Human moderation queue:** admin dashboard for manual review
- **Action execution:** warnings, suspensions, bans with audit trail
- **Appeal processing:** receive and review appeal submissions

---

## 6. Admin Dashboard Requirements

### 6.1 Admin Authentication

- **Login:** email + password + MFA (TOTP or hardware key)
- **Session:** 8-hour session timeout, re-auth for sensitive operations
- **RBAC:** role-based access control with predefined roles:
  - **Super Admin:** full access, can manage other admins
  - **Admin:** full CRUD on users, content moderation, analytics
  - **Moderator:** view users, moderate content, issue warnings/suspensions (no delete)
  - **Support:** view users (limited fields), handle reports, no edit/delete

### 6.2 User Management

**User List View:**
- Sortable, filterable, paginated table of all registered users
- Columns: ID, name, email, phone, mode, verification status, subscription tier, registration date, last active, status
- Filters: verification status, subscription tier, mode, registration date range, status (active/suspended/banned)
- Search: by name, email, phone, user ID
- Bulk actions: export CSV, batch suspend, batch verify

**User Detail View (all database fields):**
- **Profile Information:** all profile fields (name, email, phone, bio, photos, interests, etc.)
- **Verification Data:** phone verified (yes/no), social accounts linked, facial verification status, verified badge status
- **Authentication:** login method, last login IP, last login timestamp, device info, session count
- **IP/ISP Records:** historical IP/ISP data with timestamps (for investigation)
- **Subscription:** current plan, billing cycle, start date, renewal date, payment method, transaction history
- **Location Data:** current/last known location (fuzzed), map visibility status, ghost mode status, timer setting
- **Social Activity:** Poke count (sent/received), Match count, Chat count, Chatroom memberships, Reports filed
- **Moderation History:** warnings received, suspensions, bans, reports against this user, appeal history
- **Actions:** Edit any field, verify/unverify, suspend (with duration and reason), ban (with reason), delete (with confirmation), reset password, grant/revoke subscription

**User Edit Form:**
- Editable fields for all user data (inline editing or modal form)
- Field-level audit logging: every field change recorded with old value, new value, admin, timestamp
- Validation: server-side validation on all edits
- Confirmation required for destructive actions (ban, delete)

### 6.3 Content Moderation

- **Reports Queue:** incoming user reports sorted by severity and timestamp
  - Report details: reporter, reported user, category, description, attached screenshots
  - Reported content preview: profile snapshot, chat messages (decrypted for moderation)
  - Quick actions: dismiss, warn, suspend (with template messages), ban, escalate
- **Flagged Content:** auto-flagged content by automated systems
  - Inappropriate photos, suspicious behavior patterns, spam detection
- **Appeals Queue:** user appeals against moderation actions
  - Review original action, appeal reason, make decision

### 6.4 Analytics Dashboard

**Real-time Metrics:**
- Active users (now, today, this week, this month)
- New registrations (today, this week, this month)
- Active map markers, active chats, active chatrooms
- Pokes sent (regular + Super), matches created
- Reports filed, reports resolved, average resolution time

**Growth Metrics:**
- User growth chart (daily, weekly, monthly)
- Verified user rate trend
- Subscription conversion funnel
- Revenue by tier
- Geographic distribution (heatmap)

**Engagement Metrics:**
- Average session duration
- Messages per match
- Chat activation rate (% of matches where both send first message)
- Retention: Day-1, Day-7, Day-30
- Feature usage: map vs. swipe vs. chatrooms

### 6.5 System Administration

- **System health:** API response times, error rates, server resource usage
- **API monitoring:** Google Maps API usage, facial verification API usage, push notification delivery rates
- **Database monitoring:** query performance, connection pool status, storage usage
- **Audit log:** all admin actions with filtering and search
- **Admin user management:** create, edit, deactivate admin accounts (Super Admin only)

---

## 7. Database Schema

### 7.1 Core Tables

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    phone_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255), -- for admin accounts
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20),
    bio TEXT,
    mode VARCHAR(20) CHECK (mode IN ('dating', 'networking', 'both')) DEFAULT 'dating',
    profile_complete BOOLEAN DEFAULT FALSE,
    is_visible BOOLEAN DEFAULT FALSE, -- visible on map
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ,
    status VARCHAR(20) CHECK (status IN ('active', 'suspended', 'banned', 'deleted')) DEFAULT 'active',
    deleted_at TIMESTAMPTZ
);

-- Social accounts linked to users
CREATE TABLE social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('facebook', 'linkedin', 'google', 'apple', 'instagram')),
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    followers_count INTEGER, -- for Instagram
    connections_count INTEGER, -- for LinkedIn
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

-- User photos
CREATE TABLE user_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    photo_url VARCHAR(500) NOT NULL,
    photo_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dating profile fields
CREATE TABLE dating_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    gender_preference VARCHAR(50),
    relationship_goal VARCHAR(50),
    interests TEXT[],
    lifestyle_habits TEXT,
    height INTEGER,
    education VARCHAR(100),
    occupation VARCHAR(100),
    drinking VARCHAR(20),
    smoking VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interest tags (Phase 2) — standardized tags for vibe matching
CREATE TABLE interest_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL, -- 'going_out', 'active', 'creative', 'chill', 'professional'
    name VARCHAR(100) NOT NULL,
    emoji VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User selected interest tags (Phase 2)
CREATE TABLE user_interest_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES interest_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, tag_id)
);

-- Networking profile fields
CREATE TABLE networking_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_employer VARCHAR(200),
    job_title VARCHAR(200),
    industry VARCHAR(100),
    years_of_experience INTEGER,
    professional_skills TEXT[],
    career_objectives TEXT,
    linkedin_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification records
CREATE TABLE verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    verification_type VARCHAR(20) CHECK (verification_type IN ('phone', 'social', 'facial')),
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected', 'expired')) DEFAULT 'pending',
    provider VARCHAR(50), -- for facial: jumio, onfido, veriff
    provider_session_id VARCHAR(255),
    result_data JSONB,
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verified badge status
CREATE TABLE verified_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    badge_type VARCHAR(20) CHECK (badge_type IN ('basic', 'premium')),
    is_active BOOLEAN DEFAULT TRUE,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- User location data
CREATE TABLE user_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    display_latitude DECIMAL(10, 8), -- fuzzed for display
    display_longitude DECIMAL(11, 8), -- fuzzed for display
    isp_name VARCHAR(200),
    ip_city VARCHAR(100),
    ip_region VARCHAR(100),
    is_ghost_mode BOOLEAN DEFAULT FALSE,
    location_visibility VARCHAR(20) CHECK (location_visibility IN ('accurate', 'district', 'ghost')) DEFAULT 'accurate',
    display_district VARCHAR(100), -- shown in District Mode (e.g., 'Central')
    disappearing_timer_minutes INTEGER DEFAULT 30,
    timer_expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Pokes
CREATE TABLE pokes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    poke_type VARCHAR(10) CHECK (poke_type IN ('regular', 'super', 'note', 'sponsored')) DEFAULT 'regular',
    note_text VARCHAR(500), -- for Poke with Note (200 chars Premium, 500 chars Premium+)
    is_ranked_note BOOLEAN DEFAULT FALSE, -- TRUE for Premium+ Pokes with Notes (ranked higher)
    sponsor_merchant_id UUID REFERENCES merchant_accounts(id), -- NULL for user Pokes, set for Sponsored Pokes
    sponsor_type VARCHAR(20) CHECK (sponsor_type IS NULL OR sponsor_type IN ('blast', 'targeted', 'individual')), -- NULL for user Pokes
    sponsor_bid_amount DECIMAL(10,4), -- cost per Sponsored Poke delivery
    status VARCHAR(20) CHECK (status IN ('active', 'expired', 'removed', 'matched')) DEFAULT 'active',
    expires_at TIMESTAMPTZ, -- NULL for Super Pokes
    cooldown_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT no_self_poke CHECK (sender_id != receiver_id)
);

-- Matches
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_b_id UUID REFERENCES users(id) ON DELETE CASCADE,
    poke_a_id UUID REFERENCES pokes(id),
    poke_b_id UUID REFERENCES pokes(id),
    status VARCHAR(20) CHECK (status IN ('active', 'expired', 'unmatched')) DEFAULT 'active',
    activation_expires_at TIMESTAMPTZ, -- 24h timer
    both_messaged BOOLEAN DEFAULT FALSE,
    last_activity_at TIMESTAMPTZ, -- tracks last message for inactivity expiry
    inactivity_expires_at TIMESTAMPTZ, -- expires after tier-dependent inactivity period
    unmatched_by UUID REFERENCES users(id),
    unmatched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_match_pair UNIQUE (user_a_id, user_b_id)
);

-- Chats
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('active', 'expired', 'archived', 'deleted')) DEFAULT 'active',
    archived_at TIMESTAMPTZ,
    archived_delete_at TIMESTAMPTZ, -- 7 days after archive
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL, -- encrypted
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice', 'video_call', 'system')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Archived chats (for reporting after unmatch)
CREATE TABLE archived_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(id),
    user_id UUID REFERENCES users(id),
    match_id UUID REFERENCES matches(id),
    other_user_id UUID REFERENCES users(id),
    is_read_only BOOLEAN DEFAULT TRUE,
    has_report BOOLEAN DEFAULT FALSE,
    report_retention_until TIMESTAMPTZ, -- extended to 90 days if reported
    permanent_delete_at TIMESTAMPTZ, -- 7 days after archive (or 90 if reported)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chatrooms
CREATE TABLE chatrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_name VARCHAR(200),
    radius_meters INTEGER DEFAULT 500,
    max_members INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chatroom members
CREATE TABLE chatroom_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatroom_id UUID REFERENCES chatrooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'creator')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(chatroom_id, user_id)
);

-- Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tier VARCHAR(20) CHECK (tier IN ('free', 'plus', 'premium', 'premium+')) DEFAULT 'free',
    billing_duration VARCHAR(20) CHECK (billing_duration IN ('1_week', '1_month', '3_months', '6_months', '12_months')),
    status VARCHAR(20) CHECK (status IN ('active', 'cancelled', 'expired', 'grace_period')) DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT TRUE,
    payment_provider VARCHAR(20) CHECK (payment_provider IN ('stripe', 'apple', 'google')),
    provider_subscription_id VARCHAR(255),
    amount_cents INTEGER,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Merchant accounts
CREATE TABLE merchant_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_name VARCHAR(200) NOT NULL,
    business_email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    business_category VARCHAR(100),
    logo_url VARCHAR(500),
    description TEXT,
    website_url VARCHAR(500),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone VARCHAR(20),
    operating_hours JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    subscription_tier VARCHAR(20) CHECK (subscription_tier IN ('monthly', 'quarterly', 'annual')),
    subscription_status VARCHAR(20) DEFAULT 'active',
    pin_direction VARCHAR(20), -- direction/position of map pin
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Merchant promotions
CREATE TABLE merchant_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchant_accounts(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Merchant coupons
CREATE TABLE merchant_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchant_accounts(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed_amount', 'buy_x_get_y')),
    discount_value DECIMAL(10,2),
    original_price DECIMAL(10,2),
    discounted_price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'HKD',
    total_quantity INTEGER,
    claimed_quantity INTEGER DEFAULT 0,
    max_per_user INTEGER DEFAULT 1,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Merchant packages
CREATE TABLE merchant_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchant_accounts(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'HKD',
    items JSONB, -- list of included items
    image_url VARCHAR(500),
    total_quantity INTEGER,
    sold_quantity INTEGER DEFAULT 0,
    max_per_user INTEGER DEFAULT 1,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupon/package transactions (for tiered commission tracking: 12%/10%/8%)
CREATE TABLE merchant_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchant_accounts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    item_type VARCHAR(20) CHECK (item_type IN ('coupon', 'package')),
    item_id UUID NOT NULL,
    transaction_amount DECIMAL(10,2) NOT NULL,
    commission_rate DECIMAL(5,4) NOT NULL, -- 0.12 (Monthly), 0.10 (Quarterly), 0.08 (Annual)
    commission_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'HKD',
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'refunded')) DEFAULT 'pending',
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id),
    reported_user_id UUID REFERENCES users(id),
    category VARCHAR(50) NOT NULL,
    description TEXT,
    evidence_urls TEXT[],
    related_chat_id UUID REFERENCES chats(id),
    related_message_id UUID REFERENCES messages(id),
    status VARCHAR(20) CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')) DEFAULT 'pending',
    resolution VARCHAR(50),
    resolved_by UUID, -- admin user id
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blocks
CREATE TABLE blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- Profile boosts
CREATE TABLE profile_boosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE
);

-- Poke quality tracking (Phase 3 — anti-spam priority signal)
CREATE TABLE poke_quality_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    pokes_sent_7d INTEGER DEFAULT 0,
    pokes_reciprocated_7d INTEGER DEFAULT 0,
    matches_created_7d INTEGER DEFAULT 0,
    reciprocity_rate DECIMAL(5,4) DEFAULT 1.0, -- reciprocated / sent (1.0 = good)
    quality_tier VARCHAR(10) CHECK (quality_tier IN ('high', 'normal', 'low')) DEFAULT 'normal',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Quality tier rules:
--   high: reciprocity_rate >= 0.3 AND pokes_sent_7d <= 25 → full visibility
--   normal: default → standard visibility
--   low: reciprocity_rate < 0.1 AND pokes_sent_7d > 50 → lowered swipe priority,
--         Pokes delivered to bottom of recipient queue. Recovers after 3 days of
--         normal behavior.

-- Daily check-in streaks
CREATE TABLE daily_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_check_in_date DATE,
    streak_froze_used_this_week INTEGER DEFAULT 0, -- max 1 (Premium), 3 (Premium+)
    total_pokes_earned INTEGER DEFAULT 0,
    search_ranking_boost DECIMAL(3,2) DEFAULT 1.0, -- 1.0 = normal, higher = boosted by streak
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Streak reward schedule:
--   Day 1-2: +2 Regular Pokes
--   Day 3-5: +3 Regular Pokes
--   Day 6: +5 Regular Pokes
--   Day 7: +5 Regular Pokes + 1 Super Poke
--   Streak breaks reset to Day 1.
--   Search ranking boost: 7+ day streak = 1.2x, 14+ = 1.5x, 30+ = 2.0x

-- Affiliate referral tracking
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES users(id) ON DELETE CASCADE,
    referral_code VARCHAR(50) UNIQUE NOT NULL, -- referrer's unique code
    referred_phone_verified BOOLEAN DEFAULT FALSE,
    referred_profile_completed BOOLEAN DEFAULT FALSE,
    pokes_awarded_referrer INTEGER DEFAULT 0, -- +5 base, +3 for phone, +2 for profile = max 10
    pokes_awarded_referred INTEGER DEFAULT 5, -- +5 for new user
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(referrer_id, referred_id)
);

-- Referrer monthly tier tracking
CREATE TABLE referrer_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL, -- '2026-08'
    referral_count INTEGER DEFAULT 0,
    tier VARCHAR(20) CHECK (tier IN ('standard', 'ambassador', 'champion', 'legend')) DEFAULT 'standard',
    pokes_per_referral INTEGER DEFAULT 5, -- 5 (standard), 7 (ambassador), 10 (champion), 15 (legend)
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Tier thresholds: standard (1-5), ambassador (6-15), champion (16-30), legend (31+)

-- Merchant QR code scans
CREATE TABLE merchant_qr_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    merchant_id UUID REFERENCES merchant_accounts(id) ON DELETE CASCADE,
    pokes_awarded INTEGER NOT NULL,
    super_poke_awarded BOOLEAN DEFAULT FALSE, -- Premium+ only
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT one_scan_per_merchant_per_day EXCLUDE (
        user_id WITH =,
        merchant_id WITH =,
        date_trunc('day', scanned_at) WITH =
    )
);

-- Merchant QR codes
CREATE TABLE merchant_qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID UNIQUE REFERENCES merchant_accounts(id) ON DELETE CASCADE,
    qr_code_url VARCHAR(500) NOT NULL,
    deep_link VARCHAR(200) NOT NULL, -- meshpoke://checkin/merchant/{id}
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sponsored Poke campaigns (merchant advertising)
CREATE TABLE sponsored_poke_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID REFERENCES merchant_accounts(id) ON DELETE CASCADE,
    campaign_type VARCHAR(20) CHECK (campaign_type IN ('blast', 'targeted', 'individual')) NOT NULL,
    title VARCHAR(200) NOT NULL,
    promotion_text VARCHAR(500) NOT NULL,
    target_radius_km DECIMAL(5,1), -- for blast/targeted
    target_mode VARCHAR(20), -- 'dating', 'networking', or NULL for both
    target_age_min INTEGER,
    target_age_max INTEGER,
    bid_per_user DECIMAL(10,4) NOT NULL, -- USD 0.10/0.25/0.50
    budget_total DECIMAL(10,2) NOT NULL,
    budget_spent DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('draft', 'active', 'paused', 'completed', 'exhausted')) DEFAULT 'draft',
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sponsored Poke deliveries (track per-user delivery)
CREATE TABLE sponsored_poke_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES sponsored_poke_campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    poke_id UUID REFERENCES pokes(id), -- the sponsored poke record
    delivered_at TIMESTAMPTZ DEFAULT NOW(),
    dismissed_at TIMESTAMPTZ,
    engaged_at TIMESTAMPTZ, -- user tapped to view deal
    cost DECIMAL(10,4) NOT NULL, -- actual cost for this delivery
    UNIQUE(campaign_id, user_id, date_trunc('day', delivered_at))
);
-- Anti-spam: global per-user limits checked before delivery
--   max 1 Sponsored Poke per user per day
--   max 3 Sponsored Pokes per user per week
--   conflicts resolved by highest bid first

-- Admin users
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(200) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('super_admin', 'admin', 'moderator', 'support')) DEFAULT 'admin',
    mfa_secret VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admin_users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- IP/ISP history (for trust and investigation)
CREATE TABLE ip_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45) NOT NULL,
    isp_name VARCHAR(200),
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription plan pricing
CREATE TABLE plan_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier VARCHAR(20) CHECK (tier IN ('plus', 'premium', 'premium+')),
    duration VARCHAR(20) CHECK (duration IN ('1_week', '1_month', '3_months', '6_months', '12_months')),
    price_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    display_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.2 Indexes

```sql
-- Performance-critical indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_mode ON users(mode);
CREATE INDEX idx_users_location ON user_locations USING GIST (point(display_longitude, display_latitude));
CREATE INDEX idx_pokes_receiver ON pokes(receiver_id, status, created_at);
CREATE INDEX idx_pokes_sender ON pokes(sender_id, status, created_at);
CREATE INDEX idx_pokes_expires ON pokes(expires_at) WHERE status = 'active';
CREATE INDEX idx_matches_users ON matches(user_a_id, user_b_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_chats_status ON chats(status);
CREATE INDEX idx_messages_chat ON messages(chat_id, created_at);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id, status);
CREATE INDEX idx_reports_status ON reports(status, created_at);
CREATE INDEX idx_audit_log_admin ON audit_log(admin_id, created_at);
CREATE INDEX idx_audit_log_target ON audit_log(target_type, target_id);
CREATE INDEX idx_ip_history_user ON ip_history(user_id, recorded_at);
CREATE INDEX idx_archived_chats_user ON archived_chats(user_id, permanent_delete_at);
```

---

## 8. API Specification

### 8.1 Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account with social login token |
| POST | `/api/auth/login` | Email/password login (admin) |
| POST | `/api/auth/refresh` | Refresh JWT access token |
| POST | `/api/auth/logout` | Invalidate refresh token |
| POST | `/api/auth/phone/verify` | Send SMS OTP |
| POST | `/api/auth/phone/confirm` | Confirm SMS OTP |

### 8.2 User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get current user profile |
| PUT | `/api/users/me` | Update current user profile |
| GET | `/api/users/:id` | Get public profile of another user |
| POST | `/api/users/me/photos` | Upload profile photo |
| DELETE | `/api/users/me/photos/:photoId` | Delete profile photo |
| POST | `/api/users/me/social` | Link social account |
| DELETE | `/api/users/me/social/:provider` | Unlink social account |
| DELETE | `/api/users/me` | Delete account (30-day grace) |

### 8.3 Location Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/location` | Update current location |
| GET | `/api/location/nearby` | Get nearby users (map view) |
| PUT | `/api/location/settings` | Update timer, visibility mode (accurate/district/ghost), radius |
| POST | `/api/location/ghost-now` | Instant Ghost Mode toggle (one-tap) |
| WS | `/ws/location` | Real-time location WebSocket |

### 8.4 Poke Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pokes` | Send a Poke (regular, Super, or with Note) |
| GET | `/api/pokes/incoming` | Get incoming Pokes |
| GET | `/api/pokes/outgoing` | Get outgoing Pokes |
| DELETE | `/api/pokes/:id` | Remove a Poke |
| GET | `/api/pokes/cooldown/:userId` | Check cooldown status |

### 8.5 Match & Chat Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/matches` | Get all matches |
| POST | `/api/matches/:id/extend` | Extend chat activation timer |
| POST | `/api/matches/:id/rematch` | Rematch expired connection |
| DELETE | `/api/matches/:id` | Unmatch |
| GET | `/api/chats` | Get all chats |
| GET | `/api/chats/:id/messages` | Get chat messages (paginated) |
| POST | `/api/chats/:id/messages` | Send message (text, image, or voice) |
| POST | `/api/chats/:id/voice` | Upload voice message |
| POST | `/api/chats/:id/images` | Upload chat image |
| POST | `/api/chats/:id/video-call` | Initiate WebRTC video call |
| GET | `/api/chats/archived` | Get archived chats (read-only) |
| POST | `/api/chats/archived/:id/report` | Report from archived chat |

### 8.6 Chatroom Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chatrooms` | Get nearby chatrooms |
| POST | `/api/chatrooms` | Create chatroom |
| POST | `/api/chatrooms/:id/join` | Join chatroom |
| DELETE | `/api/chatrooms/:id/leave` | Leave chatroom |
| GET | `/api/chatrooms/:id/messages` | Get chatroom messages |
| POST | `/api/chatrooms/:id/messages` | Send chatroom message |

**Chatroom Downgrade Handling:** When a user's subscription is downgraded, chatrooms they created that exceed the new plan's maximum member limit are not destroyed. The chatrooms remain active and all existing members can continue chatting. However, no new members can be added to those chatrooms until the member count naturally falls below the new plan's maximum limit. The API enforces this by checking `current_member_count <= plan_max_members` before allowing a join.

### 8.7 Subscription Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscriptions/plans` | Get all available plans with pricing |
| POST | `/api/subscriptions/subscribe` | Subscribe to a plan |
| PUT | `/api/subscriptions/change` | Change plan tier or duration |
| POST | `/api/subscriptions/cancel` | Cancel subscription |
| GET | `/api/subscriptions/current` | Get current subscription details |
| POST | `/api/subscriptions/restore` | Restore subscription (platform IAP) |
| POST | `/api/webhooks/stripe` | Stripe webhook handler |
| POST | `/api/webhooks/apple` | Apple App Store Server Notification |
| POST | `/api/webhooks/google` | Google Play Real-time Developer Notification |

### 8.8 Verification Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verification/phone` | Initiate phone verification |
| POST | `/api/verification/social` | Link and verify social account |
| POST | `/api/verification/facial` | Initiate facial verification |
| GET | `/api/verification/status` | Get overall verification status |

### 8.9 Report & Moderation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reports` | File a report |
| GET | `/api/reports/mine` | Get user's filed reports |
| POST | `/api/blocks` | Block a user |
| DELETE | `/api/blocks/:userId` | Unblock a user |

### 8.10 Streak & Check-In Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/streak/check-in` | Daily check-in (awards Pokes based on streak day) |
| GET | `/api/streak/status` | Get current streak, rewards, and streak freeze count |
| POST | `/api/streak/freeze` | Use a streak freeze (Premium: 1/week, Premium+: 3/week) |

### 8.11 Referral Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/referrals/link` | Get user's unique referral link and QR code |
| GET | `/api/referrals/stats` | Get monthly referral count, tier, and Pokes earned |
| GET | `/api/referrals/leaderboard` | Get monthly referral leaderboard (top referrers) |
| POST | `/api/referrals/claim` | Claim accumulated referral + daily Pokes (launch day) |

### 8.12 Merchant QR & Scan Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/merchant/scan` | Scan merchant QR code and award Pokes |
| GET | `/api/merchant/:id/qr` | Get merchant's QR code (merchant dashboard) |
| GET | `/api/merchant/:id/scans` | Get scan analytics for merchant |

### 8.13 Sponsored Poke Endpoints (Merchant)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/merchant/sponsored-pokes` | Create Sponsored Poke campaign |
| GET | `/api/merchant/sponsored-pokes` | List merchant's campaigns |
| PUT | `/api/merchant/sponsored-pokes/:id` | Update campaign (pause/resume/edit) |
| GET | `/api/merchant/sponsored-pokes/:id/stats` | Get campaign delivery stats |
| GET | `/api/user/sponsored-pokes/settings` | Get user's Sponsored Poke preferences (opt-in/out) |
| PUT | `/api/user/sponsored-pokes/settings` | Update Sponsored Poke preferences |

### 8.14 Voice Verify Endpoints (Phase 2)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/verification/voice` | Upload 5-second voice clip for profile |
| GET | `/api/users/:id/voice` | Get user's voice verify clip |
| DELETE | `/api/verification/voice` | Remove own voice clip |

### 8.15 Report & Moderation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reports` | File a report |
| GET | `/api/reports/mine` | Get user's filed reports |
| POST | `/api/blocks` | Block a user |
| DELETE | `/api/blocks/:userId` | Unblock a user |

### 8.16 Admin Endpoints (Auth-gated, RBAC)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin login (MFA) |
| GET | `/api/admin/users` | List all users (paginated, filterable) |
| GET | `/api/admin/users/:id` | Get full user detail (all fields) |
| PUT | `/api/admin/users/:id` | Edit user data |
| DELETE | `/api/admin/users/:id` | Delete user |
| POST | `/api/admin/users` | Create user (manual) |
| POST | `/api/admin/users/bulk` | Bulk operations |
| GET | `/api/admin/reports` | List reports (filterable) |
| PUT | `/api/admin/reports/:id` | Update report (resolve, escalate) |
| GET | `/api/admin/analytics/overview` | Dashboard analytics |
| GET | `/api/admin/analytics/growth` | Growth metrics |
| GET | `/api/admin/analytics/engagement` | Engagement metrics |
| GET | `/api/admin/audit-log` | Audit log (filterable) |
| GET | `/api/admin/system/health` | System health check |
| POST | `/api/admin/admins` | Create admin (Super Admin only) |
| PUT | `/api/admin/admins/:id` | Edit admin (Super Admin only) |

---

## 9. Design System Implementation

### 9.1 Web (Tailwind Configuration)

All web components implement the Zapier-inspired design system from DESIGN.md.

**Tailwind Config (`tailwind.config.ts`):**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'zapier-black': '#201515',
        'cream-white': '#fffefb',
        'off-white': '#fffdf9',
        'zapier-orange': '#ff4f00',
        'dark-charcoal': '#36342e',
        'warm-gray': '#939084',
        'sand': '#c5c0b1',
        'light-sand': '#eceae3',
        'mid-warm': '#b5b2aa',
      },
      fontFamily: {
        display: ['"Degular Display"', 'sans-serif'],
        body: ['Inter', 'Helvetica', 'Arial', 'sans-serif'],
        editorial: ['"GT Alpina"', 'serif'],
      },
      spacing: {
        '1': '1px',
        '4': '4px',
        '6': '6px',
        '10': '10px',
        '12': '12px',
        '20': '20px',
        '24': '24px',
        '32': '32px',
        '40': '40px',
        '48': '48px',
        '56': '56px',
        '64': '64px',
        '72': '72px',
      },
      borderRadius: {
        'tight': '3px',
        'standard': '4px',
        'content': '5px',
        'comfortable': '8px',
        'social': '14px',
        'pill': '20px',
      },
      boxShadow: {
        'active-tab': 'rgb(255, 79, 0) 0px -4px 0px 0px inset',
        'hover-tab': 'rgb(197, 192, 177) 0px -4px 0px 0px inset',
      },
    },
  },
  plugins: [],
}

export default config
```

### 9.2 Flutter Theme

Flutter app uses a parallel theme implementing the same color palette and typography principles adapted for Material Design 3.

### 9.3 Component Library

Shared UI components (web):
- `Button` (Primary Orange, Primary Dark, Light/Ghost, Pill)
- `Card` (sand-bordered, no shadow)
- `Input` (cream background, sand border, orange focus)
- `Navigation` (sticky cream header, inset shadow tabs)
- `TabNav` (inset box-shadow underline)
- `Footer` (dark background, multi-column)
- `Badge` (verified, tier, savings)
- `Accordion` (for FAQ and support sections)
- `Counter` (animated number display)
- `PlanCard` (subscription tier card)
- `PriceToggle` (billing duration selector)

---

## 10. Hong Kong Market Localization

### 10.1 Payment Methods

| Method | Type | Integration |
|--------|------|-------------|
| Credit/Debit Card | Visa, Mastercard, UnionPay | Stripe |
| Apple Pay | Mobile wallet | Stripe / Apple IAP |
| Google Pay | Mobile wallet | Stripe / Google Play Billing |
| Alipay HK | Mobile payment | Stripe |
| WeChat Pay HK | Mobile payment | Stripe |
| FPS (Faster Payment System) | Bank transfer | Stripe (planned) |

### 10.2 Pricing (HKD)

All prices displayed in HKD alongside USD. Conversion rate: 1 USD ≈ 7.8 HKD.

### 10.3 Legal Compliance

- **Personal Data (Privacy) Ordinance (PDPO):** Full compliance with Hong Kong's data privacy law
  - Data Protection Principles (DPPs) 1-6 adherence
  - Appoint Data Protection Officer (DPO)
  - Data Access Request handling within 40 days
  - Cross-border data transfer restrictions compliance
- **Age of Majority:** 18 years in Hong Kong; app restricted to 18+
- **Consumer Rights:** Compliance with Trade Descriptions Ordinance
- **Electronic Transactions:** Compliance with Electronic Transactions Ordinance

### 10.4 Content Localization

- **Primary Language:** English
- **Secondary Language (Phase 2):** Traditional Chinese (繁體中文)
- **Cultural considerations:**
  - MTR station names and district names as location anchors
  - Hong Kong-specific dating culture references
  - Local event calendar integration (Phase 3)
  - Support for Hong Kong holidays and events

### 10.5 Emergency Resources (Hong Kong-Specific)

- Emergency: 999
- Police Non-emergency: 2527 7177
- Anti-Deception Hotline: 18222
- Cyber Security Bureau: 2860 5012
- Social Welfare Dept: 2343 2255
- Samaritans HK: 2389 2222
- RainLily (Sexual Violence): 2375 5322
- Personal Data Privacy Commissioner: 2827 2827

---

## 11. Non-Functional Requirements

### 11.1 Performance

| Metric | Target |
|--------|--------|
| API Response Time (p95) | < 200ms |
| Map Marker Load Time | < 500ms for 100 markers |
| Chat Message Delivery | < 1 second |
| Page Load Time (Web) | < 2 seconds (LCP) |
| App Cold Start | < 3 seconds |
| App Warm Start | < 1 second |

### 11.2 Scalability

- Target: 10,000 concurrent users at launch, scalable to 100,000
- Database: read replicas for location queries, connection pooling (PgBouncer)
- Caching: Redis for session data, nearby user lists, subscription status
- CDN: CloudFlare for static assets and media
- WebSocket: horizontal scaling via Redis pub/sub adapter

### 11.3 Security

- **Encryption:** TLS 1.3 in transit, AES-256 at rest
- **Authentication:** JWT with short-lived access tokens (15min), secure refresh tokens
- **Rate Limiting:** per-endpoint and per-user rate limits
- **Input Validation:** server-side validation on all user inputs
- **SQL Injection:** parameterized queries via ORM (Prisma/Sequelize)
- **XSS:** output encoding, CSP headers
- **CSRF:** SameSite cookies, CSRF tokens
- **File Upload:** virus scanning, file type validation, size limits (5MB photos)
- **Dependency Scanning:** automated vulnerability scanning (npm audit, Snyk)
- **Security Headers:** HSTS, X-Content-Type-Options, X-Frame-Options
- **Penetration Testing:** annual third-party pen test before major releases

### 11.4 Availability

- **Uptime Target:** 99.9% (excluding maintenance windows)
- **Monitoring:** health check endpoints, automated alerting
- **Backup:** daily automated database backups, point-in-time recovery
- **Disaster Recovery:** multi-AZ deployment, RPO < 1 hour, RTO < 4 hours

### 11.5 Privacy

- **Data Minimization:** collect only what's necessary
- **Purpose Limitation:** use data only for stated purposes
- **Storage Limitation:** delete data when no longer needed
- **Transparency:** clear privacy policy, in-app data usage explanations
- **User Rights:** data access, correction, deletion, portability
- **Children:** strict 18+ policy, age verification at registration

---

## 12. Implementation Phases

### Pre-Launch Campaign (Weeks 1-8 before app launch)

**Landing Page & Registration:**
- [ ] "Reserve Your Spot" landing page with username reservation
- [ ] Social login for 10-second signup (Google/Facebook)
- [ ] Live registration counter display
- [ ] Founding Member badge logic in database
- [ ] Poke accumulation tracker (2 Pokes/day from registration to launch, max 200)
- [ ] Affiliate referral link system (meshpoke.com/r/Username with QR code)
- [ ] Referral tier tracking (Standard → Ambassador → Champion → Legend)
- [ ] Anti-fraud: same phone/device = 1 registration only

**Email Sequence:**
- [ ] Welcome email with username confirmation
- [ ] Profile builder email (Day 3) with web profile builder link
- [ ] Map density preview email (Day 7) with anonymized heatmap
- [ ] Phone verification prompt email (Day 14)
- [ ] Launch notification email (launch day)

**Closed Beta:**
- [ ] Select top 100 most-complete profiles for 2-week beta
- [ ] Bug feedback collection mechanism
- [ ] Pre-populate map with 100+ markers before public launch

**Marketing Channels:**
- [ ] Instagram/TikTok teaser content (map concept demos)
- [ ] University campus posters (HKU, CUHK, HKUST)
- [ ] Facebook Hong Kong expat group posts
- [ ] Reddit r/HongKong posts
- [ ] Personal network outreach

### Phase 1: Foundation (Months 1-3)

**Web Application (Public Marketing Pages):**
- [ ] Project setup: React + Vite + TypeScript + Tailwind CSS
- [ ] Tailwind configuration per DESIGN.md
- [ ] Shared component library (Button, Card, Input, Navigation, Footer)
- [ ] Home / Hero page with animated map visualization
- [ ] About / How It Works page
- [ ] Plans & Pricing page with billing duration selector
- [ ] Safety page (core content)
- [ ] Support pages: Guide, Troubleshoot, Security & Privacy, Safety & Reporting
- [ ] Footer and navigation
- [ ] Responsive design across all breakpoints
- [ ] SEO optimization (meta tags, structured data, sitemap)

**Web Application (Authenticated Experience):**
- [ ] Login / Register pages with social login
- [ ] Auth context and route guards (Public vs User vs Admin)
- [ ] Authenticated navigation (separate from marketing nav)
- [ ] Persistent download banner component
- [ ] Dashboard page (activity overview, download CTA)
- [ ] Profile page (full editor, photo management, verification)
- [ ] Pokes page (incoming/outgoing tabs, Poke Back action)
- [ ] Chat list page (active chats, chatrooms, archived)
- [ ] Chat conversation page (read, reply, 24h timer display, extend)
- [ ] Chatroom page (read + reply)
- [ ] Settings page (account, privacy, notifications, mode)

**Mobile Application (Flutter):**
- [ ] Flutter project setup (iOS + Android)
- [ ] Authentication: social login (Facebook, Instagram, LinkedIn, Google, Apple)
- [ ] Phone verification flow
- [ ] Profile creation (Dating + Networking modes)
- [ ] Mandatory field validation
- [ ] Google Maps integration with user markers + **activity signal rings** (green pulsing = active now, green dot = active today, gray = active this week, dimmed = rarely active)
- [ ] **Smart radius suggestion banner** when density is low ("Only 3 people nearby. Expand to 10km?")
- [ ] **Location Visibility Modes:** Accurate Mode (exact position), District Mode (district label only, no exact pin), Ghost Mode (invisible, can still browse and Poke). One-tap "Ghost Now" button accessible from every screen
- [ ] **Tiered map refresh rates:** Free = 15 min, Plus = 5 min, Premium = 1 min, Premium+ = real-time WebSocket
- [ ] Basic Poke system (send, receive, 24h expiration)
- [ ] Match detection and chatbox creation
- [ ] 24-hour chat activation timer
- [ ] Basic chat messaging (text)
- [ ] **Daily check-in streak system:** Day 1-2 (+2 Pokes), Day 3-5 (+3), Day 6 (+5), Day 7 (+5 + 1 Super Poke). Streak breaks reset to Day 1. High-streak users receive higher ranking in search results and swipe feeds
- [ ] **Merchant QR scan-to-earn:** Users scan merchant QR codes for bonus Pokes (Free: +3/scan, max 3/day; Plus: +5, max 5/day; Premium: +5, max 7/day; Premium+: +5+1 Super, unlimited)
- [ ] **Affiliate referral links:** Each user gets unique referral link and QR code. Referrer earns +5 to +15 Pokes per referral based on monthly tier. Referred user gets +5 bonus Pokes
- [ ] Swipe mode (basic card-based discovery, sorted: boosted → paid tier → activity recency → distance)

**Backend:**
- [ ] PostgreSQL database setup with schema
- [ ] Node.js API with Express/Fastify
- [ ] Authentication service (JWT + OAuth)
- [ ] User service (CRUD)
- [ ] Location service (GPS, fuzzing, PostGIS)
- [ ] Poke service (create, match detection, cooldown)
- [ ] Chat service (create, message, activate timer)
- [ ] Verification service (phone, social)
- [ ] WebSocket server for real-time features
- [ ] Redis for caching and sessions

### Phase 2: Trust & Community (Months 4-6)

**Web Application:**
- [ ] Traditional Chinese localization
- [ ] Blog section
- [ ] SEO content expansion
- [ ] Web registration flow (multi-step profile setup)
- [ ] Subscription management page (Stripe integration)
- [ ] Payment method management (HK payment methods)
- [ ] Unmatched chat archival view (read-only + Report)
- [ ] Facial verification (selfie upload from web)

**Mobile Application:**
- [ ] Super Poke system
- [ ] Poke with Note (Premium/Premium+: attach personal message)
- [ ] **Interest tag system:** standardized tags (Going Out, Active, Creative, Chill, Professional), user selects 3-5 tags during profile setup
- [ ] **Vibe match calculation:** shared interest percentage displayed on map markers and swipe cards ("87% Vibe Match")
- [ ] **Density heatmap overlay:** auto-switch from markers to color-coded density zones when >50 users overlap in visible area
- [ ] Facial recognition verification integration
- [ ] Unmatched chat archival with reporting
- [ ] Location-based chatrooms
- [ ] Disappearing timer with background updates
- [ ] Push notifications (FCM + APNs)
- [ ] Incognito Mode (Premium+)
- [ ] Profile Boost feature
- [ ] Advanced swipe filters (by interests, activity level, vibe match %)
- [ ] **Rich media in chat:** image sending (camera + gallery), voice messages (record and send audio clips), video chat via WebRTC for matched users
- [ ] **Voice Verify:** 5-second voice clip on profile for identity confirmation
- [ ] **Streak freeze:** Premium users (1/week), Premium+ users (3/week) can skip days without breaking streak
- [ ] **Sponsored Pokes (initial):** Merchants send Pokes to users within radius (blast/targeted/individual). Free/Plus cannot turn off, Premium can turn off blast, Premium+ can turn off all. Max 1 Sponsored Poke/user/day

**Backend:**
- [ ] Facial verification webhook integration
- [ ] Chatroom service
- [ ] Notification service (push + email)
- [ ] Archived chat management with 7-day retention
- [ ] Report retention (90-day extension for active reports)
- [ ] Background job scheduler (expiration timers, deletion jobs)

### Phase 3: Monetization (Months 7-9)

**Web Application:**
- [ ] Billing history and invoice download
- [ ] Profile Boost activation from web
- [ ] Chat extend and rematch from web

**Mobile Application:**
- [ ] **Poke quality scoring:** track pokes_sent_7d, reciprocity_rate, quality_tier (high/normal/low). Low-tier users get lowered swipe priority and Pokes delivered to bottom of recipient queue. Never hides users — only adjusts priority.
- [ ] Travel Mode (Premium+)
- [ ] **Auto-generated merchant pins (food & beverage first):** Auto-generate pins for Hong Kong's 16,000+ restaurants, bars, cafés from Google Maps data. Businesses claim free → upgrade to promoted
- [ ] Merchant account map pins
- [ ] Merchant coupons, packages, and tiered commission (12%/10%/8%)
- [ ] **Merchant QR code generation:** Auto-generated when merchant claims pin. Merchants print from dashboard
- [ ] **Merchant phased rollout:** Phase 3A = food & beverage only, Phase 3B = co-working + gyms, then demand-driven retail
- [ ] Subscription management UI
- [ ] Billing duration selector (1 week - 12 months)
- [ ] In-app purchase integration (Apple/Google)
- [ ] Chat extend and rematch features

**Backend:**
- [ ] Subscription service (Stripe + platform IAP)
- [ ] Billing cycle management (1 week, 1 month, 3 months, 6 months, 12 months)
- [ ] Merchant account service
- [ ] **Sponsored Poke delivery service:** blast (USD 0.10/user, min 50), targeted (USD 0.25/user, min 20), individual (USD 0.50/Poke). Anti-spam: max 1/user/day, max 3/user/week, highest bidder wins conflicts
- [ ] **QR code scan processing service:** validate merchant, check daily limits, award Pokes
- [ ] **Affiliate referral tracking service:** track referral source, completion milestones (signup/phone verify/profile complete), tier progression
- [ ] **Daily streak service:** track consecutive days, calculate rewards, apply streak freeze, update search ranking weight
- [ ] Tier-gated feature middleware
- [ ] Webhook handlers (Stripe, Apple, Google)

### Phase 4: Admin & Analytics (Months 10-12)

**Admin Dashboard:**
- [ ] Admin authentication (MFA)
- [ ] User management: list, view all fields, add, edit, remove
- [ ] Content moderation queue
- [ ] Report management
- [ ] Analytics dashboard (real-time + historical)
- [ ] Audit logging
- [ ] RBAC implementation
- [ ] System health monitoring

**Backend:**
- [ ] Admin API endpoints (RBAC-gated)
- [ ] Analytics aggregation service
- [ ] Audit logging service
- [ ] Bulk operations API
- [ ] System health monitoring endpoints

---

## 13. Testing Strategy

### 13.1 Web Application Testing

| Type | Tool | Coverage Target |
|------|------|-----------------|
| Unit Tests | Jest + React Testing Library | 80% |
| Integration Tests | Cypress / Playwright | Critical paths |
| Visual Regression | Chromatic / Percy | All pages |
| Accessibility | axe-core / Lighthouse | WCAG 2.1 AA |
| Performance | Lighthouse CI | LCP < 2s |
| Cross-browser | BrowserStack | Chrome, Safari, Firefox, Edge |

### 13.2 Mobile Application Testing

| Type | Tool | Coverage Target |
|------|------|-----------------|
| Unit Tests | Flutter test | 80% |
| Widget Tests | Flutter widget_test | All screens |
| Integration Tests | Flutter integration_test | Critical flows |
| Platform Tests | Firebase Test Lab | iOS + Android |
| Performance | Flutter DevTools | 60fps target |
| Accessibility | Flutter Semantics | TalkBack / VoiceOver |

### 13.3 Backend Testing

| Type | Tool | Coverage Target |
|------|------|-----------------|
| Unit Tests | Jest | 90% |
| Integration Tests | Supertest | All endpoints |
| Load Tests | k6 / Artillery | 10K concurrent users |
| Security | OWASP ZAP | Annual pen test |
| Database | pgTAP | Schema constraints |

---

## 14. Launch Readiness Checklist

### Pre-Launch (Must Complete Before Any User Access)

- [ ] Pre-launch landing page live with username reservation
- [ ] Poke accumulation system active (2 Pokes/day from registration to launch)
- [ ] Affiliate referral links functional
- [ ] Email sequence configured (welcome, profile builder, density preview, phone verify)
- [ ] 500+ pre-registered users with verified phone numbers
- [ ] Closed beta completed with top 100 profiles
- [ ] Map pre-populated with 100+ markers on launch day
- [ ] All authentication flows tested (Facebook, Instagram, LinkedIn, Google, Apple)
- [ ] Phone verification working for Hong Kong numbers (+852)
- [ ] Mandatory profile fields enforced before map visibility
- [ ] Google Maps API configured with billing alerts
- [ ] Location fuzzing verified (minimum 50m offset)
- [ ] Disappearing timer tested (1 min to 24 hours)
- [ ] Poke system: creation, expiration, match detection, cooldown
- [ ] Chat activation timer: 24-hour countdown, extend, expiration
- [ ] Unmatched chat archival: 7-day retention, report button functional
- [ ] Report flow: create, notify, investigate, resolve
- [ ] Admin dashboard: login, user CRUD, moderation tools
- [ ] Audit logging active for all admin actions
- [ ] SSL/TLS certificates configured
- [ ] Rate limiting configured on all endpoints
- [ ] Database backups automated and tested (restore verified)
- [ ] Push notifications working on iOS and Android
- [ ] Subscription billing tested (all 5 durations × 3 tiers)
- [ ] Hong Kong payment methods working (Stripe test mode)
- [ ] Privacy policy live at /privacy
- [ ] Terms of service live at /terms
- [ ] Cookie consent banner functional
- [ ] 18+ age gate at registration
- [ ] PDPO compliance reviewed by legal counsel
- [ ] All website pages responsive across breakpoints
- [ ] Website SEO optimized (meta tags, sitemap, robots.txt)
- [ ] Error monitoring configured (Sentry or equivalent)
- [ ] Uptime monitoring configured with alerting
- [ ] Support email configured and tested
- [ ] App Store review guidelines compliance verified
- [ ] Google Play policy compliance verified

### Post-Launch Monitoring (First 30 Days)

- [ ] Daily: error rates, API response times, crash rates
- [ ] Daily: new registrations, active users, verification rates
- [ ] Daily: report volumes, moderation queue size
- [ ] Weekly: subscription conversions, revenue, churn
- [ ] Weekly: retention metrics (Day-1, Day-7, Day-14)
- [ ] Weekly: Google Maps API spend vs. budget
- [ ] Bi-weekly: user feedback review and prioritization
- [ ] Monthly: full analytics review, KPI tracking

---

*This PRD is a living document and will be updated as the product evolves. All requirements are subject to prioritization based on user feedback, technical constraints, and budget limitations.*
