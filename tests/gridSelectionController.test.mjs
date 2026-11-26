import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';

import {
  attachGridSelection,
  GRID_SELECTION_FRAME_HORIZONTAL_PADDING,
  GRID_SELECTION_FRAME_TOP_PADDING,
  GRID_SELECTION_FRAME_BOTTOM_PADDING,
} from '../src/components/TimelineGrid/desktop/gridSelectionController.ts';

import { PER_HOUR, slotsOf } from './support/gridSlots.mjs';

const { GRID_FRAME_COVERS_USER_HOURS } = await import('../src/components/TimelineGrid/shared/gridSelection.ts');
/** The frame's top in content coordinates: the user's hours at the top, or the first selected city. */
const FRAME_TOP = GRID_FRAME_COVERS_USER_HOURS ? 0 : 60;

const { FEATURES } = await import('../src/config.ts');
/** A frame for the time only is drawn across every city, whichever rows the pointer crosses. */
const everyCity = FEATURES.timeOnlyFrame;
const drawnRows = (rowIds) => (everyCity ? ['ny', 'lon'] : rowIds);

class FakeElement extends EventTarget {
  interactive = false;
  selected = false;
  closest() { return this.interactive ? this : null; }
  classList = { toggle: (_name, value) => { this.selected = value; } };
}
class Viewport extends FakeElement {
  captured = new Set();
  left = 100; top = 0;
  clientWidth = 400; clientHeight = 300; clientLeft = 0; clientTop = 0;
  get scrollLeft() { return this.left; }
  set scrollLeft(value) { this.left = Math.max(0, Math.min(1000, value)); }
  get scrollTop() { return this.top; }
  set scrollTop(value) { this.top = Math.max(0, Math.min(600, value)); }
  getBoundingClientRect() { return { left: 0, top: 0, right: 400, bottom: 300 }; }
  querySelectorAll(selector) { return selector.includes('timelineGrid-userHours') ? userHours : cells; }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) {
    this.captured.delete(id);
    emit(this, 'lostpointercapture');
  }

  scrollTo({ left, top }) {
    this.scrollLeft = left;
    this.scrollTop = top;
  }
}

function emit(target, type, values = {}) {
  const event = new Event(type, { cancelable: true });
  const pointerId = values.pointerId ?? 1;
  const releasePosition = type === 'pointerup' ? pointerPositions.get(pointerId) : undefined;

  Object.assign(event, {
    button: 0,
    buttons: type === 'pointerup' ? 0 : 1,
    pointerType: 'mouse',
    isPrimary: true,
    pointerId,
    clientX: 95,
    clientY: 65,
    detail: 1,
    ...releasePosition,
    ...values,
  });

  if (type === 'pointerdown' || type === 'pointermove') {
    pointerPositions.set(pointerId, { clientX: event.clientX, clientY: event.clientY });
  }

  target.dispatchEvent(event);
  return event;
}

let viewport, cells, userHours, overlay, controller, committed, active, interaction, frames, original, nextFrame, pointerPositions;

function flushFrame() {
  const pending = [...frames.values()];

  frames.clear();
  pending.forEach((callback) => callback());
}

/** The first hour of New York (of every city, with a frame for the time only). */
function selectSingleHour() {
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 100, clientY: 70 });
  emit(window, 'pointerup');
}

