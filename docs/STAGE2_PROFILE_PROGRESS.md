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
- [ ] Baseline source + CSS authority diagnostics and pre-change browser evidence
- [ ] Deterministic, non-squircle hero geometry and ring, reverse path, one haptic
- [ ] Remove hero shading without changing other screens
- [ ] Transparent hitboxes / dead-zone correction, Telegram swipe fallback
- [ ] Direction-locked horizontal tab carousel plus native vertical scrolling
- [ ] Photo ordering (six maximum), interaction areas, loading/error cases
- [ ] Confirm shared `Member` preview, zero preview mutations
- [ ] Consolidate CSS ownership without new override layers
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

## Changes
- This initial tracking document only.

## Manual acceptance
- Samsung Galaxy A55 Telegram Android WebView: **NOT TESTED**.
- Owner must explicitly say «Этап 2 принят». Do not begin Stage 3.
