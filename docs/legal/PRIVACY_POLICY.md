# MeshPoke Privacy Policy (DRAFT v0.1 — legal review required before launch)

_Last updated: 2026-XX-XX_

MeshPoke ("we", "us") is a live map for meeting people in real life, operated in Hong Kong. This policy explains what personal data we collect, why, how long we keep it, and your rights under the Personal Data (Privacy) Ordinance (Cap. 486) ("PDPO").

## 1. Data we collect

| Data | Why | Source |
|---|---|---|
| Phone number (+852 required at registration) | Account security, verification, anti-abuse (one account per person) | You, via SMS verification |
| Email address | Sign-in, receipts, account notices | You / sign-in provider |
| Display name, industry, role one-liner, keywords, vibe prompts | Your public profile sketch | You |
| Photos (optional) | Shown only to people you're connected with, never on the map or in browse lists | You |
| Instagram / LinkedIn handles (optional) | Revealed only at a mutual connection, never listed | You |
| Date of birth | 18+ requirement (age shown as a bracket, never the date) | You |
| Location (venue-level only) | "I'm here" check-ins, QR verification, nearby perks if you opt in | Your device, at the moment you act |
| Event participation & attendance record | Show-up Score (anti-no-show), host reviews | Platform use |
| Messages, notes and pokes | Delivering the service; safety review when reported | You |
| Merchant data: BR certificate, venue info, billing details | Verifying legitimate businesses; invoicing | Merchants |
| Device & usage analytics (PostHog) | Improving the product, funnels, crash triage | Automatic |

**We never store your raw GPS history.** Location is used at the moment of an action (check-in, nearby perk) and retained only as a venue-level event, not a coordinate trail.

## 2. What is public vs private

- **Public (map & rooms):** display name, sketch (industry/role/keywords/prompts), trust signals (member since, spots attended, Show-up Score bracket).
- **Never public:** your phone number, email, date of birth, photos (until you connect), social handles (until you connect), exact check-in coordinates.

## 3. Storage outside Hong Kong

Our servers run in the European Union (Hetzner, Germany); file storage and CDN in the EU; SMS delivery via Twilio (US); payments via Stripe (Stripe HK / Singapore) and Apple/Google in-app purchases; analytics via PostHog (EU). By using MeshPoke you acknowledge your data may be processed in these jurisdictions. We apply PDPO-equivalent safeguards with all processors.

## 4. Sharing

We do not sell personal data. We share only: (a) with the processors listed above, under contract; (b) with venue merchants **in aggregate** (e.g. "25 members visited this month") — your individual identity is shared with a venue only when you join their membership or redeem their drop, because the venue must know who redeemed; (c) with law enforcement where legally compelled; (d) safety reports to moderators.

## 5. Retention

- Account data: life of account; deleted within 30 days of account deletion (immediate soft-delete).
- Messages: retained while rooms are active; rooms decay ~2 weeks after events. Safety-report content retained 12 months for abuse-pattern review.
- Check-in events: venue-level records kept 24 months for Show-up Score and merchant billing integrity.
- Merchant billing records: 7 years (tax).

## 6. Your rights (PDPO Data Access & Correction)

- **Export:** Settings → Export my data (JSON) — instant.
- **Delete:** Settings → Delete account — immediate soft-delete, hard-delete within 30 days.
- **Correction:** edit your profile in-app; for records you cannot edit, contact privacy@meshpoke.com.
- **Withdraw promo consent:** Settings → Notifications, anytime. Consent records are versioned and timestamped.

## 7. Children

MeshPoke is 18+ only. We verify age at registration and remove accounts found underage.

## 8. Contact

Data Protection enquiries: privacy@meshpoke.com. Response within 7 days.

---
_TODO before launch: (1) HK legal counsel review — PDPO PICS (Personal Information Collection Statement) wording; (2) confirm processor list & sub-processors; (3) breach response runbook cross-ref; (4) App Store/Play privacy labels generated from this policy._
