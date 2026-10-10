# VEYRA V5 — Clean rebuild and release gates

## Deployment safety

This feature branch `rebuild/veyra-v5-clean-slate` contains a new React Mini App entry, a new presentation/component tree under `web/v5`, and removes the legacy front-end modules. It **does not modify Render environment variables, bot tokens, provider accounts, storage, existing customer records, or database tables**. The Render production web service still deploys automatically from `main`; merely pushing this branch does not change production. The backend security/session/payment/moderation infrastructure is preserved rather than reimplemented without migration testing. **No database reset was performed and no external backup was taken**.

Before merge/deployment:
- Run `npm ci && npm run check && npm run secrets:check` in isolated CI.
- Restore new UI-specific browser acceptance tests (legacy browser snapshots target the replaced interface).
- Verify signup 18+, city search and location consent, 3–10 photo uploads, reordering, private storage, manual moderation, rejection and resubmit.
- Verify feed, like, match, chat, member profile, gallery, block/report, unread receipts and no unnecessary remount after tab switching.
- Verify Gifts/Courtship/Premium and Telegram Stars **in a private test account** with real Telegram pre-checkout + webhook, cancellation and refunds before switching on `payments` feature flag. Paid gifting remains guarded by this flag.
- Test mobile WebView performance and authentication, accessibility, language support, legal policies, localization and user data erasure.
- **Take a verified encrypted PostgreSQL backup and a separate Supabase Storage media backup**, and validate restoration before any schema/data reset. Never execute a data reset from a frontend deploy.
- Snapshot/verify Render secret names via a secure administrative route, without displaying secret values. Keep them in Render, not GitHub.
- Obtain formal production approval and merge into `main` only after all blockers pass.

## Implemented in this branch

Telegram signed WebApp authentication; splash, welcome, five-step onboarding and manual review; 3–10 photo API; private image blob cache; SVG visual system (75 brand icon variant files) and approved logo traced SVG from `VEYRA_UI_KIT_v1.zip`; discover, nearby and preference-based suggestions; swipe/tap photo gallery, like/pass/super actions, undo, rich profiles and edit/resubmit; match overlay, likes/matches/incoming, persistent-tab chats with actual backend messages and read receipts; public gifts collection, gift catalog and Telegram Stars invoice path; consensual courtship 99 Stars for 30 days; personal ranking statistics and non-appearance popularity badges (recent incoming likes and activity); Premium inventory, filters, settings and privacy export; owner administration with moderation queue, reports, user lookup, feature flags and protected CSV/ZIP downloads.

## Current limitations

This is a **functional integration candidate, not a verified production release**. The V5 frontend has not been tested live against Supabase, Upstash, Telegram clients and Render. The existing server APIs remain in place. The first pass uses the SVG vector trace and visible icon motifs from the approved UI kit; not all PNG assets/screens were imported yet. Default interface strings are predominantly Russian; multilingual accessibility and exhaustive screen parity need review. No artificial profiles will be seeded on new server startups, but previously created test profiles must be identified and handled only after a backup. Legacy E2E visual tests need replacing with V5 scenarios. The payment feature flag stays disabled until verified. The ratings are authentic popularity and activity badges, not numerical appearance scoring.

## Rollback

Until merge there is nothing to roll back in production. After a future approved merge, revert the frontend commit/branch while preserving the existing database, Render configuration, bot webhooks and private media. Any database migration must have an independent tested recovery procedure.
