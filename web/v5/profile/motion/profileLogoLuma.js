import { clamp, mix, segment } from "./profileMotionMath.js";

// Brightness (0 dark … 1 bright) of the photo area that lies under the logo.
// Sampled once per photo; scrolling and swiping only blend cached numbers.
const SAMPLE_W = 24,
  SAMPLE_H = 6;
let canvas = null,
  ctx = null;
const luma = (data) => {
  let sum = 0;
  for (let i = 0; i < data.length; i += 4)
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  return sum / (data.length / 4) / 255;
};
/**
 * img: loaded <img> shown with object-fit:cover inside `box` (px).
 * rect: area behind the logo in the same box coordinates.
 * spread: >1 samples a wider area (used for the blurred backdrop).
 */
export function sampleRegionLuma(img, box, rect, position = [0.5, 0.36], spread = 1) {
  if (!img?.complete || img.naturalWidth < 4 || !box.width || !box.height) return null;
  const nw = img.naturalWidth,
    nh = img.naturalHeight;
  const scale = Math.max(box.width / nw, box.height / nh);
  const ox = (box.width - nw * scale) * position[0],
    oy = (box.height - nh * scale) * position[1];
  const w = rect.width * spread,
    h = rect.height * spread;
  const cx = rect.x + rect.width / 2,
    cy = rect.y + rect.height / 2;
  const sx = clamp((cx - w / 2 - ox) / scale, 0, nw - 1),
    sy = clamp((cy - h / 2 - oy) / scale, 0, nh - 1);
  const sw = Math.max(1, Math.min(nw - sx, w / scale)),
    sh = Math.max(1, Math.min(nh - sy, h / scale));
  try {
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = SAMPLE_W;
      canvas.height = SAMPLE_H;
      ctx = canvas.getContext("2d", { willReadFrequently: true });
    }
    if (!ctx) return null;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, SAMPLE_W, SAMPLE_H);
    return luma(ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data);
  } catch {
    return null;
  }
}

/**
 * Writes --vx-logo-luma on the profile logo (no React state, no per-frame
 * layout reads). The value follows what is really behind the logo:
 *  - the current photo, blended to the neighbour while the photo is dragged;
 *  - blended to the blurred main-photo backdrop while the header collapses.
 */
export function createProfileLogoLuma(selector = ".vx-member-floating-logo") {
  let byId = new Map(),
    backdrop = null,
    currentId = null,
    neighbourId = null,
    drag = 0,
    progress = 0,
    node = null,
    last = -1;
  const known = (id) => (id == null ? undefined : byId.get(String(id)));
  const apply = () => {
    const current = known(currentId),
      neighbour = known(neighbourId);
    const hero =
      current === undefined
        ? neighbour ?? 0.5
        : neighbour === undefined
          ? current
          : mix(current, neighbour, clamp(drag));
    const value = mix(hero, backdrop ?? hero, segment(progress, 0.16, 0.36));
    if (!node?.isConnected) {
      node = document.querySelector(selector);
      last = -1;
    }
    if (!node || Math.abs(value - last) < 0.004) return;
    last = value;
    node.style.setProperty("--vx-logo-luma", value.toFixed(3));
  };
  return {
    has: (id) => byId.has(String(id)),
    hasBackdrop: () => backdrop !== null,
    setPhotoLuma(id, value) {
      if (value == null) return;
      byId.set(String(id), value);
      apply();
    },
    setBackdropLuma(value) {
      if (value == null) return;
      backdrop = value;
      apply();
    },
    setCurrent(id) {
      currentId = id ?? null;
      neighbourId = null;
      drag = 0;
      apply();
    },
    setDrag(amount, id) {
      drag = amount;
      neighbourId = amount > 0 ? id ?? null : null;
      apply();
    },
    setProgress(value) {
      progress = value;
      apply();
    },
    reset() {
      byId = new Map();
      backdrop = null;
      last = -1;
    },
  };
}