# V2 roll-out / migration checklist

Do not delete the existing `web/v5/` or production database while building the next app.

- Freeze V1 production and record Git commit; back up Supabase schema/data/storage and secrets.
- Use V2's original wordmark, color tokens and SVG system as the only visual source.
- **Flow 1:** Telegram authenticated start, onboarding, account details, age gates, interests, geolocation, photo upload and moderation.
- **Flow 2:** Search people — genuine people grid, nearby and filters; no fake profiles.
- **Flow 3:** Encounters — single photo card, like/skip/superlike, next-card animation, image swipe.
- **Flow 4:** Likes — incoming likes and mutual matches; privacy rules from server.
- **Flow 5:** Chats — existing message history, read status, image handling, chat open from matches.
- **Flow 6:** Profile — user photo, editing, verification status, interests, safety, settings and subscription.
- Validate payments and Stars before monetized V2 rollout.
- Run unit, API and mobile E2E tests. Review screens in Telegram on both Android and iOS.
- Switch frontend URL only after approval. Preserve all photos, chats, match records and account IDs.

This asset-only commit intentionally does not switch the existing app UI.