beforeEach(() => {
  original = ['window', 'document', 'Element', 'requestAnimationFrame', 'cancelAnimationFrame']
    .map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  globalThis.window = Object.assign(new EventTarget(), {
    matchMedia: () => ({ matches: false }),
  });
  globalThis.document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  globalThis.Element = FakeElement;
  frames = new Map();
  nextFrame = 0;
  pointerPositions = new Map();

  globalThis.requestAnimationFrame = (callback) => {
    nextFrame += 1;
    const id = nextFrame;

    frames.set(id, callback);
    return id;
  };

  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  viewport = new Viewport();
  // The user's own hours above the cities.
  userHours = [0, 1, 2].map((index) => {
    const hour = new FakeElement();

    hour.dataset = { gridHourStart: String(index * 3600000) };
    return hour;
  });
  cells = ['ny', 'lon'].flatMap((rowId, row) => [0, 1, 2].map((index) => {
    const cell = new FakeElement();

    cell.dataset = { gridSelectionRow: rowId, gridHourStart: String(index * 3600000) };
    cell.getBoundingClientRect = () => ({
      left: 190 + index * 74 - viewport.scrollLeft,
      right: 254 + index * 74 - viewport.scrollLeft,
      top: 60 + row * 100 - viewport.scrollTop,
      bottom: 124 + row * 100 - viewport.scrollTop,
    });
    return cell;
  }));
  overlay = { hidden: true, style: {} };
  committed = [];
  active = false;
  interaction = null;
  controller = attachGridSelection(viewport, overlay, [], (hours) => {
    committed = hours;
  }, (value) => {
    interaction = value;
    active = value !== null;
  });
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

test('marquee paints partial intersections and commits only on release', () => {
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 245, clientY: 220 });
  flushFrame();
  assert.equal(active, true);
  assert.equal(interaction, 'marquee');
  assert.equal(overlay.hidden, false);
  assert.equal(overlay.style.width, '150px');
  assert.equal(cells.filter((cell) => cell.selected).length, 6);
  assert.equal(committed.length, 0);
  emit(window, 'pointerup');
  // A drawn frame takes whole hours: all three it touches, in both cities.
  assert.equal(committed.length, 2 * 3 * PER_HOUR);
  assert.equal(active, false);
  assert.equal(overlay.hidden, true);
  assert.equal(viewport.captured.size, 0);
  assert.equal(emit(viewport, 'click').defaultPrevented, true);
});

test('the button creates a one-hour meeting for every city while marquee is disabled, and clear removes it', () => {
  controller.destroy();
  window.innerWidth = 400;
  window.innerHeight = 300;
  viewport.querySelector = () => ({ getBoundingClientRect: () => ({ bottom: 46 }) });
  controller = attachGridSelection(viewport, overlay, [], (hours) => {
    committed = hours;
  }, (value) => {
    interaction = value;
    active = value !== null;
  }, { marqueeEnabled: false });
  assert.equal(controller.create(), true);
  assert.equal(committed.length, 2 * PER_HOUR);
  assert.equal(cells.filter((cell) => cell.selected).length, 2);
  controller.clear();
  assert.equal(committed.length, 0);
  assert.equal(cells.filter((cell) => cell.selected).length, 0);
  assert.equal(controller.create(), true);
  assert.equal(committed.length, 2 * PER_HOUR);
});

test('clicks inside and outside a range keep it: only clear() removes it', () => {
  emit(viewport, 'pointerdown', { clientX: 245, clientY: 220 });
  emit(window, 'pointermove', { clientX: 95, clientY: 65 });
  emit(window, 'pointerup');
  assert.equal(committed.length, 2 * 3 * PER_HOUR);
  emit(viewport, 'pointerdown');
  emit(window, 'pointerup');
  assert.equal(committed.length, 2 * 3 * PER_HOUR);
  emit(viewport, 'pointerdown', { clientX: 50, clientY: 140 });
  emit(window, 'pointerup');
  assert.equal(committed.length, 2 * 3 * PER_HOUR);
  controller.clear();
  assert.equal(committed.length, 0);
});

