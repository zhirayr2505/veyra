# VEYRA — Stage 2: profile motion, gestures, unified preview
**Status:** CI GREEN; production deployment and manual Telegram Android acceptance PENDING. Stage 3 is prohibited until the owner says **«Этап 2 принят»**.

## Immutable initial state and production safety
- Repository: `zhirayr2505/veyra`; baseline `main` SHA: `8a87fbbc1b72cc6bb572c0da114ad429a8283456` (accepted Stage 1).
- Working branch: `stage2/profile-motion-gestures-20261014`; one existing pull request: **#80** — https://github.com/zhirayr2505/veyra/pull/80
- Before-stage production: `https://veyra-3806.onrender.com`, service `srv-db29v8bbc2fs73frd4rg`, live deploy `dep-db7s0195efls73crnr60`, revision `8a87fbbc1b72cc6bb572c0da114ad429a8283456`.
- No registration reset, snapshot changes, production data changes, demo seeds, backend changes, financial changes, premium, VEYS, gifts or Stage 3 work.
- Prior browser baseline artifacts: GitHub Actions run `38561917887` and accepted Stage 1 CI run `38607583890`. Source-level initial diagnosis was completed before patching; **initial before-change hit-grid was not captured**, so do not describe post-change evidence as a pre-change measurement.
- No uncommitted Stage 1 changes have been introduced in the PR; its base is exactly the accepted `main`.

## Stage 2 tasks and current proof
| Workstream | Implementation | Evidence/status |
| --- | --- | --- |
| One genuine profile in preview | `ProfilePreview.jsx` already mounts shared `Member` with `readOnly previewData`. Same hero, tabs, mask, layout, and geometry; own action buttons remain visible and disabled | Node preview tests PASS; Stage 1 end-to-end preview navigation PASS. Exact pixel-perfect preview-vs-live fixture comparison: **not independently run** |
| Photo silhouette | One immutable portrait canvas; no width/height squash, no gradual `border-radius`; discrete `clip-path` at `.34` collapse progress | Playwright per-4px forward/reverse geometry tests PASS for **both** ScrollTimeline and forced JS fallback |
| Circle placement | Diameter and visible-region center computed from sheet edge and top header; attached white ring/online dot | Geometry Node + Playwright tests PASS; 0.62 viewport width bound checked |
| Haptic | Telegram `impactOccurred('light')` only on deliberate forward threshold crossing, guarded from repeated small oscillations | Chromium test PASS; actual Samsung haptics require manual verification |
| Unfiltered portrait | Remove shade DOM + dark overlay and extra blurred image, no image saturation/brightness filters | Source and browser DOM/computed-style tests PASS; light/dark/patterned photo visual comparison remains manual |
| Hitbox/vertical scroll | Compact hero no longer steals touches outside circular avatar; actions wrapper transparent except buttons; own-profile host avoids persistent `.view-tab` transform | 12-origin touch grid with full `elementsFromPoint()` and ancestor chain PASS in mobile Chromium |
| Horizontal tab swipe | Embla remains only gesture owner: `axis:'x'`, `dragThreshold:10`, touch-action `pan-y pinch-zoom`; no custom direction-lock added | 12-origin simulated horizontal gesture test PASS; some legacy main-baseline profile tests still fail (listed below) |
| Avoid nested scroll trap | `overflow:clip` in `MemberMotionV2.css`, remove conflicting old `overflow:hidden!important`, remove swipe viewport from global overscroll containment, allow vertical scroll chaining | First three CI approaches uncovered false assumptions about CDP gestures; final `dispatchTouchEvent` 12-point test PASS |
| Iterative reliability | Scroll-linked fallback reads `scrollTop` once in RAF, no React render per pixel; snap/resize/cleanup preserved | Twenty full repeated gallery/tab/collapse cycles PASS. Event-listener-count instrumentation **not run** |
| Performance | WAAPI ScrollTimeline or RAF fallback; uniform transform and discrete mask; never darken hero | CPU-throttled Chromium 4× trace PASS; real Samsung FPS not measured |
| Project checks | `npm ci`, typecheck, `npm run check`, lint, secret check, Chromium browser baseline | **All green on CI run `38627230433`**, head `070d5f9ea61f3c59058276dc5f455472cc1541e5` |

