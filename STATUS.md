# VEYRA — current handoff

Updated 2026-10-08 (Moscow). Existing service: https://veyra-3806.onrender.com. Private repository zhirayr2505/veyra.

## Current authorized work

Owner requested the approved five-step registration, original graphics, gift placeholders and deletion of existing test users so everyone registers again. This stage is complete. Source c294745f6f0c9e494eb014d8c978ddba96e7d8a7 is deployed and verified on Render at 2026-10-07T21:42:46Z (00:42 Moscow, October 8). Registration v2 is active; the one-time reset completed at 21:42:19Z. All old dating profiles and sessions were cleared, including profiles of retained billing accounts.

## Changes

- Exact original logo exports replace the old drawn mark. Brand animation accompanies authentication loading. Package artwork, icons, illustrations and favicon are integrated; source provenance is in public/graphics.
- Five steps: identity with 18+ check; global location/radius; partner/age filters; optional interests/habits; 3–6 photos and consent. Private drafts resume registration.
- Square photo tiles: multiple upload, replacement, deletion, touch/pointer and keyboard reorder, main-photo designation. Server checks photo ownership, permutations, consent and minimum count.
- Gifts are Coming soon placeholders in cards/chats/collections; no payment or reaction side effects. Prices and payment flag remain unchanged.
- Additive migration 005_registration.sql. One-time launch-reset.js scoped to the existing Render URL, with billing preservation and audit marker registration-v2-2026-10-07. Clears every dating profile/session and queues storage cleanup. Billing records and necessary account rows/paid entitlements are preserved; they also require fresh registration. Preserves catalog/configuration and restores owner authority from environment on next login.

## Verification

50 server tests and all 6 browser scenarios passed for source 47c3071 in CI run https://github.com/zhirayr2505/veyra/actions/runs/37687839818. Production build and secret scan passed. Includes adult registration, persistence without local storage, reorder persistence, manual moderation, match/chat/exchange/export and mobile safe areas. The server-only billing-preserving reset fix c294745 passed four focused tests. Live readiness/frontend checks passed; protected APIs require authentication; the served approved logo and icon sprite are byte-identical to the source assets. Tests are isolated, not live Telegram payments.

Do not restart repository analysis. Reuse this verified source and current results. User requested economical checks: no repeated full tests or browser runs per small edit, no repeated graphic conversions, no constant Actions polling.

Details: docs/REGISTRATION_V2.md and docs/REQUIREMENTS.md.

The first rollout revealed payments are currently enabled in the live database. This was not changed. The initial protective reset did not run; server-only fix c294745 preserves paid orders and accepted checkouts instead of blocking all resets. Its four focused registration/reset tests pass. Do not claim live payments are disabled.

## Messages Core stage 1 — 2026-10-08

Completed the isolated chat upgrade. See docs/MESSAGES_CORE.md for implementation, transport behavior and exact checks. Twenty focused server/archive checks and the two-member mobile chat scenario pass; production build passes. GitHub Actions/full CI were not run. Voice/media/stickers remain out of scope. Do not repeat registration reset or restart repository analysis.