test('modified clicks cannot create, add or remove isolated cells', () => {
  for (const modifier of [{}, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
    emit(viewport, 'pointerdown', modifier);
    emit(window, 'pointerup');
    assert.equal(committed.length, 0);
  }

  selectSingleHour();

  for (const modifier of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
    emit(viewport, 'pointerdown', { clientX: 100, clientY: 80, ...modifier });
    emit(window, 'pointerup');
    assert.deepEqual(committed, slotsOf(drawnRows(['ny']).map((rowId) => ({ rowId, start: 0 }))));
  }
});

test('Ctrl/Cmd/Shift-drag always replaces the previous range instead of adding gaps', () => {
  for (const modifier of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
    selectSingleHour();
    emit(viewport, 'pointerdown', { clientX: 245, clientY: 220, ...modifier });
    emit(window, 'pointermove', { clientX: 170, clientY: 165, ...modifier });
    emit(window, 'pointerup');
    // The whole hours it touches.
    assert.deepEqual(committed, slotsOf(drawnRows(['lon']).flatMap((rowId) => [
      { rowId, start: 3600000 },
      { rowId, start: 7200000 },
    ])));
  }
});

test('blur, cancel, lost capture, resize and hidden tab restore the committed selection', () => {
  selectSingleHour();

  for (const cancel of [
    () => emit(window, 'blur'),
    () => emit(window, 'pointercancel'),
    () => viewport.releasePointerCapture(1),
    () => emit(window, 'resize'),
    () => {
      document.visibilityState = 'hidden';
      emit(document, 'visibilitychange');
    },
  ]) {
    document.visibilityState = 'visible';
    emit(viewport, 'pointerdown');
    emit(window, 'pointermove', { clientX: 245, clientY: 220 });
    flushFrame();
    cancel();
    assert.equal(active, false);
    assert.equal(committed.length, drawnRows(['ny']).length * PER_HOUR);
    assert.equal(cells.filter((cell) => cell.selected).length, drawnRows(['ny']).length);
    assert.equal(overlay.hidden, true);
    assert.equal(frames.size, 0);
  }
});

test('Escape drops only the frame being drawn, never the selection; destroy removes all input handlers', () => {
  selectSingleHour();
  const selected = committed;

  assert.equal(emit(window, 'keydown', { key: 'Escape' }).defaultPrevented, false);
  assert.equal(committed, selected);
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 245, clientY: 220 });
  flushFrame();
  assert.equal(emit(window, 'keydown', { key: 'Escape' }).defaultPrevented, true);
  assert.equal(active, false);
  assert.equal(committed, selected);
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 245 });
  controller.destroy();
  assert.equal(active, false);
  assert.equal(frames.size, 0);
  emit(viewport, 'pointerdown');
  assert.equal(active, false);
});

test('middle/right buttons, touch, interactive controls and unrelated pointers are ignored', () => {
  for (const values of [{ button: 1, buttons: 4 }, { button: 2 }, { pointerType: 'touch' }, { isPrimary: false }, { altKey: true }]) {
    assert.equal(emit(viewport, 'pointerdown', values).defaultPrevented, false);
    assert.equal(active, false);
  }

  viewport.interactive = true;
  emit(viewport, 'pointerdown');
  assert.equal(active, false);
  viewport.interactive = false;
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { pointerId: 2, clientX: 245 });
  flushFrame();
  assert.equal(overlay.hidden, true);
});

test('edge autoscroll keeps marquee anchored to content and stops on release', () => {
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 399, clientY: 299 });
  flushFrame();
  assert.ok(viewport.scrollLeft > 100);
  assert.ok(viewport.scrollTop > 0);
  assert.ok(frames.size > 0);
  flushFrame();
  emit(window, 'pointerup');
  assert.equal(frames.size, 0);
});

function attachWithFrame(marqueeEnabled = true, direction = 'e') {
  controller.destroy();
  const layer = new FakeElement();
  const box = layer;

  layer.style = {};
  layer.hidden = true;
  layer.closest = () => ({ dataset: { gridResize: direction } });
  viewport.querySelector = () => null;
  // One whole hour: the first cell of New York.
  committed = slotsOf([{ rowId: 'ny', start: 0 }]);
  controller = attachGridSelection(viewport, overlay, committed, (hours) => {
    committed = hours;
  }, (value) => {
    interaction = value;
    active = value !== null;
  }, { selectionFrame: layer, marqueeEnabled });
  return { layer, box };
}

/** A frame for the time only reaches the bottom of the grid (300px high) under few cities. */
const frameBottom = (rowsBottom) => (everyCity
  ? Math.max(rowsBottom + GRID_SELECTION_FRAME_BOTTOM_PADDING, 300)
  : rowsBottom + GRID_SELECTION_FRAME_BOTTOM_PADDING);

