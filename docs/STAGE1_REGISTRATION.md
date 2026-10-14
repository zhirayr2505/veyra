# VEYRA · Stage 1 — Registration rebuild
Date: 2026-10-14
Base: `5f62661f3fcb1b21016f86c0fb87565ce17b8748` (PR #75/#76 already on main)
Scope: Eight existing registration steps + shared LiquidLogo, ProfilePreview read-only wiring. No backend, SQL, seed, stage-0 reset, premium, payment, admin or profile motion changes.

## Audit of baseline code
- `Registration.jsx` / `RegistrationTransitions.css` / `style.css`: concurrent native ViewTransition, WAAPI and CSS `.registration-step.forward/.backward` + stagger. Original 320 ms transitions conflict with 180 ms exiting and native pseudo-element animation.
- `Registration2026.css`: `[data-keyboard-open="true"]` makes CTA opacity 0, visibility hidden, and pointer-events none. VisualViewport was observed only for resize and keyboard status in React; missing offsetTop/scroll.
- `Registration2026.css`: final `touch-action:pan-y!important` contradicts earlier `touch-action:none`, browser cancels vertical pointer stream.
- `Registration.jsx`: `MAX_PHOTOS=7` contradicts Stage 1 cap of six; Pointer events split between document capture and tile; no direct replace UI; only horizontal keyboard arrow ordering; per-move React state writes; URL.createObjectURL uploads are guarded by uploadRunning ref.
- `LiquidLogo.jsx/.css`: approved SVG mask and animated opaque gradient; recurring sheen; absent real backdrop refraction and glass fallback.
- `ProfilePreview.jsx` already renders real `Member` via `readOnly previewData`, but defaults to feed mode. No preview-only independent Member renderer should be added. `Member` handles preview as own account and prevents network reads via `ownSeed`; local tab/action isolation needs checking.
- `Registration.jsx` localStorage writes draft but does not read it back; server draft is loaded via `me.registration`. Stage 0 reset requires ignoring stale local drafts when the server has none.
- `server/registration.js` and API/Storage are explicitly out of scope; `/profile/submit` and `/photos/order` remain canonical.

## Stage 1 acceptance checklist
- [ ] 1. Eight steps, their order, required fields, underage gate, Geoapify, consent and API unchanged
- [ ] 2. Exactly one 260–320ms compositor transition; forward/back, cancellation, no duplicate CSS, reduced motion
- [ ] 3. Stable circular 56px back/next navigation; required-field validity; submitting state, no duplicate actions
- [ ] 4. Nav follows visualViewport height + offsetTop, scroll and Telegram events; safe-area and Android Back
- [ ] 5. Shared approved-geometry LiquidLogo with translucent glass, rim, subtle specular and fallbacks
- [ ] 6. Unified 8-step appearance, narrow-width/dark-mode, no horizontal overflow
- [ ] 7. Up to 6 photos in 3x2; vertical long-press drag, pointer capture and cancel, saved main/order, keyboard reorder, delete/replace
- [ ] 8. Draft survives reload when server draft is present and never resurrects reset data
- [ ] 9. Full preview defaults to read-only Member with up-to-date draft and ordered photographs, no network actions
- [ ] 10. Atomic final submit and retry after network failures; moderation remains canonical
- [ ] 11. No new SQL/migrations/seeds/reset; protect `veyra-stage0-backups` and `registration-clean-2026-10-14-v1`
- [ ] 12. npm typecheck/lint/check/secrets:check, server tests, browser tests, production build
- [ ] 13. Record 13 known baseline Chromium failures and show zero *new* failures
- [ ] 14. PR merged only after green checks, Render LIVE SHA matches main, /healthz and /readyz
- [ ] 15. Samsung Galaxy A55 Telegram manual confirmation deferred to project owner after deployment

## Implementation evidence (branch only; production not yet deployed)
- [x] Eight original steps, age, consent and API endpoints unchanged; UI photo cap reduced from 7 to 6.
- [x] Single WAAPI 290 ms transition; removed View Transition pseudo-elements, competing CSS entrance/stagger and old CTA label animations.
- [x] Two circular 56 px arrows with realtime step validity, loading state, Telegram haptic and safe-area.
- [x] VisualViewport height + offsetTop / resize / scroll subscriptions, rAF writes to CSS, reattachment after preview.
- [x] Shared approved-logo glass renderer and fallback; no geometry changes.
- [x] 3×2 photo slots, drag capture and pointercancel, stable ghost offsets, keyboard vertical reorder, replace/delete.
- [x] Preview defaults to read-only Member with actions hidden; registration photos and draft passed in.
- [x] No schema migrations, seed or stage-0 reset code changed; no payment/admin code changed.
- [ ] Manual UI review on Samsung Galaxy A55 Telegram WebView, including real Android keyboard.
- [ ] Final current-head CI and production live verification.

## Automated tests, prior green CI
GitHub Actions Verify run `38592595857` on commit `4436902b42ebe6e2b1feed3df5a49f6d8fcb50a9`:
- `npm run typecheck`: PASS
- `npm run check`: 186/186 Node tests PASS and Vite production build PASS
- `npm run lint`: PASS
- `npm run secrets:check`: PASS
- Chromium: 56 scenarios / 44 pass / 12 existing baseline failures / **0 new regressions**.
- Subsequent fixes add real pointer drag, mocked keyboard tests and overlay stacking assertions. The latest HEAD requires its own CI before merge.
- Production verification script additionally checks `/readyz`.
- Do not treat local/build/CI as real-device visual sign-off.



## Samsung Galaxy A55 Stage 1 bugfix (owner rejected first release)
- Recorded evidence: **1000068257.mp4**, total 02:26.46, inspected in full (00:00–02:26). Reproduction: overlapping steps ~00:00.8–00:01.4, ~00:09.3–00:10.0 and ~00:38–00:39; photos ~00:48–00:58 and drag ~01:10–01:30; profile preview ~01:40 onwards.
- Only Stage 1: no data reset, seed fixtures in production, SQL migration, change to wallets, Premium, VEYS, payment, admin, or Member phase-2 motion.
- Existing authenticated profile belongs to the owner. **Do not delete it**. QA uses isolated CI fixtures.
- Stage 0 snapshot `veyra-stage0-backups/stage0-backups/registration-clean-2026-10-14-v1/`: read-only storage audit on 2026-10-14 confirms private bucket, **17 objects**, newest object updated `2026-10-14 15:12:40.171469+00` (unchanged from stage 0).
- Stage 1 rejected until a new real-device owner review; automated tests are not sign-off.

### Bugfix acceptance checklist
- [x] S1-F01 — Isolate incoming/outgoing in one overflow-hidden, size-stable viewport; one 205ms WAAPI full-distance transform/opacity path. Exit clone inert and removed on finish.
- [x] S1-F02 — Back/next same exact 56px circular glass surface, depth and icon contrast; disabled still legible, VisualViewport safe-area remains.
- [x] S1-F03 — Photo jobs `waiting / processing / loading / saving / failed`, server-confirmed successes counted and added immediately; no 99% stall.
- [x] S1-F04 — Failed upload persists with retry and remove actions; no unfinished job in profile/preview.
- [x] S1-F05 — Precise fixed-size photo drag ghost uses the visible image URL and pointer-relative offset, pointercancel cleanup, FLIP shifts and stable slots.
- [x] S1-F06 — Preload/decode high-resolution photo after upload, await image readiness before opening preview, reuse cache for read-only Member and feed.
- [x] S1-F07 — Both preview tabs source the same confirmed `photos` array/order, opening from main photo; no active profile actions.
- [x] S1-F08 — Compact interest tabs, one category visible, selected chip tray, instant case-insensitive Russian/synonym search and search clear.
- [x] S1-F09 — 3–12 selection guard, synced count, selected item deduplication, warning on 13th, persist in existing draft.
- [x] S1-F10 — Narrow/mobile CSS, 44px chip targets, short 180ms transition, keyboard-safe pinned glass nav, 0 horizontal overflow.
- [ ] S1-F11 — Verify browser intermediate step frames, max 205ms+grace, repeated clicks, arrow geometry, upload failure/retry, drag cross-row and preview mode.
- [ ] S1-F12 — HEAD typecheck, lint, check, secrets:check, Node and browser baseline 0 new regressions.
- [ ] S1-F13 — Diff review, merge bugfix PR, Render live smoke, main SHA equality, no reset and unchanged private snapshot.
- [ ] S1-F14 — **Owner manually retests on Samsung Galaxy A55 Telegram and accepts Stage 1. No Stage 2 until then.**
