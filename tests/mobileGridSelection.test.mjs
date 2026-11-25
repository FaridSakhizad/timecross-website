import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { attachMobileGridSelection } from '../src/components/TimelineGrid/mobile/mobileGridSelectionController.ts';
import {
  getVisibleMobileGridSelection,
  MOBILE_SELECTION_BOTTOM_PADDING,
  MOBILE_SELECTION_HORIZONTAL_PADDING,
  MOBILE_SELECTION_TOP_PADDING,
} from '../src/components/TimelineGrid/mobile/mobileGridSelectionGeometry.ts';

import { hourOf, PER_HOUR, SLOT_MS, slotsOf } from './support/gridSlots.mjs';

const { GRID_FRAME_COVERS_USER_HOURS } = await import('../src/components/TimelineGrid/shared/gridSelection.ts');

/** Offset of a resize handle along one axis: -distance, distance or 0. */
function handleStep(direction, backSide, forwardSide, distance) {
  if (direction.includes(backSide)) {
    return -distance;
  }

  if (direction.includes(forwardSide)) {
    return distance;
  }

  return 0;
}

const hour = 3600000;
const SIDE = MOBILE_SELECTION_HORIZONTAL_PADDING;
const px = (value) => `${value}px`;
/** The initial frame: three hours of three cities, with the frame's padding. */
const INITIAL_WIDTH = 3 * 74 - 10 + SIDE * 2;
/** The frame's top: the user's hours at the top of the content, or the first selected city. */
const INITIAL_TOP = GRID_FRAME_COVERS_USER_HOURS ? 0 : 231;
const INITIAL_HEIGHT = 564 - INITIAL_TOP + MOBILE_SELECTION_TOP_PADDING + MOBILE_SELECTION_BOTTOM_PADDING;

/** The grid's elements for a selector: the rows, the user's hours, or the cells. */
function queryGrid(selector, rows) {
  if (selector === '.timelineGrid-row_mobile') {
    return rows;
  }

  return selector.includes('timelineGrid-userHours') ? userHours : elements;
}

const ALL_ROWS = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6'];
const geometry = Array.from({ length: 7 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({
  slot: { rowId: `r${row}`, start: col * hour },
  rect: { left: 100 + col * 74, right: 164 + col * 74, top: 160 + row * 111, bottom: 224 + row * 111 },
  rowTop: 120 + row * 111,
  rowBottom: 231 + row * 111,
}))).flat();

class FakeElement extends EventTarget {
  dataset = {};
  style = {};
  hidden = true;
  isConnected = true;
  captured = new Set();
  selected = false;
  classList = { toggle: (_name, value) => { this.selected = value; } };
  closest() { return this.dataset.gridResize ? this : null; }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
}

let original, layer, frame, handles, elements, userHours, initial, committed, active, controller, frames, nextFrame;

function emit(target, type, values = {}) {
  const event = new Event(type, { cancelable: true });
  const { target: eventTarget, ...properties } = values;

  Object.assign(event, {
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
    button: 0,
    buttons: type === 'pointerup' ? 0 : 1,
    clientX: 200,
    clientY: 400,
    ...properties,
  });

  if (eventTarget) {
    Object.defineProperty(event, 'target', { value: eventTarget });
  }

  target.dispatchEvent(event);
  return event;
}

function flush() {
  const pending = [...frames.values()];

  frames.clear();
  pending.forEach((callback) => callback());
}

