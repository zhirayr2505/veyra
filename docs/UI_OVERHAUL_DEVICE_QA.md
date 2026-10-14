# VEYRA UI overhaul — physical Android acceptance (2026-10-14)

**Branch:** `feat/ui-overhaul-2026-10-14` / PR #73. **Do not merge or deploy to production before device QA.** The immutable profile morph math file `web/v5/profileMotionMath.js` has the same Git blob SHA on main and this branch: `1546f7ff65deb1daec733209ffb0094c3745ceb1`. The regression test freezes it.

## Environment and evidence

- Use a physical Android phone (target: Samsung Galaxy A55 / Android 16), the official Telegram Mini App, and a staging deployment or authenticated preview of this branch, **not** the existing production `main` Render service.
- Capture device/Android/Telegram/WebView versions, build SHA, viewport width, screen recording at 60 fps, and at least one Chrome remote-debugging performance trace (Performance panel). Compare `prefers-reduced-motion` both off and on.
- Target near-60fps frame pacing during profile morph, swipe and step transitions; report median, p95 frame interval, dropped frames and long tasks. Do not claim 60 fps from npm tests alone.

## Test matrix

| Check | Scenario | Pass criterion | Device result |
| --- | --- | --- | --- |
| 1.1 | Expand/collapse member; scroll through all tabs and to bottom | No grey blur band, clipped content or stolen touch | Pending device |
| 1.2 | Slowly morph square → circular profile photo | No premature rectangular rim or white vertical stripes | Pending device |
| 1.3 | Scroll cover with 1–7 photos | Photo progress does not overlap Telegram chrome or logo | Pending device |
| 1.4 / 2 | Very bright and very dark profile photo; switch photos while scrolling | Approved wordmark legible; no tone flash; flow pauses while scrolling | Pending device |
| 3 | Drag hero photos left/right slowly and flick rapidly; scroll vertically mid-drag | Photo follows finger, vertical scroll remains native, no morph regression | Pending device |
| 5.1–5.6 | Open user from feed/likes/chat on Slow 3G, then switch back; force a photo failure | Seed/blur same-photo first; decoded sharp replaces it within 280 ms; retry works | Pending device |
| 4.1–4.5 | Registration, feed and member interests, all 7 categories, button states | Same primary gradient, glyphs, tokens, chip palette and full preview UI | Pending device |
| 4.6–4.7 | Type name/city/bio with keyboard; test Анна-Мария and О’Брайен | CTA never covers field; inline errors readable; names save/reload | Pending device |
| 4.8 | Upload 3–7 6–20MB phone photos, rotate and reorder, disable network mid-upload | Bound images to ≤2048px; only 2 parallel, retry/progress, responsive editor | Pending device |
| 4.9 | Select cards, submit successfully and trigger error | Expected Telegram haptics; touch hit area ≥44px; focus visible | Pending device |
| 6.1 | Preview from registration, legal, editor, pending/rejected completion | Same components and visual language; action buttons work | Pending device |
| 6.2 | Step 1→8 and 8→1, rapid double taps, keyboard visible | Bidirectional transition, heading focus, no header/CTA jumps | Pending device |
| 6.3 | Select gender/goal/interest, add photo, reach submission success | Short one-shot microanimations; no repeated distracting loops | Pending device |
| 6.4 | Profile ScrollTimeline under sustained horizontal/vertical gestures | No frame pacing regression; approved phases and speed unchanged | Pending device |

## Production sanity check — separate from feature acceptance

- A manual Render API deploy of `main` (commit `9c197f5c589cabb311627616814c93b01ade86a4`) was started 2026-10-14 11:34:53 UTC and finished successfully at 11:35:41 UTC. No new feature-branch code was deployed. Render reports `live`, with both bots configured and `VEYRA listening` in startup logs.
- Render application logs show three `request_failed` events for `/api/photos/{id}` around 11:41:28 UTC, each with `code:23`; the root cause has **not** been established. They are not deploy/build failures. Check corresponding photo records/storage and authenticated access before declaring all photo traffic healthy.
- Existing photo LQIP backfill on the feature branch still requires a separately controlled migration/backfill step after feature deployment. Do not run against production as part of UI-only QA.

## Release gate

Code CI = unit tests, build, lint and secrets check. Real-world gate = every device row marked PASS with evidence, a short list of any exceptions, plus explicit production release approval. If physical Android or staging access is unavailable, mark item 6.4 `[!]` with the missing evidence rather than falsely recording `[x]`.
