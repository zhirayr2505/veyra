# VEYRA — Stage 2 profile post-2.1 hotfix

## Baseline and rollback (recorded before any application-code change)

- Date: 2026-10-15.
- Repository: `zhirayr2505/veyra`.
- Unmodified starting SHA of `main`: `4c290a07fd50abda0445408129577fbe6c3db9d9` (merge of PR #81).
- Confirmed Render production SHA: `4c290a07fd50abda0445408129577fbe6c3db9d9`, live deploy `dep-db882mk9v7es73bko140`.
- Working branch: `hotfix/stage2-profile-after-2-1-20261015`.
- **After a future hotfix merge**, exact safe rollback command: `git checkout main && git pull --ff-only && git revert -m 1 <HOTFIX_MERGE_COMMIT_SHA> && git push origin main`; replace placeholder only with the verified hotfix merge SHA. Verify production state and cause before any rollback.
- To revert Stage 2.1 itself (do not execute without incident evidence): `git revert -m 1 4c290a07fd50abda0445408129577fbe6c3db9d9`.
- **No reset**, no production-data/photos deletions, no migration, no payments/Premium/VEYS/moderation/registration changes, no Stage 3.

## Required video and status

- User-specified evidence: `1000068278.mp4`, intended full/frame-by-frame comparison against current `main` and Render.
- **BLOCKED: exact video is not available as a conversation attachment, project file, or mounted file in the current session (checked 2026-10-15).** Do not claim it was watched, do not attribute timestamps or visual findings. Under user's explicit process requirement, application code must NOT be edited until this evidence is accessible and inspected.
- Current status: diagnosis only; no profile changes; no PR, CI, or deploy created for this hotfix.

## Code review checklist (to be confirmed against video)

1. Own vs others: both use `Member.jsx`, `HeroPhotoTrack.jsx`, `MemberSwipePages.jsx` and `useVeyraProfileMotion.js`; verify actions routing and actual production render.
2. Two-state snap: inspect `useVeyraProfileMotion.js` `snap`, `queueSnap`, `onScrollEnd`, cancellation, momentum, boundary and whether a stray `scrollend` can leave progress in (0,1).
3. Morph / image continuity: inspect `runMorph` WAAPI `clipPath`, threshold hysteresis, geometry and permanent hero image; check whether photo updates reconstruct image in motion.
4. Identity: inspect `profileMotionMath.js` opacity/travel and font metrics.
5. Blurred backdrop: inspect `CompactBackdropPhoto` cache/decode behavior and CSS cover/masking, ensure photo preload and first-photo selection.
6. Clipping: inspect `MemberMotionV2.css`, `MemberMotion5.css`, `MemberFinish.css`, `MemberMotion6.css` sticky top/overflow/clip and `MemberSwipePages` viewport height.
7. Performance: measure at 390x844, 360x740 hasTouch CPU x4 before/after; record actual p50/p95, long tasks, renders, LayoutShift and animation objects; physical 120Hz is NOT verifiable here.
8. Tab content: inspect Embla `ResizeObserver` active-panel height, scroll clamp at tab switch, trailing padding and gift empty-state rendering.
9. Gallery: currently in `Member.jsx`; inspect existing portal and touch handlers, Telegram and Android Back, native fullscreen pinch zoom.
10. Buttons: existing real app routes/editors, including owner photo editor and settings; avoid toast placeholders.
11. Goal badge: verify bounding rect, parent clipping and full text at 360 and 390.
12. Cleanup: replace conflicting rules in original CSS; no additional override file or `!important`.
13. Tests: typecheck, lint, integration, Playwright, build, secrets, 20 loops and comparison with current baseline failures; never misreport failures.
14. Release: one PR -> green CI -> one Render deploy -> exact SHA, `/healthz`, `/readyz`, smoke -> physical owner acceptance.

## Verification placeholders
- Video observations and per-defect timestamps: NOT AVAILABLE.
- Before/after performance hotfix: NOT MEASURED.
- GitHub PR, merged SHA, Render hotfix deploy: NONE.
