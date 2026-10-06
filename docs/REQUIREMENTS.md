# Restored decisions and explicit implementation defaults

## Authority

The current user request overrides the prior VPS/MinIO deployment template: Render Free, Supabase PostgreSQL + Storage, Upstash Redis, Geoapify; bots @VeyraAppBot and @VeyraAdminBot; channel **@VeyraDating**. Brand is VEYRA, not NUVEL. Robokassa must not be active. Source must contain no credentials.

Retrieved sources: earlier conversation extracts, `VEYRA_DEPLOY_INPUTS_TEMPLATE.txt`, saved VEYRA logo image and the saved Premium screen reference. The retrieval did not expose a complete verbatim approved spec or all ten original screens. Therefore visual/behavioral choices below must not be presented as verbatim approved requirements.

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
- 1–6 photos, up to 5 MiB incoming image, 1600px WebP max dimensions; user-selected first uploaded photo is cover. Removing/re-uploading changes cover order.
- Gender choices man/woman/other; relationship/dating/friends/unsure; up to ten interest labels. Interests currently use exact shared labels for scoring, not embeddings.
- Age range 18–110. Age gate is self-declaration and validation, **not identity/age verification**.
- Typical discovery radius 100 km, configurable 1–20,000 km. Approximate distances rounded to 5km buckets; exact coordinates never returned in public profile cards.
- One candidate returned/reserved per feed request. Ordering: active Boost, shared interests, distance, last activity. Today requires a nonexpired plan; specific activity/time-slot preferences are displayed, not separately weighted.
- Free incoming likes show only a count; Premium reveals profiles. No reusable unauthenticated image URL is exposed.
- Premium incognito hides a profile from recommendation discovery; it does not hide it from existing matches or someone the user has liked.
- Referrer reward: one Super Like after the referred person's first approved profile. Value is stored in `feature_flags.referrals.config`; speculative revenue-share arrangements are not implemented as accepted requirements.
- Premium first-offer eligibility: no previous paid order. Premium periods are one-time purchases, not recurring billing.
- Weekly Boost uses a rolling seven-day interval. Paid inventory persists. Purchased consumables are spent before no free allowance only when allowance exhausted.
- Today expiry is selected as device-local midnight, validated server-side as no more than 24h ahead. Server stores UTC timestamps.
- Chats poll while visible (4s), match list every 12s. No claim of WebSocket transport.
- Owner is the only administrator in v1. Moderator/support role columns are reserved but no role delegation UI is exposed.
- Photo and substantive profile edits hide the profile until re-review. Preference changes do not reset review status.
- The runtime SVG brand mark interprets the described geometric V/heart/star identity. Retrieved older logo file has a different ribbon-heart mark; it was not silently treated as the exact final approved artwork. Exact final asset should replace the SVG when recovered.

## Explicit limits still requiring work before broad release

- No phone/selfie/identity verification, automatic face matching, machine-learning moderation, voice/video messages, translations beyond RU/EN, subscription renewals, card checkout, scheduled mass messaging, partner commission payout system, or claims of guaranteed Boost impressions.
- Discovery currently evaluates up to 200 eligible candidates; a large global deployment should move distance filtering/indexing to PostGIS and add cursor-based candidate retrieval.
- Owner queue lists are bounded (100 profiles/users, 200 administrative records). CSV/ZIP exports stream all users in batches. ZIP includes photos and complete transcripts attached to both participants. Owner-only dossiers/per-user archives are available. Exports are audited and limited to three starts per hour per owner.
- Billing refund mechanics are present but live Stars acceptance/refund verification is pending.
- Main Mini App BotFather configuration and operator/legal details are external setup items.
