import { getGridSelectionBounds, gridHourKey, resizeGridSelection, resizeGridSelectionRect,
  type GridResizeDirection, type SelectedGridHour, type SelectionRect } from '../shared/gridSelection.ts';
import { getMobileGridSelectionCells, getMobileGridVisibleRect,
  MOBILE_SELECTION_HORIZONTAL_PADDING, MOBILE_SELECTION_TOP_PADDING, MOBILE_SELECTION_BOTTOM_PADDING,
} from './mobileGridSelectionGeometry.ts';
import { createGridSelectionSnapAnimation } from '../shared/gridSelectionSnapAnimation.ts';

const DIRECTIONS = new Set(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']);

export function attachMobileGridSelection(
  frame: HTMLDivElement, initial: SelectedGridHour[], onCommit: (hours: SelectedGridHour[]) => void,
  onInteractionChange: (active: boolean) => void,
  viewport?: HTMLDivElement,
) {
  const root = frame.parentElement!;
  const snapAnimation = createGridSelectionSnapAnimation(frame);
  const scrollX = () => window.scrollX + (viewport?.scrollLeft ?? 0);
  const scrollY = () => window.scrollY + (viewport?.scrollTop ?? 0);
  const readCells = () => getMobileGridSelectionCells(root, viewport);
  const readVisible = () => getMobileGridVisibleRect(viewport);
  const usesTouchEvents = typeof window.TouchEvent !== 'undefined';
  let cells = readCells();
  let committed = initial;
  let preview = initial;
  let bounds = getGridSelectionBounds(cells, initial);
  let animation = 0;
  let session: {
    pointerId?: number; touchId?: number; handle: HTMLElement; direction: GridResizeDirection;
    x: number; y: number; clientX: number; clientY: number;
    bounds: NonNullable<typeof bounds>;
    limits: SelectionRect;
  } | null = null;

  const position = () => {
    if (!bounds) { frame.hidden = true; return; }
    const origin = root.getBoundingClientRect();
    frame.hidden = false;
    frame.style.left = `${bounds.left - origin.left - scrollX() - MOBILE_SELECTION_HORIZONTAL_PADDING}px`;
    frame.style.top = `${bounds.top - origin.top - scrollY() - MOBILE_SELECTION_TOP_PADDING}px`;
    frame.style.width = `${bounds.right - bounds.left + MOBILE_SELECTION_HORIZONTAL_PADDING * 2}px`;
    frame.style.height = `${bounds.bottom - bounds.top + MOBILE_SELECTION_TOP_PADDING + MOBILE_SELECTION_BOTTOM_PADDING}px`;
  };
  const paint = (hours: SelectedGridHour[], visualBounds?: SelectionRect) => {
    const keys = new Set(hours.map(gridHourKey));
    for (const element of root.querySelectorAll<HTMLElement>('.timelineGrid-row_mobile [data-grid-hour-start]')) {
      element.classList.toggle('isSelected', keys.has(gridHourKey({
        rowId: element.dataset.gridSelectionRow!, start: Number(element.dataset.gridHourStart),
      })));
    }
    bounds = visualBounds ?? getGridSelectionBounds(cells, hours);
    position();
  };
  const finish = (commit: boolean) => {
    const previous = session;
    if (!previous) return;
    session = null;
    cancelAnimationFrame(animation); animation = 0;
    if (commit) { committed = preview; snapAnimation.snap(() => paint(committed)); onCommit(committed); }
    else { preview = committed; paint(committed); }
    onInteractionChange(false);
    if (previous.pointerId !== undefined && previous.handle.hasPointerCapture(previous.pointerId)) {
      previous.handle.releasePointerCapture(previous.pointerId);
    }
  };
  const draw = (autoScroll = true) => {
    const current = session;
    if (!current) return;
    const visible = readVisible();
    const edgeSpeed = (value: number, min: number, max: number) => value < min + 24
      ? -Math.min(8, (min + 24 - value) / 4) : value > max - 24 ? Math.min(8, (value - max + 24) / 4) : 0;
    const oldX = scrollX();
    const oldY = scrollY();
    const horizontal = /[ew]/.test(current.direction);
    const vertical = /[ns]/.test(current.direction);
    if (autoScroll) (viewport ?? window).scrollBy({
      left: horizontal ? edgeSpeed(current.clientX, visible.left - oldX, visible.right - oldX) : 0,
      top: vertical ? edgeSpeed(current.clientY, visible.top - oldY, visible.bottom - oldY) : 0,
      behavior: 'instant',
    });
    const edgeX = current.direction.includes('w') ? current.bounds.left : current.bounds.right;
    const edgeY = current.direction.includes('n') ? current.bounds.top : current.bounds.bottom;
    const targetX = edgeX + current.clientX + scrollX() - current.x;
    const targetY = edgeY + current.clientY + scrollY() - current.y;
    preview = resizeGridSelection(cells, committed, current.direction, targetX, targetY);
    paint(preview, resizeGridSelectionRect(current.bounds, current.limits, current.direction, targetX, targetY));
    if (oldX !== scrollX() || oldY !== scrollY()) schedule();
  };
  const schedule = () => {
    if (!animation) animation = requestAnimationFrame(() => { animation = 0; draw(); });
  };
  const begin = (target: EventTarget | null, clientX: number, clientY: number,
    identity: { pointerId: number } | { touchId: number }) => {
    if (session || !(target instanceof Element)) return false;
    const handle = target.closest<HTMLElement>('[data-grid-resize]');
    const direction = handle?.dataset.gridResize as GridResizeDirection;
    if (!handle || !DIRECTIONS.has(direction) || !committed.length) return false;
    snapAnimation.cancel();
    window.scrollTo({ left: window.scrollX, top: window.scrollY, behavior: 'instant' });
    viewport?.scrollTo({ left: viewport.scrollLeft, top: viewport.scrollTop, behavior: 'instant' });
    cells = readCells();
    const initialBounds = getGridSelectionBounds(cells, committed);
    if (!initialBounds) return false;
    session = { ...identity, handle, direction, bounds: initialBounds,
      limits: getGridSelectionBounds(cells, cells.map((cell) => cell.hour))!,
      x: clientX + scrollX(), y: clientY + scrollY(), clientX, clientY };
    preview = committed;
    if ('pointerId' in identity) handle.setPointerCapture(identity.pointerId);
    onInteractionChange(true);
    return true;
  };
  const start = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0 || (usesTouchEvents && event.pointerType === 'touch')) return;
    if (!begin(event.target, event.clientX, event.clientY, { pointerId: event.pointerId })) return;
    event.preventDefault(); event.stopPropagation();
  };
  const move = (event: PointerEvent) => {
    if (!session || session.pointerId !== event.pointerId) return;
    if (event.pointerType === 'mouse' && !(event.buttons & 1)) {
      if (event.buttons === 0) {
        session.clientX = event.clientX; session.clientY = event.clientY;
        draw(false); finish(true);
      } else finish(false);
      return;
    }
    session.clientX = event.clientX; session.clientY = event.clientY;
    schedule(); event.preventDefault();
  };
  const up = (event: PointerEvent) => {
    if (!session || session.pointerId !== event.pointerId) return;
    session.clientX = event.clientX; session.clientY = event.clientY;
    cancelAnimationFrame(animation); animation = 0;
    draw(false); finish(true);
    event.preventDefault();
  };
  const lost = (event: PointerEvent) => {
    if (session?.pointerId !== event.pointerId) return;
    if (event.type === 'lostpointercapture' && event.buttons === 0 && frame.isConnected) {
      draw(false); finish(true);
    } else finish(false);
  };
  const cancel = () => { snapAnimation.cancel(); finish(false); };
  const multiTouch = (event: PointerEvent) => {
    if (session && !event.isPrimary && event.pointerId !== session.pointerId) cancel();
  };
  // On iOS, cancel native scrolling at the touch-event level from the first contact.
  // Pointer events remain the mouse/pen path; do not process both streams for one finger.
  const touchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) { cancel(); return; }
    const touch = event.changedTouches[0];
    if (!touch || !begin(event.target, touch.clientX, touch.clientY, { touchId: touch.identifier })) return;
    event.preventDefault(); event.stopPropagation();
  };
  const touchMove = (event: TouchEvent) => {
    if (session?.touchId === undefined) return;
    if (event.touches.length !== 1) { cancel(); return; }
    const touch = Array.from(event.changedTouches).find((touch) => touch.identifier === session?.touchId);
    if (!touch) return;
    session.clientX = touch.clientX; session.clientY = touch.clientY;
    schedule(); event.preventDefault();
  };
  const touchEnd = (event: TouchEvent) => {
    if (session?.touchId === undefined) return;
    const touch = Array.from(event.changedTouches).find((touch) => touch.identifier === session?.touchId);
    if (!touch) return;
    session.clientX = touch.clientX; session.clientY = touch.clientY;
    cancelAnimationFrame(animation); animation = 0;
    draw(false); finish(true); event.preventDefault();
  };
  const touchCancel = (event: TouchEvent) => {
    if (session?.touchId !== undefined
      && Array.from(event.changedTouches).some((touch) => touch.identifier === session?.touchId)) cancel();
  };
  const multipleTouches = (event: TouchEvent) => { if (event.touches.length > 1) cancel(); };
  const visibility = () => { if (document.visibilityState === 'hidden') cancel(); };
  const resize = () => { cancel(); cells = readCells(); bounds = getGridSelectionBounds(cells, committed); position(); };
  let viewportWidth = document.documentElement.clientWidth;
  const viewportResize = () => {
    const width = document.documentElement.clientWidth;
    // Safari changes viewport height while its toolbars expand/collapse during scrolling.
    if (width === viewportWidth) return;
    viewportWidth = width;
    resize();
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && session) { cancel(); event.preventDefault(); event.stopImmediatePropagation(); }
    if (session || !(event.target instanceof Element)) return;
    const direction = event.target.closest<HTMLElement>('[data-grid-resize]')?.dataset.gridResize as GridResizeDirection;
    if (!DIRECTIONS.has(direction) || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    snapAnimation.cancel();
    cells = readCells();
    const currentBounds = getGridSelectionBounds(cells, committed);
    if (!currentBounds) return;
    const dx = /[ew]/.test(direction) ? event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0 : 0;
    const dy = /[ns]/.test(direction) ? event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0 : 0;
    if (!dx && !dy) return;
    const columns = [...new Set(cells.map((cell) => cell.rect.left))].sort((a, b) => a - b);
    const rows = [...new Set(cells.map((cell) => cell.rowTop))].sort((a, b) => a - b);
    const x = (direction.includes('w') ? currentBounds.left : currentBounds.right) + dx * (columns[1] - columns[0] || 1);
    const y = (direction.includes('n') ? currentBounds.top : currentBounds.bottom) + dy * (rows[1] - rows[0] || 1);
    const axis = (dx ? direction.includes('w') ? 'w' : 'e' : direction.includes('n') ? 'n' : 's') as GridResizeDirection;
    committed = resizeGridSelection(cells, committed, axis, x, y);
    preview = committed; paint(committed); onCommit(committed);
    event.preventDefault(); event.stopImmediatePropagation();
  };
  const click = (event: MouseEvent) => {
    if (event.target instanceof Element && event.target.closest('[data-grid-resize]')) {
      event.preventDefault(); event.stopPropagation();
    }
  };
  const interactionScroll = () => { if (session) schedule(); };
  const contentObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  contentObserver?.observe(root);
  frame.addEventListener('pointerdown', start);
  frame.addEventListener('lostpointercapture', lost);
  frame.addEventListener('click', click);
  if (usesTouchEvents) {
    frame.addEventListener('touchstart', touchStart, { passive: false });
    window.addEventListener('touchstart', multipleTouches, { capture: true, passive: true });
    frame.addEventListener('touchmove', touchMove, { passive: false });
    frame.addEventListener('touchend', touchEnd, { passive: false });
    frame.addEventListener('touchcancel', touchCancel);
  }
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', lost);
  window.addEventListener('pointerdown', multiTouch, true);
  window.addEventListener('scroll', interactionScroll, { passive: true });
  viewport?.addEventListener('scroll', interactionScroll, { passive: true });
  window.addEventListener('resize', viewportResize);
  window.visualViewport?.addEventListener('resize', viewportResize);
  window.addEventListener('blur', cancel);
  window.addEventListener('keydown', keydown, true);
  document.addEventListener('visibilitychange', visibility);
  paint(committed);
  return { setSelection(hours: SelectedGridHour[]) {
    if (hours === committed) return;
    cancel();
    committed = preview = hours;
    paint(committed);
  }, destroy() {
    cancel(); cancelAnimationFrame(animation);
    frame.hidden = true;
    contentObserver?.disconnect();
    frame.removeEventListener('pointerdown', start);
    frame.removeEventListener('lostpointercapture', lost);
    frame.removeEventListener('click', click);
    if (usesTouchEvents) {
      frame.removeEventListener('touchstart', touchStart);
      window.removeEventListener('touchstart', multipleTouches, true);
      frame.removeEventListener('touchmove', touchMove);
      frame.removeEventListener('touchend', touchEnd);
      frame.removeEventListener('touchcancel', touchCancel);
    }
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up, true);
    window.removeEventListener('pointercancel', lost);
    window.removeEventListener('pointerdown', multiTouch, true);
    window.removeEventListener('scroll', interactionScroll);
    viewport?.removeEventListener('scroll', interactionScroll);
    window.removeEventListener('resize', viewportResize);
    window.visualViewport?.removeEventListener('resize', viewportResize);
    window.removeEventListener('blur', cancel);
    window.removeEventListener('keydown', keydown, true);
    document.removeEventListener('visibilitychange', visibility);
  } };
}