beforeEach(() => {
  original = ['window', 'document', 'Element', 'requestAnimationFrame', 'cancelAnimationFrame']
    .map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  globalThis.Element = FakeElement;
  frames = new Map();
  nextFrame = 0;

  globalThis.requestAnimationFrame = (callback) => {
    nextFrame += 1;
    const id = nextFrame;

    frames.set(id, callback);
    return id;
  };

  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  globalThis.window = Object.assign(new EventTarget(), {
    matchMedia: () => ({ matches: false }),
    scrollX: 100,
    scrollY: 0,
    innerHeight: 800,
    scrollTo({ left, top }) {
      this.scrollX = left;
      this.scrollY = top;
    },
    scrollBy({ left, top }) {
      this.scrollX = Math.max(0, Math.min(600, this.scrollX + left));
      this.scrollY = Math.max(0, Math.min(800, this.scrollY + top));
    },
  });
  // The user's own hours above the cities.
  userHours = Array.from({ length: 8 }, (_, col) => {
    const userHour = new FakeElement();

    userHour.dataset = { gridHourStart: String(col * hour) };
    return userHour;
  });
  elements = geometry.map((cell) => {
    const element = new FakeElement();

    element.dataset = { gridSelectionRow: cell.slot.rowId, gridHourStart: String(cell.slot.start) };
    element.getBoundingClientRect = () => ({
      left: cell.rect.left - window.scrollX,
      right: cell.rect.right - window.scrollX,
      top: cell.rect.top - window.scrollY,
      bottom: cell.rect.bottom - window.scrollY,
    });
    return element;
  });
  const rows = Array.from({ length: 7 }, (_, index) => ({
    getBoundingClientRect: () => ({ top: 120 + index * 111 - window.scrollY, bottom: 231 + index * 111 - window.scrollY }),
    querySelectorAll: () => elements.slice(index * 8, (index + 1) * 8),
  }));

  globalThis.document = Object.assign(new EventTarget(), {
    documentElement: { clientWidth: 390 },
    visibilityState: 'visible',
    querySelector: () => ({ getBoundingClientRect: () => ({ bottom: 106 }) }),
    querySelectorAll: (selector) => queryGrid(selector, rows),
  });
  frame = new FakeElement();
  layer = frame;
  frame.parentElement = {
    querySelectorAll: (selector) => document.querySelectorAll(selector),
    getBoundingClientRect: () => ({ left: -window.scrollX, top: -window.scrollY }),
  };
  handles = Object.fromEntries(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].map((direction) => {
    const handle = new FakeElement();

    handle.dataset.gridResize = direction;
    return [direction, handle];
  }));
  // Three whole hours of three cities.
  initial = slotsOf(geometry.filter((cell) => ['r1', 'r2', 'r3'].includes(cell.slot.rowId)
    && cell.slot.start >= hour
    && cell.slot.start <= 3 * hour).map((cell) => cell.slot));
  committed = initial;
  active = false;
  controller = attachMobileGridSelection(layer, initial, (value) => {
    committed = value;
  }, (value) => { active = value; });
});
afterEach(() => {
  controller.destroy();

  for (const [key, descriptor] of original) {
    if (descriptor) {
      Object.defineProperty(globalThis, key, descriptor);
    } else {
      delete globalThis[key];
    }
  }
});

test('frame initially includes city titles and full hour cells, not only the hour band', () => {
  assert.equal(layer.hidden, false);
  assert.equal(frame.style.left, px(174 - SIDE));
  assert.equal(frame.style.width, px(INITIAL_WIDTH));
  assert.equal(frame.style.height, px(INITIAL_HEIGHT));
  assert.equal(elements.filter((element) => element.selected).length, 9);
});

test('zen meeting stays over visible hours even when other elements are far outside the screen', () => {
  document.querySelector = (selector) => ({
    getBoundingClientRect: () => (selector === '.timelineGrid-userHours_mobile'
      ? { bottom: 106 }
      : { left: 3000, right: 3200 }),
  });
  window.scrollX = 300;
  const selected = getVisibleMobileGridSelection();

  assert.deepEqual([...new Set(selected.map((cell) => hourOf(cell.start)))], [5 * hour]);
  assert.deepEqual([...new Set(selected.map((cell) => cell.rowId))], ALL_ROWS);
  controller.destroy();
  controller = attachMobileGridSelection(layer, selected, () => {}, () => {});
  assert.equal(frame.style.left, px(470 - SIDE));
  assert.equal(frame.style.width, px(64 + SIDE * 2));
});

test('zen meeting follows horizontal page scrolling and keeps every city when selection is enabled again', () => {
  window.scrollX = 300;
  window.scrollY = 200;
  const selected = getVisibleMobileGridSelection();

  assert.deepEqual([...new Set(selected.map((cell) => hourOf(cell.start)))], [5 * hour]);
  assert.deepEqual([...new Set(selected.map((cell) => cell.rowId))], ALL_ROWS);
  window.scrollX = 100;
  window.scrollY = 0;
  const reset = getVisibleMobileGridSelection();

  assert.deepEqual([...new Set(reset.map((cell) => hourOf(cell.start)))], [2 * hour]);
  assert.deepEqual([...new Set(reset.map((cell) => cell.rowId))], ALL_ROWS);
});

