import { FEATURES } from '../../../config.ts';
import {
  getArrowKeyStep,
  getEdgeScrollSpeed,
  getFrameSidePadding,
  getGridSelectionBounds,
  getGridStep,
  getHourCellSlots,
  getSelectedHourStarts,
  GRID_FRAME_COVERS_USER_HOURS,
  getKeyboardResizeAxis,
  getWholeHourSlots,
  gridSlotKey,
  intersectsSelection,
  resizeGridSelection,
  resizeGridSelectionRect,
  type GridResizeDirection,
  type GridSelectionCellGeometry,
  type SelectedGridSlot,
  type SelectionRect,
} from '../shared/gridSelection.ts';
import { createGridSelectionSnapAnimation } from '../shared/gridSelectionSnapAnimation.ts';

import { getInitialDesktopGridSelection } from './initialGridSelection.ts';

const INTERACTIVE_TARGET = 'a, button, input, select, textarea, [contenteditable], [role="button"], [role="slider"], .timelineGrid-userHours, [data-grid-selection-card]';

type Cell = GridSelectionCellGeometry & { element: HTMLElement };
const DESKTOP_EDGE_SCROLL = { edge: 28, maxSpeed: 16, slowdown: 3 };

export const GRID_SELECTION_FRAME_HORIZONTAL_PADDING = 6;
export const GRID_SELECTION_FRAME_TOP_PADDING = 1;
export const GRID_SELECTION_FRAME_BOTTOM_PADDING = 16;

export type GridSelectionInteraction = 'marquee' | 'resize';

