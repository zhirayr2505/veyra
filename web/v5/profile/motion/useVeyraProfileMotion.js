import { useCallback, useLayoutEffect, useRef } from "react";
import {
  clamp,
  profilePanelHeight,
  profileCircleGeometry,
  profileReleaseVelocity,
  profileReleaseTarget,
  PROFILE_CIRCLE_AT,
  PROFILE_CENTER_AT,
  PROFILE_CONTENT_GATE,
  PROFILE_WHEEL_GATE,
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
  backdrop: ".vx-profile-compact-backdrop",
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
  onFrame,
}) {
  const api = useRef({});
  const frameRef = useRef(onFrame);
  frameRef.current = onFrame;
  const onTouchStart = useCallback((event) => api.current.start?.(event), []);
  const onTouchEnd = useCallback(() => api.current.end?.(), []);
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
      geometryKey: "",
      native: null,
      nativeTried: false,
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
      releaseVelocity: 0,
      samples: [],
      pull: 0,
      haptic: false,
      gesture: false,
      // Tab content must never "chain" into the header: a fling from deep
      // inside the content stops at the top of the content, and a new pull
      // has to travel PROFILE_CONTENT_GATE px before the header opens.
      lock: false,
      lockTimer: 0,
      gateFinger: null,
      lastFinger: 0,
      wheelGate: 0,
      wheelAt: 0,
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
          const expected = s.native.range
            ? clamp(y / s.distance)
            : y / s.maxScroll;
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
        frameRef.current?.(p);
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
    // Native momentum keeps pushing after the finger lifts and would carry the
    // header past the rest position: end it before our own settle animation.
    const stopMomentum = () => {
      const overflow = el.style.overflowY;
      el.style.overflowY = "hidden";
      void el.scrollTop;
      el.style.overflowY = overflow;
    };
    // A barrier gesture can end at the compact rest while native inertia
    // starts AFTER touchend. Guard the rest for a few frames; otherwise the
    // browser can leave the header halfway open without a pending release.
    const holdRest = (target) => {
      clearTimeout(s.lockTimer);
      s.lock = false;
      stopMomentum();
      s.snapping = true;
      // Hold by elapsed time, not frame count: 24 frames were insufficient
      // for long inertial tails in Chromium (2-3 px drift after 1100 ms).
      const guardUntil = performance.now() + 1400;
      const hold = (now) => {
        if (!s.snapping || s.touching) return;
        if (Math.abs(el.scrollTop - target) > 0.5) {
          stopMomentum();
          el.scrollTop = target;
          paint();
        }
        if (now < guardUntil) s.settleRaf = requestAnimationFrame(hold);
        else {
          s.snapping = false;
          s.settleRaf = 0;
        }
      };
      s.settleRaf = requestAnimationFrame(hold);
    };
    const settleTo = (target) => {
      s.lock = false;
      clearTimeout(s.lockTimer);
      const from = el.scrollTop,
        delta = target - from;
      if (Math.abs(delta) < 0.5) return;
      if (reduced()) {
        el.scrollTop = target;
        paint();
        return;
      }
      const duration = Math.min(380, 200 + Math.abs(delta) * 0.35);
      let start;
      s.snapping = true;
      const step = (now) => {
        if (!s.snapping || s.touching) return;
        start ??= now;
        const t = Math.min(1, (now - start) / duration);
        el.scrollTop = from + delta * (1 - (1 - t) ** 3);
        paint();
        if (t < 1) s.settleRaf = requestAnimationFrame(step);
        else holdRest(target);
      };
      s.settleRaf = requestAnimationFrame(step);
    };
    // Decide the rest state. Used on finger lift (immediately, so native
    // momentum cannot carry the header to a random place) and as a fallback
    // after wheel / momentum bursts.
    const release = () => {
      clearTimeout(s.quietTimer);
      s.quietTimer = 0;
      s.pending = false;
      const y = el.scrollTop;
      // Content, taps and horizontal swipes must never snap back to the header.
      if (y <= 0.5) return;
      if (y >= s.distance - 0.5) {
        if (
          Math.abs(y - s.distance) <= 1.5 &&
          (s.lock || Math.abs(s.startScroll - s.distance) <= 1.5)
        ) holdRest(s.distance);
        return;
      }
      stopMomentum();
      settleTo(
        profileReleaseTarget({
          y,
          startScroll: s.startScroll,
          distance: s.distance,
          velocity: s.releaseVelocity,
        }),
      );
    };
    const finishScroll = () => {
      if (s.touching || s.snapping || !s.pending) return;
      release();
    };
    const queueFinish = () => {
      clearTimeout(s.quietTimer);
      // Fallback for wheel and WebViews without scrollend.
      s.quietTimer = setTimeout(finishScroll, 140);
    };
    // The hold only lives for the gesture and its momentum: it is dropped
    // 250 ms after the finger lifted / the last scroll event, so programmatic
    // scrolls (restoring the saved state, scrollTo) are never clamped.
    const armLockExpiry = () => {
      if (!s.lock) return;
      clearTimeout(s.lockTimer);
      s.lockTimer = setTimeout(() => {
        s.lock = false;
        s.gateFinger = null;
      }, 250);
    };
    const scroll = () => {
      // Hold the top of the tab content while the gate is closed.
      if (
        s.lock &&
        !s.snapping &&
        s.distance > 1 &&
        el.scrollTop < s.distance - 0.5
      ) {
        if (s.gateFinger === null) s.gateFinger = s.lastFinger;
        el.scrollTop = s.distance;
        // End a fling that arrived from the content: it would keep pushing against the hold.
        if (!s.touching) stopMomentum();
      }
      if (s.pull && el.scrollTop > 1) elastic(0, true);
      if (!s.touching) armLockExpiry();
      paint();
      if (s.pending && !s.touching && !s.snapping) queueFinish();
    };
    const start = (event) => {
      cancelSettle();
      const touch = event.touches?.[0];
      if (!touch) return;
      s.touching = true;
      s.axis = null;
      s.releaseVelocity = 0;
      s.haptic = false;
      s.gesture = true;
      s.startX = touch.clientX;
      s.startY = touch.clientY;
      s.startScroll = el.scrollTop;
      s.lock = s.distance > 1 && el.scrollTop >= s.distance - 1.5;
      s.gateFinger = null;
      clearTimeout(s.lockTimer);
      s.lastFinger = touch.clientY;
      s.samples = [{ at: performance.now(), finger: touch.clientY }];
      elastic(0);
    };
    const move = (event) => {
      if (!s.touching || event.touches?.length !== 1) return;
      const touch = event.touches[0],
        dx = touch.clientX - s.startX,
        dy = touch.clientY - s.startY;
      s.lastFinger = touch.clientY;
      if (s.lock && s.gateFinger !== null) {
        if (touch.clientY < s.gateFinger) s.gateFinger = touch.clientY;
        else if (touch.clientY - s.gateFinger >= PROFILE_CONTENT_GATE)
          s.lock = false;
      }
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
      s.gesture = false;
      if (s.pull) elastic(0, true);
      s.releaseVelocity = profileReleaseVelocity(s.samples, performance.now());
      armLockExpiry();
      // A horizontal swipe never starts a header move; if the header is
      // somewhere in the middle (interrupted settle) it is still completed.
      release();
    };
    const cancel = () => {
      if (s.touching) {
        s.touching = false;
        s.gesture = false;
        s.releaseVelocity = 0;
        armLockExpiry();
        release();
      }
      s.axis = null;
      if (s.pull) elastic(0, true);
    };
    const wheel = (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const now = performance.now(),
        top = el.scrollTop;
      if (event.deltaY < 0 && top >= s.distance - 1.5) {
        // At the top of the content: opening the header needs a deliberate pull.
        if (now - s.wheelAt > 280) s.wheelGate = 0;
        s.wheelAt = now;
        s.wheelGate += -event.deltaY;
        if (s.wheelGate < PROFILE_WHEEL_GATE) {
          event.preventDefault();
          return;
        }
      } else if (event.deltaY < 0 && top > s.distance + 1.5 && top + event.deltaY < s.distance) {
        // A big wheel step must stop at the top of the content, not fly into the header.
        event.preventDefault();
        el.scrollTop = s.distance;
        s.wheelGate = 0;
        s.wheelAt = now;
        return;
      } else if (top >= s.distance - 1.5) s.wheelGate = 0;
      const continuing = s.pending;
      cancelSettle();
      s.gesture = false;
      if (!continuing) s.startScroll = el.scrollTop;
      s.releaseVelocity = Math.sign(event.deltaY) * 0.3;
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
        ".vx-member-native-header.vx-top-zone",
      );
      const safeTop = logoHeader
        ? Math.max(
            64,
            Math.ceil(
              logoHeader.getBoundingClientRect().bottom -
                el.getBoundingClientRect().top,
            ) + 12,
          )
        : 64;
      // Exactly enough content to dock the header; no second collapse distance.
      const pageMin = Math.max(0, el.clientHeight - compactHeight - 52);
      if (el.style.getPropertyValue("--vx-profile-page-min") !== pageMin + "px")
        el.style.setProperty("--vx-profile-page-min", pageMin + "px");
      s.maxScroll = Math.max(1, el.scrollHeight - el.clientHeight);
      const geometryKey = [width, height, compactHeight, safeTop, distance].join(":");
      // With a pixel-range timeline the total scroll height (tab content) is
      // irrelevant; only engines without it must follow maxScroll.
      const signature =
        geometryKey + ":" + (s.native && !s.native.range ? s.maxScroll : 0);
      if (signature === s.signature) return;
      if (geometryKey !== s.geometryKey) cancelSettle();
      s.signature = signature;
      s.geometryKey = geometryKey;
      Object.assign(s, {
        width,
        height,
        compactHeight,
        safeTop,
        distance,
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
      if (s.native) {
        // In place: never cancel / recreate while the page is alive.
        s.native.update(s);
      } else if (!s.nativeTried) {
        s.nativeTried = true;
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
      }
      s.lastProgress = -1;
      paint();
    };
    const resize = () => {
      if (!s.resizeRaf) s.resizeRaf = requestAnimationFrame(measure);
    };
    // ResizeObserver callbacks run after layout and before paint: measure
    // synchronously so a tab switch never paints one frame with stale geometry.
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => measure())
        : null;
    for (const node of [
      el,
      stage,
      parts.hero,
      el.querySelector(".vx-profile-swipe-viewport"),
    ])
      if (node) observer?.observe(node);
    api.current = { start, end, calibrate: measure };
    el.addEventListener("scroll", scroll, { passive: true });
    el.addEventListener("touchmove", move, { passive: true });
    el.addEventListener("touchcancel", cancel, { passive: true });
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("scrollend", finishScroll, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    window.visualViewport?.addEventListener("resize", resize, {
      passive: true,
    });
    measure();
    return () => {
      api.current = {};
      cancelSettle();
      clearTimeout(s.lockTimer);
      cancelAnimationFrame(s.paintRaf);
      cancelAnimationFrame(s.resizeRaf);
      s.native?.cancel();
      observer?.disconnect();
      elastic(0);
      el.removeEventListener("scroll", scroll);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchcancel", cancel);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("scrollend", finishScroll);
      window.removeEventListener("resize", resize);
      window.visualViewport?.removeEventListener("resize", resize);
    };
  }, [ready, scrollRef, stageRef, motionRef]);
  return { onTouchStart, onTouchEnd, calibrate };
}