test('all eight touch handles resize in complete hours/cities while fixing opposite edges', () => {
  for (const direction of Object.keys(handles)) {
    controller.destroy();
    committed = initial;
    controller = attachMobileGridSelection(layer, initial, (value) => {
      committed = value;
    }, (value) => { active = value; });
    const x = direction.includes('w') ? 74 : 286;
    const y = direction.includes('n') ? 231 : 564;
    const dx = handleStep(direction, 'w', 'e', 74);
    const dy = handleStep(direction, 'n', 's', 111);
    const down = emit(layer, 'pointerdown', { target: handles[direction], clientX: x, clientY: y });

    assert.equal(down.defaultPrevented, true);
    assert.equal(active, true);
    emit(window, 'pointermove', { clientX: x + dx, clientY: y + dy });
    flush();
    assert.equal(committed, initial);
    emit(window, 'pointerup', { clientX: x + dx, clientY: y + dy });
    assert.equal(active, false);
    assert.equal(handles[direction].captured.size, 0);
    assert.equal(new Set(committed.map((cell) => cell.rowId)).size, dy ? 4 : 3, direction);
    assert.equal(new Set(committed.map((cell) => hourOf(cell.start))).size, dx ? 4 : 3, direction);
  }
});

test('fast touch release commits final coordinates even without intermediate moves', () => {
  emit(layer, 'pointerdown', { target: handles.e, clientX: 286, clientY: 400 });
  emit(window, 'pointerup', { clientX: 360, clientY: 400 });
  assert.equal(committed.length, 3 * 4 * PER_HOUR);
  // The user's hours above the cities show the four hours now selected.
  assert.deepEqual(userHours.map((userHour) => Boolean(userHour.selected)), [false, true, true, true, true, false, false, false]);
});

function nativeTouch(target, type, handle, x, y, identifier = 7, touches) {
  const touch = { identifier, clientX: x, clientY: y };

  return emit(target, type, {
    target: handle,
    changedTouches: [touch],
    touches: touches ?? (type === 'touchend' || type === 'touchcancel' ? [] : [touch]),
  });
}

function enableNativeTouch(viewport) {
  controller.destroy();
  window.TouchEvent = class {};
  controller = attachMobileGridSelection(layer, initial, (value) => {
    committed = value;
  }, (value) => { active = value; }, viewport);
}

test('native first-contact dragging resizes all eight handles without a preliminary tap', () => {
  for (const direction of Object.keys(handles)) {
    enableNativeTouch();
    committed = initial;
    const x = direction.includes('w') ? 74 : 286;
    const y = direction.includes('n') ? 231 : 564;
    const dx = handleStep(direction, 'w', 'e', 74);
    const dy = handleStep(direction, 'n', 's', 111);
    const pointer = emit(layer, 'pointerdown', { target: handles[direction], clientX: x, clientY: y });

    assert.equal(pointer.defaultPrevented, false);
    assert.equal(active, false);
    assert.equal(nativeTouch(layer, 'touchstart', handles[direction], x, y).defaultPrevented, true);
    assert.equal(active, true);
    assert.equal(nativeTouch(layer, 'touchmove', handles[direction], x + dx, y + dy).defaultPrevented, true);
    flush();
    emit(window, 'pointerup', { clientX: x + dx, clientY: y + dy });
    assert.equal(active, true, 'the duplicate pointer stream must not finish the touch gesture');
    nativeTouch(layer, 'touchend', handles[direction], x + dx, y + dy);
    assert.equal(active, false);
    assert.equal(new Set(committed.map((cell) => cell.rowId)).size, dy ? 4 : 3, direction);
    assert.equal(new Set(committed.map((cell) => hourOf(cell.start))).size, dx ? 4 : 3, direction);
  }
});

test('native touch release uses final coordinates without a rendered move frame', () => {
  enableNativeTouch();
  nativeTouch(layer, 'touchstart', handles.e, 286, 400);
  nativeTouch(layer, 'touchend', handles.e, 360, 400);
  assert.equal(committed.length, 3 * 4 * PER_HOUR);
  assert.equal(frames.size, 0);
});

