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
    // Blurred main photo behind the shrinking hero. It must be fully visible
    // BEFORE the hero starts to shrink (PROFILE_MORPH_START), otherwise the
    // pale page background shows through around the photo.
    backdrop: {
      clipPath: `inset(0px 0px ${f.backdropClipBottom.toFixed(3)}px 0px)`,
    },
    backdropPhoto: { opacity: segment(p, 0.02, 0.14) },
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
    rim: { opacity: ring },
    online: { opacity: ring },
    mainPhoto: { opacity: f.mainPhotoOpacity },
    grabber: {
      opacity: 1 - segment(p, 0.03, 0.24),
      transform: profileTranslate(0, f.sheetY - (height - 30)),
    },
  };
}

/**
 * `range` = true: the animation is bound to a fixed pixel range [0, distance]
 * of the scroller, so its progress does NOT depend on the total scroll height
 * (switching between a short and a tall tab cannot move the header).
 * `range` = false (older engines): offsets are scaled by distance / maxScroll.
 */
export function buildProfileScrollKeyframes(
  width,
  height,
  distance,
  maxScroll,
  compactHeight = 292,
  safeTop = 64,
  range = false,
) {
  const limit = range
    ? 1
    : Math.min(1, Math.max(1, distance) / Math.max(1, maxScroll));
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
export function supportsProfileScrollRange(win = window) {
  return (
    typeof win.Animation === "function" &&
    "rangeStart" in win.Animation.prototype &&
    "rangeEnd" in win.Animation.prototype
  );
}
const px = (win, value) =>
  win.CSS?.px ? win.CSS.px(value) : `${Math.max(0, value)}px`;

/**
 * Creates the compositor-driven animations ONCE. Later geometry changes are
 * applied in place with update(); animations are never cancelled and rebuilt
 * while the user interacts (a rebuild shows one frame of the unstyled,
 * fully expanded hero).
 */
export function createProfileScrollAnimations(el, parts, geometry) {
  const win = el.ownerDocument.defaultView;
  if (!supportsProfileTimeline(win)) return null;
  let range = supportsProfileScrollRange(win);
  const build = (g) =>
    buildProfileScrollKeyframes(
      g.width,
      g.height,
      g.distance,
      el.scrollHeight - el.clientHeight,
      g.compactHeight,
      g.safeTop,
      range,
    );
  const created = [];
  const create = () => {
    const animations = new Map();
    const timeline = new win.ScrollTimeline({ source: el, axis: "block" });
    for (const [name, keyframes] of Object.entries(build(geometry)))
      if (parts[name]) {
        const animation = parts[name].animate(keyframes, {
          timeline,
          fill: "both",
        });
        created.push(animation);
        if (range) {
          animation.rangeStart = px(win, 0);
          animation.rangeEnd = px(win, geometry.distance);
        }
        animations.set(name, animation);
      }
    return animations;
  };
  let animations;
  try {
    animations = create();
  } catch {
    // Engines that expose the range properties but reject pixel values.
    created.forEach((animation) => animation.cancel());
    created.length = 0;
    try {
      range = false;
      animations = create();
    } catch {
      created.forEach((animation) => animation.cancel());
      return null;
    }
  }
  if (!animations.size) return null;
  return {
    range,
    animations: [...animations.values()],
    update(g) {
      try {
        const frames = build(g);
        for (const [name, animation] of animations) {
          animation.effect.setKeyframes(frames[name]);
          if (range) animation.rangeEnd = px(win, g.distance);
        }
      } catch {
        /* keep the previous keyframes rather than flashing the base style */
      }
    },
    cancel: () => animations.forEach((animation) => animation.cancel()),
  };
}
