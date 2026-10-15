// One scroll progress controls the mask, fitted image and profile sheet.
// Geometry is in pixels in the profile scroll viewport.
export const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
export const mix = (a, b, t) => a + (b - a) * t;
/** Pure release choice: late finger direction wins over the midpoint of the header. */
export function profileReleaseDirection({
  samples = [],
  startY = 0,
  y = 0,
  at = 0,
}) {
  const recent = samples.filter((point) => at - point.at <= 120);
  if (recent.length > 1) {
    const first = recent[0],
      last = recent[recent.length - 1];
    const dt = last.at - first.at;
    const velocity = dt > 0 ? (first.finger - last.finger) / dt : 0;
    if (Math.abs(velocity) >= 0.12)
      return { direction: Math.sign(velocity), velocity };
  }
  const displacement = y - startY;
  if (Math.abs(displacement) >= 6)
    return { direction: Math.sign(displacement), velocity: 0 };
  return { direction: 0, velocity: 0 };
}
// Outside the header interval the browser owns the content scroll.
export const releaseTarget = (direction, y, d, startY) => {
  if (y <= 0.5 || y >= d - 0.5) return y;
  return direction > 0
    ? d
    : direction < 0
      ? 0
      : startY >= d - 0.5
        ? d
        : startY <= 0.5
          ? 0
          : y >= d / 2
            ? d
            : 0;
};
export const smooth = (t) => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};
export const segment = (p, a, b) => smooth((p - a) / (b - a));
export const PROFILE_MORPH_START = 0.18;
export const PROFILE_CIRCLE_AT = 0.35;
export const PROFILE_CENTER_AT = 0.5;
export const PROFILE_VISIBLE_TOP_INSET = 64; // bottom edge of profile's native logo/header
export const PROFILE_CIRCLE_WIDTH_FRACTION = 0.62; // absolute upper bound at morph
export const PROFILE_AVATAR_DIAMETER = 98;
export const PROFILE_PRE_DOCK_RATIO = 0.94;
// Covers the sheet-to-tabs span for supported hero heights (322–600px).
// Fixed between resizes; never animate layout height.
export const profilePanelHeight = (height) => Math.max(284, height * 0.3 + 160);
export function profileCircleGeometry(
  width, height, compactHeight = 292, safeTop = PROFILE_VISIBLE_TOP_INSET,
) {
  const w = Math.max(1, width),
    h = Math.max(1, height);
  const coverY = -16 * segment(PROFILE_MORPH_START, 0, PROFILE_MORPH_START);
  const sheetY = mix(h - 30, 109, smooth(clamp(PROFILE_CIRCLE_AT / 0.78)));
  // The portalled Telegram TopZone can be taller than the nominal 64px.
  // Keep the morphing portrait below that measured header, including landscape.
  const visibleTop = Math.max(0, safeTop);
  const visibleBottom = Math.max(
    visibleTop + PROFILE_AVATAR_DIAMETER,
    Math.min(h + coverY, sheetY),
  );
  const visibleHeight = Math.max(
    PROFILE_AVATAR_DIAMETER,
    visibleBottom - visibleTop,
  );
  const diameter = Math.max(
    PROFILE_AVATAR_DIAMETER,
    Math.min(visibleHeight, w * PROFILE_CIRCLE_WIDTH_FRACTION),
  );
  const centerY = visibleTop + (visibleBottom - visibleTop) / 2;
  return {
    diameter,
    visibleTop,
    visibleBottom,
    visibleHeight,
    centerY,
    maskCenterY: centerY - coverY,
    compactHeight,
  };
}
export const profileMaskDiameter = (width, height, compactHeight = 292) =>
  profileCircleGeometry(width, height, compactHeight).diameter;
