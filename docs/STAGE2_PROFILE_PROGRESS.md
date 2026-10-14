# VEYRA Stage 2 — Profile progress
Status: IN PROGRESS / NOT ACCEPTED

## Immutable baseline
- Base branch: `main`
- Initial SHA: `8a87fbbc1b72cc6bb572c0da114ad429a8283456`
- Production: `https://veyra-3806.onrender.com`
- Render service: `srv-db29v8bbc2fs73frd4rg`
- Initial live deploy: `dep-db7s0195efls73crnr60` at `8a87fbbc1b72cc6bb572c0da114ad429a8283456`.
- Existing Stage 1 registration is owner-accepted. Do not change Stage 1 workflows (except connecting existing read-only Member preview).
- No production data reset, seeds, migrations, payments/Premium/VEYS changes; Stage 0 snapshot remains untouched.
- Working branch: `stage2/profile-motion-gestures-20261014`. Exactly one final PR and one auto-deploy after merge.

## Stage 2 checklist
- [x] Baseline static source/CSS audit (pre-change Playwright screenshots NOT captured: evidence incomplete)
- [x] Code patch: deterministic uniform hero transform, discrete circle mask, attached ring/online; native haptic edge trigger unchanged. Browser validation PENDING
- [x] Code patch: remove duplicated blurred image and hero shade DOM/CSS
- [x] Code patch: avatar-only interaction and pointer-transparent action wrapper; Telegram dismiss guard was already implemented. Browser touch validation PENDING
- [x] Code patch: Embla drag threshold 10px, existing Embla axis arbitration; actual Android gesture validation PENDING
- [ ] Photo ordering (six maximum), interaction areas, loading/error cases
- [x] Existing real `Member` preview retained. Inert but visible disabled owner-action controls; manual browser parity PENDING
- [x] Removed duplicate motion-specific transition, dark shades, redundant fixed ring/dot/blur definitions; residual broader CSS consolidation PENDING
- [ ] Unit/Playwright mobile, geometry, gesture, preview, performance coverage
- [ ] `npm ci`, typecheck, lint, tests, build, secret check
- [ ] One PR, required CI, merge, production Render SHA and endpoints

## Confirmed source findings (initial static inspection)
- `MemberMotion5.css` contains `transition:border-radius .16s ... !important`, but `MemberMotion6.css` overrides it with `transition:border-radius 0s!important`: the transition is a conflicting legacy rule; **not confirmed to be actively animated**.
- `MemberPolish7.css` explicitly applies a multi-stop dark gradient to `.vx-profile-photo-shade` and `Member.jsx` renders the shade node. This is a proven source of photo darkening.
- `Member.jsx` already mounts the real `Member` inside `ProfilePreview.jsx` with readOnly + previewData. Duplication of full Member is NOT confirmed; preview has distinct outer tabs and a separate feed-card mode.
- `profileMotionMath.js` switches `height` from full hero height to square width abruptly at `PROFILE_CIRCLE_AT=.34` while width is still full screen; this produces a transient oversized circle in the fallback. `profileScrollTimeline.js` shares these keyframes.
- `MemberMotionV2.css` sets `.vx-profile-hero-photo{pointer-events:auto}` for the full original hero viewport even after visual transform; `vx-profile-primary-actions` is a full-width pointer-events:auto wrapper. Both are potential dead-zone hit targets. Verify via hit-test on browser before changing.
- Existing Embla `MemberSwipePages` already follows the finger but conflicts with profile scroller and hero gesture touch-action; real-device behavior remains unverified.

## Pending diagnostics/evidence
- Pre-change Playwright screenshots and `elementsFromPoint` grid: NOT RUN YET.
- CPU 4× throttling and real Samsung 55–60 FPS: NOT VERIFIED.
- CI / PR / production checks: NOT RUN YET.