export function attachGridSelection(
  viewport: HTMLDivElement,
  overlay: HTMLDivElement,
  initialSelection: SelectedGridSlot[],
  onCommit: (hours: SelectedGridSlot[]) => void,
  /** A drag starts or ends: drawing a new frame ("marquee") or moving an edge of the frame ("resize"). */
  onInteractionChange: (interaction: GridSelectionInteraction | null) => void,
  options: { selectionFrame?: HTMLDivElement; marqueeEnabled?: boolean } = {},
) {
  const selectionFrame = options.selectionFrame;
  const snapAnimation = createGridSelectionSnapAnimation(selectionFrame);
  let frameBounds: SelectionRect | null = null;
  let sidePadding = getFrameSidePadding(initialSelection, GRID_SELECTION_FRAME_HORIZONTAL_PADDING);
  let committed = initialSelection;
  let preview = committed;
  let session: {
    pointerId: number;
    x: number;
    y: number;
    clientX: number;
    clientY: number;
    moved: boolean;
    cells: Cell[];
    resizeDirection?: GridResizeDirection;
    resizeBounds?: SelectionRect;
    resizeLimits?: SelectionRect;
    /** The rectangle drawn so far, in content coordinates. */
    marquee?: SelectionRect;
  } | null = null;
  let frame = 0;
  let suppressClick = false;

  const getCells = (): Cell[] => {
    const origin = viewport.getBoundingClientRect();

    // An hour's cell in halves: the frame snaps to them.
    return [...viewport.querySelectorAll<HTMLElement>('[data-grid-selection-row][data-grid-hour-start]')].flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const rowRect = element.closest('.timelineGrid-row')?.getBoundingClientRect() ?? rect;

      return getHourCellSlots({
        element,
        slot: { rowId: element.dataset.gridSelectionRow!, start: Number(element.dataset.gridHourStart) },
        rect: {
          left: rect.left - origin.left - viewport.clientLeft + viewport.scrollLeft,
          top: rect.top - origin.top - viewport.clientTop + viewport.scrollTop,
          right: rect.right - origin.left - viewport.clientLeft + viewport.scrollLeft,
          bottom: rect.bottom - origin.top - viewport.clientTop + viewport.scrollTop,
        },
        rowTop: rowRect.top - origin.top - viewport.clientTop + viewport.scrollTop,
        rowBottom: rowRect.bottom - origin.top - viewport.clientTop + viewport.scrollTop,
      });
    });
  };

  /**
   * Where the frame ends: under the last selected city. A frame for the time only reaches the
   * bottom of the grid too, when the cities leave empty room below them.
   */
  const getFrameBottom = (rowsBottom: number) => {
    const bottom = rowsBottom + GRID_SELECTION_FRAME_BOTTOM_PADDING;

    return FEATURES.timeOnlyFrame ? Math.max(bottom, viewport.clientHeight) : bottom;
  };

  const positionFrame = () => {
    if (!selectionFrame) {
      return;
    }

    selectionFrame.hidden = !frameBounds || Boolean(session && !session.resizeDirection);

    if (!frameBounds || selectionFrame.hidden) {
      return;
    }

    // From the user's hours at the top, or from the first selected city.
    const top = GRID_FRAME_COVERS_USER_HOURS ? 0 : frameBounds.top;

    selectionFrame.style.left = `${frameBounds.left - sidePadding.left}px`;
    selectionFrame.style.top = `${top - GRID_SELECTION_FRAME_TOP_PADDING}px`;
    selectionFrame.style.width = `${frameBounds.right - frameBounds.left + sidePadding.left + sidePadding.right}px`;
    selectionFrame.style.height = `${getFrameBottom(frameBounds.bottom) - top + GRID_SELECTION_FRAME_TOP_PADDING}px`;
  };

  const paint = (cells: Cell[], hours: SelectedGridSlot[], visualBounds?: SelectionRect) => {
    const keys = new Set(hours.map(gridSlotKey));
    // An hour's cell is selected when either of its halves is.
    const selectedElements = new Set(cells.filter((cell) => keys.has(gridSlotKey(cell.slot))).map((cell) => cell.element));

    for (const { element } of cells) {
      element.classList.toggle('isSelected', selectedElements.has(element));
    }

    // The user's hours above the cities show the hours the selection touches.
    const hourStarts = getSelectedHourStarts(hours);

    for (const hour of viewport.querySelectorAll<HTMLElement>('.timelineGrid-userHours [data-grid-hour-start]')) {
      hour.classList.toggle('isSelected', hourStarts.has(Number(hour.dataset.gridHourStart)));
    }

    frameBounds = visualBounds ?? getGridSelectionBounds(cells, hours);
    sidePadding = getFrameSidePadding(hours, GRID_SELECTION_FRAME_HORIZONTAL_PADDING, visualBounds && session?.resizeDirection);
    positionFrame();
  };

  const finish = (commit: boolean) => {
    const previous = session;

    if (!previous) {
      return;
    }

    session = null;
    cancelAnimationFrame(frame);
    frame = 0;
    overlay.hidden = true;

    if (commit) {
      committed = preview;
    } else {
      paint(previous.cells, committed);
    }

    frameBounds = getGridSelectionBounds(previous.cells, committed);
    sidePadding = getFrameSidePadding(committed, GRID_SELECTION_FRAME_HORIZONTAL_PADDING);

    if (commit && previous.marquee && selectionFrame && frameBounds) {
      // The frame grows out of the drawn rectangle into whole hours, instead of replacing it.
      const { left, top, right, bottom } = previous.marquee;

      selectionFrame.hidden = false;
      selectionFrame.style.left = `${left}px`;
      selectionFrame.style.top = `${top}px`;
      selectionFrame.style.width = `${right - left}px`;
      selectionFrame.style.height = `${bottom - top}px`;
      snapAnimation.snap(positionFrame);
    } else if (commit && previous.resizeDirection) {
      snapAnimation.snap(positionFrame);
    } else {
      positionFrame();
    }

    if (commit) {
      onCommit(committed);
    }

    onInteractionChange(null);

    if (viewport.hasPointerCapture(previous.pointerId)) {
      viewport.releasePointerCapture(previous.pointerId);
    }
  };

  const draw = (autoScroll = true) => {
    const current = session;

    if (!current?.moved) {
      return;
    }

    const origin = viewport.getBoundingClientRect();
    const right = origin.left + viewport.clientLeft + viewport.clientWidth;
    const bottom = origin.top + viewport.clientTop + viewport.clientHeight;
    const edgeSpeed = (value: number, min: number, max: number) => getEdgeScrollSpeed(value, min, max, DESKTOP_EDGE_SCROLL);
    const beforeLeft = viewport.scrollLeft;
    const beforeTop = viewport.scrollTop;

    if (autoScroll) {
      viewport.scrollLeft += edgeSpeed(current.clientX, origin.left, right);
      viewport.scrollTop += edgeSpeed(current.clientY, origin.top, bottom);
    }

    const x = Math.max(0, Math.min(viewport.clientWidth, current.clientX - origin.left - viewport.clientLeft)) + viewport.scrollLeft;
    const y = Math.max(0, Math.min(viewport.clientHeight, current.clientY - origin.top - viewport.clientTop)) + viewport.scrollTop;

    if (current.resizeDirection && current.resizeBounds && current.resizeLimits) {
      const edgeX = current.resizeDirection.includes('w') ? current.resizeBounds.left : current.resizeBounds.right;
      const edgeY = current.resizeDirection.includes('n') ? current.resizeBounds.top : current.resizeBounds.bottom;
      // Resize logical cell edges by pointer displacement, independent of the frame's visual padding.
      const targetX = edgeX + x - current.x;
      const targetY = edgeY + y - current.y;

      preview = resizeGridSelection(current.cells, committed, current.resizeDirection, targetX, targetY);
      paint(current.cells, preview, resizeGridSelectionRect(current.resizeBounds, current.resizeLimits, current.resizeDirection, targetX, targetY));

      if (viewport.scrollLeft !== beforeLeft || viewport.scrollTop !== beforeTop) {
        scheduleDraw();
      }

      return;
    }

    const rect = { left: Math.min(current.x, x), top: Math.min(current.y, y), right: Math.max(current.x, x), bottom: Math.max(current.y, y) };

    // A frame for the time only is drawn across every city, whichever rows the pointer crosses,
    // and over the user's hours above them.
    if (FEATURES.timeOnlyFrame && current.cells.length) {
      rect.top = GRID_FRAME_COVERS_USER_HOURS ? 0 : Math.min(...current.cells.map((cell) => cell.rowTop));
      rect.bottom = getFrameBottom(Math.max(...current.cells.map((cell) => cell.rowBottom))) - GRID_SELECTION_FRAME_BOTTOM_PADDING;
    }

    current.marquee = rect;
    overlay.hidden = false;
    const visibleLeft = Math.max(origin.left + viewport.clientLeft, rect.left - viewport.scrollLeft + origin.left + viewport.clientLeft);
    const visibleTop = Math.max(origin.top + viewport.clientTop, rect.top - viewport.scrollTop + origin.top + viewport.clientTop);
    const visibleRight = Math.min(right, rect.right - viewport.scrollLeft + origin.left + viewport.clientLeft);
    const visibleBottom = Math.min(bottom, rect.bottom - viewport.scrollTop + origin.top + viewport.clientTop);

    overlay.style.left = `${visibleLeft}px`;
    overlay.style.top = `${visibleTop}px`;
    overlay.style.width = `${Math.max(0, visibleRight - visibleLeft)}px`;
    overlay.style.height = `${Math.max(0, visibleBottom - visibleTop)}px`;
    const hits = current.cells.filter((cell) => intersectsSelection(rect, cell.rect)).map((cell) => cell.slot);

    // Drawn in whole hours; the handles and the keyboard then move its sides by half an hour.
    preview = getWholeHourSlots(current.cells, hits);
    paint(current.cells, preview);

    if (viewport.scrollLeft !== beforeLeft || viewport.scrollTop !== beforeTop) {
      scheduleDraw();
    }
  };

  const scheduleDraw = () => {
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        draw();
      });
    }
  };

  const start = (event: PointerEvent) => {
    if (event.button === 1 && session) {
      finish(false);
      return;
    }

    if (
      event.pointerType !== 'mouse'
      || !event.isPrimary
      || event.button !== 0
      || session
      || event.altKey
      || !(event.target instanceof Element)
      || event.target.closest(INTERACTIVE_TARGET)
    ) {
      return;
    }

    snapAnimation.cancel();

    if (options.marqueeEnabled === false) {
      return;
    }

    const origin = viewport.getBoundingClientRect();

    viewport.scrollTo({ left: viewport.scrollLeft, top: viewport.scrollTop, behavior: 'instant' });
    session = {
      pointerId: event.pointerId,
      x: event.clientX - origin.left - viewport.clientLeft + viewport.scrollLeft,
      y: event.clientY - origin.top - viewport.clientTop + viewport.scrollTop,
      clientX: event.clientX,
      clientY: event.clientY,
      moved: false,
      cells: getCells(),
    };
    suppressClick = false;
    preview = committed;
    viewport.setPointerCapture(event.pointerId);
    onInteractionChange('marquee');
    event.preventDefault();
  };

  const startResize = (event: PointerEvent) => {
    if (
      event.pointerType !== 'mouse'
      || !event.isPrimary
      || event.button !== 0
      || session
      || !(event.target instanceof Element)
    ) {
      return;
    }

    const direction = event.target.closest<HTMLElement>('[data-grid-resize]')?.dataset.gridResize as GridResizeDirection | undefined;

    if (!direction || !committed.length) {
      return;
    }

    snapAnimation.cancel();
    const origin = viewport.getBoundingClientRect();

    viewport.scrollTo({ left: viewport.scrollLeft, top: viewport.scrollTop, behavior: 'instant' });
    const cells = getCells();
    const resizeBounds = getGridSelectionBounds(cells, committed);

    if (!resizeBounds) {
      return;
    }

    session = {
      pointerId: event.pointerId,
      x: event.clientX - origin.left - viewport.clientLeft + viewport.scrollLeft,
      y: event.clientY - origin.top - viewport.clientTop + viewport.scrollTop,
      clientX: event.clientX,
      clientY: event.clientY,
      moved: false,
      cells,
      resizeDirection: direction,
      resizeBounds,
      resizeLimits: getGridSelectionBounds(cells, cells.map((cell) => cell.slot))!,
    };
    preview = committed;
    viewport.setPointerCapture(event.pointerId);
    onInteractionChange('resize');
    event.preventDefault();
    event.stopPropagation();
  };

  const updatePointer = (event: PointerEvent) => {
    if (!session) {
      return;
    }

    session.clientX = event.clientX;
    session.clientY = event.clientY;
    const origin = viewport.getBoundingClientRect();
    const x = event.clientX - origin.left - viewport.clientLeft + viewport.scrollLeft;
    const y = event.clientY - origin.top - viewport.clientTop + viewport.scrollTop;

    if (Math.hypot(x - session.x, y - session.y) >= 4) {
      session.moved = true;
    }
  };

  const complete = (event?: PointerEvent) => {
    if (!session) {
      return;
    }

    if (event) {
      updatePointer(event);
    }

    if (session.moved) {
      suppressClick = true;
      cancelAnimationFrame(frame);
      frame = 0;
      // Commit the release position synchronously; do not wait for a frame or scroll further.
      draw(false);
    } else {
      // A click is not a frame: only the clear button removes the selection.
      finish(false);
      return;
    }

    finish(true);
  };

  const move = (event: PointerEvent) => {
    if (!session || session.pointerId !== event.pointerId) {
      return;
    }

    if (!(event.buttons & 1)) {
      if (event.buttons === 0) {
        complete(event);
      } else {
        finish(false);
      }

      return;
    }

    updatePointer(event);

    if (session.moved) {
      suppressClick = true;
      scheduleDraw();
    }

    event.preventDefault();
  };

  const up = (event: PointerEvent) => {
    if (!session || session.pointerId !== event.pointerId || event.button !== 0 || (event.buttons & 1)) {
      return;
    }

    complete(event);
  };

  const preventNativeDrag = (event: DragEvent) => {
    if (session) {
      event.preventDefault();
    }
  };

  const cancel = () => {
    snapAnimation.cancel();
    finish(false);
  };

  const cancelPointer = (event: PointerEvent) => {
    if (session?.pointerId !== event.pointerId) {
      return;
    }

    if (
      event.type === 'lostpointercapture'
      && event.target === viewport
      && event.buttons === 0
      && viewport.isConnected !== false
    ) {
      // Chrome can release capture before delivering pointerup. Capture-loss coordinates
      // are not reliable, so finalize at the last real pointer position instead of rolling back.
      complete();
    } else {
      cancel();
    }
  };

  const clear = () => {
    cancel();
    committed = [];
    preview = [];
    paint(getCells(), []);
    onCommit([]);
  };

  const keydown = (event: KeyboardEvent) => {
    // Escape drops the frame being drawn or the edge being moved, never the selection: only the
    // clear button removes it. Escape already used by something above the grid (a modal) is not ours.
    if (event.key === 'Escape' && !event.defaultPrevented && session) {
      cancel();
      event.preventDefault();
    }
  };

  const resizeKeydown = (event: KeyboardEvent) => {
    if (session || !(event.target instanceof Element)) {
      return;
    }

    const direction = event.target.closest<HTMLElement>('[data-grid-resize]')?.dataset.gridResize as GridResizeDirection | undefined;

    if (!direction || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      return;
    }

    snapAnimation.cancel();
    const cells = getCells();
    const bounds = getGridSelectionBounds(cells, committed);

    if (!bounds) {
      return;
    }

    const horizontal = direction.includes('w') || direction.includes('e');
    const vertical = direction.includes('n') || direction.includes('s');
    const dx = horizontal ? getArrowKeyStep(event.key, 'ArrowLeft', 'ArrowRight') : 0;
    const dy = vertical ? getArrowKeyStep(event.key, 'ArrowUp', 'ArrowDown') : 0;

    if (!dx && !dy) {
      return;
    }

    const columns = [...new Set(cells.map((cell) => cell.rect.left))].sort((a, b) => a - b);
    const rows = [...new Set(cells.map((cell) => cell.rowTop))].sort((a, b) => a - b);
    const x = (direction.includes('w') ? bounds.left : bounds.right) + dx * getGridStep(columns);
    const y = (direction.includes('n') ? bounds.top : bounds.bottom) + dy * getGridStep(rows);
    // A corner handle changes only the axis of the arrow key that was pressed.
    const axisDirection = getKeyboardResizeAxis(direction, Boolean(dx));

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

      if (event.target instanceof Element && event.target.closest(INTERACTIVE_TARGET)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  const visibility = () => {
    if (document.visibilityState === 'hidden') {
      cancel();
    }
  };

  const resize = () => {
    cancel();
    frameBounds = getGridSelectionBounds(getCells(), committed);
    positionFrame();
  };

  const interactionScroll = () => {
    if (session?.moved) {
      scheduleDraw();
    }
  };

  selectionFrame?.addEventListener('pointerdown', startResize);
  selectionFrame?.addEventListener('keydown', resizeKeydown);
  const content = selectionFrame?.parentElement;
  const contentObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);

  if (content) {
    contentObserver?.observe(content);
  }

  frameBounds = getGridSelectionBounds(getCells(), committed);
  positionFrame();
  viewport.addEventListener('pointerdown', start);
  viewport.addEventListener('lostpointercapture', cancelPointer);
  viewport.addEventListener('click', click, true);
  viewport.addEventListener('dragstart', preventNativeDrag);
  viewport.addEventListener('scroll', interactionScroll, { passive: true });
  window.addEventListener('scroll', interactionScroll, { passive: true });
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

    if (!next.length) {
      return false;
    }

    committed = preview = next;
    paint(cells, committed);
    onCommit(committed);
    return true;
  };

  return {
    clear,
    create,
    cancel,
    destroy: () => {
      cancel();
      cancelAnimationFrame(frame);

      if (selectionFrame) {
        selectionFrame.hidden = true;
      }

      contentObserver?.disconnect();
      selectionFrame?.removeEventListener('pointerdown', startResize);
      selectionFrame?.removeEventListener('keydown', resizeKeydown);
      viewport.removeEventListener('pointerdown', start);
      viewport.removeEventListener('lostpointercapture', cancelPointer);
      viewport.removeEventListener('click', click, true);
      viewport.removeEventListener('dragstart', preventNativeDrag);
      viewport.removeEventListener('scroll', interactionScroll);
      window.removeEventListener('scroll', interactionScroll);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', cancelPointer);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', keydown);
      document.removeEventListener('visibilitychange', visibility);
    },
  };
}