test('native resizing moves freely by pixels on every handle then snaps on release', () => {
  for (const direction of Object.keys(handles)) {
    enableNativeTouch();
    committed = initial;
    const x = direction.includes('w') ? 74 : 286;
    const y = direction.includes('n') ? 231 : 564;
    // Nearer to the frame's edge than to the next half, across the gap between the cells.
    const dx = handleStep(direction, 'w', 'e', 8);
    const dy = handleStep(direction, 'n', 's', 8);
    const before = { ...frame.style };

    nativeTouch(layer, 'touchstart', handles[direction], x, y);
    nativeTouch(layer, 'touchmove', handles[direction], x + dx, y + dy);
    flush();
    // A dragged side follows the pointer without padding.
    assert.equal(parseFloat(frame.style.width), INITIAL_WIDTH + (dx ? 8 - SIDE : 0), direction);
    // With the user's hours in the frame, its top stays at the top of the content.
    const movesHeight = direction.includes('s') || (direction.includes('n') && !GRID_FRAME_COVERS_USER_HOURS);

    assert.equal(parseFloat(frame.style.height), INITIAL_HEIGHT + (movesHeight ? 8 : 0), direction);
    assert.equal(committed, initial);
    nativeTouch(layer, 'touchend', handles[direction], x + dx, y + dy);
    assert.deepEqual(frame.style, before, direction);
    assert.deepEqual(committed, initial);
  }
});

test('native snap animation survives selection state sync and stops on the next touch', () => {
  enableNativeTouch();
  const animations = [];

  frame.animate = (keyframes) => {
    const animation = {
      keyframes,
      cancelled: false,
      cancel() {
        this.cancelled = true;
      },
    };

    animations.push(animation);
    return animation;
  };

  nativeTouch(layer, 'touchstart', handles.e, 286, 400);
  nativeTouch(layer, 'touchmove', handles.e, 294, 400);
  flush();
  assert.equal(animations.length, 0);
  nativeTouch(layer, 'touchend', handles.e, 294, 400);
  assert.equal(animations.length, 1);
  assert.equal(animations[0].keyframes[0].width, px(INITIAL_WIDTH + 8 - SIDE));
  assert.equal(animations[0].keyframes[1].width, px(INITIAL_WIDTH));
  controller.setSelection(committed);
  assert.equal(animations[0].cancelled, false);
  nativeTouch(layer, 'touchstart', handles.e, 286, 400);
  assert.equal(animations[0].cancelled, true);
});

test('native touch cancellation and a second finger roll back the range and release scrolling', () => {
  for (const cancel of [
    () => nativeTouch(layer, 'touchcancel', handles.e, 360, 400),
    () => nativeTouch(window, 'touchstart', handles.e, 360, 400, 8, [{ identifier: 7 }, { identifier: 8 }]),
  ]) {
    enableNativeTouch();
    committed = initial;
    const originalStyle = { ...frame.style };

    nativeTouch(layer, 'touchstart', handles.e, 286, 400);
    nativeTouch(layer, 'touchmove', handles.e, 360, 400);
    flush();
    assert.equal(elements.filter((element) => element.selected).length, 12);
    cancel();
    assert.equal(active, false);
    assert.equal(committed, initial);
    assert.deepEqual(frame.style, originalStyle);
    assert.equal(elements.filter((element) => element.selected).length, 9);
    assert.equal(nativeTouch(layer, 'touchmove', handles.e, 380, 400).defaultPrevented, false);
  }
});

test('native swipes outside handles and listeners after destroy never prevent page scrolling', () => {
  enableNativeTouch();
  const outside = new FakeElement();

  assert.equal(nativeTouch(layer, 'touchstart', outside, 200, 400).defaultPrevented, false);
  assert.equal(nativeTouch(window, 'touchmove', outside, 260, 400).defaultPrevented, false);
  assert.equal(active, false);
  controller.destroy();
  assert.equal(nativeTouch(layer, 'touchstart', handles.e, 286, 400).defaultPrevented, false);
  assert.equal(active, false);
});

test('native page swipes outside handles are neither prevented nor interpreted as selection', () => {
  assert.equal(emit(window, 'pointerdown').defaultPrevented, false);
  assert.equal(emit(window, 'pointermove', { clientX: 250 }).defaultPrevented, false);
  assert.equal(emit(window, 'pointerup').defaultPrevented, false);
  window.scrollX += 74;
  const previous = { ...frame.style };

  emit(window, 'scroll');
  assert.equal(frames.size, 0);
  assert.deepEqual(frame.style, previous);
  assert.equal(committed, initial);
});

