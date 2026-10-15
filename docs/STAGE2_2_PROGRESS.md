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
