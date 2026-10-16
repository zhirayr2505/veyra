import test from 'node:test';
import assert from 'node:assert/strict';
import {
  profileReleaseTarget, profileFrame, profileContentFrame, segment,
  PROFILE_CIRCLE_AT, PROFILE_MORPH_START, PROFILE_AVATAR_DIAMETER,
} from '../web/v5/profile/motion/profileMotionMath.js';
import {profileStyles, buildProfileScrollKeyframes} from '../web/v5/profile/motion/profileScrollTimeline.js';

test('release preserves content position in either direction, including taps', () => {
  const distance = 373;
  for (const y of [0, distance, distance + 20, distance + 200, 1800]) {
    for (const velocity of [-2, -0.3, 0, 0.3, 2]) {
      for (const start of [0, distance, y - 50, y + 50]) {
        assert.equal(profileReleaseTarget({ y, startScroll: start, distance, velocity }), y);
      }
    }
  }
  assert.equal(profileReleaseTarget({ y: 200, startScroll: 0, distance, velocity: 0.3 }), distance);
  assert.equal(profileReleaseTarget({ y: distance - 200, startScroll: distance, distance, velocity: -0.3 }), 0);
});

test('fitted image covers the mask and reduces to avatar size, without stretching', () => {
  for (const [width, height] of [[360, 355], [390, 447], [430, 600], [640, 322]]) {
    for (let i = 0; i <= 1000; i++) {
      const p = i / 1000;
      const frame = profileFrame(p, width, height);
      const content = profileContentFrame(p, width, height, frame.maskDiameter, frame.maskCenterY);
      const t = segment(p, PROFILE_MORPH_START, PROFILE_CIRCLE_AT);
      const maskWidth = width + (frame.maskDiameter - width) * t;
      const maskHeight = height + (frame.maskDiameter - height) * t;
      const left = (width - maskWidth) / 2;
      const top = (frame.maskCenterY - frame.maskDiameter / 2) * t;
      assert.ok(content.scale > 0 && content.scale <= 1);
      assert.ok(content.x <= left + 1e-6);
      assert.ok(content.y <= top + 1e-6);
      assert.ok(content.x + width * content.scale >= left + maskWidth - 1e-6);
      assert.ok(content.y + height * content.scale >= top + maskHeight - 1e-6);
      if (p === 1) {
        const shorterSide = Math.min(width, height) * content.scale * frame.heroScale;
        assert.ok(Math.abs(shorterSide - PROFILE_AVATAR_DIAMETER) < 1e-6);
      }
    }
  }
});

test('one sheet reaches the tab rail at every progress and supported height', () => {
  for (let height = 322; height <= 600; height++) {
    for (const compact of [220, 292]) {
      for (let i = 0; i <= 1000; i++) {
        const p = i / 1000;
        const f = profileFrame(p, 390, height, compact);
        const rail = height + 218 - (height + 218 - compact) * p;
        const bottom = f.sheetY + f.panelHeight - f.panelClipBottom;
        assert.ok(Math.abs(bottom - rail - 1) < 1e-6, `gap at ${height}, ${compact}, ${p}`);
      }
    }
  }
});

test('native keyframes and JS fallback use identical styles; main photo is ready at circle', () => {
  const distance = 373, total = 2000;
  const tracks = buildProfileScrollKeyframes(390, 447, distance, total);
  for (const p of [0, PROFILE_MORPH_START, PROFILE_CIRCLE_AT, .5, 1]) {
    const styles = profileStyles(p, 390, 447);
    for (const [name, values] of Object.entries(styles)) {
      const keyframe = tracks[name].find(frame => Math.abs(frame.offset - p * distance / total) < 1e-10);
      assert.ok(keyframe, `${name}, ${p}`);
      const {offset, ...actual} = keyframe;
      assert.deepEqual(actual, values);
    }
  }
  assert.equal(profileStyles(PROFILE_CIRCLE_AT, 390, 447).mainPhoto.opacity, 1);
});
