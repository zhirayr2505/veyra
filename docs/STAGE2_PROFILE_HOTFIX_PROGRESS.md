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

## Source-code diagnosis performed before video (these are code findings, NOT video-verified observations)

- **Snap can leave an intermediate state:** `web/v5/useVeyraProfileMotion.js:288-293` invokes snap on `scrollend` only when `s.released===true`, otherwise clears `snapRaf`; `onTouchEnd:213-220` explicitly sets released=false on elastic and horizontal touch. `snap:154-156` uses a time-window gating 680ms after release, not a physical no-velocity settlement. A real scrollend with released false and 0<scrollTop<distance has no recovery. Correlate with video before selecting the fix.
- **Morph owns a separate clock from scroll transforms:** `useVeyraProfileMotion.js:18-27,81-88` starts `hero.animate({clipPath})` for 180ms on a threshold crossing, whereas `profileScrollTimeline.js` runs the hero's `transform` against scroll progress. This allows shape animation to lag changing geometry or continue if the finger stops. A single visible hero remains, but mask timeline and position timeline are not equivalent.
- **Name opacity disappears across a large section:** `profileMotionMath.js:56-57` fades out by progress .29, stays invisible until .70, and finishes at .96, while `photoW` / `heroScale` progress independently. This is an explicit timing mismatch to validate on video.
- **Content top/height ownership is divided:** `MemberMotionV2.css:27-35` sets a sticky zero-height `.vx-profile-motion`, `:245-253` sticky tab rail at compactHeight, `:275-296` clipping swipe viewport, and `MemberSwipePages.jsx:20-32` sets viewport height to selected panel via ResizeObserver; `Member.jsx:147-154` changes Embla tab without clamping `scroller.scrollTop` to the newly shorter content. Potentially explains lost / clipped content after changing long to short tabs; needs screenshot/video evidence.
- **Backdrop may not show an image at first paint:** `Member.jsx:30-46` renders `CompactBackdropPhoto` from `cachedPhotoAny(id)` with undefined `src` when cache empty; it waits for a captured load event from `.vx-profile-hero-photo`. This is one place to check for premature empty lavender placeholder. `Member.jsx:186` currently selects `photos[idx]`, not necessarily the first/main photo the hotfix specifies.
- **Gallery currently has no pinch, zoom or pan:** `Member.jsx:251-259` mounts a portal with a single `Photo resolution=960`, touchstart/end deltas for next/previous and vertical close, and no pointer tracking, transform model or zoom state. `App.jsx:67-72` handles Telegram BackButton at the global member level; it cannot know local `gallery===true`, so a BackButton click currently closes the profile instead of only the gallery.
- **Owner photo button does not open the editor:** `Member.jsx:208` executes `openTab('photos')`. `App.jsx:106-108,130` already has a real ProfileEditor, and `ProfileEditor.jsx` already implements photo add/reorder/delete/save. This is a routing fix, not a new editing backend.
- **Goal badge text may be truncated intentionally:** `MemberFinish.css:38-39` uses `white-space:nowrap;overflow:hidden;text-overflow:ellipsis`; `MemberMotionV2.css:191-196` uses capped width and a short line-height. Need bounding-rect validation on 360 and 390 px and with long labels.
- **GiftCollection has an empty state already:** `Extras.jsx:22` renders `<Empty art="gift" title="Пока нет подарков"...>` when gifts are absent. It should be visually audited rather than duplicated.
- **Own vs other profile share one engine already:** `Member.jsx:49-53,177-248` branches only content and actions; both render the same `HeroPhotoTrack`, scroller, `useVeyraProfileMotion` and `MemberSwipePages`. Keep a single shared engine.
- **CSS competing rules remain:** `MemberMotionV2.css`, `MemberMotion5.css`, `MemberMotion6.css`, `MemberFinish.css`, `MemberReferencePolish.css` and `MemberTelegramProfile.css` contain overlapping selectors and legacy `!important`. No new override CSS should be created; once the video confirms the visual glitch, fix the original rule(s), remove obsolete counterparts, and verify CSS load order.

**Code changes deliberately withheld until `1000068278.mp4` is uploaded and inspected.** No merge, deploy or production action has occurred.

## Video inspection — completed 2026-10-15

- Source: user-uploaded `1000068278.mp4`, 74.59s, 590 × 1280, variable frame cadence (~39.86 decoded frames/s). 75 timestamped 1-second reference frames reviewed, focused transitions also reviewed as a coherent sequence.
- 00:00–00:05: profile starts in an intermediate, photo and text change visual location during expanding/collapsing; frame 00:03 shows a large circular headshot before it finishes docking; 00:04 returns to compact.
- 00:09–00:15: finger-controlled scroll exhibits intermittent large portrait/morph frame before returning to compact; 00:11 shows an intermediate cropped rounded rectangle rather than completed circle; 00:12–00:14 cover, sheet and circle move at different stages.
- 00:16–00:29: the first About/Interests content passes beneath the header and is visually cropped/hidden; 00:22–00:23 user annotates the empty clipping band just under tab rail; 00:27–00:28 bottom shows huge blank lavender region after short content.
- 00:30–00:36: Photos grid shows differing rows; gallery/photo transitions as user swipes reveal content discontinuity and odd clipping around hero.
- 00:37–00:53: tab Gifts rendered with a nearly blank full-height lavender panel; user scrolls through empty content and tabs retain unexpected empty offset; 00:40–00:52 repeated long static blank area.
- 00:54–00:70: repeated collapse/expand with gallery and Gifts demonstrates different visual stops (55–56 large circle, 57 compact, 58 cover, 59 large circle, 60+ compact); bottom of photo area sometimes vanishes.
- 00:71–00:74: feed/profile selector is shown and the issue context returns to the app; no evidence that the user requests changing the approved brand visual style.
- The video does **not** show reliable finger-event telemetry, JS frame timing, or proof of physical 120Hz; code tests are needed to distinguish native inertial scroll from lost snap callbacks.

Code-to-video mapping:
- Halfway stuck: `useVeyraProfileMotion.js` only recovers scrollend if `s.released`; delayed settle and unreconciled momentum.
- Morph mismatch: separate 180ms WAAPI clip clock vs scroll progress transform.
- Cropped About content: sticky `vx-profile-motion` overlay / sticky rail and Embla viewport `overflow:clip`; no active-height scroll clamp on tab change.
- Blank Gifts: GiftCollection has an Empty UI, but inactive/active Embla height and current scroll offset can prevent it being visible; intentionally not insert fake gifts.
- Gallery: not a full zoom viewer; portal has only swipe-based switch and vertical-close and no BackButton interception.
- Badging: `nowrap;text-overflow:ellipsis` on goal text.

Proceed to surgical fixes. Keep current visual concept; no production-side intervention until CI green.
