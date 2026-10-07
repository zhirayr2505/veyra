# VEYRA — current handoff

Updated 2026-10-07. Canonical source: private GitHub `zhirayr2505/veyra`, branch `main`. Existing service: https://veyra-3806.onrender.com.

## Working product

The owner confirmed the previous deployed version works. The current task is the visual refresh requested with ten mobile references, plus missing agreed experience features. Do not restart the project, ask for the known URL or request credentials in chat.

- Mini App, API, owner Web Admin, user/admin Telegram bots; PostgreSQL, Redis, private Supabase Storage, Geoapify and Telegram Stars integration.
- Auth/onboarding/18+, private photos, manual moderation, global feed and quotas, swipes, likes, Super Likes, pre-match, matching, Today, internal chats, read status, block/report/unmatch and mutual Telegram exchange.
- Premium/Boost, referrals/promos, support/settings, owner audit/flags and complete CSV/ZIP exports. Each participant's archive includes their own profile/photos and associated full chat transcripts.
- Existing startup fix recognizes the legacy HTTP 400 missing-bucket response, creates a private bucket and rereads metadata. Permission/authentication errors still fail closed.

## Design refresh

- All ten screen types updated: welcome, registration/photos, feed, Today, likes, match, chat list, conversation, Premium and profile.
- Near-black surfaces, pink/magenta/violet gradients, larger photos, consistent controls, restrained glow, smooth swipe/sheet/screen transitions and reduced-motion support.
- Added persisted profile pause/resume, chat search, photo gallery, direct entry into the matched chat and real navigation counters.
- Today supports a list of up to six profiles using the existing daily impression allowance. Paused profiles disappear from discovery/incoming likes while existing chats remain usable.
- Modal layers render above navigation; nested dialogs preserve focus and restore scrolling. Switches respond immediately and revert if a save fails.
- VEYRA branding, global geography, actual member data and confirmed prices retained. Decorative reference prices and sample people are not used as live data.
- Additive migration: `004_profile_pause.sql`. No data reset, provider change or payment-flag change.

## Verification

Release candidate: `5210eb010ffd85998cf892b15d271a0c1dff918b`.
CI: https://github.com/zhirayr2505/veyra/actions/runs/37609850415.
46 server/API tests and all 6 Chromium browser scenarios pass, including failed-save rollback and nested-dialog focus/scroll cleanup. Production build and credential scan pass.

Previous complete design CI also passed on `b842140b60a8ba132ccc2ee2cdd0641a26139a5e` (run 37609578329). Reviewed the resulting mobile screenshots, including onboarding, feed, Today, likes/paywall, chat, profile, profile preview, Premium and match. The small-screen gate includes 390×844 and 320×568 with a 34px bottom safe area.

Live verification: 2026-10-07, 10:53 UTC (13:53 Moscow). Render serves `5210eb010ffd85998cf892b15d271a0c1dff918b`. All six public checks pass: application, PostgreSQL/Redis readiness and unauthorized-data rejection. JavaScript, CSS and welcome WebP return HTTP 200 with the expected types and match the verified local build byte for byte.

Payments remain disabled in the test service. Actual Stars purchase/refund is still a separate live acceptance item. Automated browser tests use signed fixture identities, an isolated database and stubbed external providers; they do not send real Telegram messages or create real purchases. The owner's general confirmation does not establish every individual payment/webhook scenario.

Decisions: `docs/REQUIREMENTS.md`. Screen mapping/artwork: `docs/DESIGN_REFRESH.md`. Exact evidence: `docs/verification.txt`. Next action: `NEXT_TASK.md`.
