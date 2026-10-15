import {
  profileFrame,
  profileMorphInset,
  profileContentFrame,
  segment,
  PROFILE_MORPH_START,
  PROFILE_CIRCLE_AT,
  PROFILE_CENTER_AT,
} from "./profileMotionMath.js";

export const profileTranslate = (x, y) =>
  `translate3d(${x.toFixed(3)}px,${y.toFixed(3)}px,0)`;

// Both backends consume the same geometry, opacity and clipping data.
export function profileStyles(
  p, width, height, compactHeight = 292,
  safeTop = 64,
) {
  const f = profileFrame(p, width, height, compactHeight, safeTop);
  const content = profileContentFrame(
    p,
    width,
    height,
    f.maskDiameter,
    f.maskCenterY,
  );
  const ring = segment(p, PROFILE_CIRCLE_AT, PROFILE_CIRCLE_AT + 0.04);
  return {
    hero: {
      transform:
        profileTranslate(f.heroX, f.heroY) +
        ` scale(${f.heroScale.toFixed(7)})`,
      clipPath: profileMorphInset(
        p,
        width,
        height,
        f.maskDiameter,
        f.maskCenterY,
      ),
    },
    photoContent: {
      transform:
        profileTranslate(content.x, content.y) +
        ` scale(${content.scale.toFixed(7)})`,
    },
    panel: {
      transform: profileTranslate(0, f.sheetY - (height - 30)),
      clipPath: `inset(0px 0px ${f.panelClipBottom.toFixed(3)}px 0px)`,
    },
    identity: {
      transform: profileTranslate(f.nameX, f.nameY - (height + 9)),
      opacity: f.nameOpacity,
    },
    actions: {
      transform: profileTranslate(0, f.actionY - (height + 123)),
      opacity: f.actionOpacity,
    },
    more: { transform: profileTranslate(0, f.moreY - (height + 8)) },
    goal: { transform: profileTranslate(f.goalX, f.goalY) },
    bars: { opacity: f.photoExtrasOpacity },
    backdropPhoto: { opacity: segment(p, 0.2, 0.55) },
    rim: { opacity: ring },
    online: { opacity: ring },
    mainPhoto: { opacity: f.mainPhotoOpacity },
    grabber: {
      opacity: 1 - segment(p, 0.03, 0.24),
      transform: profileTranslate(0, f.sheetY - (height - 30)),
    },
  };
}

export function buildProfileScrollKeyframes(
  width,
  height,
  distance,
  maxScroll,
  compactHeight = 292,
  safeTop = 64,
) {
  const limit = Math.min(1, Math.max(1, distance) / Math.max(1, maxScroll));
  const points = new Set([
    0,
    0.03,
    0.12,
    0.17,
    PROFILE_MORPH_START,
    0.2,
    0.24,
    0.29,
    0.3,
    PROFILE_CIRCLE_AT,
    PROFILE_CIRCLE_AT + 0.04,
    PROFILE_CENTER_AT,
    0.55,
    0.7,
    0.78,
    0.88,
    0.96,
    1,
  ]);
  for (let i = 0; i <= 80; i++) points.add(i / 80);
  const tracks = {};
  const append = (offset, p) => {
    for (const [key, styles] of Object.entries(
      profileStyles(p, width, height, compactHeight, safeTop),
    ))
      (tracks[key] ??= []).push({ offset, ...styles });
  };
  for (const p of [...points].sort((a, b) => a - b)) append(p * limit, p);
  if (limit < 1) append(1, 1);
  return tracks;
}
export function supportsProfileTimeline(win = window) {
  return (
    typeof win.ScrollTimeline === "function" &&
    typeof win.Element?.prototype?.animate === "function" &&
    !win.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
  );
}
export function createProfileScrollAnimations(el, parts, geometry) {
  const win = el.ownerDocument.defaultView;
  if (!supportsProfileTimeline(win)) return null;
  const animations = [];
  try {
    const timeline = new win.ScrollTimeline({ source: el, axis: "block" });
    const frames = buildProfileScrollKeyframes(
      geometry.width,
      geometry.height,
      geometry.distance,
      el.scrollHeight - el.clientHeight,
      geometry.compactHeight,
      geometry.safeTop,
    );
    for (const [name, keyframes] of Object.entries(frames))
      if (parts[name])
        animations.push(
          parts[name].animate(keyframes, { timeline, fill: "both" }),
        );
    if (!animations.length) return null;
    return {
      animations,
      cancel: () => animations.forEach((animation) => animation.cancel()),
    };
  } catch {
    animations.forEach((animation) => animation.cancel());
    return null;
  }
}