## Changes in PR #80
- `profileMotionMath.js`, `profileScrollTimeline.js`, `useVeyraProfileMotion.js`: uniform portrait transform + one discrete clip path, no counter-stretch; old layer tracks removed.
- `Member.jsx`: remove shade and second decorative blurred photo, add avatar-only hit target, inert preview action UI and retry path.
- `MemberMotionV2.css`, `MemberFinish.css`, `MemberMotion5.css`, `MemberMotion6.css`, `MemberPolish7.css`, `MemberReferencePolish.css`: remove shadow overlays, obsolete radius transitions, fixed avatar ring and dot; authoritative avatar silhouette in V2.
- `ProfilePreview.css`: keep shared visible disabled buttons instead of hiding full row.
- `MemberSwipePages.jsx`: horizontal Embla drag threshold raised from 4px to 10px; browser touch checks needed.
- `tests/profile-motion.test.js`, `tests/profile-scrolltimeline.test.js`, `tests/browser/v5.spec.js`, `tests/member-readonly-preview.test.js`, `tests/ui-overhaul-acceptance.test.js`: Stage 2 assertions and update previously frozen stage-1 expectations.

## Actual CI result and errors
- PR #80 head before test revisions: `cb1de3381123483deafaa69ab61ce4107e37e93d`.
- Workflow `38616235099`, npm ci PASS, typecheck PASS. `npm run check` FAIL: 182 of 185 Node tests pass; three rejected obsolete Stage-1 assertions:
  1. `member-readonly-preview.test.js`: required the old `display:none` rule for preview controls. Stage 2 requires visible but inert actions.
  2. `ui-overhaul-acceptance.test.js`: frozen Git blob SHA of the old math module. Stage 2 deliberately changes math.
  3. `ui-overhaul-acceptance.test.js`: expected `tracks.blur.push` despite explicitly removing redundant secondary blurred photo.
- Those regression tests were rewritten to check the new design requirements. New CI after commit PENDING.
- `npm run lint`, secrets check, Playwright, production build have NOT passed yet; first run was blocked at `npm run check`.
- No production deployment of Stage 2 has occurred.

## Defect root causes
- Dark photograph: confirmed DOM `vx-profile-photo-shade` + multiple black overlays.
- Circle intermediate silhouette/oversized circle: original `profileFrame` made the full-width photo square in one frame before it shrank, and CSS styles declared multiple radius transitions. The final override might have disabled transition; direct device repro was not performed before patch.
- White ring/dot mismatch: old independent ring drawn at fixed coordinates and delayed rim fade while photo was moving.
- Invisible hit region: full original hero layer and full-width actions wrapper had `pointer-events:auto`; runtime elementsFromPoint before-change not captured.
- Horizontal gestures: Embla already existed; hardcoded 4px threshold and adjacent inactive page content-visibility were suspected contributors. No direct before-change touch trace.

## Known unverified tests and manual inspection
- Baseline Playwright screenshots before change: NOT AVAILABLE. New post-change screenshots are in test code, results pending.
- Deterministic per-4px geometry, 12-point vertical+horizontal gesture grid, 20 round-trip cycles, 4× CPU FPS measurements: NOT EXECUTED.
- Compare profile/preview identical data, light/dark/patterned photo screenshot and external Telegram WebView: NOT EXECUTED.
- No changes may merge until required CI gates succeed; Stage 2 owner acceptance pending.

## Manual acceptance
- Samsung Galaxy A55 Telegram Android WebView: **NOT TESTED**.
- Owner must explicitly say «Этап 2 принят». Do not begin Stage 3.


