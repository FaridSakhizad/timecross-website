import assert from 'node:assert/strict';
import { beforeEach, afterEach, test } from 'node:test';
import {
  attachGridSelection, GRID_SELECTION_FRAME_HORIZONTAL_PADDING,
  GRID_SELECTION_FRAME_TOP_PADDING, GRID_SELECTION_FRAME_BOTTOM_PADDING,
} from '../src/components/TimelineGrid/desktop/gridSelectionController.ts';

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
  querySelectorAll() { return cells; }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); emit(this, 'lostpointercapture'); }
  scrollTo({ left, top }) { this.scrollLeft = left; this.scrollTop = top; }
}
function emit(target, type, values = {}) {
  const event = new Event(type, { cancelable: true });
  const pointerId = values.pointerId ?? 1;
  const releasePosition = type === 'pointerup' ? pointerPositions.get(pointerId) : undefined;
  Object.assign(event, { button: 0, buttons: type === 'pointerup' ? 0 : 1, pointerType: 'mouse', isPrimary: true,
    pointerId, clientX: 95, clientY: 65, detail: 1, ...releasePosition, ...values });
  if (type === 'pointerdown' || type === 'pointermove') {
    pointerPositions.set(pointerId, { clientX: event.clientX, clientY: event.clientY });
  }
  target.dispatchEvent(event);
  return event;
}
let viewport, cells, overlay, controller, committed, active, frames, original, nextFrame, pointerPositions;
function flushFrame() {
  const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback());
}
function selectSingleHour() {
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 100, clientY: 70 });
  emit(window, 'pointerup');
}
beforeEach(() => {
  original = ['window', 'document', 'Element', 'requestAnimationFrame', 'cancelAnimationFrame']
    .map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  globalThis.window = new EventTarget();
  globalThis.document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
  globalThis.Element = FakeElement;
  frames = new Map(); nextFrame = 0;
  pointerPositions = new Map();
  globalThis.requestAnimationFrame = (callback) => { const id = ++nextFrame; frames.set(id, callback); return id; };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  viewport = new Viewport();
  cells = ['ny', 'lon'].flatMap((rowId, row) => [0, 1, 2].map((index) => {
    const cell = new FakeElement();
    cell.dataset = { gridSelectionRow: rowId, gridHourStart: String(index * 3600000) };
    cell.getBoundingClientRect = () => ({ left: 190 + index * 74 - viewport.scrollLeft, right: 254 + index * 74 - viewport.scrollLeft,
      top: 60 + row * 100 - viewport.scrollTop, bottom: 124 + row * 100 - viewport.scrollTop });
    return cell;
  }));
  overlay = { hidden: true, style: {} }; committed = []; active = false;
  controller = attachGridSelection(viewport, overlay, [], (hours) => { committed = hours; }, (value) => { active = value; });
});
afterEach(() => {
  controller.destroy();
  for (const [key, descriptor] of original) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

test('marquee paints partial intersections and commits only on release', () => {
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 245, clientY: 220 });
  flushFrame();
  assert.equal(active, true);
  assert.equal(overlay.hidden, false);
  assert.equal(overlay.style.width, '150px');
  assert.equal(cells.filter((cell) => cell.selected).length, 6);
  assert.equal(committed.length, 0);
  emit(window, 'pointerup');
  assert.equal(committed.length, 6);
  assert.equal(active, false);
  assert.equal(overlay.hidden, true);
  assert.equal(viewport.captured.size, 0);
  assert.equal(emit(viewport, 'click').defaultPrevented, true);
});

test('clicks inside a range preserve it and clicks on blank space outside clear it', () => {
  emit(viewport, 'pointerdown', { clientX: 245, clientY: 220 });
  emit(window, 'pointermove', { clientX: 95, clientY: 65 });
  emit(window, 'pointerup');
  assert.equal(committed.length, 6);
  emit(viewport, 'pointerdown'); emit(window, 'pointerup');
  assert.equal(committed.length, 6);
  emit(viewport, 'pointerdown', { clientX: 50, clientY: 140 }); emit(window, 'pointerup');
  assert.equal(committed.length, 0);
});

