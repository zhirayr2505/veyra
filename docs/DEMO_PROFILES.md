# VEYRA owner demo profiles — 13 October 2026

**Purpose:** a private visual review of the existing *Лента / Для вас / Рядом* UI and full profiles. Test profiles are not real members and must not be represented as such.

## What is included

- 12 fictional, explicitly marked demo identities: six women and six men aged 23–31.
- One high-resolution illustrative portrait for each identity, with individual bios, interests and dating goals.
- Portrait source: Unsplash (https://unsplash.com/license), fetched from fixed images.unsplash.com photo IDs once at seed time. Images are normalized through the existing private Supabase Storage adapter. They are never exposed as public CDN URLs from the app.
- No Telegram accounts, notifications to synthetic accounts or registration-flow changes.
- The owner sees a lavender demo toggle and the profiles regardless of personal gender/age/distance preferences, to review both layouts. The standard real-user feed stays unchanged.
- Test profiles are labeled **ДЕМО** in swipes, grids and full profiles, with a disclaimer that the persona is fictional and the photo is illustrative.
- The same profiles can be liked to exercise match/chat UI; the automatic test greeting remains clearly labeled.

## Access and isolation

The existing `POST /api/owner/seed-test-profiles` route is authenticated and owner-only. The seed runs only when both application origins exactly match `https://veyra-3806.onrender.com`. Upon approved owner login, the frontend invokes it once, then enables demo preview. Owner can toggle back to real profiles. Do not enable demo profiles for regular users or use synthetic profiles to count registered members.

Production recommendations include synthetic users only for an owner requesting `demo=true` (normal users cannot activate it). In production, direct demo profile and portrait endpoints reject non-owners; synthetic profiles never receive bot notifications. Retired illustrated photos are removed only after a successful new seed.

Seed is repeat-safe via `audit_log` key `owner-demo-portraits-women-men-2026-10-13`. The earlier six illustrated women, if present, are upgraded in place rather than duplicated. If a photo source is temporarily unavailable, the seed fails safely and the owner may press **Повторить**. No partial seed should be visible.

## Verification

Run `npm test`, `npm run build`, `npm run lint`. On a phone open @VeyraAppBot as owner and check each tab and a full profile after Render deployment; confirm photos are sharp and no demo identity appears on a standard account. Deployment and visual verification are not implied by a merged commit alone.