const frameWidth = (width) => `${width + GRID_SELECTION_FRAME_HORIZONTAL_PADDING * 2}px`;
/** While a side is dragged it follows the pointer without padding; the other side keeps its own. */
const liveFrameWidth = (width) => `${width + GRID_SELECTION_FRAME_HORIZONTAL_PADDING}px`;

test('persistent frame has content coordinates and scroll never schedules frame updates', () => {
  const { layer, box } = attachWithFrame();

  assert.equal(layer.hidden, false);
  assert.equal(box.style.left, `${190 - GRID_SELECTION_FRAME_HORIZONTAL_PADDING}px`);
  assert.equal(box.style.top, `${FRAME_TOP - GRID_SELECTION_FRAME_TOP_PADDING}px`);
  assert.equal(box.style.height, `${frameBottom(124) - FRAME_TOP + GRID_SELECTION_FRAME_TOP_PADDING}px`);
  assert.equal(Number.parseFloat(box.style.top) + Number.parseFloat(box.style.height), frameBottom(124));
  assert.equal(Number.parseFloat(box.style.left) + Number.parseFloat(box.style.width), 254 + GRID_SELECTION_FRAME_HORIZONTAL_PADDING);
  viewport.scrollLeft += 40;
  emit(viewport, 'scroll');
  assert.equal(frames.size, 0);
  assert.equal(box.style.left, `${190 - GRID_SELECTION_FRAME_HORIZONTAL_PADDING}px`);
  assert.equal(box.style.width, frameWidth(64));
  viewport.scrollTop += 20;
  emit(viewport, 'scroll');
  assert.equal(frames.size, 0);
  assert.equal(box.style.top, `${FRAME_TOP - GRID_SELECTION_FRAME_TOP_PADDING}px`);
});

test('embedded desktop frame follows page scrolling and removes its page listener on destroy', () => {
  const { layer, box } = attachWithFrame();

  viewport.getBoundingClientRect = () => ({ left: 0, top: 100, right: 400, bottom: 400 });
  emit(window, 'scroll');
  flushFrame();
  assert.equal(frames.size, 0);
  assert.equal(box.style.top, `${FRAME_TOP - GRID_SELECTION_FRAME_TOP_PADDING}px`);
  assert.equal(committed.length, PER_HOUR);
  controller.destroy();
  emit(window, 'scroll');
  assert.equal(frames.size, 0);
});