test('modified clicks cannot create, add or remove isolated cells', () => {
  for (const modifier of [{}, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
    emit(viewport, 'pointerdown', modifier); emit(window, 'pointerup');
    assert.equal(committed.length, 0);
  }
  selectSingleHour();
  for (const modifier of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
    emit(viewport, 'pointerdown', { clientX: 100, clientY: 80, ...modifier }); emit(window, 'pointerup');
    assert.deepEqual(committed, [{ rowId: 'ny', start: 0 }]);
  }
});

test('Ctrl/Cmd/Shift-drag always replaces the previous range instead of adding gaps', () => {
  for (const modifier of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
    selectSingleHour();
    emit(viewport, 'pointerdown', { clientX: 245, clientY: 220, ...modifier });
    emit(window, 'pointermove', { clientX: 170, clientY: 165, ...modifier });
    emit(window, 'pointerup');
    assert.deepEqual(committed, [{ rowId: 'lon', start: 3600000 }, { rowId: 'lon', start: 7200000 }]);
  }
});

test('blur, cancel, lost capture, resize and hidden tab restore the committed selection', () => {
  selectSingleHour();
  for (const cancel of [
    () => emit(window, 'blur'), () => emit(window, 'pointercancel'), () => viewport.releasePointerCapture(1),
    () => emit(window, 'resize'), () => { document.visibilityState = 'hidden'; emit(document, 'visibilitychange'); },
  ]) {
    document.visibilityState = 'visible';
    emit(viewport, 'pointerdown'); emit(window, 'pointermove', { clientX: 245, clientY: 220 }); flushFrame();
    cancel();
    assert.equal(active, false);
    assert.equal(committed.length, 1);
    assert.equal(cells.filter((cell) => cell.selected).length, 1);
    assert.equal(overlay.hidden, true);
    assert.equal(frames.size, 0);
  }
});

test('Escape clears selection and destroy removes all input handlers', () => {
  selectSingleHour();
  assert.equal(emit(window, 'keydown', { key: 'Escape' }).defaultPrevented, true);
  assert.equal(committed.length, 0);
  emit(viewport, 'pointerdown'); emit(window, 'pointermove', { clientX: 245 });
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
  emit(viewport, 'pointerdown'); assert.equal(active, false);
  viewport.interactive = false;
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { pointerId: 2, clientX: 245 }); flushFrame();
  assert.equal(overlay.hidden, true);
});

test('edge autoscroll keeps marquee anchored to content and stops on release', () => {
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 399, clientY: 299 }); flushFrame();
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
  const box = { style: {} };
  layer.style = {};
  layer.hidden = true;
  layer.querySelector = () => box;
  layer.closest = () => ({ dataset: { gridResize: direction } });
  viewport.querySelector = () => null;
  committed = [{ rowId: 'ny', start: 0 }];
  controller = attachGridSelection(viewport, overlay, committed, (hours) => { committed = hours; }, (value) => { active = value; },
    { frameLayer: layer, marqueeEnabled });
  return { layer, box };
}
const frameWidth = (width) => `${width + GRID_SELECTION_FRAME_HORIZONTAL_PADDING * 2}px`;

test('persistent frame follows scrolling without changing its content bounds', () => {
  const { layer, box } = attachWithFrame();
  assert.equal(layer.hidden, false);
  assert.equal(box.style.left, `${90 - GRID_SELECTION_FRAME_HORIZONTAL_PADDING}px`);
  assert.equal(box.style.top, `${60 - GRID_SELECTION_FRAME_TOP_PADDING}px`);
  assert.equal(box.style.height, `${64 + GRID_SELECTION_FRAME_TOP_PADDING + GRID_SELECTION_FRAME_BOTTOM_PADDING}px`);
  assert.equal(Number.parseFloat(box.style.top) + Number.parseFloat(box.style.height), 124 + GRID_SELECTION_FRAME_BOTTOM_PADDING);
  assert.equal(Number.parseFloat(box.style.left) + Number.parseFloat(box.style.width), 154 + GRID_SELECTION_FRAME_HORIZONTAL_PADDING);
  viewport.scrollLeft += 40;
  emit(viewport, 'scroll'); flushFrame();
  assert.equal(box.style.left, `${50 - GRID_SELECTION_FRAME_HORIZONTAL_PADDING}px`);
  assert.equal(box.style.width, frameWidth(64));
  viewport.scrollTop += 20;
  emit(viewport, 'scroll'); flushFrame();
  assert.equal(box.style.top, `${40 - GRID_SELECTION_FRAME_TOP_PADDING}px`);
});