test('pointercancel, second finger, blur, resize and hidden tab roll back previews', () => {
  for (const stop of [
    () => emit(window, 'pointercancel'),
    () => emit(window, 'pointerdown', { pointerId: 2, isPrimary: false }),
    () => emit(window, 'blur'),
    () => {
      document.documentElement.clientWidth += 10;
      emit(window, 'resize');
    },
    () => {
      document.visibilityState = 'hidden';
      emit(document, 'visibilitychange');
    },
  ]) {
    document.visibilityState = 'visible';
    emit(layer, 'pointerdown', { target: handles.e, clientX: 286, clientY: 400 });
    emit(window, 'pointermove', { clientX: 360, clientY: 400 });
    flush();
    assert.equal(elements.filter((el) => el.selected).length, 12);
    stop();
    assert.equal(active, false);
    assert.equal(elements.filter((el) => el.selected).length, 9);
    assert.equal(committed, initial);
  }
});

test('pointer capture loss with released buttons commits, held buttons cancel', () => {
  emit(layer, 'pointerdown', { target: handles.e, clientX: 286, clientY: 400 });
  emit(window, 'pointermove', { clientX: 360, clientY: 400 });
  emit(layer, 'lostpointercapture', { buttons: 0 });
  assert.equal(committed.length, 3 * 4 * PER_HOUR);
  const previous = committed;

  emit(layer, 'pointerdown', { target: handles.e, clientX: 360, clientY: 400 });
  emit(window, 'pointermove', { clientX: 286, clientY: 400 });
  emit(layer, 'lostpointercapture', { buttons: 1 });
  assert.equal(committed, previous);
  assert.equal(active, false);
});

test('edge autoscroll runs only during handle resizing and stops on release', () => {
  emit(layer, 'pointerdown', { target: handles.e, clientX: 286, clientY: 400 });
  emit(window, 'pointermove', { clientX: 389, clientY: 400 });
  flush();
  assert.ok(window.scrollX > 100);
  emit(window, 'pointerup', { clientX: 389, clientY: 400 });
  const finalX = window.scrollX;

  flush();
  assert.equal(window.scrollX, finalX);
  assert.equal(frames.size, 0);
});

test('destroy removes input listeners and hides the frame', () => {
  controller.destroy();
  emit(layer, 'pointerdown', { target: handles.e });
  assert.equal(active, false);
  assert.equal(layer.hidden, true);
  assert.equal(frames.size, 0);
});

test('shrinking never crosses opposite edges or leaves an empty selection', () => {
  emit(layer, 'pointerdown', { target: handles.nw, clientX: 74, clientY: 231 });
  emit(window, 'pointerup', { clientX: 1000, clientY: 1200 });
  // The last half of the last hour in the last city: the opposite corner.
  assert.equal(committed.length, 1);
  assert.deepEqual(committed, [{ rowId: 'r3', start: 4 * hour - SLOT_MS }]);
});

test('keyboard users can adjust a handle by one whole block without scrolling the page', () => {
  const event = emit(window, 'keydown', { target: handles.e, key: 'ArrowRight' });

  assert.equal(event.defaultPrevented, true);
  // Half an hour more in each of the three cities.
  assert.equal(committed.length, 3 * (3 * PER_HOUR + 1));
  assert.equal(window.scrollX, 100);
});

test('Escape during resizing restores the range instead of passing through to mode dismissal', () => {
  emit(layer, 'pointerdown', { target: handles.e, clientX: 286, clientY: 400 });
  emit(window, 'pointermove', { clientX: 360, clientY: 400 });
  flush();
  const event = emit(window, 'keydown', { key: 'Escape' });

  assert.equal(event.defaultPrevented, true);
  assert.equal(active, false);
  assert.equal(committed, initial);
});