test('clicks and sub-threshold mouse jitter keep the existing frame visible and unchanged', () => {
  const { layer, box } = attachWithFrame();

  for (const modifier of [{}, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
    emit(viewport, 'pointerdown', { clientX: 100, clientY: 80, ...modifier });
    assert.equal(layer.hidden, false);
    emit(window, 'pointermove', { clientX: 102, clientY: 81, ...modifier });
    flushFrame();
    emit(window, 'pointerup');
    assert.deepEqual(committed, slotsOf([{ rowId: 'ny', start: 0 }]));
    assert.equal(layer.hidden, false);
    assert.equal(box.style.width, frameWidth(64));
  }
});

test('outside clicks keep the range and its frame, without selecting the clicked cell', () => {
  for (const marqueeEnabled of [true, false]) {
    const { layer } = attachWithFrame(marqueeEnabled);
    const selected = committed;

    emit(viewport, 'pointerdown', { clientX: 245, clientY: 165 });
    emit(window, 'pointerup');
    assert.equal(committed, selected);
    assert.equal(layer.hidden, false);
  }
});

test('inside-frame clicks preserve the range in Pan mode, and panning outside does not dismiss it', () => {
  const { layer } = attachWithFrame(false);

  emit(viewport, 'pointerdown', { clientX: 100, clientY: 80 });
  emit(window, 'pointerup');
  assert.equal(committed.length, PER_HOUR);
  emit(viewport, 'pointerdown', { clientX: 245, clientY: 165 });
  emit(window, 'pointermove', { clientX: 300, clientY: 180 });
  emit(window, 'pointerup');
  assert.equal(committed.length, PER_HOUR);
  assert.equal(layer.hidden, false);
});

test('a click on a resize handle never clears the range', () => {
  const { layer } = attachWithFrame();

  emit(layer, 'pointerdown', { clientX: 159, clientY: 90 });
  emit(window, 'pointerup');
  assert.equal(committed.length, PER_HOUR);
  assert.equal(layer.hidden, false);
});

test('released capture without a drag does not turn a click into a single-cell selection', () => {
  emit(viewport, 'pointerdown');
  emit(viewport, 'lostpointercapture', { buttons: 0 });
  emit(window, 'blur');
  assert.equal(committed.length, 0);
  assert.equal(cells.filter((cell) => cell.selected).length, 0);
});

test('handle resize previews cells and commits on release even when marquee mode is disabled', () => {
  const { layer, box } = attachWithFrame(false);

  emit(viewport, 'pointerdown');
  assert.equal(active, false);
  emit(layer, 'pointerdown', { clientX: 154, clientY: 90 });
  assert.equal(interaction, 'resize');
  emit(window, 'pointermove', { clientX: 300, clientY: 90 });
  flushFrame();
  assert.equal(committed.length, PER_HOUR);
  assert.equal(cells.filter((cell) => cell.selected).length, 3);
  assert.equal(overlay.hidden, true);
  assert.equal(box.style.width, liveFrameWidth(210));
  emit(window, 'pointerup');
  assert.equal(box.style.width, frameWidth(212));
  assert.equal(committed.length, 3 * PER_HOUR);
  assert.equal(active, false);
});

test('frame padding and the handle grab point do not change logical hour resizing', () => {
  for (const clientX of [148, 154, 159]) {
    const { layer } = attachWithFrame();

    emit(layer, 'pointerdown', { clientX, clientY: 90 });
    emit(window, 'pointerup', { clientX: clientX + 74, clientY: 90 });
    assert.deepEqual(committed, slotsOf([{ rowId: 'ny', start: 0 }, { rowId: 'ny', start: 3600000 }]));
  }
});

test('desktop frame follows sub-hour movement freely and snaps only on release', () => {
  const { layer, box } = attachWithFrame(false);

  emit(layer, 'pointerdown', { clientX: 154, clientY: 90 });
  // 6px past the hour: nearer to it than to the end of the next half, so it snaps back.
  emit(window, 'pointermove', { clientX: 160, clientY: 90 });
  flushFrame();
  assert.equal(box.style.width, liveFrameWidth(70));
  assert.equal(committed.length, PER_HOUR);
  emit(window, 'pointerup');
  assert.equal(box.style.width, frameWidth(64));
  assert.equal(committed.length, PER_HOUR);
  emit(layer, 'pointerdown', { clientX: 154, clientY: 90 });
  // Nearer to the end of the next hour than to its first half.
  emit(window, 'pointermove', { clientX: 222, clientY: 90 });
  flushFrame();
  assert.equal(box.style.width, liveFrameWidth(132));
  emit(window, 'pointerup');
  assert.equal(box.style.width, frameWidth(138));
  assert.equal(committed.length, 2 * PER_HOUR);
});

test('desktop snap animation starts on release and stops immediately on the next resize', () => {
  const { layer, box } = attachWithFrame(false);
  const animations = [];

  box.animate = (keyframes) => {
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

  emit(layer, 'pointerdown', { clientX: 154, clientY: 90 });
  emit(window, 'pointermove', { clientX: 158, clientY: 90 });
  flushFrame();
  assert.equal(animations.length, 0);
  emit(window, 'pointerup');
  assert.equal(animations.length, 1);
  assert.equal(animations[0].keyframes[0].width, liveFrameWidth(68));
  assert.equal(animations[0].keyframes[1].width, frameWidth(64));
  emit(layer, 'pointerdown', { clientX: 154, clientY: 90 });
  assert.equal(animations[0].cancelled, true);
});

test('the user\'s hours above the cities show the hours the selection touches', () => {
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 175, clientY: 70 });
  flushFrame();
  // While it is drawn, then once it is committed.
  assert.deepEqual(userHours.map((hour) => hour.selected), [true, true, false]);
  emit(window, 'pointerup');
  assert.deepEqual(userHours.map((hour) => hour.selected), [true, true, false]);
  controller.clear();
  assert.deepEqual(userHours.map((hour) => hour.selected), [false, false, false]);
});

