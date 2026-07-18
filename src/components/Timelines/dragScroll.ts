type HorizontalDragScrollOptions = {
  draggingClassName?: string;
};

type HorizontalDragState = {
  pointerId: number;
  lastX: number;
};

export function initHorizontalDragScroll(
  viewport: HTMLElement,
  { draggingClassName }: HorizontalDragScrollOptions = {},
) {
  let drag: HorizontalDragState | null = null;

  const endDrag = () => {
    if (!drag) {
      return;
    }

    drag = null;
    viewport.classList.remove(draggingClassName ?? '');
    window.removeEventListener('pointermove', handleWindowPointerMove);
    window.removeEventListener('pointerup', handleWindowPointerUp);
    window.removeEventListener('pointercancel', handleWindowPointerUp);
    window.removeEventListener('blur', handleWindowBlur);
  };

  const handleWindowPointerMove = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (event.buttons === 0) {
      endDrag();
      return;
    }

    event.preventDefault();
    viewport.scrollLeft -= event.clientX - drag.lastX;
    drag.lastX = event.clientX;
  };

  const handleWindowPointerUp = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    viewport.scrollLeft -= event.clientX - drag.lastX;
    endDrag();
  };

  const handleWindowBlur = () => {
    endDrag();
  };

  const handleViewportPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    endDrag();
    drag = {
      pointerId: event.pointerId,
      lastX: event.clientX,
    };
    viewport.classList.add(draggingClassName ?? '');
    window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    window.addEventListener('blur', handleWindowBlur);
  };

  viewport.addEventListener('pointerdown', handleViewportPointerDown);

  return () => {
    viewport.removeEventListener('pointerdown', handleViewportPointerDown);
    endDrag();
  };
}
