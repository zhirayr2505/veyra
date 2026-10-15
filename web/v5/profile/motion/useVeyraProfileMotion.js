import { useCallback, useLayoutEffect, useRef } from "react";
import {
  clamp,
  profilePanelHeight,
  profileCircleGeometry,
  profileReleaseDirection,
  releaseTarget,
  PROFILE_CIRCLE_AT,
  PROFILE_CENTER_AT,
} from "./profileMotionMath.js";
import {
  createProfileScrollAnimations,
  profileStyles,
} from "./profileScrollTimeline.js";
import {
  profileProbeEnabled,
  recordProfileCalibration,
  recordProfileFrame,
} from "./profilePerfProbe.js";
import {
  elasticPullDistance,
  elasticPhotoScale,
} from "./profileElasticMath.js";

const SELECTORS = {
  hero: ".vx-profile-hero-photo",
  photoContent: ".vx-profile-photo-content",
  panel: ".vx-profile-card-backdrop",
  identity: ".vx-profile-identity",
  actions: ".vx-profile-primary-actions",
  more: ".vx-profile-card-more",
  goal: ".vx-profile-goal",
  bars: ".vx-profile-photo-bars",
  mainPhoto: ".vx-profile-main-crossfade",
  backdropPhoto: ".vx-profile-compact-backdrop .photo-box",
  rim: ".vx-profile-photo-morph-rim",
  online: ".vx-profile-online",
  grabber: ".vx-profile-sheet-grabber",
};

