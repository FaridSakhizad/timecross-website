import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { attachDesktopGridPan } from '../src/components/TimelineGrid/desktop/gridPanController.ts';

class FakeViewport extends EventTarget {
  captured = new Set();
  interactive = false;
  left = 500;
  top = 100;
  scrollCalls = [];
  get scrollLeft() { return this.left; }
  set scrollLeft(value) { this.left = Math.max(0, Math.min(5000, value)); }
  get scrollTop() { return this.top; }
  set scrollTop(value) { this.top = Math.max(0, Math.min(1000, value)); }
  closest() { return this.interactive ? this : null; }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) {
    this.captured.delete(id);
    emit(this, 'lostpointercapture', { pointerId: id });
  }
  scrollTo(options) {
    this.scrollCalls.push(options);
    this.scrollLeft = options.left;
    this.scrollTop = options.top;
  }
}

function emit(target, type, values = {}) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, {
    pointerType: 'mouse', isPrimary: true, pointerId: 1,
    button: 0, buttons: 1, clientX: 100, clientY: 100, detail: 1,
    ...values,
  });
  target.dispatchEvent(event);
  return event;
}

let viewport;
let controller;
let active;
let originalGlobals;
beforeEach(() => {
  originalGlobals = ['window', 'document', 'Element'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  globalThis.window = new EventTarget();
  globalThis.document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  globalThis.Element = FakeViewport;
  viewport = new FakeViewport();
  active = false;
  controller = attachDesktopGridPan(viewport, (value) => { active = value; });
});
afterEach(() => {
  controller.destroy();
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

test('diagonal dragging moves both axes and stops on release outside the viewport', () => {
  emit(viewport, 'pointerdown');
  assert.equal(active, true);
  assert.equal(viewport.hasPointerCapture(1), true);
  emit(window, 'pointermove', { clientX: -135, clientY: -45 });
  assert.equal(viewport.scrollLeft, 735);
  assert.equal(viewport.scrollTop, 245);
  emit(window, 'pointerup', { buttons: 0 });
  assert.equal(active, false);
  assert.equal(viewport.hasPointerCapture(1), false);
  emit(window, 'pointermove', { clientX: -500 });
  assert.equal(viewport.scrollLeft, 735);
});

test('small movements remain clicks and do not move the grid', () => {
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 103, clientY: 102 });
  emit(window, 'pointerup', { buttons: 0 });
  assert.equal(viewport.scrollLeft, 500);
  assert.equal(viewport.scrollTop, 100);
  assert.equal(emit(viewport, 'click').defaultPrevented, false);
});

test('interactive controls, modified clicks, touch and other pointers are ignored', () => {
  for (const values of [
    { pointerType: 'touch' }, { pointerType: 'pen' }, { button: 2 },
    { ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, { isPrimary: false },
  ]) {
    emit(viewport, 'pointerdown', values);
    assert.equal(active, false);
  }
  viewport.interactive = true;
  emit(viewport, 'pointerdown');
  assert.equal(active, false);
  viewport.interactive = false;
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { pointerId: 2, clientX: -200 });
  assert.equal(viewport.scrollLeft, 500);
  emit(window, 'pointerup', { pointerId: 2 });
  assert.equal(active, true);
});

test('cancel, capture loss, lost buttons, blur and hidden document end the interaction', () => {
  for (const cancel of [
    () => controller.cancel(),
    () => emit(window, 'pointercancel'),
    () => viewport.releasePointerCapture(1),
    () => emit(window, 'pointermove', { buttons: 0 }),
    () => emit(window, 'blur'),
    () => { document.visibilityState = 'hidden'; emit(document, 'visibilitychange'); },
  ]) {
    document.visibilityState = 'visible';
    emit(viewport, 'pointerdown');
    assert.equal(active, true);
    cancel();
    assert.equal(active, false);
    assert.equal(viewport.hasPointerCapture(1), false);
  }
});

test('drag suppresses its trailing click but preserves keyboard and subsequent clicks', () => {
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 60 });
  emit(window, 'pointerup');
  assert.equal(emit(viewport, 'click', { detail: 0 }).defaultPrevented, false);
  assert.equal(emit(viewport, 'click').defaultPrevented, true);
  emit(viewport, 'pointerdown');
  emit(window, 'pointerup');
  assert.equal(emit(viewport, 'click').defaultPrevented, false);
});

test('scrolling clamps to edges and new drags use the current position', () => {
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 10000, clientY: 10000 });
  assert.equal(viewport.scrollLeft, 0);
  assert.equal(viewport.scrollTop, 0);
  emit(window, 'pointerup');
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 40, clientY: 30 });
  assert.equal(viewport.scrollLeft, 60);
  assert.equal(viewport.scrollTop, 70);
  assert.equal(viewport.scrollCalls.at(-1).behavior, 'instant');
});

test('a control activation is not swallowed when a drag produced no trailing click', () => {
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 60 });
  emit(window, 'pointerup');
  viewport.interactive = true;
  assert.equal(emit(viewport, 'click').defaultPrevented, false);
});

test('destroy during a drag releases capture and removes handlers', () => {
  emit(viewport, 'pointerdown');
  controller.destroy();
  assert.equal(active, false);
  assert.equal(viewport.hasPointerCapture(1), false);
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 0 });
  assert.equal(active, false);
  assert.equal(viewport.scrollLeft, 500);
});
