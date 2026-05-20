# MeshPoke Business Plan
## Location-Based Social Platform — Dating, Networking & Community

**Version 3.0 | April 2026 | Confidential**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Company Overview](#2-company-overview)
3. [Market Analysis](#3-market-analysis)
4. [Product Description](#4-product-description)
5. [Business Model and Revenue Strategy](#5-business-model-and-revenue-strategy)
6. [Marketing and Growth Strategy](#6-marketing-and-growth-strategy)
7. [Financial Projections](#7-financial-projections)
8. [Risk Analysis and Mitigation](#8-risk-analysis-and-mitigation)
9. [Implementation Roadmap](#9-implementation-roadmap)
10. [Budget Allocation](#10-budget-allocation)
11. [Strategic Recommendations](#11-strategic-recommendations)

---

## 1. Executive Summary

MeshPoke is a location-based social networking mobile application built with Flutter that uniquely combines dating, professional networking, and real-time community interaction into a single platform. Unlike conventional dating apps that rely on algorithmic swiping, or professional networks that remain purely digital, MeshPoke integrates Google Maps to display verified users on a live map, enabling meaningful connections based on physical proximity and shared presence. The app addresses a critical gap in the market: the lack of trust, authenticity, and contextual interaction that plagues existing social and dating platforms.

The global online dating market was valued at approximately USD 9.60 billion in 2025 and is projected to reach USD 19.50 billion by 2034, reflecting sustained consumer demand. Over 350 million people use dating apps worldwide, yet user satisfaction remains remarkably low due to fake profiles, catfishing, superficial interactions, and the absence of genuine community. MeshPoke directly tackles these pain points through a multi-layered verification system that includes social account linking, mobile phone verification, IP address and ISP display on profiles, and facial recognition technology, ensuring that every user on the map is a real, accountable person.

The app operates on a dual-mode system — Dating Mode and Networking Mode — allowing users to signal their intent clearly. Users can interact through two primary discovery methods: the live map interface showing nearby verified profiles, and a swipe mode listing users within range. The Poke system serves as the primary connection mechanism: regular Pokes expire in 24 hours, while Super Pokes remain indefinitely and receive priority placement. When both users Poke each other, it creates a Match that opens a chatbox with its own 24-hour activation timer — both users must send a message to keep the chat alive, preventing passive ghosting.

Revenue is generated through a freemium subscription model with four tiers: Free, Plus, Premium, and Premium+, offering progressively richer features including unlimited Pokes, Super Pokes, Poke with Note (Premium and Premium+), chatroom creation, Incognito Mode, Travel Mode, and priority visibility. An additional Merchant Account tier enables restaurants and businesses to display promoted pins on the map with auto-renewing subscriptions. The company is bootstrapped with a maximum monthly budget of HK$10,000 (approximately USD 1,280), leveraging vibe coding with AI-assisted development at approximately USD 30-80 per month in tooling costs, making development costs near-zero while focusing spending on infrastructure, services, and targeted marketing.

---

## 2. Company Overview

### 2.1 Vision and Mission

MeshPoke envisions a world where meeting new people — whether for romance or professional opportunity — is as natural as walking into a coffee shop and spotting someone interesting. Our mission is to bridge the gap between digital discovery and real-world connection by creating a trusted, location-aware social platform where verified users can discover, interact with, and meet people in their vicinity. We believe that the best connections happen when people are in the same place at the same time, and MeshPoke makes that serendipity discoverable.

### 2.2 Problem Statement

The social and dating app landscape is broken in several fundamental ways. First, trust is nonexistent: fake profiles remain rampant across all major platforms, and users have no way to verify that someone is who they claim to be or is actually located where they say. Second, intention ambiguity causes frustration: users on dating apps receive unwanted professional solicitations, while networking platforms are increasingly flooded with romantic advances. Third, existing platforms are entirely disconnected from physical location, making it impossible to discover people nearby in real time. Fourth, community is absent: most dating apps are one-on-one swiping experiences with no sense of place-based community or shared context. Fifth, ghosting is epidemic: matches go cold because there is no mechanism to encourage or require initial engagement after matching. Finally, user experience suffers from blank profiles, low-effort participation, and superficial engagement metrics that prioritize time-on-app over genuine connection quality.

### 2.3 Solution Overview

MeshPoke solves these problems through a comprehensive set of innovations. Mobile phone verification is compulsory for all users during registration via SMS code, ensuring every account is tied to a real phone number from the start. The Multi-Layer Verification System combines this mandatory phone verification with social account authentication (Facebook, LinkedIn, Gmail, Apple), IP address and ISP display on profiles, and third-party facial recognition to create the most trustworthy user base in the industry. Since phone verification is already mandatory for all users, the verified badge is earned by additionally connecting either an Instagram account with 50+ followers or a LinkedIn account with 50+ connections — providing an extra layer of social proof. The IP address location and ISP name displayed on each profile adds an additional anti-scam layer: users can see the general geographic origin of a profile's connection, making it significantly harder for overseas scammers to pretend to be local.

The Dual-Mode System lets users choose between Dating Mode and Networking Mode, eliminating intent ambiguity. The Live Map Interface integrates Google Maps directly into the app so users can see verified profiles of nearby people in real time, with granular privacy controls including a disappearing timer that removes the user marker from 1 minute to 24 hours after leaving the app. The Poke and Match System creates intentional connections: regular Pokes expire in 24 hours, Super Pokes stay indefinitely with priority placement, mutual Pokes create a Match with a chatbox that requires both users to send a message within 24 hours to keep it active, and users can re-Poke after a one-week cooldown to prevent spam. Once both users have sent their first message and the chat is activated, the chatbox remains active as long as there is activity within any 7-day period — if neither user sends a message for 7 consecutive days, the chatbox expires and the Match is dissolved. The Swipe Mode provides a traditional list-based discovery experience sorted by boosted users first, then paid plan tier, then distance. Incognito Mode and Travel Mode give Premium and Premium+ users advanced privacy and location flexibility, with Travel Mode transparently indicating when a user has virtually relocated to prevent misrepresentation. The Location-Based Chatroom System enables place-anchored group conversations with plan-dependent size limits — if a user downgrades their plan, existing chatrooms remain active even if they exceed the new plan's maximum, but no new members can be added until the count falls below the limit. Poke with Note allows Premium and Premium+ subscribers to attach a personal message to their Poke — giving the recipient context and a compelling reason to Poke back. Mandatory Profile Completeness requires users to fill in all essential fields before becoming visible. Finally, Merchant Accounts allow restaurants and businesses to display promoted pins on the map, create coupons and packages, and sell deals with a tiered platform commission (12%/10%/8% depending on subscription commitment).

---

## 3. Market Analysis

### 3.1 Industry Overview

The online dating and social networking industry represents one of the largest and fastest-growing segments of the mobile application economy. According to Business of Apps, over 350 million people worldwide use dating apps, generating more than 1.46 billion downloads in 2025 alone. The global online dating market was valued at approximately USD 9.60 billion in 2025 and is projected to reach USD 19.50 billion by 2034, according to Fortune Business Insights. However, the industry is showing signs of maturity: both Tinder and Bumble experienced revenue declines in 2025, with Tinder down 5.2 percent and Bumble down 9.5 percent. This decline signals user fatigue with the traditional swipe-based model and creates an opening for innovative approaches like MeshPoke.

### 3.2 Target Market Segmentation

| Segment | Age Range | Description | Estimated Size |
|---------|-----------|-------------|----------------|
| Young Professionals | 22-35 | Urban workers seeking both dating and networking | 85M |
| College Students | 18-24 | Social discovery and campus-based connections | 60M |
| Digital Nomads | 25-40 | Location-fluid professionals needing local connections | 15M |
| Event Attendees | 21-45 | Conference, festival, and meetup participants | 40M |
| New City Residents | 22-38 | Relocated individuals building local social circles | 30M |

### 3.3 Competitive Landscape

The competitive landscape spans three categories: dating apps, professional networking platforms, and location-based social apps. Tinder, Bumble, and Hinge dominate with swipe-based interfaces but suffer from user fatigue, declining revenues, and pervasive trust issues. Bumble Premium costs up to USD 40 per month, while Hinge+ ranges from USD 12 to USD 40 per week. LinkedIn lacks location-based real-time discovery. Apps like Nearby Live shut down due to data breaches. No existing platform combines verified identity, dual-mode intent, live map discovery, poke-and-match mechanics, swipe mode, IP-based trust signals, and location-based chatrooms into a single cohesive experience.

| Feature | Tinder | Bumble | LinkedIn | MeshPoke |
|---------|--------|--------|----------|----------|
| Identity Verification | Basic | Basic | Email only | Multi-layer + Facial + IP/ISP |
| Location Map | No | No | No | Yes (Google Maps) |
| Dual Mode | No | No | No | Dating + Networking |
| Poke + Match System | No (Like only) | No | No | Poke + Super Poke + Match |
| Swipe Mode | Yes | Yes | No | Yes (priority sorted) |
| Chatrooms | No | No | Groups only | Location-based |
| IP/ISP Display | No | No | No | Yes (anti-scam) |
| Incognito/Travel Mode | Limited | No | No | Yes (with transparency) |
| Merchant Accounts | No | No | No | Map pins + promotions |
| Privacy Controls | Limited | Moderate | Limited | Granular timer + Ghost |

### 3.4 Lessons from Failed Apps

#### Why Dating Apps Fail

According to industry analyses, the top reasons dating apps fail include bad UI/UX design, unstable performance, lack of innovative features, absence of account security, and failure to address the emotional needs of users. NPR reported in 2024 that dating apps are "worse than ever" due to a paradox where the abundance of choice leads to decision paralysis. The lack of genuine connection facilitation and the prioritization of engagement metrics over relationship outcomes are the two greatest failures. Apps that fail to verify identities see 40-60% fake profile rates, which drives away genuine users in a death spiral.

#### Why Social Networks Fail

Failed social networks like Friendster, Vine, Google+, and MySpace share common failure patterns: displaced by better competition, failure to monetize before funding runs out, inability to retain creators and power users, ignoring user feedback, and treating growth as inevitable rather than earned. HeyMandi, a chat-based social app, received negative reviews citing buggy UI, security concerns including blackmail incidents, and login problems, highlighting the critical importance of robust security and stable performance at launch.

#### How MeshPoke Avoids These Mistakes

MeshPoke addresses each failure pattern with specific countermeasures. Against the fake profile epidemic, MeshPoke implements multi-layer verification including facial recognition and IP/ISP display. Against the monetization timing problem, MeshPoke launches with a clear freemium model from day one. Against the UI/UX failure pattern, MeshPoke prioritizes a clean, map-centric Flutter interface. Against the growth-without-marketing mistake, MeshPoke allocates dedicated marketing budget within the HK$10,000/month constraint. Against the security breach risk, MeshPoke implements granular location privacy controls and end-to-end encryption. Against the ghosting epidemic, MeshPoke's 24-hour chat activation timer and re-Poke cooldown create accountability for engagement.

---

## 4. Product Description

### 4.1 Core Features

#### 4.1.1 Multi-Platform Authentication

Users sign up and log in using Facebook, Instagram, LinkedIn, Gmail, or Apple Account, providing flexibility and reducing onboarding friction. Each authentication method contributes to the verification score. The social login integration uses OAuth 2.0 protocols to ensure security. Facebook and Instagram login share the same Meta Developer Portal app (same App ID and Secret), simplifying management while offering users two distinct login options — some users, especially younger demographics in Hong Kong, prefer Instagram over Facebook. When a user logs in with Instagram, the app can immediately check their follower count for the verified badge (50+ followers), eliminating the need for a separate account linking step. Apple Sign In captures the iOS user base, which tends to have higher spending patterns on in-app purchases (approximately 2.5x more than Android users on average). **Phone number verification via SMS code is compulsory during registration** — every user must verify a mobile phone number before their account is activated. This ensures that every MeshPoke account is tied to a real, traceable phone number from the very first step.

#### 4.1.2 Verification Badge System

The verification badge is the cornerstone of MeshPoke's trust infrastructure. Since mobile phone verification is already compulsory during registration for all users, the verified badge is earned by additionally connecting either an Instagram account with not less than 50 followers or a LinkedIn account with not less than 50 connections. The thresholds are deliberately set low enough to be achievable for genuine users while filtering out freshly created fake accounts. Verified users are visually distinguished on the map with a badge icon.

#### 4.1.3 IP Address and ISP Display

Every user profile displays the general IP address location (city/region level only, never the exact address) and the name of the Internet Service Provider (ISP) through which they are connected. This feature is a powerful anti-scam mechanism: if a user claims to be in New York but their ISP shows a provider based in Lagos or Manila, the discrepancy is immediately visible to other users. The IP/ISP display is shown on every profile card and cannot be hidden or modified by the user, making it a persistent trust signal. This transparency makes it significantly harder and more costly for overseas scammers to operate on the platform, as they would need to use VPNs with local endpoints and local ISP indicators, adding friction and expense to their operations. The display format shows: "Connected via: [ISP Name] — [City, Region]" ensuring that the information is readable and actionable for users evaluating the authenticity of a profile.

#### 4.1.4 Dual-Mode System: Dating and Networking

Upon registration, users choose whether they want to appear in Dating Mode, Networking Mode, or both. Each mode has its own set of mandatory profile fields that must be completed before the user becomes visible on the map. Dating Mode profiles include age, gender preferences, relationship goals, interests, lifestyle habits, bio, and photo gallery. Networking Mode profiles include current employer, job title, industry, years of experience, professional skills, career objectives, and professional headshot. When viewing another user on the map, the mode indicator is prominently displayed. Users can switch modes at any time.

#### 4.1.5 Google Maps Live Location Interface

The core visual interface is a full-screen Google Maps integration that displays verified users as circular profile picture markers at their real-time GPS locations. When the app is open and the user is online, their location is shared on the map visible to other users within a configurable radius. When a user exits the app, the app continues to update their location in the background until the configured disappearing timer expires — meaning the user's marker remains on the map and tracks their movement for the duration of the timer before fading away. This provides a more accurate representation of nearby presence rather than a static last-known position.

The map displays basic information when a user taps on a profile circle: first name, age or professional title depending on mode, verified badge status, IP/ISP info, interest tags (Phase 2), vibe match percentage if interests overlap (Phase 2), and distance from the viewer. From this popup, users can Poke, Super Poke, or use Poke with Note (Premium and Premium+ only — attach a short personal message to the Poke). Poke with Note messages from Premium+ subscribers are ranked higher in the recipient's Poke inbox, increasing visibility. The disappearing marker timer is configurable from 1 minute to 24 hours depending on subscription tier.

**Activity Signals on Map Markers:** To help users prioritize who to engage with, map markers display real-time activity status based on `last_active_at` timestamps. This is not an algorithm that hides users — every verified user within radius is always visible. Activity signals simply help users identify who is most likely to respond: active now (green pulsing ring — active within 30 minutes), active today (solid green dot — active within 24 hours), active this week (gray dot — active within 7 days), and rarely active (dimmed marker — inactive 7+ days). This directly addresses the biggest frustration on competitor apps: sending messages to inactive users who never respond. By making activity visible, MeshPoke increases response rates and user satisfaction without sacrificing transparency.

**Location Visibility Modes:** Users choose from three privacy modes for how they appear on the map, switchable at any time: Accurate Mode (exact position on map — best for actively meeting people), District Mode (shows district label only, e.g., "Central" — no exact pin, best for browsing with privacy), and Ghost Mode (invisible on the map, can still browse and Poke others — best for complete privacy). A one-tap "Ghost Now" button is accessible from every screen for instant map removal. All three modes are available to all users regardless of subscription tier — safety is never paywalled.

**Tiered Map Refresh Rates:** To manage Google Maps API costs, map data refresh rates are tiered by subscription. Free users receive updates every 15 minutes (sufficient to show who is in the area — a person at a café for 30-60 minutes is still visible), Plus users every 5 minutes, Premium users every 1 minute, and Premium+ users receive real-time WebSocket updates. This reduces free-tier API calls by approximately 93% compared to real-time updates while keeping the map feeling alive — markers shift every refresh, creating a living feel without the cost.

**Daily Check-In Streak System:** Users earn Pokes through daily engagement. The streak system rewards consecutive days of app activity (open app + send 1 Poke or reply to 1 chat): Day 1 (+2 Regular Pokes), Day 2 (+2), Day 3 (+3), Day 4 (+3), Day 5 (+3), Day 6 (+5), Day 7 (+5 Regular Pokes + 1 Super Poke). Streak breaks reset to Day 1. Premium users get 1 streak freeze per week (skip 1 day without breaking streak). Premium+ users get 3 streak freezes per week. High-streak users receive higher ranking in search results and swipe feeds — the algorithm rewards consistent engagement with visibility, creating a virtuous cycle of retention and activity.

**Merchant QR Check-In System:** Merchants display a MeshPoke QR code at their counter/entrance. Users scan the QR via the app's "Scan & Earn" feature to receive bonus Pokes: Free tier (+3 Regular Pokes per scan, max 3 scans/day), Plus (+5, max 5/day), Premium (+5, max 7/day), Premium+ (+5 + 1 Super Poke, unlimited scans/day). Each merchant can only be scanned once per day per user. QR codes are auto-generated when merchants claim their pin — they print it themselves from their dashboard. Every scan = app open = engagement metric for MeshPoke, foot traffic data for merchants, and a habitual daily reason for users to open the app.

**Smart Radius Suggestions:** When user density is low in a user's area, the app proactively suggests expanding the radius: fewer than 10 users within 5km prompts a suggestion to expand to 10km; fewer than 5 users within 10km suggests 25km; zero users within 25km shows "Be the first in your area!" with encouragement to visit popular districts. This is a friendly nudge, not a forced change — the user always controls their radius. This prevents the "the app feels dead" churn that kills location-based apps in early growth.

**Density Heatmap Overlay (Phase 2):** A unique feature that no competitor can offer because no competitor has a live map. In dense urban areas like Central or Causeway Bay, where 200+ markers would overlap and clutter the map, a heatmap overlay replaces individual markers with color-coded density zones: red/orange for high density (30+ active users), yellow for moderate (10-30), blue/green for low (1-10). Tapping a hotspot reveals the individual markers in that area. This creates FOMO ("30 people are at LKF right now!"), drives foot traffic to popular areas, and solves the marker clutter problem without hiding anyone.

#### 4.1.6 Poke and Super Poke System

The Poke system is MeshPoke's primary connection mechanism, replacing the ambiguous "like" systems of competing apps with intentional, time-sensitive signals.

**Regular Poke:** A lightweight notification that signals interest. Regular Pokes expire after 24 hours if not reciprocated. The recipient can see who Poked them and has 24 hours to Poke back. Users can re-Poke the same person after a one-week cooldown period to prevent spam while allowing persistent interest to be expressed. When both users have Poked each other, it creates a Match that opens a chatbox between them.

**Super Poke:** A premium Poke available to Premium and Premium+ subscribers. Super Pokes are prioritized in the recipient's notification queue, appearing at the top of their Pokes list. Unlike regular Pokes, Super Pokes do not expire — they remain indefinitely in the recipient's list until the user manually removes them. Super Pokes also trigger a push notification to ensure the recipient is aware of the interest. Super Pokes are allocated on a per-month basis according to the subscription tier.

**Poke with Note:** A premium feature available to Premium and Premium+ subscribers that replaces the need for a separate DM function. Instead of allowing users to bypass the Poke → Match → Chat flow with direct messages, Poke with Note lets Premium subscribers attach a personal message (up to 200 characters) to their Poke — giving the recipient context about who is reaching out and why. Premium+ subscribers can attach longer notes (up to 500 characters) and their Poke with Note appears ranked higher in the recipient's Poke inbox, increasing visibility and response likelihood. The recipient still must Poke back to create a Match — the core connection loop is preserved. This approach avoids the spam and complexity problems of a separate DM system (cold messaging from strangers, two messaging inboxes, diluted core mechanic) while providing the same monetization incentive: "stand out with a personal message" is a compelling reason to upgrade. Every conversation on MeshPoke still starts with mutual consent, maintaining trust and intentionality.

**Match and Chatbox Activation:** When a mutual Poke (regular or Super) creates a Match, a chatbox opens between the two users. However, the chatbox has a 24-hour activation timer: both users must send at least one message within 24 hours of the Match, or the chat expires and the Match is dissolved. This mechanism prevents passive ghosting and ensures that matches lead to actual conversation. Once both users have sent their first message and the chat is activated, the chatbox remains active as long as there is activity within any 7-day period — if neither user sends a message for 7 consecutive days, the chatbox expires and the Match is dissolved. Higher-tier subscribers can extend the 24-hour timer or rematch with expired connections: Plus users get 1 extend per week, Premium users get unlimited extends, and Premium+ users get unlimited extends plus unlimited rematches for expired conversations.

**Unmatched Chat Dialogue Visibility:** When a user unmatches or a chat expires, the chat dialogue remains visible to the user who initiated the unmatch (and to the other party for a limited 7-day retention window) in a read-only "Archived Chats" section. This ensures that users can review and report inappropriate messages, harassment, or safety concerns even after severing the connection. This feature exists specifically so users who intend not to leave a trace of problematic interactions can still provide evidence for reporting. Archived chats display a prominent "Report" button at the top of the conversation. After 7 days, archived chats are permanently deleted from both the client and server unless an active report is associated with the conversation, in which case the data is retained for investigation purposes for up to 90 days.

**Rich Media in Chat (Phase 2):** Once a chat is activated, users can send not only text but also images (photos from camera or gallery) and voice messages (record and send audio clips). Voice messages are particularly important for trust verification — hearing someone's voice confirms they are real before meeting in person. Video chat via WebRTC is available for matched users who want face-to-face conversation without leaving the app. A "Voice Verify" feature allows users to record a 5-second voice clip that appears on their profile, confirming they are a real person without requiring video. These features prevent users from leaving MeshPoke for WhatsApp/WeChat to verify matches, keeping engagement inside the app.

#### 4.1.7 Swipe Mode

In addition to the map interface, MeshPoke supports a traditional swipe discovery mode. Swipe Mode lists all users within the user's configured distance settings in a card-based interface. The sorting algorithm prioritizes users as follows: boosted users first (those who have activated a Profile Boost), then sorted by paid plan tier (Premium+ > Premium > Plus > Free), then by activity recency (active now first, then active today, then active this week), then by distance (nearest first). This sorting system ensures that paying and boosted users receive maximum visibility while prioritizing active users who are most likely to respond, maintaining fair exposure for free users.

**Poke Quality Signal (Phase 3):** MeshPoke's approach to anti-spam is fundamentally different from Tinder's. Tinder hides low-Elo users entirely — creating inequality and frustration. MeshPoke never hides anyone. Instead, Poke behavior quality gently influences swipe feed priority. Users who send fewer, more targeted Pokes (and receive reciprocal Pokes back) maintain full visibility. Users who mass-Poke indiscriminately (e.g., 50+ Pokes/day) see their swipe feed position gradually lowered and their Pokes delivered to the bottom of recipients' Poke queues. Recovery is simple: reduce Poke volume and get mutual matches for 3 days. This preserves MeshPoke's core value of transparency while discouraging spam — a lesson borrowed from Tinder's right-swipe penalty and CMB's Give & Take economy, but implemented without the inequality of a desirability score.

Users who have been swiped (left or right) will not appear again in the swipe feed for one week, after which they re-enter the pool. This prevents the repetitive "seeing the same profiles" problem that plagues Tinder and other swipe apps, while still allowing for reconsideration after a reasonable period. Swipe results can be filtered by mode (Dating/Networking), verification status, age range, and other criteria depending on subscription tier.

#### 4.1.8 Incognito Mode

Incognito Mode allows users to browse the map and swipe feed without appearing on other users' maps or in their swipe results. When Incognito Mode is active, the user's profile marker is hidden from the map, and they are excluded from other users' swipe feeds. The user can still browse, Poke, and Poke with Note others, but they appear as "Incognito" in the interaction. Incognito Mode is available exclusively to Premium and Premium+ subscribers and can be toggled on or off at any time. This feature is particularly valuable for users who want to explore the app discreetly before making themselves visible, or for professionals who want to network without broadcasting their presence to the entire dating pool.

#### 4.1.9 Travel Mode and Virtual Relocation

Travel Mode allows Premium+ subscribers to virtually relocate their map marker to any city in the world, enabling them to discover and connect with people in a destination before arriving. This is particularly valuable for business travelers, digital nomads, and people planning relocation. Crucially, when a user is in Travel Mode, their profile displays a visible "Traveling" indicator and shows their virtual location alongside their actual IP/ISP information, which reveals their true connection origin. This transparency prevents users from pretending to be in a location they are not actually in, addressing the primary scam concern with virtual relocation features. Other users can see at a glance that the person is virtually located and make an informed decision about engaging.

Additionally, Premium+ users can adjust their map radius filter up to 100 km, and if they choose to relocate their displayed position, other users will see a "Virtual Location" tag on their profile. This anti-scam transparency is a core design principle: MeshPoke prioritizes trust over feature flashiness.

#### 4.1.10 Location-Based Chatroom System

Users can create topics anchored to specific geographic locations (coffee shops, co-working spaces, campuses, conference venues). Each topic automatically generates a chatroom where nearby users can participate in real-time group conversations. The number of chatrooms a user can join and create, and the maximum member size of chatrooms they create, is determined by their subscription tier. Chatrooms are moderated by their creators with basic reporting and blocking tools.

**Downgrade Handling:** If a user downgrades their subscription plan, any existing chatrooms that exceed the new plan's maximum member limit remain active and intact — no members are removed. However, the user cannot add new members to those chatrooms until the member count naturally falls below the new plan's maximum limit. This protects existing communities from disruption while enforcing plan limits going forward.

#### 4.1.11 Facial Recognition Verification

During the verification process, users take a live selfie using the device camera. The facial recognition system compares the selfie against uploaded profile photos to confirm they depict the same person. This prevents stolen or stock photos. The verification is optional but strongly incentivized: users who complete it receive a premium verified badge and algorithmic priority. The third-party service (Jumio, Onfido, or Veriff) processes data in real time without storing biometric templates on MeshPoke servers.

##### 4.1.12 Admin Dashboard and Server Management

MeshPoke operates with a centralized server architecture where all app data is stored and managed. A dedicated Admin Dashboard provides authorized administrators with full control over the platform's data and user base.

**Admin Authentication:** Administrators log in through a secure web-based portal with multi-factor authentication (MFA). Admin accounts are separate from user accounts and are created manually by super admins during initial system setup.

**Admin Capabilities:**
- **View all registered user data:** Admins can view every database field for all registered users, including profile information, verification status, subscription tier, login history, IP/ISP records, poke history, match history, and chat metadata (not chat content, which is end-to-end encrypted).
- **Add users:** Admins can manually create user accounts for testing, promotional, or support purposes.
- **Remove users:** Admins can deactivate or permanently delete user accounts, with full audit logging of the action and reason.
- **Edit user data:** Admins can modify any user field — update verification status, reset subscription tiers, correct profile information, adjust account standing, or override settings.
- **Bulk operations:** Admins can perform bulk actions such as batch banning suspicious accounts, exporting user data reports, and applying mass status changes.
- **Content moderation:** Admins can review reported profiles, flagged messages (when decrypted for moderation), and user-submitted reports. Admins can issue warnings, temporary suspensions, or permanent bans.
- **Analytics and monitoring:** Real-time dashboards showing user growth, active sessions, geographic distribution, subscription conversions, report volumes, and system health metrics.
- **Audit log:** Every admin action is logged with timestamp, admin identity, affected user, and action details — ensuring accountability and enabling rollback of erroneous changes.

**Data Security:** Admin access to sensitive data (passwords are never stored in plaintext; auth tokens are managed via secure sessions) is governed by role-based access control (RBAC). Super admins can create and manage other admin accounts with granular permission levels (e.g., a support admin can view but not edit; a moderation admin can suspend but not delete).

#### 4.1.13 Merchant Accounts

Restaurants, bars, coffee shops, and other businesses can register Merchant Accounts on MeshPoke. Merchant Accounts are distinct from personal user accounts and provide the following capabilities:

- Display a business profile pin on the MeshPoke map with the business name, logo, category, and promotional content
- Choose the direction/position of the pin attached to the map (allowing precise placement at their storefront location)
- Post promotions, special offers, and events that appear when users tap on the merchant pin
- **Create coupons and packages:** Merchants can create digital coupons (e.g., "10% off any coffee") and promotional packages (e.g., "Date Night Set: appetizer + 2 mains + dessert for HK$388") that users can claim and redeem in-store
- View analytics on how many users viewed, tapped, and engaged with their pin
- Auto-renewing subscription plans: 1 month (USD 29.99/month), 3 months (USD 24.99/month, billed USD 74.97 quarterly), and annually (USD 19.99/month, billed USD 239.88 annually)

**Auto-Generated Merchant Pins (Phase 2):** To create instant map density without a sales team, MeshPoke auto-generates pins for food & beverage venues (restaurants, bars, cafés) from Google Maps data across Hong Kong. The phased approach starts with food & beverage only (Phase 2A, Month 7-8: Hong Kong's 16,000+ restaurants create rich map density; food venues are social destinations where dates and business meetings happen; they have margins for coupons; they already use apps like OpenRice and Foodpanda), then adds co-working spaces and gyms (Phase 2B, Month 9-10: serving networking mode users), and finally expands to all retail and services in Phase 3 (demand-driven, only where merchants have claimed pins). Businesses "claim" their auto-generated pin for free and get a basic dashboard, then can upgrade to promoted status with coupons, packages, and QR codes. This creates instant map density and a pipeline of potential paying merchants.

**Merchant QR Code System:** Claimed merchants receive an auto-generated MeshPoke QR code for display at their counter or entrance. Users scan the QR code via the app's "Scan & Earn" feature to receive bonus Pokes (see Daily Check-In Streak System). Merchants see scan analytics in their dashboard: total scans, daily scans, repeat visitors. The QR code is free for claimed merchants and serves as a physical marketing channel — every scan brings a user into the app.

**Platform Commission:** MeshPoke takes a tiered commission on all coupon and package transactions processed through the platform. The commission structure rewards merchant commitment — longer subscription plans receive lower commission rates:

- **Monthly plan: 12% commission** — merchants testing the platform pay a higher rate reflecting their lower commitment
- **Quarterly plan: 10% commission** — committed merchants receive the standard rate
- **Annual plan: 8% commission** — long-term partners are rewarded with the lowest rate, reflecting their higher transaction volume and loyalty

This tiered structure creates a double incentive for merchants to commit to longer plans: they save on both the monthly subscription price and the per-transaction commission. The commission range of 8-12% is competitive for a marketplace providing built-in customer acquisition through map discovery (compared to Uber at 25%, DoorDash at 15-30%, and the App Store at 15-30%). Higher-tier merchant plans also offer better analytics, priority placement, and more coupon/package creation slots, creating a comprehensive value ladder.

Merchant pins appear on the map with a distinct visual style (square icon vs. circular profile picture) to differentiate them from user profiles. When a user taps on a merchant pin, they see the business information, current promotions, available coupons and packages, photos, hours of operation, and a "Get Directions" button. Merchants cannot Poke or DM users — the interaction is one-directional from user to merchant — preventing spam from business accounts. This feature creates a sustainable B2B revenue stream while adding value for users by surfacing relevant local businesses and exclusive deals on the map.

### 4.2 MeshPoke Website (Hybrid: Marketing + Authenticated Web Experience)

MeshPoke will launch a website built with **React, Node.js, PostgreSQL, and Tailwind CSS** implementing the Zapier-inspired design system defined in DESIGN.md. The website serves dual purposes: (1) a public-facing marketing gateway communicating the app's value proposition, plans, safety commitments, and support resources, and (2) a lightweight authenticated web experience allowing users to sign up, manage their profile, read and reply to chats, manage subscriptions, and handle account settings from any browser — without needing the mobile app.

This hybrid approach is a deliberate strategic decision. The core map discovery, swipe mode, GPS tracking, and push notification experiences remain mobile-only (Flutter app), because native location APIs, background tracking, and push delivery are fundamentally superior on mobile. However, offering chat and profile management on the web removes the download barrier for onboarding, enables viral sharing (chatroom links, profile links), and captures desktop usage during work hours — a significant use case in Hong Kong's office culture.

**Why not full web app parity?** The live map experience depends on real-time GPS, background location updates, and native push notifications — all of which are degraded or impossible in browsers (iOS Safari does not support Web Push; browser Geolocation API has poor accuracy and no background capability). Building a compromised web version of the map would undermine MeshPoke's core differentiator. Instead, the web experience focuses on what browsers do well: forms, text, media, and account management.

The website targets the **Hong Kong market first**, with all content in English with Traditional Chinese (繁體中文) localization planned for Phase 2.

**Feature Availability Matrix:**

| Capability | Mobile App (Flutter) | Website (React) |
|---|---|---|
| Browse marketing pages | — | ✅ Full |
| Sign up / Register | ✅ Primary | ✅ Supported |
| Login | ✅ Primary | ✅ Supported |
| View / edit profile | ✅ Full | ✅ Full |
| Live map discovery | ✅ Primary | ❌ Not on web |
| Poke / Super Poke | ✅ Primary | ✅ View incoming Pokes, Poke back |
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

**Web Onboarding Flow:** A web visitor lands on the site → signs up → builds their profile → is prompted: *"Your profile is ready! Download MeshPoke to discover people near you on the live map."* This removes two high-friction steps (cold App Store visit + in-app registration) and yields a pre-registered user who is much more likely to complete the download and start engaging immediately.

#### 4.2.1 Public Website Sections (Unauthenticated)

**1. Home / Hero Page**
- Bold hero section communicating MeshPoke's core proposition: verified, location-based social discovery
- App download CTAs (App Store and Google Play badges)
- Animated map visualization showing the app concept in action
- Social proof: user count, verified user count, matches made
- Quick-scroll navigation to key sections

**2. About / How It Works**
- Step-by-step walkthrough: Sign Up → Verify → Discover on Map → Poke → Match → Chat → Meet
- Dual-mode explanation (Dating vs. Networking)
- Live map feature showcase with interactive demo
- IP/ISP transparency explanation as trust differentiator
- Comparison with traditional dating apps (why MeshPoke is different)

**3. Plans and Pricing**
- Full subscription tier comparison table (Free, Plus, Premium, Premium+)
- Flexible billing durations with discount visualization (1 week, 1 month, 3 months, 6 months, 12 months)
- Feature breakdown per tier with clear visual indicators
- Merchant account plans for businesses
- FAQ section addressing billing, cancellation, refunds, and plan changes
- Pricing displayed in both USD and HKD for Hong Kong market

**4. Safety**
- Multi-layer verification system explanation
- IP/ISP display and anti-scam measures
- Facial recognition verification overview
- Location privacy controls and disappearing timer
- Ghost Mode and Incognito Mode explanation
- Partnership with safety organizations (planned)
- Safety tips for meeting in person
- Emergency resources and hotlines (Hong Kong-specific)
- Unmatched chat visibility for reporting purposes

**5. Support (comprehensive help center)**

  *5a. Guide to Use and Functions*
  - Getting started tutorial: account creation, profile setup, verification
  - Map interface guide: browsing, discovering, interacting with nearby users
  - Poke system guide: sending Pokes, Super Pokes, understanding Match mechanics
  - Swipe mode guide: using the card-based discovery feed
  - Chat and messaging guide: chat activation timer, extending conversations, rematch
  - Chatroom guide: creating and joining location-based chatrooms
  - Travel Mode guide: virtual relocation features and transparency indicators
  - Account settings: privacy controls, notification preferences, mode switching
  - Video walkthroughs and animated GIF tutorials for each feature

  *5b. Troubleshoots*
  - Login and authentication issues (social login, password reset, account recovery)
  - Location and GPS problems (permissions, accuracy, background location)
  - Notification delivery issues (push notifications, email notifications)
  - Payment and subscription issues (billing errors, plan changes, refund requests)
  - Verification problems (failed facial recognition, phone verification, social account linking)
  - Map loading and performance issues
  - Chat and messaging issues (messages not sending, chat expiration, match problems)
  - App crashes and performance optimization tips
  - Compatibility and device requirements

  *5c. Security and Privacy*
  - Data encryption overview (TLS 1.3 in transit, AES-256 at rest)
  - What data MeshPoke collects and why (transparent data inventory)
  - How location data is used, stored, and deleted
  - IP address handling and ISP display policy
  - Facial recognition data processing (third-party service, no on-server storage)
  - Account security best practices (strong passwords, MFA)
  - Blocking and reporting mechanisms
  - Data export and account deletion (GDPR/Personal Data (Privacy) Ordinance compliance for Hong Kong)
  - Cookie policy and third-party tracking disclosure
  - Children and minors policy (18+ only)

  *5d. Safety and Reporting*
  - How to recognize and report suspicious profiles
  - How to report harassment, abuse, or inappropriate behavior
  - Catfishing and scam detection guide
  - In-app reporting tools and escalation process
  - What happens after you report someone (investigation timeline and outcomes)
  - Law enforcement cooperation policy
  - Hong Kong-specific legal resources (Hong Kong Police Force cybercrime reporting, Social Welfare Department)
  - Mental health resources and support hotlines
  - Community guidelines and code of conduct
  - Consequences for policy violations (warnings, suspensions, permanent bans)

**6. Blog / Resources (Phase 2)**
- Dating safety tips
- Networking best practices
- Hong Kong events and meetups
- App updates and feature announcements

**7. Footer**
- Links to all sections above
- App Store and Google Play download links
- Social media links
- Legal links: Terms of Service, Privacy Policy, Cookie Policy
- Language selector (English / 繁體中文)
- Contact information and support email

#### 4.2.2 Authenticated Web Sections (After Login)

These sections are accessible to registered users who log in on the website. They provide a lightweight but functional web experience that complements the mobile app.

**1. Dashboard / Home**
- Welcome message with user stats (Pokes received, active chats, subscription status)
- Prominent CTA: "Download the app to discover people nearby on the live map"
- Quick links to edit profile, manage subscription, open chats
- Activity feed: recent Pokes, new matches, unread messages

**2. My Profile**
- Full profile editor: all fields from Dating and Networking modes
- Photo management: upload, reorder, delete
- Verification status and actions (phone, social, facial)
- Profile preview (how others see you)

**3. Pokes**
- View incoming Pokes (regular + Super) with sender info
- Poke back directly from web
- View outgoing Pokes and their status
- Cannot initiate new discovery-based Pokes (no map/swipe on web)

**4. Chats**
- Active chat list with unread indicators
- Full chat interface: read messages, reply, send images
- 24-hour activation timer display for new matches
- Extend expiring chats (tier-dependent)
- Archived chats (read-only) with Report button
- Unmatch functionality

**5. Chatrooms**
- View joined chatrooms
- Read and reply to chatroom messages
- Cannot create new chatrooms or browse/discover chatrooms (mobile-only)

**6. Subscription Management**
- Current plan details and usage
- Upgrade / downgrade with billing duration selector
- Payment method management
- Billing history
- Cancel subscription

**7. Settings**
- Account settings: email, password, linked accounts
- Privacy settings: blocked users, data export, account deletion
- Notification preferences
- Mode switching (Dating / Networking / Both)

**8. Download Prompt (persistent)**
- A persistent banner or interstitial appears on every authenticated page:
  *"You're using MeshPoke on the web. Download the app for the full experience — live map discovery, swipe mode, push notifications, and more!"*
- App Store and Google Play badges
- Dismissable per session but reappears on next login

#### 4.2.3 Hong Kong Market Adaptation
- All pricing displayed in HKD alongside USD (HKD ≈ USD × 7.8)
- Integration with local payment methods: Alipay HK, WeChat Pay HK, FPS (Faster Payment System), credit/debit cards
- Hong Kong-specific emergency numbers and safety resources
- References to Hong Kong's Personal Data (Privacy) Ordinance (PDPO) compliance
- Content reflecting Hong Kong's dense urban environment (MTR stations, districts, neighborhoods as location anchors)
- Traditional Chinese language support planned for Phase 2

### 4.3 Feature Roadmap

| Phase | Timeline | Features |
|-------|----------|----------|
| MVP Launch | Month 1-6 | Core map interface with activity signals (green/gray/dimmed markers), smart radius suggestions, dual-mode profiles, social login, basic verification, IP/ISP display, Poke system, swipe mode (basic — boosted → paid tier → activity → distance), Flutter app (iOS + Android) |
| Phase 2 | Month 7-12 | Super Poke, Poke with Note, interest tags with vibe match percentage on map markers, density heatmap overlay for crowded areas, chatroom system, facial verification, disappearing timer with background updates, chat activation timer, push notifications, Incognito Mode |
| Phase 3 | Month 13-18 | Poke quality signal (anti-spam priority), Travel Mode, merchant accounts, advanced swipe filters (by interests, activity level, vibe match %), premium subscriptions, advertising platform, chat extend/rematch features |
| Phase 4 | Month 19-24 | API for third-party venues, event integration, group events, business dashboard, AI-powered recommendations, international expansion |

---

## 5. Business Model and Revenue Strategy

### 5.1 Business Model Overview

MeshPoke operates on a freemium business model that generates revenue through five primary channels: subscription plans, Super Poke and boost purchases, merchant account subscriptions, location-based advertising, and in-app purchases. The freemium approach is essential for building the user base critical mass required for a location-based social app. The subscription tiers gate high-value features that enhance the core experience without making the free tier unusable.

### 5.2 Subscription Plans

All prices are stated in USD. Users can choose from flexible billing durations — the longer the commitment, the bigger the discount:

| Duration | Plus | Premium | Premium+ |
|----------|------|---------|-----------|
| 1 Week | $2.99 | $5.99 | $9.99 |
| 1 Month | $9.99/mo | $19.99/mo | $34.99/mo |
| 3 Months | $8.49/mo (billed $25.47) | $16.99/mo (billed $50.97) | $29.99/mo (billed $89.97) |
| 6 Months | $7.49/mo (billed $44.94) | $14.99/mo (billed $89.94) | $26.49/mo (billed $158.94) |
| 12 Months | $5.99/mo (billed $71.88) | $11.99/mo (billed $143.88) | $22.99/mo (billed $275.88) |

Discount summary: 3-month plans save ~15%, 6-month plans save ~25%, and 12-month plans save ~40% compared to monthly billing.

| Feature | Free | Plus ($9.99/mo) | Premium ($19.99/mo) | Premium+ ($34.99/mo) |
|---------|------|-----------------|----------------------|------------------------|
| Map Browsing | Yes | Yes | Yes | Yes |
| Map Refresh Rate | Every 15 min | Every 5 min | Every 1 min | Real-time (WebSocket) |
| Profile Visibility | Standard | Priority | High Priority | Top Priority |
| Regular Pokes per Day | 5 | 25 | Unlimited | Unlimited |
| Super Pokes per Month | 0 | 3 | 10 | Unlimited |
| See Who Poked You | Yes (limited) | Yes | Yes | Yes + History |
| Poke with Note | No | No | Yes (200 chars per Poke) | Yes (500 chars + ranked higher in inbox) |
| Chatroom Join Limit | 3 | 10 | 25 | Unlimited |
| Chatroom Creation | 0 | 2/month | 10/month | Unlimited |
| Chatroom Max Members | — | 25 | 50 | 100 |
| Disappearing Timer | 1-60 min | 1-6 hours | 1-12 hours | 1 min - 24 hours |
| Map Radius Filter | 5 km | 25 km | 50 km | 100 km |
| Swipe Mode | Yes | Yes | Yes | Yes |
| Swipe Filters | Basic | Basic | Advanced | All + AI Match |
| Incognito Mode | No | No | Yes | Yes |
| Travel Mode | No | No | No | Yes (with transparency) |
| Chat Activation Extend | No | 1/week | Unlimited | Unlimited + Rematch |
| Chat Inactivity Expiry | 7 days | 7 days | 14 days | 30 days |
| Daily Check-In Streak Freeze | No | 1/week | 1/week | 3/week |
| Streak Search Ranking Boost | No | Yes | Yes | Yes |
| Voice Messages (Phase 2) | Yes | Yes | Yes | Yes |
| Video Chat (Phase 2) | No | No | Yes | Yes |
| Voice Verify (Phase 2) | No | Available | Included | Included |
| Merchant QR Scan Reward | +3 Pokes (3/day) | +5 Pokes (5/day) | +5 Pokes (7/day) | +5+1 Super (unlimited) |
| Sponsored Poke Control | Cannot turn off | Cannot turn off | Turn off blast | Turn off all |
| Facial Verification Badge | No | Available | Included | Included + Priority |
| Ad Experience | Full ads + Sponsored Pokes | Reduced + Sponsored Pokes | Optional (can hide ads, limit Sponsored Pokes) | Optional (can hide all) |
| Profile Boosts | 0 | 1/month | 3/month | 7/month |
| IP/ISP Display | Visible on others | Yes | Yes | Yes |

### 5.3 Merchant Account Plans

All prices are stated in USD.

| Plan | Monthly Price | Billing Cycle | Features | Commission |
|------|---------------|---------------|----------|------------|
| Monthly | USD 29.99/month | Monthly, auto-renew | Map pin, promotions, coupons (5/mo), packages (2/mo), basic analytics | 12% |
| Quarterly | USD 24.99/month | USD 74.97 quarterly, auto-renew | Map pin, promotions, coupons (15/mo), packages (5/mo), advanced analytics, priority placement | 10% |
| Annual | USD 19.99/month | USD 239.88 annually, auto-renew | Map pin, promotions, coupons (unlimited), packages (unlimited), full analytics, priority placement, custom pin direction | 8% |

### 5.4 Additional Revenue Streams

**In-App Purchases:** Poke Packs (USD 1.99 for 20 regular Pokes), Super Poke Packs (USD 4.99 for 5 Super Pokes), Profile Boosts (USD 2.99 for 30-minute boost), Chat Extends (USD 0.99 each for free/Plus users), and Rematch Tokens (USD 1.99 each for expired conversations). These microtransactions capture revenue from non-subscribers.

**Sponsored Pokes:** A new advertising format where merchants send Pokes that appear in users' Poke inboxes like regular Pokes, but with a "Sponsored" label and merchant icon. Merchants choose blast (all users within radius), targeted (specific demographics — mode, age range, distance), or individual delivery. Users see: merchant name, logo, promotion text, distance ("Starbucks Wan Chai — 50m away"), and can tap to view the deal, get directions, or dismiss. Users cannot Poke back merchants (one-directional). User control: Free/Plus users cannot turn off Sponsored Pokes (this IS the ad experience), Premium users can turn off blast Pokes but keep targeted ones, Premium+ users can turn off ALL Sponsored Pokes. Merchant pricing: Blast (USD 0.10/user reached, min 50), Targeted (USD 0.25/user, min 20), Individual (USD 0.50/Poke). Anti-spam limits: max 1 Sponsored Poke per user per day, max 3 per user per week. If multiple merchants target the same user on the same day, only the highest bidder delivers.

---

## 6. Marketing and Growth Strategy

### 6.1 Go-to-Market Strategy for Limited Budgets

Given the maximum monthly budget of HK$10,000 (approximately USD 1,280), MeshPoke employs an ultra-lean concentrated launch strategy. Every dollar must be concentrated on achieving critical mass in a single city before expanding. The initial target city should be a dense urban center with a young, tech-savvy population. Achieving 5,000 active users in one city creates network density that makes the app genuinely useful.

### 6.2 Pre-Launch Campaign: Solving the Cold-Start Problem

The live map is MeshPoke's core differentiator and identity. An empty map on launch day is the #1 killer of location-based apps — this is what killed Nearby Live. MeshPoke must have 500+ verified, profile-complete users ready to appear on the map the moment the app goes live. This requires a staged pre-launch campaign beginning 6-8 weeks before public launch.

**Stage 1: "Reserve Your Spot" Landing Page (Week 1-4)**

A simple React landing page (part of the MeshPoke website) with a single action: reserve your username. The page includes: a hero section ("The first map-based dating & networking app in Hong Kong"), three bullet-point value props, a live counter showing total reservations ("472 people have reserved their spot"), and social login (Google/Facebook) for 10-second signup. Users pick a username and mode (dating/networking/both).

**Why they register:** FOMO (the counter creates urgency), username reservation (first-come-first-served — "lock in 'Alex_Central' before someone takes it"), exclusive Founding Member badge (permanent, visible on profile forever), and Founding Member perks (1 month free Premium, 5 free Super Pokes at launch).

**Poke Accumulation Incentive:** Early registrants earn 2 Regular Pokes per day from the moment they register until launch day. The earlier you register, the more Pokes you have on day one. This creates a powerful incentive to register as early as possible. Registration on June 1 for an August 1 launch = 60 days × 2 = 120 Pokes. Registration on July 28 = only 6 Pokes. Phone verification and profile completion are required to claim accumulated Pokes on launch day. Maximum cap: 200 accumulated Pokes. This is communicated on the landing page: "Register today — you're already earning 2 Pokes/day that you can spend the moment MeshPoke launches."

**Stage 2: "Profile Builder" Email Sequence (Week 3-6)**

After reserving, users receive an email sequence: Email 1 (immediate): "Welcome, Founding Member! Your username @Alex_Central is reserved." Email 2 (Day 3): "Complete your profile early — be visible on the map the MINUTE we launch" with a link to the web profile builder. Email 3 (Day 7): "XXX people in Central have reserved. Here's the map density preview" showing an anonymized heatmap. Email 4 (Day 14): "Launch countdown: 2 weeks. Complete phone verification now to skip the line on day one" — getting users through the hardest step before launch.

**Stage 3: Closed Beta (Week 5-7)**

Invite the top 100 most-complete profiles to test the app 2 weeks before public launch. They get early access (exclusive feeling), populate the map before anyone else, provide bug feedback, and when public launch happens, the map already has 100 active markers.

**Stage 4: Public Launch (Week 7)**

Push notification + email to all 500+ reserved users: "MeshPoke is LIVE. Open the app — your profile is already visible." Users open, see 100+ people on the map, start Poking, and activity generates more activity. The remaining 400+ who didn't join beta complete profiles and flood in over Week 1.

**Pre-Launch Registration Targets:**

| Channel | Expected Reach | Expected Conversion | Users |
|---------|---------------|-------------------|-------|
| Instagram/TikTok content | 20K views | 1.5% | 300 |
| University campus posters (3 campuses) | 5K views | 2% | 100 |
| Facebook expat groups | 10K views | 0.5% | 50 |
| Reddit | 5K views | 0.4% | 20 |
| Referral (viral from above) | — | — | 50-100 |
| Personal network | — | — | 30 |
| **Total** | | | **550-600** |

### 6.3 Growth Tactics

**App Store Optimization (ASO):** The single highest-ROI activity for a limited budget. Targeted keywords include "meet people nearby," "local dating," "professional networking," "map dating," and "verified dating." A/B test monthly. The app preview video demonstrates a real-time connection scenario.

**Campus Ambassador Program:** Recruit 15-20 ambassadors at 2-3 target universities. Provide free Premium subscriptions and small stipends. Estimated cost: USD 3,000-5,000 per semester.

**Affiliate Referral Program:** Every user gets a unique referral link (meshpoke.com/r/Username) and a shareable QR code. When someone registers via the link, both parties benefit: new user gets +5 bonus Pokes, referrer gets +5 Regular Pokes per signup. If the new user completes phone verification, the referrer gets +3 bonus Pokes (total +8). If the new user completes their full profile, the referrer gets +2 bonus Pokes (total +10 per fully-onboarded referral).

Referrer tiers (monthly): 1-5 referrals = standard (+5 Pokes each), 6-15 = Ambassador (+7 each), 16-30 = Champion (+10 each), 31+ = Legend (+15 each + "Recruiter" badge on profile). Anti-fraud: same phone/device = 1 registration only. Monthly referral leaderboard in app. Top 10 referrers get permanent "Founding Recruiter" badge.

During pre-launch, accumulated referral Pokes are credited on launch day alongside daily accumulation Pokes.

**Content Marketing:** Short-form video on TikTok and Instagram Reels about dating safety, networking tips, and behind-the-scenes development stories. Minimal cash investment, primarily time and creativity.

**Strategic Partnerships:** Co-working spaces, event organizers, and local businesses. Free Premium subscriptions for co-working members in exchange for promotion.

### 6.4 Key Performance Indicators

| KPI | Year 1 Target | Year 2 Target | Year 3 Target |
|-----|---------------|---------------|---------------|
| Total Users | 80,000 | 400,000 | 1,500,000 |
| Monthly Active Users | 32,000 | 160,000 | 600,000 |
| Verified User Rate | 40% | 50% | 60% |
| Paid Conversion Rate | 2.5% | 4% | 6% |
| Day-30 Retention | 22% | 32% | 40% |
| Chatrooms Active | 300 | 3,000 | 15,000 |
| Merchant Accounts | 50 | 500 | 2,000 |
| Average Revenue Per User | USD 0.40 | USD 1.00 | USD 2.00 |

---

## 7. Financial Projections

### 7.1 Revenue Projections

Revenue projections are based on conservative assumptions derived from industry benchmarks. Dating apps typically achieve 3-8% paid conversion rates. MeshPoke targets 2.5% in Year 1 (reflecting the bootstrap budget constraint on marketing), growing to 6% by Year 3. The average revenue per paying user is estimated at USD 14 per month, blending the Plus, Premium, and Premium+ tiers weighted toward Plus as the most popular tier. Merchant account revenue is modeled based on expected business adoption in launch cities.

| Revenue Stream | Year 1 | Year 2 | Year 3 |
|---------------|--------|--------|--------|
| Subscriptions | USD 84,000 | USD 448,000 | USD 1,512,000 |
| In-App Purchases | USD 12,000 | USD 67,200 | USD 226,800 |
| Merchant Accounts | USD 6,000 | USD 72,000 | USD 360,000 |
| Advertising | USD 8,000 | USD 80,000 | USD 300,000 |
| **Total Revenue** | **USD 110,000** | **USD 667,200** | **USD 2,398,800** |

### 7.2 Cost Structure (Maximum HK$10,000/Month = USD 1,280/Month)

The cost structure is designed for extreme lean operation, leveraging vibe coding with AI-assisted development to minimize the largest traditional expense: development team salaries. The founder serves as the primary developer using Cursor or similar AI-powered coding tools at approximately USD 30/month for the coding plan, with occasional Claude Opus usage estimated at USD 20-50/month for complex architectural decisions and debugging.

| Cost Category | Monthly (USD) | Year 1 Annual (USD) | Notes |
|---------------|---------------|---------------------|-------|
| Development Tools (Cursor + Claude Opus) | 50-80 | 780 | Vibe coding: USD 30/mo plan + occasional Opus |
| Google Maps API | 150-300 | 2,700 | Optimized with client-side caching |
| Cloud Infrastructure (Firebase/AWS) | 100-200 | 1,800 | Serverless, auto-scaling |
| Facial Verification Service | 50-100 | 900 | Per-verification pricing, volume discounts |
| Apple Developer + Google Play | 25 | 300 | Annual fees amortized |
| Marketing and ASO | 200-400 | 3,600 | Organic-focused, minimal paid acquisition |
| Push Notification Service | 20-40 | 360 | Firebase Cloud Messaging + fallback |
| Database and Storage | 50-100 | 900 | Firestore/S3 |
| Contingency | 100-200 | 1,800 | Unexpected costs |
| **Total** | **~USD 750-1,280** | **~USD 13,140** | Within HK$10,000/month cap |

### 7.3 Profitability Timeline

With the ultra-lean cost structure of approximately USD 1,000/month (well within the HK$10,000 cap), MeshPoke reaches monthly break-even at approximately USD 1,000 in monthly revenue. At the projected conversion rates, this occurs when the app reaches approximately 8,000-10,000 active users with 2.5% paid conversion, which is expected by Month 8-10 of operations. This dramatically faster break-even compared to traditionally funded startups is a direct result of the near-zero development cost through vibe coding. Cumulative profitability is expected by the end of Month 12, and by Year 2 the business should be generating substantial surplus that can be reinvested in growth or distributed as profit.

The key financial insight is that by eliminating the largest startup expense (development team salaries, typically USD 15,000-25,000/month), MeshPoke can achieve profitability at a fraction of the user base required by competitors. This creates a sustainable business even at relatively small scale.

---

## 8. Risk Analysis and Mitigation

### 8.1 Privacy and Security Risks

Location sharing is the most sensitive feature. MeshPoke mitigates this through location fuzzing at the display level (minimum 50-meter radius), the disappearing timer with background updates, distance ranges rather than exact numbers, TLS 1.3 encryption, AES-256 encryption at rest, Ghost Mode for immediate map removal, and IP/ISP transparency that paradoxically enhances security by making scam attempts visible. Annual third-party security audits and a bug bounty program will be maintained.

### 8.2 IP/ISP Display Legal Considerations

Displaying IP-derived location and ISP information raises potential privacy concerns in certain jurisdictions. MeshPoke addresses this by showing only city/region-level location (never exact IP addresses), clearly disclosing this practice in the privacy policy presented during onboarding, providing an opt-out mechanism that disables the user's map visibility (since map visibility without IP transparency would undermine trust), and complying with GDPR, CCPA, and other privacy regulations. Legal counsel will review the IP/ISP display feature before launch to ensure compliance in all target markets.

### 8.3 Competitive Risks

The primary risk is a major player copying the map-based interface or dual-mode concept. Mitigation: first-mover advantage and network effects, the multi-layer verification system including IP/ISP display creates a switching cost, the chatroom ecosystem builds community lock-in, and the Poke/Match system with its 24-hour activation timer creates a unique engagement mechanic that is difficult to replicate without appearing derivative.

### 8.4 Cold Start Problem

The concentrated city launch strategy, campus ambassadors, co-working partnerships, and the chatroom system as a retention tool all address this. The free tier is designed to maximize visible users on the map. The ultra-lean cost structure means the app can survive a longer cold-start period without running out of funds, as monthly burn is only USD 750-1,280.

### 8.5 Vibe Coding Risks

Relying on AI-assisted development (vibe coding) carries risks including code quality concerns, security vulnerabilities in AI-generated code, and scalability limitations. Mitigation: thorough code review using Claude Opus for critical sections, automated testing pipelines, security scanning tools integrated into the CI/CD pipeline, and gradual refactoring of key modules as revenue allows hiring dedicated developers.

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Privacy breach / stalking | High | Medium | Location fuzzing, timer, Ghost Mode, encryption |
| Regulatory non-compliance | High | Low | DPO, privacy-by-design, IP/ISP legal review |
| Competitor copy | Medium | Medium | First-mover, network density, verification moat |
| Cold start / low density | High | Medium | Single-city launch, ambassadors, chatrooms |
| API cost overrun | Medium | Medium | Caching, batch processing, budget monitoring |
| Vibe coding quality issues | Medium | Medium | Opus review, testing, security scanning |
| IP/ISP privacy complaints | Medium | Low | City-level only, clear disclosure, legal review |

---

## 9. Implementation Roadmap

### 9.1 Development Phases

**Phase 1: MVP (Months 1-6)**
Social login, basic verification with IP/ISP display, dual-mode profiles, Google Maps with real-time markers and background location updates, regular Poke system, basic swipe mode, disappearing timer (5 min, 30 min, 1 hour). Built entirely with Flutter for iOS and Android from a single codebase. Success criterion: 10,000 registered users in the launch city within 60 days.

**Phase 2: Community and Trust (Months 7-12)**
Super Poke system, chatroom system, facial verification, expanded timer options (1 min to 12 hours), chat activation timer with extend feature, push notifications, Incognito Mode for Premium users, Plus and Premium subscription launch. Success criterion: 40,000 registered users with 2.5% paid conversion, 200 active chatrooms.

**Phase 3: Monetization and Expansion (Months 13-18)**
Travel Mode for Premium+ users, merchant accounts, advanced swipe filters, advertising platform, Premium+ tier launch, chat extend and rematch features, expansion to 2-3 additional cities. Success criterion: 150,000 registered users, 4% paid conversion, monthly revenue exceeding USD 30,000.

**Phase 4: Platform Maturity (Months 19-24)**
API for third-party integrations, event integration, group events, business analytics dashboard, AI-powered recommendations, international expansion. Success criterion: 400,000 registered users, profitability, sustainable growth trajectory.

---

## 10. Budget Allocation

### 10.1 Monthly Budget Breakdown (Maximum HK$10,000 ≈ USD 1,280)

The budget is structured to maximize the impact of every dollar within the HK$10,000 monthly cap. Development costs are minimized through vibe coding, allowing the majority of funds to be directed toward infrastructure and growth.

| Category | Monthly Allocation (USD) | Percentage | Priority |
|----------|--------------------------|------------|----------|
| Development Tools | 50-80 | 4-6% | Essential |
| Google Maps API | 200-300 | 16-23% | Essential |
| Cloud Infrastructure | 150-200 | 12-16% | Essential |
| Facial Verification | 50-100 | 4-8% | Important |
| App Store Fees | 25 | 2% | Essential |
| Marketing and ASO | 300-400 | 23-31% | High Priority |
| Push Notifications | 30-40 | 2-3% | Essential |
| Database and Storage | 80-100 | 6-8% | Essential |
| Contingency | 145-235 | 11-18% | Safety Net |
| **Total** | **~USD 1,080-1,280** | **100%** | |

### 10.2 Scaling the Budget

As revenue grows, the budget can increase beyond the HK$10,000 cap while maintaining profitability. The scaling plan is:

- **Month 1-6:** Cap at HK$10,000/month (bootstrap phase)
- **Month 7-12:** Cap at HK$15,000/month if monthly revenue exceeds HK$5,000
- **Month 13-18:** Cap at HK$25,000/month if monthly revenue exceeds HK$15,000
- **Month 19-24:** No cap, reinvest 40% of revenue into growth

### 10.3 Development Cost Detail

The founder's primary development approach is vibe coding using AI-powered tools:

| Tool | Monthly Cost | Purpose |
|------|-------------|---------|
| Cursor Pro Plan | USD 20/month | Primary AI-assisted coding IDE |
| Claude Opus (occasional) | ~USD 30-60/month | Complex architecture, code review, debugging |
| GitHub Copilot (included in Cursor) | USD 0 | Code completion and suggestions |
| **Total Development Tools** | **~USD 50-80/month** | |

This compares to a traditional development team cost of USD 15,000-25,000/month for 2-3 developers, representing a 99% cost reduction. The trade-off is development speed and the need for careful code review, but for a bootstrap startup, this approach makes the business viable with minimal funding.

---

## 11. Strategic Recommendations

### 11.1 The Lean Launch Playbook

For a vibe-coded app with a HK$10,000/month budget, the key principle is concentration over breadth. Build the core map-plus-poke experience in Flutter, launch in one dense urban area, seed the market with 50-100 power users through personal networks and ambassador programs, and iterate aggressively based on user feedback until Day-7 retention exceeds 25%. Only then should you expand features or target additional cities.

### 11.2 Key Mistakes to Avoid

1. **Never compromise on verification quality:** Cutting corners on identity verification or hiding the IP/ISP display will result in fake profile proliferation that destroys trust.
2. **Never expand to a new city before achieving critical mass:** Spreading thin across geographies is the number one cause of death for location-based apps.
3. **Never delay monetization:** Launch with the freemium model from day one.
4. **Never ignore the chat activation timer:** The 24-hour timer is the key anti-ghosting mechanic; removing it would make MeshPoke just another ghosting app.
5. **Never allow Travel Mode without transparency:** The "Virtual Location" tag is non-negotiable. Removing it would enable the exact scam behavior MeshPoke is designed to prevent.
6. **Never rely solely on paid acquisition:** At HK$10,000/month, you cannot outspend competitors. Organic growth through ASO, referrals, and community is the only sustainable path.
7. **Never let API costs run uncontrolled:** Google Maps API costs can spiral rapidly. Implement aggressive client-side caching and monitor usage daily.

### 11.3 The Vibe Coding Advantage

Vibe coding with AI-assisted tools is MeshPoke's secret weapon. While competitors spend USD 180,000-300,000 annually on development teams, MeshPoke's development costs are under USD 1,000 annually. This means:

- Break-even occurs at approximately 70-100 paying users instead of 1,000+
- The app can survive a 12-18 month cold start period without additional funding
- Every dollar of revenue goes further because the cost base is so low
- The founder maintains full equity control without diluting to investors

The key risk — code quality — is mitigated by using Claude Opus for code review of critical sections, implementing comprehensive automated tests, and gradually refactoring key modules as revenue allows. The Flutter framework also provides built-in quality advantages through its strongly-typed Dart language and widget testing framework.

---

*This business plan is confidential and intended for internal use only. All financial projections are estimates based on industry benchmarks and conservative assumptions. Actual results may vary.*
