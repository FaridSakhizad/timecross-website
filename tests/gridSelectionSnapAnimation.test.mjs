import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGridSelectionSnapAnimation, GRID_SELECTION_SNAP_DURATION } from '../src/components/TimelineGrid/shared/gridSelectionSnapAnimation.ts';

const from = { left: '10px', top: '20px', width: '213.5px', height: '325.5px' };
const to = { left: '10px', top: '20px', width: '224px', height: '328px' };

function element() {
  const calls = [];
  const frame = { style: { ...from }, hidden: false,
    animate(keyframes, options) {
      const animation = { cancelled: false, cancel() { this.cancelled = true; this.oncancel?.(); } };
      calls.push({ keyframes, options, animation });
      return animation;
    },
  };
  return { frame, calls };
}

test('snap animates from free geometry to the committed rectangle without scaling handles', () => {
  const { frame, calls } = element();
  const snap = createGridSelectionSnapAnimation(frame);
  snap.snap(() => Object.assign(frame.style, to));
  assert.deepEqual(frame.style, to);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].keyframes, [from, to]);
  assert.equal(calls[0].options.duration, GRID_SELECTION_SNAP_DURATION);
  assert.ok(!('transform' in calls[0].keyframes[0]));
  snap.cancel();
  assert.equal(calls[0].animation.cancelled, true);
});

test('repeated snaps cancel the previous animation; an already aligned frame does not animate', () => {
  const { frame, calls } = element();
  const snap = createGridSelectionSnapAnimation(frame);
  snap.snap(() => Object.assign(frame.style, to));
  snap.snap(() => { frame.style.width = '298px'; });
  assert.equal(calls[0].animation.cancelled, true);
  assert.equal(calls.length, 2);
  calls[1].animation.onfinish();
  snap.cancel();
  assert.equal(calls[1].animation.cancelled, false);
  snap.snap(() => {});
  assert.equal(calls.length, 2);
});

test('hidden frames and browsers without animation support still receive the final rectangle', () => {
  for (const hidden of [true, false]) {
    const frame = { hidden, style: { ...from } };
    createGridSelectionSnapAnimation(frame).snap(() => Object.assign(frame.style, to));
    assert.deepEqual(frame.style, to);
  }
  let updated = false;
  createGridSelectionSnapAnimation().snap(() => { updated = true; });
  assert.equal(updated, true);
});

test('reduced-motion preference commits immediately without an animation', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    globalThis.window = { matchMedia(query) {
      assert.equal(query, '(prefers-reduced-motion: reduce)');
      return { matches: true };
    } };
    const { frame, calls } = element();
    createGridSelectionSnapAnimation(frame).snap(() => Object.assign(frame.style, to));
    assert.deepEqual(frame.style, to);
    assert.equal(calls.length, 0);
  } finally {
    if (original) Object.defineProperty(globalThis, 'window', original);
    else delete globalThis.window;
  }
});
