# VEYRA visual refresh — 2026-10-07

The owner confirmed the previous live version worked, then supplied ten mobile references and requested a smoother, more polished design with missing agreed functions. This update retains VEYRA, global discovery, stored profiles/chats, moderation, provider integrations and the existing product prices.

## Screen mapping

| Reference | Implemented behavior |
| --- | --- |
| Welcome | Cinematic photo, dark gradient, VEYRA mark, 18+ information, Telegram entry and explanation sheet |
| Registration | Clear progress, consistent fields/chips, existing age/consent/location validation, private photo upload and moderation |
| Feed | Large photo card, carousel count, interests/goals, smooth swipe and reaction transitions, working filters |
| Today | Real profile list, availability switch, time/activity settings and existing expiry; up to six results within remaining daily quota |
| Likes | Premium grid and free count/paywall; hidden profiles never fetched as decorative blurred photos |
| Match | Full-screen celebration with both real profile photos; direct navigation into that match's chat |
| Chat list | Rounded avatars, actual unread counts/timestamps and working name/last-message search |
| Conversation | Date groups, received avatars, read ticks, emoji picker, keyboard-aware composer and existing report/block/exchange flows |
| Premium | Benefit cards, plan selection and live catalog prices; existing Stars checkout, feature flag and purchase confirmation |
| Profile | Large avatar, interests, photo gallery, profile editing, functional pause/resume and existing account/settings/support controls |

## Interaction and data behavior

- Near-black surfaces, warm pink/magenta/violet accents, thin borders, restrained glows and consistent rounded controls.
- Animated screen/sheet transitions, touch feedback, image fades and swipe spring-back. Reduced-motion preferences disable nonessential motion.
- Sheets retain keyboard focus, support Escape and return focus to their trigger. Navigation and controls have accessible names.
- Profile pause is an additive database migration (`004_profile_pause.sql`); it does not delete or recreate any data. Discovery and incoming likes exclude paused profiles, while existing chats remain available.
- Today uses the same server impression accounting as the regular feed. Rendering a batch cannot bypass the daily quota or charge the same impression twice.
- No sample people, online counts, artificial unread counts, guaranteed Boost multipliers or decorative mockup prices are presented as live data.
- Moderation marks mean manual review, not identity/age verification. Calling, voice/video messaging and identity verification are not introduced as nonfunctional buttons.
- Existing external integrations and payment enablement remain controlled by their existing configuration. No real messages or purchases are sent during automated tests.

## Welcome artwork

Mode: built-in image generation. New decorative welcome/Premium artwork, not a modification of the owner's references or a member's profile photo.

Application asset: `web/assets/welcome-couple.webp`, 50,410 bytes. The original generated image was inspected and converted to a compressed WebP for the Vite asset pipeline.

Generation brief: photorealistic natural portrait, 2:3 composition for a full-bleed VEYRA welcome screen. An adult couple around 28–32 on a city terrace at blue hour: a woman with wavy chestnut hair wearing a black top, and a man with dark wavy hair and a dark shirt gently kissing her temple. Candid expression, natural skin texture, faces in the upper-middle area. River/city background, warm amber bokeh, midnight purple and black with subtle magenta. Quiet top for the brand and a dark lower third for white interface copy. No text, logo, interface, phone frame, buttons or watermark.

## Verification

Server/API checks cover pause authorization/persistence, hiding and resuming discovery/likes, preserving chats, and Today batch limits/accounting. Browser checks cover all redesigned main screens, chat search, persisted pause, actual product prices, locked-photo privacy, onboarding/moderation/match/chat/exchange/export and small-screen safe areas.

Exact CI run, results and live deployment revision are recorded in `verification.txt` and `../STATUS.md` after verification. Tests use isolated signed fixture identities and stubbed providers; they do not substitute for actual Telegram/Stars acceptance.

Release evidence: 46 server/API tests and 6 Chromium scenarios passed on application commit `5210eb010ffd85998cf892b15d271a0c1dff918b` ([CI run](https://github.com/zhirayr2505/veyra/actions/runs/37609850415)). The live Render deployment was verified at 13:53 Moscow on 2026-10-07: all six public checks passed, and the served JavaScript, CSS and welcome artwork matched the tested build byte for byte. Real Stars purchases remain disabled in the test service.