test('Escape already used above the grid, by a modal, is left alone', () => {
  selectSingleHour();
  const before = committed;
  const escape = Object.assign(new Event('keydown', { cancelable: true }), { key: 'Escape' });

  // A modal closes on it first and marks it used.
  escape.preventDefault();
  window.dispatchEvent(escape);
  assert.equal(committed, before);
  assert.equal(escape.defaultPrevented, true);
});

test('a drawn frame grows out of the drawn rectangle into whole hours on release', () => {
  const { box } = attachWithFrame();
  const animations = [];

  box.animate = (keyframes) => {
    animations.push({ keyframes });
    return { cancel() {} };
  };

  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 245, clientY: 220 });
  flushFrame();
  emit(window, 'pointerup');
  assert.equal(animations.length, 1);
  // From the rectangle under the pointer to the three whole hours it touched.
  assert.equal(animations[0].keyframes[0].left, '195px');
  assert.equal(animations[0].keyframes[0].width, '150px');
  assert.equal(animations[0].keyframes[1].left, `${190 - GRID_SELECTION_FRAME_HORIZONTAL_PADDING}px`);
  assert.equal(animations[0].keyframes[1].width, frameWidth(212));
});

test('vertical frame padding does not change whole-city resizing', () => {
  for (const clientY of [120, 124, 129]) {
    const { layer } = attachWithFrame(true, 's');

    emit(layer, 'pointerdown', { clientX: 120, clientY });
    emit(window, 'pointerup', { clientX: 120, clientY: clientY + 100 });
    assert.deepEqual(committed, slotsOf([{ rowId: 'ny', start: 0 }, { rowId: 'lon', start: 0 }]));
  }
});

test('Escape and capture loss roll back resizing without clearing the prior selection', () => {
  const { layer, box } = attachWithFrame();

  for (const cancel of [() => emit(window, 'keydown', { key: 'Escape' }), () => viewport.releasePointerCapture(1)]) {
    emit(layer, 'pointerdown', { clientX: 154, clientY: 90 });
    emit(window, 'pointermove', { clientX: 300, clientY: 90 });
    flushFrame();
    cancel();
    assert.equal(committed.length, PER_HOUR);
    assert.equal(box.style.width, frameWidth(64));
    assert.equal(layer.hidden, false);
    assert.equal(active, false);
  }
});

test('focused handles can resize one block at a time using the keyboard', () => {
  const { layer, box } = attachWithFrame();

  assert.equal(emit(layer, 'keydown', { key: 'ArrowRight' }).defaultPrevented, true);
  // Half an hour more: across the gap between the cells, the first half of the next hour.
  assert.equal(committed.length, PER_HOUR + 1);
  // The right side on the middle of a cell: no padding there.
  assert.equal(box.style.width, `${106 + GRID_SELECTION_FRAME_HORIZONTAL_PADDING}px`);
  emit(layer, 'keydown', { key: 'ArrowLeft' });
  assert.equal(committed.length, PER_HOUR);
  controller.destroy();
  assert.equal(layer.hidden, true);
  emit(layer, 'keydown', { key: 'ArrowRight' });
  assert.equal(committed.length, PER_HOUR);
});

test('fast release uses the release coordinates rather than the last rendered pointermove', () => {
  const { layer } = attachWithFrame();

  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 170, clientY: 100 });
  flushFrame();
  emit(window, 'pointerup', { clientX: 245, clientY: 220 });
  assert.equal(committed.length, 2 * 3 * PER_HOUR);
  assert.equal(layer.hidden, false);
});

