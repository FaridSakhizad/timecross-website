import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { getInitialMobileGridSelection, getVisibleMobileGridSelection } from '../src/components/TimelineGrid/mobile/mobileGridSelectionGeometry.ts';
import { attachMobileGridSelection } from '../src/components/TimelineGrid/mobile/mobileGridSelectionController.ts';

const hour = 3600000;
const geometry = Array.from({ length: 7 }, (_, row) => Array.from({ length: 8 }, (_, col) => ({
  hour: { rowId: `r${row}`, start: col * hour },
  rect: { left: 100 + col * 74, right: 164 + col * 74, top: 160 + row * 111, bottom: 224 + row * 111 },
  rowTop: 120 + row * 111, rowBottom: 231 + row * 111,
}))).flat();

test('button seed selects three centered hours and a three-city frame nearest the screen center', () => {
  const selected = getInitialMobileGridSelection(geometry, { left: 100, right: 490, top: 106, bottom: 844 }, 295, 422);
  assert.equal(selected.length, 9);
  assert.deepEqual([...new Set(selected.map((cell) => cell.rowId))], ['r1', 'r2', 'r3']);
  assert.deepEqual([...new Set(selected.map((cell) => cell.start))], [hour, 2 * hour, 3 * hour]);
});

test('initial selection uses the scrolled visible rows, never the first hidden cities', () => {
  const selected = getInitialMobileGridSelection(geometry, { left: 100, right: 490, top: 430, bottom: 900 }, 295, 665);
  assert.deepEqual([...new Set(selected.map((cell) => cell.rowId))], ['r3', 'r4', 'r5']);
});

test('equally centered three-city frames favor the lower group without changing the selected hours', () => {
  const selected = getInitialMobileGridSelection(geometry, { left: 100, right: 490, top: 106, bottom: 800 }, 295, 453);
  assert.deepEqual([...new Set(selected.map((cell) => cell.rowId))], ['r2', 'r3', 'r4']);
  assert.deepEqual([...new Set(selected.map((cell) => cell.start))], [hour, 2 * hour, 3 * hour]);
});

test('centering compares complete frame bounds when city rows have different heights', () => {
  const uneven = geometry.map((cell) => cell.hour.rowId === 'r1' ? { ...cell, rowTop: cell.rowTop - 20 } : cell);
  const selected = getInitialMobileGridSelection(uneven, { left: 100, right: 490, top: 106, bottom: 800 }, 295, 450);
  assert.deepEqual([...new Set(selected.map((cell) => cell.rowId))], ['r2', 'r3', 'r4']);
});

test('fewer visible cities and timeline edges produce a smaller valid rectangle', () => {
  const few = geometry.filter((cell) => cell.hour.rowId === 'r0' || cell.hour.rowId === 'r1');
  assert.equal(getInitialMobileGridSelection(few, { left: 0, right: 390, top: 106, bottom: 800 }, 0, 700).length, 6);
  const last = getInitialMobileGridSelection(few, { left: 500, right: 900, top: 106, bottom: 800 }, 850, 700);
  assert.deepEqual([...new Set(last.map((cell) => cell.start))], [5 * hour, 6 * hour, 7 * hour]);
  const one = geometry.slice(0, 1);
  assert.equal(getInitialMobileGridSelection(one, { left: 0, right: 390, top: 106, bottom: 800 }, 195, 700).length, 1);
  assert.deepEqual(getInitialMobileGridSelection(geometry, { left: 0, right: 390, top: 1000, bottom: 1100 }, 195, 1050), []);
});

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

