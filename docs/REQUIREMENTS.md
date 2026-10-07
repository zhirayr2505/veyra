# Restored decisions and explicit implementation defaults

## Authority

The current user request overrides the prior VPS/MinIO deployment template: Render Free, Supabase PostgreSQL + Storage, Upstash Redis, Geoapify; bots @VeyraAppBot and @VeyraAdminBot; channel **@VeyraDating**. Brand is VEYRA, not NUVEL. Robokassa must not be active. Source must contain no credentials.

Retrieved sources: earlier conversation extracts, `VEYRA_DEPLOY_INPUTS_TEMPLATE.txt`, saved VEYRA logo image and the saved Premium screen reference. On 2026-10-07 the owner supplied all ten design references directly in the conversation and requested a smoother visual refresh while preserving working behavior and adding missing agreed functions. The restored material does not include a complete verbatim specification; implementation defaults below remain explicitly identified.

The ten screens guide layout, colors and interaction polish. Their decorative Newell branding, Krasnodar-only geography, sample people/counts and 99/199/399 prices do not override VEYRA, global discovery, real application data or the confirmed price table. See `DESIGN_REFRESH.md`.

## Confirmed from prior decisions

- Global-first service, dark premium visual direction, pink/magenta/violet/cyan accents.
- Five tabs: Feed, Today, Likes, Chats, Profile; manual moderation; full bot and owner administration.
- Free: 30 profile impressions per UTC day, 15 positive reactions per UTC day. UTC boundary is an implementation default.
- Premium: unlimited views/likes, 3 daily Super Likes, one Boost per week.
- Boost duration 30 minutes; pre-match message maximum 140 characters.
- Today: available now/evening/after 21:00; coffee, walk, dinner, cinema, ride, party, meet; expiring presence.
- Saved price template is authoritative over decorative prices in earlier visual mockups:

| Product | Units/duration | Stars |
| --- | --- | --- |
| First Premium | 24 hours | 10 |
| Premium | 24 hours / 7 days / 30 days | 25 / 65 / 160 |
| Super Likes | 1 / 5 / 15 | 9 / 35 / 85 |
| Boost | 1 / 3 / 10 | 25 / 60 / 160 |
| Pre-match | 1 / 5 | 10 / 35 |

## Chosen defaults where the missing full spec did not resolve details

- Interface RU/EN. User-entered profile text is not translated. Country/city search is global; it is not restricted to Russia.
- 3–6 photos, up to 5 MiB each, 1600px WebP maximum. Square previews support touch drag, keyboard order changes, replacement and deletion. The first photo is the main photo. Three photos are required by the server for submission and approval.
- Gender choices man/woman; looking for women/men/everyone; relationship/dating/friends/unsure; up to seven optional interest labels. Interests currently use exact shared labels for scoring, not embeddings.
- Age range 18–110. Age gate is self-declaration and validation, **not identity/age verification**.
- Registration radius 5–200 km or Anywhere (20000 sentinel, bypasses distance restriction). Approximate distances rounded to 5km buckets; exact coordinates never returned in public profile cards.
- Regular feed returns/reserves one candidate per request. Today can request up to six candidates for its list; each new impression consumes the same daily allowance, and the response cannot exceed the remaining allowance. Ordering: active Boost, shared interests, distance, last activity. Today requires a nonexpired plan; specific activity/time-slot preferences are displayed, not separately weighted.
- Free incoming likes show only a count; Premium reveals profiles. No reusable unauthenticated image URL is exposed.
- Premium incognito hides a profile from recommendation discovery; it does not hide it from existing matches or someone the user has liked.
- Profile pause is available independently of Premium. It hides the profile from regular/Today discovery and incoming-like lists while preserving existing matches and chats. The authenticated user can resume it at any time; moderation status is unchanged.
- Referrer reward: one Super Like after the referred person's first approved profile. Value is stored in `feature_flags.referrals.config`; speculative revenue-share arrangements are not implemented as accepted requirements.
- Premium first-offer eligibility: no previous paid order. Premium periods are one-time purchases, not recurring billing.
- Weekly Boost uses a rolling seven-day interval. Paid inventory persists. Purchased consumables are spent before no free allowance only when allowance exhausted.
- Today expiry is selected as device-local midnight, validated server-side as no more than 24h ahead. Server stores UTC timestamps.
- Chats poll while visible (4s), match list every 12s. No claim of WebSocket transport.
- Chat search filters the current user's matches by name and last message. Navigation badges use actual incoming likes and unread counts; no fictional online status is shown. Manual moderation badges do not claim identity verification.
- Owner is the only administrator in v1. Moderator/support role columns are reserved but no role delegation UI is exposed.
- Photo and substantive profile edits hide the profile until re-review. Preference changes do not reset review status.
- The owner-approved original ribbon V/heart/star logo replaces the temporary SVG. Only exact exports from the corrected v1.1 graphics package are used; no retracing or generation.

## Explicit limits still requiring work before broad release

- No phone/selfie/identity verification, automatic face matching, machine-learning moderation, voice/video messages, translations beyond RU/EN, subscription renewals, card checkout, scheduled mass messaging, partner commission payout system, or claims of guaranteed Boost impressions.
- Discovery currently evaluates up to 200 eligible candidates; a large global deployment should move distance filtering/indexing to PostGIS and add cursor-based candidate retrieval.
- Owner queue lists are bounded (100 profiles/users, 200 administrative records). CSV/ZIP exports stream all users in batches. ZIP includes photos and complete transcripts attached to both participants. Owner-only dossiers/per-user archives are available. Exports are audited and limited to three starts per hour per owner.
- Billing refund mechanics are present but live Stars acceptance/refund verification is pending.
- Main Mini App BotFather configuration and operator/legal details are external setup items.

## Registration v2 — authorized 2026-10-07

Exactly five steps: name/birth date/gender; global location/radius; partner gender/age range; optional interests/goal/smoking/leisure/bio; 3–6 photos and explicit consent. Interests can be skipped. Progress survives reopening, with private server drafts and a local draft tied to the current account creation timestamp. Actual boot loading uses the approved animated logo. Manual review follows submission.

Gifts are deferred. Only Coming soon placeholders are exposed on cards, chats and collections. No gifts, payments, reactions, notifications or sample collections are generated by these placeholders. The future agreed flow is paid gift plus normal like after payment, matching only on mutual consent, and all received gifts in a public profile collection. No gift prices are approved for implementation.

The owner explicitly requested deleting all existing test users so everyone registers again. A one-time startup operation is scoped to the existing Render URL, recorded under registration-v2-2026-10-07, refuses real payment history, deletes existing profiles/photos/chats/likes/sessions and queues private object deletion. Catalog/configuration and the audit remain. Owner permissions are re-established from OWNER_TELEGRAM_ID at next login. No generic reset HTTP endpoint is added.