export function useVeyraProfileMotion({
  scrollRef,
  stageRef,
  motionRef,
  ready,
}) {
  const api = useRef({});
  const onTouchStart = useCallback((event) => api.current.start?.(event), []);
  const onTouchEnd = useCallback(() => api.current.end?.(), []);
  const onWheel = useCallback((event) => api.current.wheel?.(event), []);
  const calibrate = useCallback(() => api.current.calibrate?.(), []);
  useLayoutEffect(() => {
    const el = scrollRef.current,
      motion = motionRef.current,
      stage = stageRef.current;
    if (!ready || !el || !motion || !stage) return;
    const parts = Object.fromEntries(
      Object.entries(SELECTORS).map(([key, selector]) => [
        key,
        motion.querySelector(selector),
      ]),
    );
    if (!parts.hero) return;
    const s = {
      width: 1,
      height: 1,
      compactHeight: 292,
      safeTop: 64,
      distance: 1,
      maxScroll: 1,
      lastProgress: -1,
      signature: "",
      native: null,
      nativeFailures: 0,
      paintRaf: 0,
      resizeRaf: 0,
      settleRaf: 0,
      quietTimer: 0,
      touching: false,
      snapping: false,
      pending: false,
      axis: null,
      startX: 0,
      startY: 0,
      startScroll: 0,
      direction: 0,
      samples: [],
      pull: 0,
      haptic: false,
      gesture: false,
    };
    const reduced = () =>
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const elastic = (pull, settling = false) => {
      s.pull = pull;
      const scale = elasticPhotoScale(pull);
      el.classList.toggle("vx-elastic-release", settling);
      el.style.setProperty("--vx-elastic-pull", pull.toFixed(2) + "px");
      el.style.setProperty("--vx-elastic-scale", scale.toFixed(5));
      el.style.setProperty(
        "--vx-elastic-x",
        ((-s.width * (scale - 1)) / 2).toFixed(2) + "px",
      );
    };
    const cancelSettle = () => {
      clearTimeout(s.quietTimer);
      cancelAnimationFrame(s.settleRaf);
      s.quietTimer = 0;
      s.settleRaf = 0;
      s.snapping = false;
      s.pending = false;
    };
    const paint = () => {
      if (s.paintRaf) return;
      s.paintRaf = requestAnimationFrame(() => {
        s.paintRaf = 0;
        const sampled = profileProbeEnabled(),
          began = sampled ? performance.now() : 0;
        const y = el.scrollTop,
          p = clamp(y / s.distance);
        // Some WebViews expose ScrollTimeline but never advance it. Do not
        // abandon native animation after a single compositor/JS sampling delay.
        if (s.native && p > 0.03) {
          const timing =
            s.native.animations[0]?.effect?.getComputedTiming()?.progress;
          const expected = y / s.maxScroll;
          s.nativeFailures =
            typeof timing !== "number" || Math.abs(timing - expected) > 0.08
              ? s.nativeFailures + 1
              : 0;
          if (s.nativeFailures >= 3) {
            s.native.cancel();
            s.native = null;
            s.lastProgress = -1;
          }
        }
        // A fast gesture may cross the circle threshold between two paints.
        // Haptic must not depend on the previously painted value having changed.
        const hapticDue =
          s.gesture &&
          s.axis === "y" &&
          !s.haptic &&
          s.startScroll / s.distance < PROFILE_CIRCLE_AT &&
          p >= PROFILE_CIRCLE_AT;
        if (Math.abs(p - s.lastProgress) < 0.0001 && !hapticDue) return;
        s.lastProgress = p;
        motion.dataset.state =
          p <= 0.002 ? "expanded" : p >= 0.998 ? "compact" : "transition";
        motion.dataset.photoShape = p >= PROFILE_CIRCLE_AT ? "circle" : "cover";
        const phase =
          p < PROFILE_CIRCLE_AT
            ? "sheet"
            : p < PROFILE_CENTER_AT
              ? "center"
              : "avatar";
        motion.dataset.motionPhase = phase;
        motion.dataset.sheetOverlap = String(p < PROFILE_CIRCLE_AT);
        if (!s.native) {
          for (const [key, styles] of Object.entries(
            profileStyles(p, s.width, s.height, s.compactHeight, s.safeTop),
          )) {
            if (parts[key])
              for (const [property, value] of Object.entries(styles))
                parts[key].style[property] = String(value);
          }
        }
        if (hapticDue) {
          s.haptic = true;
          try {
            window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.("light");
          } catch {}
        }
        if (sampled)
          recordProfileFrame(
            performance.now() - began,
            p,
            y,
            s.distance,
            phase,
          );
      });
    };
    const settleTo = (target) => {
      const from = el.scrollTop,
        delta = target - from;
      if (Math.abs(delta) < 0.5) return;
      if (reduced()) {
        el.scrollTop = target;
        paint();
        return;
      }
      const duration = Math.min(260, 180 + Math.abs(delta) * 0.18);
      let start;
      s.snapping = true;
      const step = (now) => {
        if (!s.snapping || s.touching) return;
        start ??= now;
        const t = Math.min(1, (now - start) / duration);
        el.scrollTop = from + delta * (1 - (1 - t) ** 3);
        paint();
        if (t < 1) s.settleRaf = requestAnimationFrame(step);
        else {
          s.snapping = false;
          s.settleRaf = 0;
        }
      };
      s.settleRaf = requestAnimationFrame(step);
    };
    const finishScroll = () => {
      clearTimeout(s.quietTimer);
      s.quietTimer = 0;
      if (s.touching || s.snapping || !s.pending) return;
      s.pending = false;
      const y = el.scrollTop;
      // Content, taps and horizontal swipes must never snap back to the header.
      if (y <= 0.5 || y >= s.distance - 0.5) return;
      settleTo(releaseTarget(s.direction, y, s.distance, s.startScroll));
    };
    const queueFinish = () => {
      clearTimeout(s.quietTimer);
      // Fallback for WebViews without scrollend; momentum resets this timer.
      s.quietTimer = setTimeout(finishScroll, 140);
    };
    const scroll = () => {
      if (s.pull && el.scrollTop > 1) elastic(0, true);
      paint();
      if (s.pending && !s.touching && !s.snapping) queueFinish();
    };
    const start = (event) => {
      cancelSettle();
      const touch = event.touches?.[0];
      if (!touch) return;
      s.touching = true;
      s.axis = null;
      s.direction = 0;
      s.haptic = false;
      s.gesture = true;
      s.startX = touch.clientX;
      s.startY = touch.clientY;
      s.startScroll = el.scrollTop;
      s.samples = [{ at: performance.now(), finger: touch.clientY }];
      elastic(0);
    };
    const move = (event) => {
      if (!s.touching || event.touches?.length !== 1) return;
      const touch = event.touches[0],
        dx = touch.clientX - s.startX,
        dy = touch.clientY - s.startY;
      if (!s.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 8)
        s.axis =
          Math.abs(dx) > Math.abs(dy) * 1.2
            ? "x"
            : Math.abs(dy) > Math.abs(dx) * 1.2
              ? "y"
              : null;
      const now = performance.now();
      s.samples.push({ at: now, finger: touch.clientY });
      while (s.samples.length > 2 && now - s.samples[0].at > 120)
        s.samples.shift();
      const pull =
        !reduced() &&
        s.axis === "y" &&
        s.startScroll <= 1 &&
        el.scrollTop <= 1 &&
        dy > 0
          ? elasticPullDistance(dy)
          : 0;
      if (Math.abs(pull - s.pull) > 0.1) elastic(pull);
    };
    const end = () => {
      if (!s.touching) return;
      s.touching = false;
      if (s.pull) elastic(0, true);
      if (s.axis !== "y" || Math.abs(el.scrollTop - s.startScroll) < 2) {
        s.pending = false;
        s.gesture = false;
        return;
      }
      s.direction = profileReleaseDirection({
        samples: s.samples,
        startY: s.startScroll,
        y: el.scrollTop,
        at: performance.now(),
      }).direction;
      s.pending = true;
      queueFinish();
    };
    const cancel = () => {
      s.touching = false;
      s.axis = null;
      s.gesture = false;
      cancelSettle();
      if (s.pull) elastic(0, true);
    };
    const wheel = (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      cancelSettle();
      s.gesture = false;
      s.startScroll = el.scrollTop;
      s.direction = Math.sign(event.deltaY);
      s.pending = true;
      queueFinish();
    };
    const measure = () => {
      s.resizeRaf = 0;
      const width = Math.max(1, parts.hero.offsetWidth),
        height = Math.max(1, parts.hero.offsetHeight);
      const compactHeight =
        parseFloat(
          getComputedStyle(el).getPropertyValue("--vx-profile-compact-height"),
        ) || 292;
      const distance = Math.max(1, stage.offsetHeight - compactHeight);
      const logoHeader = document.body.querySelector(
        '.vx-member-native-header.vx-top-zone',
      );
      const safeTop = logoHeader
        ? Math.max(64, Math.ceil(logoHeader.getBoundingClientRect().bottom -
            el.getBoundingClientRect().top) + 12)
        : 64;
      // Exactly enough content to dock the header; no second collapse distance.
      const pageMin = Math.max(0, el.clientHeight - compactHeight - 52);
      if (el.style.getPropertyValue("--vx-profile-page-min") !== pageMin + "px")
        el.style.setProperty("--vx-profile-page-min", pageMin + "px");
      const signature = [
        width,
        height,
        compactHeight,
        safeTop,
        distance,
        el.clientHeight,
        el.scrollHeight,
      ].join(":");
      if (signature === s.signature) return;
      cancelSettle();
      s.signature = signature;
      Object.assign(s, {
        width,
        height,
        compactHeight,
        safeTop,
        distance,
        maxScroll: Math.max(1, el.scrollHeight - el.clientHeight),
      });
      const geometry = profileCircleGeometry(width, height, compactHeight, safeTop);
      parts.panel?.style.setProperty(
        "--vx-profile-panel-height",
        profilePanelHeight(height) + "px",
      );
      parts.hero.style.setProperty(
        "--vx-profile-mask-diameter",
        geometry.diameter + "px",
      );
      parts.hero.style.setProperty(
        "--vx-profile-mask-radius",
        geometry.diameter / 2 + "px",
      );
      parts.hero.style.setProperty(
        "--vx-profile-mask-center-y",
        geometry.maskCenterY + "px",
      );
      s.native?.cancel();
      for (const part of Object.values(parts))
        if (part)
          for (const property of ["transform", "opacity", "clip-path"])
            part.style.removeProperty(property);
      s.native = createProfileScrollAnimations(el, parts, s);
      s.nativeFailures = 0;
      recordProfileCalibration(
        width,
        height,
        distance,
        s.native ? "WAAPI ScrollTimeline" : "JS fallback",
      );
      s.lastProgress = -1;
      paint();
    };
    const resize = () => {
      if (!s.resizeRaf) s.resizeRaf = requestAnimationFrame(measure);
    };
    const observer =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    for (const node of [
      el,
      stage,
      parts.hero,
      el.querySelector(".vx-profile-swipe-viewport"),
    ])
      if (node) observer?.observe(node);
    api.current = { start, end, wheel, calibrate: measure };
    el.addEventListener("scroll", scroll, { passive: true });
    el.addEventListener("touchmove", move, { passive: true });
    el.addEventListener("touchcancel", cancel, { passive: true });
    el.addEventListener("scrollend", finishScroll, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    window.visualViewport?.addEventListener("resize", resize, {
      passive: true,
    });
    measure();
    return () => {
      api.current = {};
      cancelSettle();
      cancelAnimationFrame(s.paintRaf);
      cancelAnimationFrame(s.resizeRaf);
      s.native?.cancel();
      observer?.disconnect();
      elastic(0);
      el.removeEventListener("scroll", scroll);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchcancel", cancel);
      el.removeEventListener("scrollend", finishScroll);
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
    };
  }, [ready, scrollRef, stageRef, motionRef]);
  return { onTouchStart, onTouchEnd, onWheel, calibrate };
}
