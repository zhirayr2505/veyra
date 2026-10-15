# VEYRA Stage 2.2 — progress and safety boundary

- Base main: `8ac6749de12e2bc8fac02c52299a994143452311` (PR #82 merged).
- Branch: `feat/stage2-2-profile-unified-20261015`; one PR targeting main. Do NOT merge/deploy until browser acceptance.
- Rollback after future merge: `git revert <STAGE2_2_MERGE_SHA>` (not run).
- Scope: client React/CSS/profile rendering only. No migrations, .env, secrets, payment, Premium, VEYS, or production records.
- Browser visual QA / elementsFromPoint band cause: **NOT VERIFIED**, cannot infer measured geometry from CSS alone.
- Confirmed code defects:
  1. Member combines `vx-master-profile` and `vx-telegram-member` while their CSS both define layout and compact height (292/278 vs 238/225).
  2. Stage 2 motion still switches a `data-photo-shape` marker at a discrete threshold, and identity is driven by one mixed opacity track.
  3. Scroll snap decision still uses release velocity/position heuristics; it must honor direction.
  4. Preview includes its fourth tab even when its content is not present.
  5. Member hydration effect resets `tab` and `idx` whenever its dependencies refresh.
  6. CompactBackdropPhoto obtains `cachedPhotoAny` and may use a different image resolution from the 256px asset.
- The approximate 54px band, image loss at frame ~0.95 and exact geometries are hypotheses until CDP/Playwright/screenshots prove the responsible layer.
- Status: **IN PROGRESS / NOT ACCEPTED**.

## Measured diagnostics (2026-10-15)

- Chromium UI evidence: GitHub Actions run 38749479246; synthetic local-only fixtures, **not** production.
- Original `main`: 65 passing, 11 failing v5 Playwright specs. After Stage2.2: 75 passing, 4 failing before the latest test adjustment.
- 390×844 compact rail top: **292.3125 CSS px**. Badge bottom: **223.5px**; action top: **228.3125px**; clearance: 4.8125px. `elementsFromPoint` directly below the rail reports `vx-profile-surface vx-profile-about`, not an overlay.
- Same main-photo ID used by the compact avatar and backdrop while hero's committed index remains the third photo. 44-frame portrait contact sheet shows reciprocal forward/reverse positions (11 each per direction with index=0 or 2).
- Landscape 740×360 now uses the same compact-height variable at 220px, with buttons to the right of the unchanged 98px avatar and the tab rail visible above native bottom navigation.
- Remaining known pre-existing failures: pending approval screen, registration visual audit and premium feed glint. These are outside Stage2.2 and remain **failures**, not claimed as passing.
- Added `scripts/stage2-2-browser-gate.js` as a strict release gate for the profile and Stage2.2 checks. See test-results/stage2-2-release-gate.json after CI.
- Actual production photography, Samsung Galaxy A55 Telegram HFR and real user data were not used in these tests. Those require final device acceptance; no unmeasured 120fps claims.

**STATUS: DRAFT / awaiting Stage 2.2 browser gate and final screenshots. No production merge or deployment.**