test('a drag with no intermediate move still selects the entire release rectangle', () => {
  const { layer } = attachWithFrame();

  emit(viewport, 'pointerdown');
  emit(window, 'pointerup', { clientX: 245, clientY: 220 });
  assert.equal(committed.length, 2 * 3 * PER_HOUR);
  assert.equal(layer.hidden, false);
});

test('button-up movement before pointerup commits a fast drag even before its queued frame', () => {
  const { layer } = attachWithFrame();

  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 245, clientY: 220 });
  emit(window, 'pointermove', { buttons: 0, clientX: 245, clientY: 220 });
  emit(window, 'pointerup');
  assert.equal(committed.length, 2 * 3 * PER_HOUR);
  assert.equal(cells.filter((cell) => cell.selected).length, 6);
  assert.equal(layer.hidden, false);
  assert.equal(active, false);
  assert.equal(frames.size, 0);
});

test('native dragstart cannot cancel a selection gesture', () => {
  emit(viewport, 'pointerdown');
  assert.equal(emit(viewport, 'dragstart').defaultPrevented, true);
});

test('already visible selection is retained when a released-button move precedes pointerup', () => {
  const { layer } = attachWithFrame();

  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 245, clientY: 220 });
  flushFrame();
  assert.equal(cells.filter((cell) => cell.selected).length, 6);
  emit(window, 'pointermove', { buttons: 0, clientX: 245, clientY: 220 });
  emit(window, 'pointerup');
  assert.equal(committed.length, 2 * 3 * PER_HOUR);
  assert.equal(cells.filter((cell) => cell.selected).length, 6);
  assert.equal(layer.hidden, false);
});

test('a fast handle resize also commits from the final release position', () => {
  const { layer, box } = attachWithFrame();

  emit(layer, 'pointerdown', { clientX: 154, clientY: 90 });
  emit(window, 'pointerup', { clientX: 300, clientY: 90 });
  assert.equal(committed.length, 3 * PER_HOUR);
  assert.equal(box.style.width, frameWidth(212));
  assert.equal(layer.hidden, false);
});

test('Chrome capture loss with released buttons commits pending selection without pointerup', () => {
  const { layer } = attachWithFrame();

  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 245, clientY: 220 });
  // Chrome can report zero/default coordinates on capture loss: retain the last actual position.
  emit(viewport, 'lostpointercapture', { buttons: 0, clientX: 0, clientY: 0 });
  assert.equal(committed.length, 2 * 3 * PER_HOUR);
  assert.equal(cells.filter((cell) => cell.selected).length, 6);
  assert.equal(layer.hidden, false);
  assert.equal(active, false);
  assert.equal(frames.size, 0);
  emit(window, 'blur');
  assert.equal(committed.length, 2 * 3 * PER_HOUR);
  assert.equal(layer.hidden, false);
});

test('Chrome capture loss after painting preserves the preview and resize frame', () => {
  const { layer, box } = attachWithFrame();

  emit(layer, 'pointerdown', { clientX: 154, clientY: 90 });
  emit(window, 'pointermove', { clientX: 300, clientY: 90 });
  flushFrame();
  emit(viewport, 'lostpointercapture', { buttons: 0 });
  emit(window, 'blur');
  assert.equal(committed.length, 3 * PER_HOUR);
  assert.equal(box.style.width, frameWidth(212));
  assert.equal(layer.hidden, false);
});

test('explicit pointercancel with released buttons still rolls back instead of committing', () => {
  const { layer } = attachWithFrame();

  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 245, clientY: 220 });
  flushFrame();
  emit(window, 'pointercancel', { buttons: 0 });
  assert.equal(committed.length, PER_HOUR);
  assert.equal(layer.hidden, false);
  assert.equal(active, false);
});

test('under cities taller than the grid the frame ends under the last selected city', () => {
  viewport.clientHeight = 100;
  const { box } = attachWithFrame();

  assert.equal(Number.parseFloat(box.style.top) + Number.parseFloat(box.style.height), 124 + GRID_SELECTION_FRAME_BOTTOM_PADDING);
});