## Confirmed and rejected hypotheses
1. **Dark portrait confirmed:** `Member.jsx` mounted `.vx-profile-photo-shade` and `MemberPolish7.css` applied a dark gradient. Both removed. Duplicate `.vx-profile-blurred-header` also removed.
2. **Transient giant/square intermediate confirmed in math:** the previous `profileFrame()` abruptly changed the original hero height to its full width before shrinking. Now geometry never changes the canvas dimensions. `MemberMotion5.css` used `transition:border-radius .16s!important` but `MemberMotion6.css` overrode it with 0s; the transition was a **conflicting rule**, not proven active on real WebView.
3. **Ring lag:** independent fixed ring/dot and delayed opacity phases could detach from a moving photo; removed these independent coordinates. New rim and dot share the same fixed-image transform/mask origin.
4. **Dead zones:** full original hero and actions wrapper had pointer events; compact states now expose only real interactive areas. Parent profile container also suffered from a persistent `transform` introduced by `animation-fill-mode:both` on `.view-tab`. Scoped removal for own-profile host restored painted profile.
5. **Gesture conflict:** Embla was already present; no homegrown direction lock required. The shared swipe viewport had `overflow:hidden` and `overscroll-behavior:contain` blocking vertical scroll chaining. Now `overflow:clip`, no extra containment on viewport. The first CDP `synthesizeScrollGesture` test *also* failed to scroll a known-good isolated fixture in this CI environment; the final positive test uses actual touchStart/touchMove/touchEnd packets and verifies scroll traces.
6. **Hypothesis rejected:** merely changing `overscroll-behavior-y` without removing the nested `overflow:hidden` was insufficient. `border-radius .16s` alone was not proven responsible because a later zero-duration override existed.
7. Telegram-supported `disableVerticalSwipes()` already had a guarded fallback; no further change required. Shared LiquidLogo is retained, not forked.

## Named circle geometry and both engines
- `PROFILE_CIRCLE_AT = 0.34`, `PROFILE_CENTER_AT = 0.46`, `PROFILE_VISIBLE_TOP_INSET = 64` px.
- `PROFILE_CIRCLE_WIDTH_FRACTION = 0.62`, `PROFILE_AVATAR_DIAMETER = 98` px, `PROFILE_PRE_DOCK_RATIO = 0.94`.
- `profileCircleGeometry()` defines `visibleTop` below the native header; `visibleBottom = min(heroHeight + coverYOffset, sheetY)`; initial diameter `max(finalDiameter, min(visibleHeight, 0.62 * viewportWidth))`, center Y `(visibleTop + visibleBottom) / 2`. In supported viewports initial diameter cannot exceed 0.62 screen width.
- CSS mask is switched in **one discrete state** (`circle(var(--vx-profile-mask-radius) at 50% var(--vx-profile-mask-center-y))`) rather than a radius transition; unchanged image canvas has one **uniform scale** from both ScrollTimeline keyframes and RAF fallback.
- Playwright test files contain `stage2-geometry-parity.json` artifacts for **native ScrollTimeline** and **forced no-ScrollTimeline**; each ran **95** forward/reverse samples at ≈4px for a 373px collapse distance, both PASS.

## Photographs — preserve real limits
- Accepted `Registration.jsx` constants: `MIN_PHOTOS=3` and `MAX_PHOTOS=6`.
- Baseline server `POST /api/photos` currently permits up to 7, while `POST /api/profile/submit` requires 3. This **preexisting client/server discrepancy is explicitly left unchanged** in Stage 2; do not describe these numbers as newly designed limits.
- Photo order remains saved ordering, first remains hero, error/empty placeholders unchanged. No new upload pipeline, formats, caches, seeds or production records.

