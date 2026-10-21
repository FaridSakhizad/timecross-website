const PAN_THRESHOLD = 5;
const INTERACTIVE_TARGET = 'a, button, input, select, textarea, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="slider"]';

type PanSession = {
  pointerId: number;
  x: number;
  y: number;
  scrollLeft: number;
  scrollTop: number;
  moved: boolean;
};

export function attachDesktopGridPan(viewport: HTMLDivElement, onInteractionChange: (active: boolean) => void) {
  let session: PanSession | null = null;
  let suppressClick = false;
  const cancel = () => {
    const previous = session;
    if (!previous) return;
    session = null;
    onInteractionChange(false);
    if (viewport.hasPointerCapture(previous.pointerId)) viewport.releasePointerCapture(previous.pointerId);
  };
  const start = (event: PointerEvent) => {
    suppressClick = false;
    if (event.pointerType !== 'mouse' || !event.isPrimary || event.button !== 0
      || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
      || session || !(event.target instanceof Element)
      || event.target.closest(INTERACTIVE_TARGET)) return;
    // Stop any smooth snap before measuring the drag's starting position.
    viewport.scrollTo({ left: viewport.scrollLeft, top: viewport.scrollTop, behavior: 'instant' });
    session = {
      pointerId: event.pointerId, x: event.clientX, y: event.clientY,
      scrollLeft: viewport.scrollLeft, scrollTop: viewport.scrollTop, moved: false,
    };
    viewport.setPointerCapture(event.pointerId);
    onInteractionChange(true);
    event.preventDefault();
  };
  const move = (event: PointerEvent) => {
    if (!session || session.pointerId !== event.pointerId) return;
    if (!(event.buttons & 1)) { cancel(); return; }
    const dx = event.clientX - session.x;
    const dy = event.clientY - session.y;
    if (!session.moved && Math.hypot(dx, dy) < PAN_THRESHOLD) return;
    session.moved = true;
    suppressClick = true;
    event.preventDefault();
    viewport.scrollLeft = session.scrollLeft - dx;
    viewport.scrollTop = session.scrollTop - dy;
  };
  const finish = (event: PointerEvent) => {
    if (session?.pointerId === event.pointerId) cancel();
  };
  const handleClick = (event: MouseEvent) => {
    if (event.detail === 0 || !suppressClick) return;
    suppressClick = false;
    if (event.target instanceof Element && event.target.closest(INTERACTIVE_TARGET)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const preventNativeDrag = (event: DragEvent) => {
    if (session) event.preventDefault();
  };
  const handleVisibility = () => {
    if (document.visibilityState === 'hidden') cancel();
  };
  viewport.addEventListener('pointerdown', start);
  viewport.addEventListener('lostpointercapture', finish);
  viewport.addEventListener('click', handleClick, true);
  viewport.addEventListener('dragstart', preventNativeDrag);
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', finish);
  window.addEventListener('pointercancel', finish);
  window.addEventListener('blur', cancel);
  document.addEventListener('visibilitychange', handleVisibility);
  return {
    cancel,
    destroy: () => {
      viewport.removeEventListener('pointerdown', start);
      viewport.removeEventListener('lostpointercapture', finish);
      viewport.removeEventListener('click', handleClick, true);
      viewport.removeEventListener('dragstart', preventNativeDrag);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', handleVisibility);
      cancel();
      suppressClick = false;
    },
  };
}