test('clicks and sub-threshold mouse jitter keep the existing frame visible and unchanged', () => {
  const { layer, box } = attachWithFrame();
  for (const modifier of [{}, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
    emit(viewport, 'pointerdown', { clientX: 100, clientY: 80, ...modifier });
    assert.equal(layer.hidden, false);
    emit(window, 'pointermove', { clientX: 102, clientY: 81, ...modifier }); flushFrame();
    emit(window, 'pointerup');
    assert.deepEqual(committed, [{ rowId: 'ny', start: 0 }]);
    assert.equal(layer.hidden, false);
    assert.equal(box.style.width, frameWidth(64));
  }
});

test('outside clicks clear the range and its frame without selecting the clicked cell', () => {
  for (const marqueeEnabled of [true, false]) {
    const { layer } = attachWithFrame(marqueeEnabled);
    emit(viewport, 'pointerdown', { clientX: 245, clientY: 165 });
    emit(window, 'pointerup');
    assert.equal(committed.length, 0);
    assert.equal(layer.hidden, true);
    assert.equal(cells.filter((cell) => cell.selected).length, 0);
  }
});

test('inside-frame clicks preserve the range in Pan mode, and panning outside does not dismiss it', () => {
  const { layer } = attachWithFrame(false);
  emit(viewport, 'pointerdown', { clientX: 100, clientY: 80 }); emit(window, 'pointerup');
  assert.equal(committed.length, 1);
  emit(viewport, 'pointerdown', { clientX: 245, clientY: 165 });
  emit(window, 'pointermove', { clientX: 300, clientY: 180 });
  emit(window, 'pointerup');
  assert.equal(committed.length, 1);
  assert.equal(layer.hidden, false);
});

test('inside/outside hit testing uses calibrated visual frame edges, not only selected cells', () => {
  const { layer } = attachWithFrame();
  const left = 90 - GRID_SELECTION_FRAME_HORIZONTAL_PADDING;
  emit(viewport, 'pointerdown', { clientX: left + 1, clientY: 80 }); emit(window, 'pointerup');
  assert.equal(committed.length, 1);
  emit(viewport, 'pointerdown', { clientX: left - 1, clientY: 80 }); emit(window, 'pointerup');
  assert.equal(committed.length, 0);
  assert.equal(layer.hidden, true);
});

test('a click on a resize handle never clears the range', () => {
  const { layer } = attachWithFrame();
  emit(layer, 'pointerdown', { clientX: 159, clientY: 90 }); emit(window, 'pointerup');
  assert.equal(committed.length, 1);
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
  emit(viewport, 'pointerdown'); assert.equal(active, false);
  emit(layer, 'pointerdown', { clientX: 154, clientY: 90 });
  emit(window, 'pointermove', { clientX: 300, clientY: 90 }); flushFrame();
  assert.equal(committed.length, 1);
  assert.equal(cells.filter((cell) => cell.selected).length, 3);
  assert.equal(overlay.hidden, true);
  assert.equal(box.style.width, frameWidth(212));
  emit(window, 'pointerup');
  assert.equal(committed.length, 3);
  assert.equal(active, false);
});

test('frame padding and the handle grab point do not change logical hour resizing', () => {
  for (const clientX of [148, 154, 159]) {
    const { layer } = attachWithFrame();
    emit(layer, 'pointerdown', { clientX, clientY: 90 });
    emit(window, 'pointerup', { clientX: clientX + 74, clientY: 90 });
    assert.deepEqual(committed, [{ rowId: 'ny', start: 0 }, { rowId: 'ny', start: 3600000 }]);
  }
});

test('vertical frame padding does not change whole-city resizing', () => {
  for (const clientY of [120, 124, 129]) {
    const { layer } = attachWithFrame(true, 's');
    emit(layer, 'pointerdown', { clientX: 120, clientY });
    emit(window, 'pointerup', { clientX: 120, clientY: clientY + 100 });
    assert.deepEqual(committed, [{ rowId: 'ny', start: 0 }, { rowId: 'lon', start: 0 }]);
  }
});

test('Escape and capture loss roll back resizing without clearing the prior selection', () => {
  const { layer, box } = attachWithFrame();
  for (const cancel of [() => emit(window, 'keydown', { key: 'Escape' }), () => viewport.releasePointerCapture(1)]) {
    emit(layer, 'pointerdown', { clientX: 154, clientY: 90 });
    emit(window, 'pointermove', { clientX: 300, clientY: 90 }); flushFrame();
    cancel();
    assert.equal(committed.length, 1);
    assert.equal(box.style.width, frameWidth(64));
    assert.equal(layer.hidden, false);
    assert.equal(active, false);
  }
});

test('focused handles can resize one block at a time using the keyboard', () => {
  const { layer, box } = attachWithFrame();
  assert.equal(emit(layer, 'keydown', { key: 'ArrowRight' }).defaultPrevented, true);
  assert.equal(committed.length, 2);
  assert.equal(box.style.width, frameWidth(138));
  emit(layer, 'keydown', { key: 'ArrowLeft' });
  assert.equal(committed.length, 1);
  controller.destroy();
  assert.equal(layer.hidden, true);
  emit(layer, 'keydown', { key: 'ArrowRight' });
  assert.equal(committed.length, 1);
});

test('fast release uses the release coordinates rather than the last rendered pointermove', () => {
  const { layer } = attachWithFrame();
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 170, clientY: 100 }); flushFrame();
  emit(window, 'pointerup', { clientX: 245, clientY: 220 });
  assert.equal(committed.length, 6);
  assert.equal(layer.hidden, false);
});