export function profileFrame(
  progress, width, height, compactHeight = 292,
  safeTop = PROFILE_VISIBLE_TOP_INSET,
) {
  const p = clamp(progress),
    w = Math.max(1, width),
    h = Math.max(1, height);
  const circleGeometry = profileCircleGeometry(w, h, compactHeight, safeTop);
  const { diameter: maskDiameter, maskCenterY } = circleGeometry;
  const circle = p >= PROFILE_CIRCLE_AT;
  const formation = segment(p, PROFILE_CIRCLE_AT, PROFILE_CENTER_AT);
  const docking = segment(p, PROFILE_CENTER_AT, 1);
  const coverY = -16 * segment(p, 0, PROFILE_MORPH_START);
  const midWidth = Math.max(
    PROFILE_AVATAR_DIAMETER,
    maskDiameter * PROFILE_PRE_DOCK_RATIO,
  );
  const photoW = !circle
    ? w
    : p < PROFILE_CENTER_AT
      ? mix(maskDiameter, midWidth, formation)
      : mix(midWidth, PROFILE_AVATAR_DIAMETER, docking);
  const photoX = !circle
    ? 0
    : p < PROFILE_CENTER_AT
      ? (w - photoW) / 2
      : mix((w - midWidth) / 2, 16, docking);
  const circleStartY = circleGeometry.centerY - maskDiameter / 2;
  const photoY = !circle
    ? coverY
    : p < PROFILE_CENTER_AT
      ? mix(circleStartY, 82, formation)
      : mix(82, 102, docking);
  const heroScale = circle ? photoW / maskDiameter : 1;
  const heroX = circle ? photoX - (w / 2 - maskDiameter / 2) * heroScale : 0;
  const heroY = circle
    ? photoY - (maskCenterY - maskDiameter / 2) * heroScale
    : coverY;
  const sheetY = mix(h - 30, 109, smooth(clamp(p / 0.78)));
  // Landscape header must leave room for tabs above the bottom navigation.
  const shortLandscape = compactHeight < 260;
  const dockNameY = shortLandscape ? 86 : 116;
  const dockActionY = shortLandscape ? 172 : 228;
  // Route the visible identity BELOW the portrait until the avatar has moved
  // left enough to fit the name beside it. This avoids disappearing names,
  // impossible mid-frame overlaps and a hard jump to the docked position.
  const baseNameY = mix(h + 9, dockNameY, smooth(p));
  const underPhotoY = photoY + photoW + 16;
  const sideX = Math.min(w - 140, Math.max(174, w * 0.45));
  const nameLeft = p <= 0.72
    ? 19
    : p < 0.84
      ? mix(19, sideX, segment(p, 0.72, 0.84))
      : mix(sideX, 129, segment(p, 0.84, 1));
  const nameY = p < PROFILE_CIRCLE_AT
    ? baseNameY
    : p < 0.84
      ? Math.max(baseNameY, underPhotoY)
      : mix(underPhotoY, dockNameY, segment(p, 0.84, 0.96));
  const railY = mix(h + 218, compactHeight, p);
  const panelHeight = profilePanelHeight(h);
  const panelClipBottom = Math.max(
    0,
    panelHeight - Math.max(0, railY - sheetY + 1),
  );
  return {
    progress: p,
    stage: !circle ? "sheet" : p < PROFILE_CENTER_AT ? "center" : "avatar",
    x: photoX,
    y: photoY,
    width: photoW,
    height: circle ? photoW : h,
    radius: circle ? 50 : 0,
    heroX,
    heroY,
    heroScale,
    maskDiameter,
    maskCenterY,
    visibleTop: circleGeometry.visibleTop,
    visibleBottom: circleGeometry.visibleBottom,
    visibleHeight: circleGeometry.visibleHeight,
    sheetY,
    panelHeight,
    panelClipBottom,
    // Move the identity across the invisible middle, then reveal from the right.
    nameX: nameLeft - 19,
    nameY,
    nameOpacity: 1,
    // Temporarily hide buttons instead of hiding the name during the morph.
    actionOpacity: 1 - segment(p, 0.38, 0.52) + segment(p, 0.84, 0.96),
    actionY: mix(h + 123, dockActionY, smooth(clamp(p / 0.88))),
    moreY: mix(h + 8, 113, smooth(p)),
    photoExtrasOpacity: 1 - segment(p, 0.2, 0.33),
    mainPhotoOpacity: segment(p, 0.12, 0.3),
    goalX: 0,
    goalY: 0,
    compactHeight,
  };
}

export function profileMorphInset(p, width, height, diameter, centerY) {
  const t = segment(p, PROFILE_MORPH_START, PROFILE_CIRCLE_AT),
    w = Math.max(1, width),
    h = Math.max(1, height),
    d = diameter;
  const top = (centerY - d / 2) * t,
    side = ((w - d) / 2) * t,
    bottom = (h - centerY - d / 2) * t,
    r = (d / 2) * t;
  return (
    "inset(" +
    top.toFixed(2) +
    "px " +
    side.toFixed(2) +
    "px " +
    bottom.toFixed(2) +
    "px " +
    side.toFixed(2) +
    "px round " +
    r.toFixed(2) +
    "px)"
  );
}

// Uniformly fit the image inside the changing mask; clipping alone crops an eye.
export function profileContentFrame(p, width, height, diameter, centerY) {
  const t = segment(p, PROFILE_MORPH_START, PROFILE_CIRCLE_AT);
  const w = Math.max(1, width),
    h = Math.max(1, height);
  const boxWidth = mix(w, diameter, t),
    boxHeight = mix(h, diameter, t);
  const left = (w - boxWidth) / 2,
    top = (centerY - diameter / 2) * t;
  const scale = Math.max(boxWidth / w, boxHeight / h);
  return {
    scale,
    x: left + (boxWidth - w * scale) / 2,
    y: top + (boxHeight - h * scale) * 0.36,
  };
}