function embeddedViewport() {
  controller.destroy();
  const viewport = Object.assign(new FakeElement(), {
    scrollLeft: 148,
    scrollTop: 111,
    getBoundingClientRect: () => ({ left: 20, right: 370, top: 140, bottom: 720 }),
    querySelector: () => ({ getBoundingClientRect: () => ({ bottom: 186 }) }),
    scrollTo({ left, top }) {
      this.scrollLeft = left;
      this.scrollTop = top;
    },
    scrollBy({ left, top }) {
      this.scrollLeft = Math.max(0, this.scrollLeft + left);
      this.scrollTop = Math.max(0, this.scrollTop + top);
    },
  });

  for (const element of elements) {
    const originalRect = element.getBoundingClientRect;

    element.getBoundingClientRect = () => {
      const rect = originalRect();

      return {
        left: rect.left - viewport.scrollLeft,
        right: rect.right - viewport.scrollLeft,
        top: rect.top - viewport.scrollTop,
        bottom: rect.bottom - viewport.scrollTop,
      };
    };
  }

  const rows = Array.from({ length: 7 }, (_, index) => ({
    getBoundingClientRect: () => ({
      top: 120 + index * 111 - window.scrollY - viewport.scrollTop,
      bottom: 231 + index * 111 - window.scrollY - viewport.scrollTop,
    }),
    querySelectorAll: () => elements.slice(index * 8, (index + 1) * 8),
  }));

  viewport.querySelectorAll = (selector) => queryGrid(selector, rows);
  frame.parentElement = {
    querySelectorAll: (selector) => viewport.querySelectorAll(selector),
    getBoundingClientRect: () => ({
      left: -window.scrollX - viewport.scrollLeft,
      top: -window.scrollY - viewport.scrollTop,
    }),
  };
  controller = attachMobileGridSelection(layer, initial, (value) => {
    committed = value;
  }, (value) => { active = value; }, viewport);
  return viewport;
}

test('embedded frame keeps content coordinates during independent widget and page scrolling', () => {
  const viewport = embeddedViewport();
  const initialStyle = { ...frame.style };
  const left = parseFloat(frame.style.left);

  viewport.scrollLeft += 74;
  emit(viewport, 'scroll');
  assert.equal(frames.size, 0);
  assert.equal(parseFloat(frame.style.left), left);
  assert.equal(committed, initial);
  assert.equal(window.scrollX, 100);
  viewport.scrollTop += 111;
  const top = parseFloat(frame.style.top);

  emit(viewport, 'scroll');
  assert.equal(frames.size, 0);
  assert.equal(parseFloat(frame.style.top), top);
  window.scrollY += 50;
  emit(window, 'scroll');
  assert.equal(frames.size, 0);
  assert.deepEqual(frame.style, initialStyle);
  assert.equal(committed, initial);
});

test('Safari toolbar height changes do not reposition the content frame or cancel a native resize', () => {
  enableNativeTouch();
  nativeTouch(layer, 'touchstart', handles.e, 286, 400);
  const style = { ...frame.style };

  window.innerHeight -= 60;
  emit(window, 'resize');
  assert.equal(active, true);
  assert.deepEqual(frame.style, style);
  assert.equal(frames.size, 0);
  nativeTouch(layer, 'touchend', handles.e, 360, 400);
  assert.equal(committed.length, 3 * 4 * PER_HOUR);
});

test('embedded touch resize uses widget scroll offsets and autoscroll never scrolls the page', () => {
  const viewport = embeddedViewport();

  emit(layer, 'pointerdown', { target: handles.e, clientX: 200, clientY: 400 });
  emit(window, 'pointerup', { clientX: 274, clientY: 400 });
  assert.equal(committed.length, 3 * 4 * PER_HOUR);
  emit(layer, 'pointerdown', { target: handles.e, clientX: 274, clientY: 400 });
  emit(window, 'pointermove', { clientX: 369, clientY: 400 });
  flush();
  assert.ok(viewport.scrollLeft > 148);
  assert.equal(window.scrollX, 100);
  assert.equal(window.scrollY, 0);
  emit(window, 'pointerup', { clientX: 369, clientY: 400 });
  const finalX = viewport.scrollLeft;

  flush();
  assert.equal(viewport.scrollLeft, finalX);
  controller.destroy();
  emit(viewport, 'scroll');
  assert.equal(frames.size, 0);
});

test('native embedded resizing and edge autoscroll affect only the widget', () => {
  const viewport = embeddedViewport();

  enableNativeTouch(viewport);
  assert.equal(nativeTouch(layer, 'touchstart', handles.e, 200, 400).defaultPrevented, true);
  nativeTouch(layer, 'touchend', handles.e, 274, 400);
  assert.equal(committed.length, 3 * 4 * PER_HOUR);
  nativeTouch(layer, 'touchstart', handles.e, 274, 400);
  nativeTouch(layer, 'touchmove', handles.e, 369, 400);
  flush();
  assert.ok(viewport.scrollLeft > 148);
  assert.equal(window.scrollX, 100);
  assert.equal(window.scrollY, 0);
  nativeTouch(layer, 'touchend', handles.e, 369, 400);
  const finalX = viewport.scrollLeft;

  flush();
  assert.equal(viewport.scrollLeft, finalX);
});
