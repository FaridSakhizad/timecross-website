import {
  getGridSelectionBounds, gridHourKey, intersectsSelection, resizeGridSelection,
  type GridResizeDirection, type GridSelectionCellGeometry, type SelectedGridHour, type SelectionRect,
} from '../shared/gridSelection.ts';
import { getInitialDesktopGridSelection } from './initialGridSelection.ts';

const INTERACTIVE_TARGET = 'a, button, input, select, textarea, [contenteditable], [role="button"], [role="slider"], .timelineGrid-userHours';
type Cell = GridSelectionCellGeometry & { element: HTMLElement };
export const GRID_SELECTION_FRAME_HORIZONTAL_PADDING = 6;
export const GRID_SELECTION_FRAME_TOP_PADDING = -5;
export const GRID_SELECTION_FRAME_BOTTOM_PADDING = 0;

export function attachGridSelection(
  viewport: HTMLDivElement,
  overlay: HTMLDivElement,
  initialSelection: SelectedGridHour[],
  onCommit: (hours: SelectedGridHour[]) => void,
  onInteractionChange: (active: boolean) => void,
  options: { frameLayer?: HTMLDivElement; marqueeEnabled?: boolean } = {},
) {
  const frameLayer = options.frameLayer;
  const selectionFrame = frameLayer?.querySelector<HTMLElement>('[data-grid-selection-frame]');
  let frameBounds: SelectionRect | null = null;
  let committed = initialSelection;
  let preview = committed;
  let session: {
    pointerId: number; x: number; y: number; clientX: number; clientY: number;
    moved: boolean; cells: Cell[];
    resizeDirection?: GridResizeDirection;
    resizeBounds?: SelectionRect;
  } | null = null;
  let frame = 0;
  let suppressClick = false;
  let panClick: { pointerId: number; x: number; y: number; moved: boolean } | null = null;

  const isOutsideFrame = (clientX: number, clientY: number) => {
    if (!frameBounds) return false;
    const origin = viewport.getBoundingClientRect();
    const x = clientX - origin.left - viewport.clientLeft + viewport.scrollLeft;
    const y = clientY - origin.top - viewport.clientTop + viewport.scrollTop;
    return x < frameBounds.left - GRID_SELECTION_FRAME_HORIZONTAL_PADDING
      || x > frameBounds.right + GRID_SELECTION_FRAME_HORIZONTAL_PADDING
      || y < frameBounds.top - GRID_SELECTION_FRAME_TOP_PADDING
      || y > frameBounds.bottom + GRID_SELECTION_FRAME_BOTTOM_PADDING;
  };

  const getCells = (): Cell[] => {
    const origin = viewport.getBoundingClientRect();
    return [...viewport.querySelectorAll<HTMLElement>('[data-grid-selection-row][data-grid-hour-start]')].map((element) => {
      const rect = element.getBoundingClientRect();
      const rowRect = element.closest('.timelineGrid-row')?.getBoundingClientRect() ?? rect;
      return {
        element,
        hour: { rowId: element.dataset.gridSelectionRow!, start: Number(element.dataset.gridHourStart) },
        rect: {
          left: rect.left - origin.left - viewport.clientLeft + viewport.scrollLeft,
          top: rect.top - origin.top - viewport.clientTop + viewport.scrollTop,
          right: rect.right - origin.left - viewport.clientLeft + viewport.scrollLeft,
          bottom: rect.bottom - origin.top - viewport.clientTop + viewport.scrollTop,
        },
        rowTop: rowRect.top - origin.top - viewport.clientTop + viewport.scrollTop,
        rowBottom: rowRect.bottom - origin.top - viewport.clientTop + viewport.scrollTop,
      };
    });
  };
  const positionFrame = () => {
    if (!frameLayer || !selectionFrame) return;
    if (!frameBounds) { frameLayer.hidden = true; return; }
    const origin = viewport.getBoundingClientRect();
    const headerBottom = viewport.querySelector('.timelineGrid-userHours')?.getBoundingClientRect().bottom ?? origin.top;
    const top = Math.max(origin.top + viewport.clientTop, headerBottom);
    frameLayer.hidden = false;
    frameLayer.style.left = `${origin.left + viewport.clientLeft}px`;
    frameLayer.style.top = `${top}px`;
    frameLayer.style.width = `${viewport.clientWidth}px`;
    frameLayer.style.height = `${Math.max(0, origin.top + viewport.clientTop + viewport.clientHeight - top)}px`;
    selectionFrame.style.left = `${frameBounds.left - viewport.scrollLeft - GRID_SELECTION_FRAME_HORIZONTAL_PADDING}px`;
    selectionFrame.style.top = `${frameBounds.top - viewport.scrollTop + origin.top + viewport.clientTop - top - GRID_SELECTION_FRAME_TOP_PADDING}px`;
    selectionFrame.style.width = `${frameBounds.right - frameBounds.left + GRID_SELECTION_FRAME_HORIZONTAL_PADDING * 2}px`;
    selectionFrame.style.height = `${frameBounds.bottom - frameBounds.top + GRID_SELECTION_FRAME_TOP_PADDING + GRID_SELECTION_FRAME_BOTTOM_PADDING}px`;
  };
  const paint = (cells: Cell[], hours: SelectedGridHour[]) => {
    const keys = new Set(hours.map(gridHourKey));
    for (const cell of cells) cell.element.classList.toggle('isSelected', keys.has(gridHourKey(cell.hour)));
    frameBounds = getGridSelectionBounds(cells, hours);
    if (frameLayer) frameLayer.hidden = Boolean(session && !session.resizeDirection);
    if (!session || session.resizeDirection) positionFrame();
  };
  const finish = (commit: boolean) => {
    const previous = session;
    if (!previous) return;
    session = null;
    cancelAnimationFrame(frame);
    frame = 0;
    overlay.hidden = true;
    if (commit) { committed = preview; onCommit(committed); }
    else paint(previous.cells, committed);
    frameBounds = getGridSelectionBounds(previous.cells, committed);
    positionFrame();
    onInteractionChange(false);
    if (viewport.hasPointerCapture(previous.pointerId)) viewport.releasePointerCapture(previous.pointerId);
  };
  const draw = (autoScroll = true) => {
    const current = session;
    if (!current?.moved) { positionFrame(); return; }
    const origin = viewport.getBoundingClientRect();
    const right = origin.left + viewport.clientLeft + viewport.clientWidth;
    const bottom = origin.top + viewport.clientTop + viewport.clientHeight;
    const edgeSpeed = (value: number, min: number, max: number) => value < min + 28
      ? -Math.min(16, (min + 28 - value) / 3)
      : value > max - 28 ? Math.min(16, (value - max + 28) / 3) : 0;
    const beforeLeft = viewport.scrollLeft;
    const beforeTop = viewport.scrollTop;
    if (autoScroll) {
      viewport.scrollLeft += edgeSpeed(current.clientX, origin.left, right);
      viewport.scrollTop += edgeSpeed(current.clientY, origin.top, bottom);
    }
    const x = Math.max(0, Math.min(viewport.clientWidth, current.clientX - origin.left - viewport.clientLeft)) + viewport.scrollLeft;
    const y = Math.max(0, Math.min(viewport.clientHeight, current.clientY - origin.top - viewport.clientTop)) + viewport.scrollTop;
    if (current.resizeDirection && current.resizeBounds) {
      const edgeX = current.resizeDirection.includes('w') ? current.resizeBounds.left : current.resizeBounds.right;
      const edgeY = current.resizeDirection.includes('n') ? current.resizeBounds.top : current.resizeBounds.bottom;
      // Resize logical cell edges by pointer displacement, independent of the frame's visual padding.
      preview = resizeGridSelection(current.cells, committed, current.resizeDirection,
        edgeX + x - current.x, edgeY + y - current.y);
      paint(current.cells, preview);
      if (viewport.scrollLeft !== beforeLeft || viewport.scrollTop !== beforeTop) scheduleDraw();
      return;
    }
    const rect = { left: Math.min(current.x, x), top: Math.min(current.y, y), right: Math.max(current.x, x), bottom: Math.max(current.y, y) };
    overlay.hidden = false;
    const visibleLeft = Math.max(origin.left + viewport.clientLeft, rect.left - viewport.scrollLeft + origin.left + viewport.clientLeft);
    const visibleTop = Math.max(origin.top + viewport.clientTop, rect.top - viewport.scrollTop + origin.top + viewport.clientTop);
    const visibleRight = Math.min(right, rect.right - viewport.scrollLeft + origin.left + viewport.clientLeft);
    const visibleBottom = Math.min(bottom, rect.bottom - viewport.scrollTop + origin.top + viewport.clientTop);
    overlay.style.left = `${visibleLeft}px`;
    overlay.style.top = `${visibleTop}px`;
    overlay.style.width = `${Math.max(0, visibleRight - visibleLeft)}px`;
    overlay.style.height = `${Math.max(0, visibleBottom - visibleTop)}px`;
    const hits = current.cells.filter((cell) => intersectsSelection(rect, cell.rect)).map((cell) => cell.hour);
    preview = hits;
    paint(current.cells, preview);
    if (viewport.scrollLeft !== beforeLeft || viewport.scrollTop !== beforeTop) scheduleDraw();
  };
  const scheduleDraw = () => {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; draw(); });
  };
  const start = (event: PointerEvent) => {
    if (event.button === 1 && session) { finish(false); return; }
    if (event.pointerType !== 'mouse' || !event.isPrimary || event.button !== 0 || session
      || event.altKey || !(event.target instanceof Element) || event.target.closest(INTERACTIVE_TARGET)) return;
    if (options.marqueeEnabled === false) {
      panClick = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
      return;
    }
    const origin = viewport.getBoundingClientRect();
    viewport.scrollTo({ left: viewport.scrollLeft, top: viewport.scrollTop, behavior: 'instant' });
    session = {
      pointerId: event.pointerId,
      x: event.clientX - origin.left - viewport.clientLeft + viewport.scrollLeft,
      y: event.clientY - origin.top - viewport.clientTop + viewport.scrollTop,
      clientX: event.clientX, clientY: event.clientY, moved: false,
      cells: getCells(),
    };
    suppressClick = false;
    preview = committed;
    viewport.setPointerCapture(event.pointerId);
    onInteractionChange(true);
    event.preventDefault();
  };
  const startResize = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !event.isPrimary || event.button !== 0 || session
      || !(event.target instanceof Element)) return;
    const direction = event.target.closest<HTMLElement>('[data-grid-resize]')?.dataset.gridResize as GridResizeDirection | undefined;
    if (!direction || !committed.length) return;
    const origin = viewport.getBoundingClientRect();
    viewport.scrollTo({ left: viewport.scrollLeft, top: viewport.scrollTop, behavior: 'instant' });
    const cells = getCells();
    const resizeBounds = getGridSelectionBounds(cells, committed);
    if (!resizeBounds) return;
    session = {
      pointerId: event.pointerId,
      x: event.clientX - origin.left - viewport.clientLeft + viewport.scrollLeft,
      y: event.clientY - origin.top - viewport.clientTop + viewport.scrollTop,
      clientX: event.clientX, clientY: event.clientY, moved: false, cells,
      resizeDirection: direction,
      resizeBounds,
    };
    preview = committed;
    viewport.setPointerCapture(event.pointerId);
    onInteractionChange(true);
    event.preventDefault();
    event.stopPropagation();
  };
  const updatePointer = (event: PointerEvent) => {
    if (!session) return;
    session.clientX = event.clientX;
    session.clientY = event.clientY;
    const origin = viewport.getBoundingClientRect();
    const x = event.clientX - origin.left - viewport.clientLeft + viewport.scrollLeft;
    const y = event.clientY - origin.top - viewport.clientTop + viewport.scrollTop;
    if (Math.hypot(x - session.x, y - session.y) >= 4) session.moved = true;
  };
  const complete = (event?: PointerEvent) => {
    if (!session) return;
    if (event) updatePointer(event);
    if (session.moved) {
      suppressClick = true;
      cancelAnimationFrame(frame); frame = 0;
      // Commit the release position synchronously; do not wait for a frame or scroll further.
      draw(false);
    } else {
      const outside = !session.resizeDirection && isOutsideFrame(session.clientX, session.clientY);
      finish(false);
      if (outside) clear();
      return;
    }
    finish(true);
  };
  const move = (event: PointerEvent) => {
    if (panClick?.pointerId === event.pointerId && Math.hypot(event.clientX - panClick.x, event.clientY - panClick.y) >= 4) {
      panClick.moved = true;
    }
    if (!session || session.pointerId !== event.pointerId) return;
    if (!(event.buttons & 1)) {
      if (event.buttons === 0) complete(event);
      else finish(false);
      return;
    }
    updatePointer(event);
    if (session?.moved) { suppressClick = true; scheduleDraw(); }
    event.preventDefault();
  };
  const up = (event: PointerEvent) => {
    if (panClick?.pointerId === event.pointerId && event.button === 0 && !(event.buttons & 1)) {
      const isClick = !panClick.moved && Math.hypot(event.clientX - panClick.x, event.clientY - panClick.y) < 4;
      panClick = null;
      if (isClick && isOutsideFrame(event.clientX, event.clientY)) clear();
    }
    if (!session || session.pointerId !== event.pointerId || event.button !== 0 || (event.buttons & 1)) return;
    complete(event);
  };
  const preventNativeDrag = (event: DragEvent) => {
    if (session) event.preventDefault();
  };
  const cancel = () => { panClick = null; finish(false); };
  const cancelPointer = (event: PointerEvent) => {
    if (panClick?.pointerId === event.pointerId) panClick = null;
    if (session?.pointerId !== event.pointerId) return;
    if (event.type === 'lostpointercapture' && event.target === viewport
      && event.buttons === 0 && viewport.isConnected !== false) {
      // Chrome can release capture before delivering pointerup. Capture-loss coordinates
      // are not reliable, so finalize at the last real pointer position instead of rolling back.
      complete();
    } else {
      cancel();
    }
  };
  const clear = () => {
    cancel(); committed = []; preview = []; paint(getCells(), []); onCommit([]);
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && (session || committed.length)) {
      if (session?.resizeDirection) cancel();
      else clear();
      event.preventDefault();
    }
  };
  const resizeKeydown = (event: KeyboardEvent) => {
    if (session || !(event.target instanceof Element)) return;
    const direction = event.target.closest<HTMLElement>('[data-grid-resize]')?.dataset.gridResize as GridResizeDirection | undefined;
    if (!direction || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const cells = getCells();
    const bounds = getGridSelectionBounds(cells, committed);
    if (!bounds) return;
    const horizontal = direction.includes('w') || direction.includes('e');
    const vertical = direction.includes('n') || direction.includes('s');
    const dx = horizontal ? event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0 : 0;
    const dy = vertical ? event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0 : 0;
    if (!dx && !dy) return;
    const columns = [...new Set(cells.map((cell) => cell.rect.left))].sort((a, b) => a - b);
    const rows = [...new Set(cells.map((cell) => cell.rowTop))].sort((a, b) => a - b);
    const x = (direction.includes('w') ? bounds.left : bounds.right) + dx * (columns.length > 1 ? columns[1] - columns[0] : 1);
    const y = (direction.includes('n') ? bounds.top : bounds.bottom) + dy * (rows.length > 1 ? rows[1] - rows[0] : 1);
    // A corner handle changes only the axis of the arrow key that was pressed.
    const axisDirection = (dx ? direction.includes('w') ? 'w' : 'e' : direction.includes('n') ? 'n' : 's') as GridResizeDirection;
    committed = resizeGridSelection(cells, committed, axisDirection, x, y);
    preview = committed;
    paint(cells, committed);
    onCommit(committed);
    event.preventDefault();
    event.stopPropagation();
  };
  const click = (event: MouseEvent) => {
    if (suppressClick && event.detail !== 0) {
      suppressClick = false;
      if (event.target instanceof Element && event.target.closest(INTERACTIVE_TARGET)) return;
      event.preventDefault(); event.stopImmediatePropagation();
    }
  };
  const visibility = () => { if (document.visibilityState === 'hidden') cancel(); };
  const resize = () => { cancel(); frameBounds = getGridSelectionBounds(getCells(), committed); positionFrame(); };
  frameLayer?.addEventListener('pointerdown', startResize);
  frameLayer?.addEventListener('keydown', resizeKeydown);
  frameBounds = getGridSelectionBounds(getCells(), committed);
  positionFrame();
  viewport.addEventListener('pointerdown', start);
  viewport.addEventListener('lostpointercapture', cancelPointer);
  viewport.addEventListener('click', click, true);
  viewport.addEventListener('dragstart', preventNativeDrag);
  viewport.addEventListener('scroll', scheduleDraw, { passive: true });
  window.addEventListener('scroll', scheduleDraw, { passive: true });
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', cancelPointer);
  window.addEventListener('blur', cancel);
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', keydown);
  document.addEventListener('visibilitychange', visibility);
  const create = () => {
    cancel();
    const origin = viewport.getBoundingClientRect();
    const left = origin.left + viewport.clientLeft;
    const top = origin.top + viewport.clientTop;
    const headerBottom = viewport.querySelector('.timelineGrid-userHours')?.getBoundingClientRect().bottom ?? top;
    const visible = {
      left: Math.max(0, left) - left + viewport.scrollLeft,
      right: Math.min(window.innerWidth, left + viewport.clientWidth) - left + viewport.scrollLeft,
      top: Math.max(0, top, headerBottom) - top + viewport.scrollTop,
      bottom: Math.min(window.innerHeight, top + viewport.clientHeight) - top + viewport.scrollTop,
    };
    const cells = getCells();
    const next = getInitialDesktopGridSelection(cells, visible);
    if (!next.length) return false;
    committed = preview = next;
    paint(cells, committed);
    onCommit(committed);
    return true;
  };
  return { clear, create, cancel, destroy: () => {
    cancel(); cancelAnimationFrame(frame);
    if (frameLayer) frameLayer.hidden = true;
    frameLayer?.removeEventListener('pointerdown', startResize);
    frameLayer?.removeEventListener('keydown', resizeKeydown);
    viewport.removeEventListener('pointerdown', start);
    viewport.removeEventListener('lostpointercapture', cancelPointer);
    viewport.removeEventListener('click', click, true);
    viewport.removeEventListener('dragstart', preventNativeDrag);
    viewport.removeEventListener('scroll', scheduleDraw);
    window.removeEventListener('scroll', scheduleDraw);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up, true);
    window.removeEventListener('pointercancel', cancelPointer);
    window.removeEventListener('blur', cancel);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', keydown);
    document.removeEventListener('visibilitychange', visibility);
  } };
}
