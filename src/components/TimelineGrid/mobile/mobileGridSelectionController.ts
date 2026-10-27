import { getGridSelectionBounds, gridHourKey, resizeGridSelection,
  type GridResizeDirection, type SelectedGridHour } from '../desktop/gridSelection.ts';
import { getMobileGridSelectionCells, getMobileGridVisibleRect,
  MOBILE_SELECTION_HORIZONTAL_PADDING, MOBILE_SELECTION_TOP_PADDING, MOBILE_SELECTION_BOTTOM_PADDING,
} from './mobileGridSelectionGeometry.ts';

const DIRECTIONS = new Set(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']);

export function attachMobileGridSelection(
  layer: HTMLDivElement, initial: SelectedGridHour[], onCommit: (hours: SelectedGridHour[]) => void,
  onInteractionChange: (active: boolean) => void,
) {
  const frame = layer.querySelector<HTMLElement>('[data-grid-selection-frame]')!;
  let cells = getMobileGridSelectionCells();
  let committed = initial;
  let preview = initial;
  let bounds = getGridSelectionBounds(cells, initial);
  let animation = 0;
  let session: {
    pointerId: number; handle: HTMLElement; direction: GridResizeDirection;
    x: number; y: number; clientX: number; clientY: number;
    bounds: NonNullable<typeof bounds>;
  } | null = null;

  const position = () => {
    if (!bounds) { layer.hidden = true; return; }
    const visible = getMobileGridVisibleRect();
    layer.hidden = false;
    layer.style.left = '0px';
    layer.style.top = `${visible.top - window.scrollY}px`;
    layer.style.width = `${visible.right - visible.left}px`;
    layer.style.height = `${Math.max(0, visible.bottom - visible.top)}px`;
    frame.style.left = `${bounds.left - window.scrollX - MOBILE_SELECTION_HORIZONTAL_PADDING}px`;
    frame.style.top = `${bounds.top - visible.top - MOBILE_SELECTION_TOP_PADDING}px`;
    frame.style.width = `${bounds.right - bounds.left + MOBILE_SELECTION_HORIZONTAL_PADDING * 2}px`;
    frame.style.height = `${bounds.bottom - bounds.top + MOBILE_SELECTION_TOP_PADDING + MOBILE_SELECTION_BOTTOM_PADDING}px`;
  };
  const paint = (hours: SelectedGridHour[]) => {
    const keys = new Set(hours.map(gridHourKey));
    for (const element of document.querySelectorAll<HTMLElement>('.timelineGrid-row_mobile [data-grid-hour-start]')) {
      element.classList.toggle('isSelected', keys.has(gridHourKey({
        rowId: element.dataset.gridSelectionRow!, start: Number(element.dataset.gridHourStart),
      })));
    }
    bounds = getGridSelectionBounds(cells, hours);
    position();
  };
  const finish = (commit: boolean) => {
    const previous = session;
    if (!previous) return;
    session = null;
    cancelAnimationFrame(animation); animation = 0;
    if (commit) { committed = preview; onCommit(committed); }
    else { preview = committed; paint(committed); }
    onInteractionChange(false);
    if (previous.handle.hasPointerCapture(previous.pointerId)) previous.handle.releasePointerCapture(previous.pointerId);
  };
  const draw = (autoScroll = true) => {
    const current = session;
    if (!current) { position(); return; }
    const visible = getMobileGridVisibleRect();
    const edgeSpeed = (value: number, min: number, max: number) => value < min + 24
      ? -Math.min(8, (min + 24 - value) / 4) : value > max - 24 ? Math.min(8, (value - max + 24) / 4) : 0;
    const oldX = window.scrollX;
    const oldY = window.scrollY;
    const horizontal = /[ew]/.test(current.direction);
    const vertical = /[ns]/.test(current.direction);
    if (autoScroll) window.scrollBy({
      left: horizontal ? edgeSpeed(current.clientX, 0, visible.right - visible.left) : 0,
      top: vertical ? edgeSpeed(current.clientY, visible.top - oldY, window.innerHeight) : 0,
      behavior: 'instant',
    });
    const edgeX = current.direction.includes('w') ? current.bounds.left : current.bounds.right;
    const edgeY = current.direction.includes('n') ? current.bounds.top : current.bounds.bottom;
    preview = resizeGridSelection(cells, committed, current.direction,
      edgeX + current.clientX + window.scrollX - current.x,
      edgeY + current.clientY + window.scrollY - current.y);
    paint(preview);
    if (oldX !== window.scrollX || oldY !== window.scrollY) schedule();
  };
  const schedule = () => {
    if (!animation) animation = requestAnimationFrame(() => { animation = 0; draw(); });
  };
  const start = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0 || session || !(event.target instanceof Element)) return;
    const handle = event.target.closest<HTMLElement>('[data-grid-resize]');
    const direction = handle?.dataset.gridResize as GridResizeDirection;
    if (!handle || !DIRECTIONS.has(direction) || !committed.length) return;
    window.scrollTo({ left: window.scrollX, top: window.scrollY, behavior: 'instant' });
    cells = getMobileGridSelectionCells();
    const initialBounds = getGridSelectionBounds(cells, committed);
    if (!initialBounds) return;
    session = { pointerId: event.pointerId, handle, direction, bounds: initialBounds,
      x: event.clientX + window.scrollX, y: event.clientY + window.scrollY,
      clientX: event.clientX, clientY: event.clientY };
    preview = committed;
    handle.setPointerCapture(event.pointerId);
    onInteractionChange(true);
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
    if (event.type === 'lostpointercapture' && event.buttons === 0 && layer.isConnected) {
      draw(false); finish(true);
    } else finish(false);
  };
  const cancel = () => finish(false);
  const multiTouch = (event: PointerEvent) => { if (session && event.pointerId !== session.pointerId) cancel(); };
  const visibility = () => { if (document.visibilityState === 'hidden') cancel(); };
  const resize = () => { cancel(); cells = getMobileGridSelectionCells(); bounds = getGridSelectionBounds(cells, committed); position(); };
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && session) { cancel(); event.preventDefault(); event.stopImmediatePropagation(); }
    if (session || !(event.target instanceof Element)) return;
    const direction = event.target.closest<HTMLElement>('[data-grid-resize]')?.dataset.gridResize as GridResizeDirection;
    if (!DIRECTIONS.has(direction) || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    cells = getMobileGridSelectionCells();
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
  layer.addEventListener('pointerdown', start);
  layer.addEventListener('lostpointercapture', lost);
  layer.addEventListener('click', click);
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', lost);
  window.addEventListener('pointerdown', multiTouch, true);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  window.addEventListener('blur', cancel);
  window.addEventListener('keydown', keydown, true);
  document.addEventListener('visibilitychange', visibility);
  paint(committed);
  return { destroy() {
    cancel(); cancelAnimationFrame(animation);
    layer.hidden = true;
    layer.removeEventListener('pointerdown', start);
    layer.removeEventListener('lostpointercapture', lost);
    layer.removeEventListener('click', click);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up, true);
    window.removeEventListener('pointercancel', lost);
    window.removeEventListener('pointerdown', multiTouch, true);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', resize);
    window.visualViewport?.removeEventListener('resize', resize);
    window.removeEventListener('blur', cancel);
    window.removeEventListener('keydown', keydown, true);
    document.removeEventListener('visibilitychange', visibility);
  } };
}