## Files changed in PR #80
- React/components: `web/v5/Member.jsx`, `web/v5/MemberSwipePages.jsx`, `web/v5/ProfilePreview.css`.
- Motion: `web/v5/profileMotionMath.js`, `web/v5/profileScrollTimeline.js`, `web/v5/useVeyraProfileMotion.js`.
- Consolidated CSS: `web/v5/MemberMotionV2.css`, `web/v5/MemberFinish.css`, `web/v5/MemberMotion5.css`, `web/v5/MemberMotion6.css`, `web/v5/MemberPolish7.css`, `web/v5/MemberReferencePolish.css`, `web/v5/TelegramSwipeGuard.css`.
- Tests: `tests/browser/v5.spec.js`, `tests/profile-motion.test.js`, `tests/profile-scrolltimeline.test.js`, `tests/member-readonly-preview.test.js`, `tests/ui-overhaul-acceptance.test.js`.
- Tracking: `docs/STAGE2_PROFILE_PROGRESS.md`.
- Deleted/merged rules: dark `.vx-profile-photo-shade` block, duplicate blurred header, legacy `transition:border-radius` in Motion5/Motion6, old independent avatar ring/dot positioning, unnecessary blur/rim/opacity keyframe tracks, duplicate swipe viewport `overflow:hidden!important`, shared vertical overscroll containment on the Embla viewport. New CSS is placed in existing files; no `MemberMotion8.css`, `MemberFixFinal.css`, or other override layer.
- No intentional backend changes, production migrations, secret files, uploads, or payment logic in PR diff.

## CI evidence: last GREEN verification
- Pull request: https://github.com/zhirayr2505/veyra/pull/80
- Full workflow: https://github.com/zhirayr2505/veyra/actions/runs/38627230433
- Artifact: `browser-verification`, id `11925350492`; Playwright `v5-results.json`.
- `npm ci` **PASS**; `npm run typecheck` **PASS**; `npm run check` **PASS**, 186 / 186 Node tests, 0 failures and production Vite build PASS.
- `npm run lint` **PASS**; `npm run secrets:check` **PASS**, no detected credentials.
- Chromium regression comparison: **68 browser tests = 56 pass + 12 documented failures already in `main`; new regressions = 0**. Exact evidence: `main_baseline_run=38561917887`. These 12 are **not** marked as successful tests.
- All new Stage 2 browser scenarios PASS: discrete mask/rim/shade, 4px ScrollTimeline, 4px RAF fallback, own profile paint and hitbox, 12-point horizontal and vertical drag, 20 cycles, Telegram haptic, CPU4× telemetry.
- CPU 4× diagnostic: 90 frames; **mean FPS 60.0026**, slowest FPS **59.5238**, p95 frame **16.7ms**, **0 long tasks**, **0 layout shifts**. This is an isolated Chromium diagnostic and **NOT a guarantee of 55–60fps on Samsung Galaxy A55**.
- Initial failed CI runs documented for diagnosis: `38616235099`, `38617664096`, `38619876592`, `38621161926`, `38622441455`, `38623558473`, `38624697335`, `38625783248`. Only last head `070d5f9e` is release-gated green.

## Safe rollback before any merge
- Last working `main` prior to Stage 2: `8a87fbbc1b72cc6bb572c0da114ad429a8283456`.
- **Use a merge commit** (no squash/rebase). After merge, with merger commit as HEAD:
```bash
git switch main
git pull --ff-only origin main
test "$(git rev-parse HEAD^1)" = "8a87fbbc1b72cc6bb572c0da114ad429a8283456"
git revert --no-edit -m 1 HEAD
git push origin main
```
- Execute revert ONLY if deploy, health, startup logs, or SHA verification fail; the parent test prevents reverting unrelated changes. Never force-push, reset a DB or patch blindly over a failed deploy.
- Final merge SHA, Render deploy ID, `/healthz`, `/readyz` and production smoke outcome: **PENDING**; append actual facts after deployment. `main` and production must agree.

## Manual acceptance remaining
- Samsung Galaxy A55 inside Telegram: visible first-circle diameter/location, reverse mask/ring, online dot, haptic exactly once, no photograph darkening, real touch/diagonal gestures, links/buttons, bottom safe-area.
- Real light, dark and busy photo variants; production network retry, one vs many photos, long text, offline/online and Premium/without Premium.
- Exact real profile vs registration preview screenshots using equivalent real draft data; identical style and no preview requests. Reconfirm Stage 1 registration transitions remain intact.
- Per-event listener count comparison and native-device profiling were not independently gathered (20-cycle UI test ran without a listener-count fixture).
- 12 pre-existing main-baseline browser failures remain known; do not silently call them passed.
- **Do not begin Stage 3 until owner explicitly says «Этап 2 принят».**