let original, layer, frame, handles, elements, initial, committed, active, controller, frames, nextFrame;
function emit(target, type, values = {}) {
  const event = new Event(type, { cancelable: true });
  const { target: eventTarget, ...properties } = values;
  Object.assign(event, { pointerId: 1, pointerType: 'touch', isPrimary: true,
    button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: 200, clientY: 400, ...properties });
  if (eventTarget) Object.defineProperty(event, 'target', { value: eventTarget });
  target.dispatchEvent(event);
  return event;
}
function flush() {
  const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback());
}
beforeEach(() => {
  original = ['window', 'document', 'Element', 'requestAnimationFrame', 'cancelAnimationFrame']
    .map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  globalThis.Element = FakeElement;
  frames = new Map(); nextFrame = 0;
  globalThis.requestAnimationFrame = (callback) => { const id = ++nextFrame; frames.set(id, callback); return id; };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  globalThis.window = Object.assign(new EventTarget(), {
    scrollX: 100, scrollY: 0, innerHeight: 800,
    scrollTo({ left, top }) { this.scrollX = left; this.scrollY = top; },
    scrollBy({ left, top }) {
      this.scrollX = Math.max(0, Math.min(600, this.scrollX + left));
      this.scrollY = Math.max(0, Math.min(800, this.scrollY + top));
    },
  });
  elements = geometry.map((cell) => {
    const element = new FakeElement();
    element.dataset = { gridSelectionRow: cell.hour.rowId, gridHourStart: String(cell.hour.start) };
    element.getBoundingClientRect = () => ({ left: cell.rect.left - window.scrollX, right: cell.rect.right - window.scrollX,
      top: cell.rect.top - window.scrollY, bottom: cell.rect.bottom - window.scrollY });
    return element;
  });
  const rows = Array.from({ length: 7 }, (_, index) => ({
    getBoundingClientRect: () => ({ top: 120 + index * 111 - window.scrollY, bottom: 231 + index * 111 - window.scrollY }),
    querySelectorAll: () => elements.slice(index * 8, (index + 1) * 8),
  }));
  globalThis.document = Object.assign(new EventTarget(), { documentElement: { clientWidth: 390 }, visibilityState: 'visible',
    querySelector: () => ({ getBoundingClientRect: () => ({ bottom: 106 }) }),
    querySelectorAll: (selector) => selector === '.timelineGrid-row_mobile' ? rows : elements,
  });
  frame = new FakeElement(); layer = new FakeElement(); layer.querySelector = () => frame;
  handles = Object.fromEntries(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].map((direction) => {
    const handle = new FakeElement(); handle.dataset.gridResize = direction; return [direction, handle];
  }));
  initial = geometry.filter((cell) => ['r1', 'r2', 'r3'].includes(cell.hour.rowId)
    && cell.hour.start >= hour && cell.hour.start <= 3 * hour).map((cell) => cell.hour);
  committed = initial; active = false;
  controller = attachMobileGridSelection(layer, initial, (value) => { committed = value; }, (value) => { active = value; });
});
afterEach(() => {
  controller.destroy();
  for (const [key, descriptor] of original) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

test('frame initially includes city titles and full hour cells, not only the hour band', () => {
  assert.equal(layer.hidden, false);
  assert.equal(frame.style.left, '68px');
  assert.equal(frame.style.width, '224px');
  assert.equal(frame.style.height, '328px');
  assert.equal(elements.filter((element) => element.selected).length, 9);
});

test('zen seed stays over visible hours even when the add-city button is far outside the screen', () => {
  document.querySelector = (selector) => ({ getBoundingClientRect: () => selector === '.timelineGrid-userHours_mobile'
    ? { bottom: 106 } : { left: 3000, right: 3200 } });
  window.scrollX = 300;
  const selected = getVisibleMobileGridSelection();
  assert.deepEqual([...new Set(selected.map((cell) => cell.start))], [4 * hour, 5 * hour, 6 * hour]);
  assert.deepEqual([...new Set(selected.map((cell) => cell.rowId))], ['r1', 'r2', 'r3']);
  controller.destroy();
  controller = attachMobileGridSelection(layer, selected, () => {}, () => {});
  assert.equal(layer.style.left, '0px');
  assert.equal(frame.style.left, '90px');
  assert.equal(frame.style.width, '224px');
});

test('zen seed follows both axes of page scrolling when selection is enabled again', () => {
  window.scrollX = 300;
  window.scrollY = 200;
  const selected = getVisibleMobileGridSelection();
  assert.deepEqual([...new Set(selected.map((cell) => cell.start))], [4 * hour, 5 * hour, 6 * hour]);
  assert.deepEqual([...new Set(selected.map((cell) => cell.rowId))], ['r3', 'r4', 'r5']);
  window.scrollX = 100;
  window.scrollY = 0;
  const reset = getVisibleMobileGridSelection();
  assert.deepEqual([...new Set(reset.map((cell) => cell.start))], [hour, 2 * hour, 3 * hour]);
  assert.deepEqual([...new Set(reset.map((cell) => cell.rowId))], ['r1', 'r2', 'r3']);
});

test('all eight touch handles resize in complete hours/cities while fixing opposite edges', () => {
  for (const direction of Object.keys(handles)) {
    controller.destroy(); committed = initial;
    controller = attachMobileGridSelection(layer, initial, (value) => { committed = value; }, (value) => { active = value; });
    const x = direction.includes('w') ? 74 : 286;
    const y = direction.includes('n') ? 231 : 564;
    const dx = direction.includes('w') ? -74 : direction.includes('e') ? 74 : 0;
    const dy = direction.includes('n') ? -111 : direction.includes('s') ? 111 : 0;
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
    assert.equal(new Set(committed.map((cell) => cell.start)).size, dx ? 4 : 3, direction);
  }
});

test('fast touch release commits final coordinates even without intermediate moves', () => {
  emit(layer, 'pointerdown', { target: handles.e, clientX: 286, clientY: 400 });
  emit(window, 'pointerup', { clientX: 360, clientY: 400 });
  assert.equal(committed.length, 12);
});

test('native page swipes outside handles are neither prevented nor interpreted as selection', () => {
  assert.equal(emit(window, 'pointerdown').defaultPrevented, false);
  assert.equal(emit(window, 'pointermove', { clientX: 250 }).defaultPrevented, false);
  assert.equal(emit(window, 'pointerup').defaultPrevented, false);
  window.scrollX += 74;
  emit(window, 'scroll'); flush();
  assert.equal(frame.style.left, '-6px');
  assert.equal(committed, initial);
});

test('pointercancel, second finger, blur, resize and hidden tab roll back previews', () => {
  for (const stop of [
    () => emit(window, 'pointercancel'),
    () => emit(window, 'pointerdown', { pointerId: 2, isPrimary: false }),
    () => emit(window, 'blur'), () => emit(window, 'resize'),
    () => { document.visibilityState = 'hidden'; emit(document, 'visibilitychange'); },
  ]) {
    document.visibilityState = 'visible';
    emit(layer, 'pointerdown', { target: handles.e, clientX: 286, clientY: 400 });
    emit(window, 'pointermove', { clientX: 360, clientY: 400 }); flush();
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
  assert.equal(committed.length, 12);
  const previous = committed;
  emit(layer, 'pointerdown', { target: handles.e, clientX: 360, clientY: 400 });
  emit(window, 'pointermove', { clientX: 286, clientY: 400 });
  emit(layer, 'lostpointercapture', { buttons: 1 });
  assert.equal(committed, previous);
  assert.equal(active, false);
});

test('edge autoscroll runs only during handle resizing and stops on release', () => {
  emit(layer, 'pointerdown', { target: handles.e, clientX: 286, clientY: 400 });
  emit(window, 'pointermove', { clientX: 389, clientY: 400 }); flush();
  assert.ok(window.scrollX > 100);
  emit(window, 'pointerup', { clientX: 389, clientY: 400 });
  const finalX = window.scrollX; flush();
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
  assert.equal(committed.length, 1);
  assert.deepEqual(committed, [{ rowId: 'r3', start: 3 * hour }]);
});

test('keyboard users can adjust a handle by one whole block without scrolling the page', () => {
  const event = emit(window, 'keydown', { target: handles.e, key: 'ArrowRight' });
  assert.equal(event.defaultPrevented, true);
  assert.equal(committed.length, 12);
  assert.equal(window.scrollX, 100);
});

test('Escape during resizing restores the range instead of passing through to mode dismissal', () => {
  emit(layer, 'pointerdown', { target: handles.e, clientX: 286, clientY: 400 });
  emit(window, 'pointermove', { clientX: 360, clientY: 400 }); flush();
  const event = emit(window, 'keydown', { key: 'Escape' });
  assert.equal(event.defaultPrevented, true);
  assert.equal(active, false);
  assert.equal(committed, initial);
});

function embeddedViewport() {
  controller.destroy();
  const viewport = Object.assign(new FakeElement(), {
    scrollLeft: 148, scrollTop: 111,
    getBoundingClientRect: () => ({ left: 20, right: 370, top: 140, bottom: 720 }),
    querySelector: () => ({ getBoundingClientRect: () => ({ bottom: 186 }) }),
    scrollTo({ left, top }) { this.scrollLeft = left; this.scrollTop = top; },
    scrollBy({ left, top }) { this.scrollLeft = Math.max(0, this.scrollLeft + left); this.scrollTop = Math.max(0, this.scrollTop + top); },
  });
  for (const element of elements) {
    const originalRect = element.getBoundingClientRect;
    element.getBoundingClientRect = () => {
      const rect = originalRect();
      return { left: rect.left - viewport.scrollLeft, right: rect.right - viewport.scrollLeft,
        top: rect.top - viewport.scrollTop, bottom: rect.bottom - viewport.scrollTop };
    };
  }
  const rows = Array.from({ length: 7 }, (_, index) => ({
    getBoundingClientRect: () => ({ top: 120 + index * 111 - window.scrollY - viewport.scrollTop,
      bottom: 231 + index * 111 - window.scrollY - viewport.scrollTop }),
    querySelectorAll: () => elements.slice(index * 8, (index + 1) * 8),
  }));
  viewport.querySelectorAll = (selector) => selector === '.timelineGrid-row_mobile' ? rows : elements;
  controller = attachMobileGridSelection(layer, initial, (value) => { committed = value; },
    (value) => { active = value; }, viewport);
  return viewport;
}

test('embedded selection clips its layer to the widget and follows independent widget/page scrolling', () => {
  const viewport = embeddedViewport();
  assert.equal(layer.style.left, '20px');
  assert.equal(layer.style.top, '186px');
  assert.equal(layer.style.width, '350px');
  assert.equal(layer.style.height, '534px');
  const left = parseFloat(frame.style.left);
  viewport.scrollLeft += 74;
  emit(viewport, 'scroll'); flush();
  assert.equal(parseFloat(frame.style.left), left - 74);
  assert.equal(committed, initial);
  assert.equal(window.scrollX, 100);
  viewport.scrollTop += 111;
  const top = parseFloat(frame.style.top);
  emit(viewport, 'scroll'); flush();
  assert.equal(parseFloat(frame.style.top), top - 111);
  window.scrollY += 50;
  emit(window, 'scroll'); flush();
  assert.equal(committed, initial);
});

test('embedded touch resize uses widget scroll offsets and autoscroll never scrolls the page', () => {
  const viewport = embeddedViewport();
  emit(layer, 'pointerdown', { target: handles.e, clientX: 200, clientY: 400 });
  emit(window, 'pointerup', { clientX: 274, clientY: 400 });
  assert.equal(committed.length, 12);
  emit(layer, 'pointerdown', { target: handles.e, clientX: 274, clientY: 400 });
  emit(window, 'pointermove', { clientX: 369, clientY: 400 }); flush();
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
