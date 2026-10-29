export const GRID_SELECTION_SNAP_DURATION = 300;

export function createGridSelectionSnapAnimation(frame?: HTMLElement) {
  let animation: Animation | null = null;
  const cancel = () => { animation?.cancel(); animation = null; };
  const read = (element: HTMLElement) => ({ left: element.style.left, top: element.style.top,
    width: element.style.width, height: element.style.height });

  return {
    cancel,
    snap(update: () => void) {
      cancel();
      const from = frame ? read(frame) : null;
      update();
      if (!frame || frame.hidden || !from || typeof frame.animate !== 'function'
        || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)) return;
      const to = read(frame);
      if (Object.keys(from).every((key) => from[key as keyof typeof from] === to[key as keyof typeof to])) return;
      // Animate the rectangle itself so borders and handles do not stretch as with a scale transform.
      const current = frame.animate([from, to], {
        duration: GRID_SELECTION_SNAP_DURATION,
      });
      animation = current;
      current.onfinish = current.oncancel = () => { if (animation === current) animation = null; };
    },
  };
}