test('a drag with no intermediate move still selects the entire release rectangle', () => {
  const { layer } = attachWithFrame();
  emit(viewport, 'pointerdown');
  emit(window, 'pointerup', { clientX: 245, clientY: 220 });
  assert.equal(committed.length, 6);
  assert.equal(layer.hidden, false);
});

test('button-up movement before pointerup commits a fast drag even before its queued frame', () => {
  const { layer } = attachWithFrame();
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 245, clientY: 220 });
  emit(window, 'pointermove', { buttons: 0, clientX: 245, clientY: 220 });
  emit(window, 'pointerup');
  assert.equal(committed.length, 6);
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
  emit(window, 'pointermove', { clientX: 245, clientY: 220 }); flushFrame();
  assert.equal(cells.filter((cell) => cell.selected).length, 6);
  emit(window, 'pointermove', { buttons: 0, clientX: 245, clientY: 220 });
  emit(window, 'pointerup');
  assert.equal(committed.length, 6);
  assert.equal(cells.filter((cell) => cell.selected).length, 6);
  assert.equal(layer.hidden, false);
});

test('a fast handle resize also commits from the final release position', () => {
  const { layer, box } = attachWithFrame();
  emit(layer, 'pointerdown', { clientX: 154, clientY: 90 });
  emit(window, 'pointerup', { clientX: 300, clientY: 90 });
  assert.equal(committed.length, 3);
  assert.equal(box.style.width, frameWidth(212));
  assert.equal(layer.hidden, false);
});

test('Chrome capture loss with released buttons commits pending selection without pointerup', () => {
  const { layer } = attachWithFrame();
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 245, clientY: 220 });
  // Chrome can report zero/default coordinates on capture loss: retain the last actual position.
  emit(viewport, 'lostpointercapture', { buttons: 0, clientX: 0, clientY: 0 });
  assert.equal(committed.length, 6);
  assert.equal(cells.filter((cell) => cell.selected).length, 6);
  assert.equal(layer.hidden, false);
  assert.equal(active, false);
  assert.equal(frames.size, 0);
  emit(window, 'blur');
  assert.equal(committed.length, 6);
  assert.equal(layer.hidden, false);
});

test('Chrome capture loss after painting preserves the preview and resize frame', () => {
  const { layer, box } = attachWithFrame();
  emit(layer, 'pointerdown', { clientX: 154, clientY: 90 });
  emit(window, 'pointermove', { clientX: 300, clientY: 90 }); flushFrame();
  emit(viewport, 'lostpointercapture', { buttons: 0 });
  emit(window, 'blur');
  assert.equal(committed.length, 3);
  assert.equal(box.style.width, frameWidth(212));
  assert.equal(layer.hidden, false);
});

test('explicit pointercancel with released buttons still rolls back instead of committing', () => {
  const { layer } = attachWithFrame();
  emit(viewport, 'pointerdown');
  emit(window, 'pointermove', { clientX: 245, clientY: 220 }); flushFrame();
  emit(window, 'pointercancel', { buttons: 0 });
  assert.equal(committed.length, 1);
  assert.equal(layer.hidden, false);
  assert.equal(active, false);
});