## Owner addendum (2026-10-14) — supersedes conflicting earlier spec
### Visible-region circle geometry — implemented, automated checks pending
- `PROFILE_CIRCLE_AT = .34`: exactly one forward/backwards shape boundary, no interpolated border-radius.
- `PROFILE_CENTER_AT = .46`: finish initial inward movement before docking.
- `PROFILE_VISIBLE_TOP_INSET = 64` px: native profile header visible-area start in scroller coordinates.
- `PROFILE_CIRCLE_WIDTH_FRACTION = .62`: circle diameter may NEVER exceed 62% of viewport width at morph.
- `PROFILE_AVATAR_DIAMETER = 98` px: existing compact avatar endpoint; initial circle never smaller than this.
- `PROFILE_PRE_DOCK_RATIO = .94`: small uniform initial shrink before docking.
- `profileCircleGeometry()`: computes `visibleBottom = min(heroHeight + coverYOffset, sheetY)`; `visibleHeight = max(avatarDiameter, visibleBottom - visibleTop)`, initial diameter `max(avatarDiameter, min(visibleHeight, 0.62 * viewportWidth))`; circle center Y exactly `(visibleTop + visibleBottom) / 2`. Source canvas mask center compensates the cover's preceding vertical translation.
- `useVeyraProfileMotion.js` sets one center/radius pair at calibration and switches CSS `clip-path` discretely at the same offset in BOTH WAAPI and JS fallback. Uniform image transform is keyed to the same `profileFrame()` for native and fallback.
- In nondegenerate supported mobile sizes (360×740, 390×844), the visible-height bound is valid. Narrower/abnormally short viewports must still preserve the 98px endpoint, taking precedence over an impossible smaller visible span.

### Gesture arbitration — Embla is the only horizontal owner
- Existing `MemberSwipePages` uses Embla `axis:'x'` and `dragThreshold:10`, native `touch-action:pan-y pinch-zoom` at the swipe viewport. There is **no custom tab drag recognizer**. User requested any custom lock only after failing Playwright gesture evidence.
- Existing Telegram `disableVerticalSwipes()` has a 7.7+ compatibility guard and is left unchanged.

### Photo count and API discrepancy — preserve, do not normalize in this stage
- **Registration.jsx:** `MIN_PHOTOS=3`, `MAX_PHOTOS=6` (confirmed from line 20 of baseline Stage 1 code).
- **server/app.js:** `POST /api/photos` permits uploads when existing count is below 7 (`if(c.n>=7) fail('PHOTO_LIMIT')`); `POST /api/profile/submit` requires at least 3. This existing server/client discrepancy is NOT changed in Stage 2.
- Stored photo order is preserved; the frontend does not widen Stage 1 upload limits.

### ScrollTimeline absent — explicit acceptance gate
- New Playwright `Stage 2 4px reverse geometry parity` tests are implemented for BOTH native `window.ScrollTimeline` and forced `window.ScrollTimeline=undefined`.
- Each test walks the collapse distance forward/backward in ~4px increments, checks the same shape threshold, computed uniform transform, a hard 0.62 width cap, ring, and near-equal positions in both directions.
- **Result: NOT YET VERIFIED** until CI browser run finishes. Do not claim fallback passed from source inspection alone.

### Rollback requirement — BEFORE merge
- Last known working `main` SHA: `8a87fbbc1b72cc6bb572c0da114ad429a8283456`.
- Merge PR **using GitHub merge-commit strategy** (not squash/rebase); do not merge red CI. At immediate post-merge `main` head, with the merge as HEAD, execute:
  ```bash
  git switch main
  git pull --ff-only origin main
  test "$(git rev-parse HEAD^1)" = "8a87fbbc1b72cc6bb572c0da114ad429a8283456"
  git revert --no-edit -m 1 HEAD
  git push origin main
  ```
- The `test` parent-SHA guard prevents reverting an unrelated deployment; if it fails, halt and inspect, never force push.
- On failed Render `/healthz`, `/readyz`, SHA mismatch, new boot errors or required CI: **do not patch blindly**; revert the merge promptly and report.
- The actual Stage 2 merge commit SHA, production deploy ID, and endpoint results must be recorded after they exist; currently NONE.

### Remaining prerequisites before release
- Stage 2 17.3 actual gestures from 12 lower-region origins; tap verification; preview parity; cycle/leak checks.
- Chromium 4× perf/FPS and real-device manual validation (do not equate laboratory FPS with Samsung FPS).
- New CI for latest addendum geometry + native/fallback Playwright; current published statements about status remain preliminary.
