import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

type UseTimeRulerScrollOptions = {
  offsetMinutes: number;
  pixelsInMinute: number;
  rangeMinutes: number;
  onOffsetChange: (offsetMinutes: number) => void;
};

type TimeRulerDrag = {
  pointerId: number;
  startX: number;
  startScrollLeft: number;
};

const OFFSET_SYNC_INTERVAL_MS = 50;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getWheelDelta(event: WheelEvent, viewport: HTMLElement) {
  const lineHeight = 16;
  const pageWidth = viewport.clientWidth || 1;
  const deltaMultiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
    ? lineHeight
    : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
      ? pageWidth
      : 1;

  return (event.deltaX || event.deltaY) * deltaMultiplier;
}

export function useTimeRulerScroll({
  offsetMinutes,
  pixelsInMinute,
  rangeMinutes,
  onOffsetChange,
}: UseTimeRulerScrollOptions) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<TimeRulerDrag | null>(null);
  const scrollSyncTimeoutRef = useRef<number | null>(null);
  const lastEmittedOffsetRef = useRef<number | null>(null);
  const lastOffsetEmitTimeRef = useRef(0);
  const pendingOffsetRef = useRef<number | null>(null);
  const onOffsetChangeRef = useRef(onOffsetChange);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    onOffsetChangeRef.current = onOffsetChange;
  }, [onOffsetChange]);

  const getScrollLeftForOffset = useCallback((nextOffsetMinutes: number) => (
    (nextOffsetMinutes + rangeMinutes) * pixelsInMinute
  ), [pixelsInMinute, rangeMinutes]);

  const getOffsetFromScroll = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return null;
    }

    return clamp(
      Math.round(viewport.scrollLeft / pixelsInMinute - rangeMinutes),
      -rangeMinutes,
      rangeMinutes,
    );
  }, [pixelsInMinute, rangeMinutes]);

  const emitOffset = useCallback((nextOffset: number) => {
    if (lastEmittedOffsetRef.current === nextOffset) {
      return;
    }

    lastEmittedOffsetRef.current = nextOffset;
    lastOffsetEmitTimeRef.current = performance.now();
    onOffsetChangeRef.current(nextOffset);
  }, []);

  const scheduleOffsetSync = useCallback(() => {
    const nextOffset = getOffsetFromScroll();

    if (nextOffset === null) {
      return;
    }

    pendingOffsetRef.current = nextOffset;

    const now = performance.now();
    const elapsed = now - lastOffsetEmitTimeRef.current;

    if (lastOffsetEmitTimeRef.current === 0 || elapsed >= OFFSET_SYNC_INTERVAL_MS) {
      pendingOffsetRef.current = null;
      emitOffset(nextOffset);
      return;
    }

    if (scrollSyncTimeoutRef.current !== null) {
      return;
    }

    scrollSyncTimeoutRef.current = window.setTimeout(() => {
      scrollSyncTimeoutRef.current = null;

      const pendingOffset = pendingOffsetRef.current;
      pendingOffsetRef.current = null;

      if (pendingOffset !== null) {
        emitOffset(pendingOffset);
      }
    }, OFFSET_SYNC_INTERVAL_MS - elapsed);
  }, [emitOffset, getOffsetFromScroll]);

  const scrollToOffset = useCallback((nextOffsetMinutes: number, emitImmediately = false) => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const nextOffset = clamp(Math.round(nextOffsetMinutes), -rangeMinutes, rangeMinutes);
    const targetScrollLeft = getScrollLeftForOffset(nextOffset);

    if (emitImmediately) {
      pendingOffsetRef.current = null;
      emitOffset(nextOffset);
    }

    viewport.scrollLeft = targetScrollLeft;
  }, [emitOffset, getScrollLeftForOffset, rangeMinutes]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || lastEmittedOffsetRef.current === offsetMinutes) {
      return;
    }

    viewport.scrollLeft = getScrollLeftForOffset(offsetMinutes);
    lastEmittedOffsetRef.current = offsetMinutes;
  }, [getScrollLeftForOffset, offsetMinutes]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const endDrag = () => {
      const drag = dragRef.current;

      if (!drag) {
        return;
      }

      dragRef.current = null;
      setIsDragging(false);

      if (viewport.hasPointerCapture(drag.pointerId)) {
        viewport.releasePointerCapture(drag.pointerId);
      }
    };

    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) {
        return;
      }

      event.preventDefault();
      viewport.setPointerCapture(event.pointerId);

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startScrollLeft: viewport.scrollLeft,
      };

      setIsDragging(true);
    };

    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      if (event.buttons === 0) {
        endDrag();
        return;
      }

      event.preventDefault();
      viewport.scrollLeft = drag.startScrollLeft - (event.clientX - drag.startX);
    };

    const handlePointerUp = (event: globalThis.PointerEvent) => {
      const drag = dragRef.current;

      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      endDrag();
    };

    const handleScroll = () => {
      scheduleOffsetSync();
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      viewport.scrollLeft += getWheelDelta(event, viewport);
    };

    const handleWindowPointerEnd = () => {
      endDrag();
    };

    viewport.addEventListener('pointerdown', handlePointerDown);
    viewport.addEventListener('pointermove', handlePointerMove);
    viewport.addEventListener('pointerup', handlePointerUp);
    viewport.addEventListener('pointercancel', handlePointerUp);
    viewport.addEventListener('wheel', handleWheel, { passive: false });
    viewport.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pointerup', handleWindowPointerEnd);
    window.addEventListener('pointercancel', handleWindowPointerEnd);
    window.addEventListener('blur', handleWindowPointerEnd);

    return () => {
      viewport.removeEventListener('pointerdown', handlePointerDown);
      viewport.removeEventListener('pointermove', handlePointerMove);
      viewport.removeEventListener('pointerup', handlePointerUp);
      viewport.removeEventListener('pointercancel', handlePointerUp);
      viewport.removeEventListener('wheel', handleWheel);
      viewport.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pointerup', handleWindowPointerEnd);
      window.removeEventListener('pointercancel', handleWindowPointerEnd);
      window.removeEventListener('blur', handleWindowPointerEnd);

      if (scrollSyncTimeoutRef.current !== null) {
        window.clearTimeout(scrollSyncTimeoutRef.current);
        scrollSyncTimeoutRef.current = null;
      }
    };
  }, [scheduleOffsetSync]);

  return {
    isDragging,
    scrollToOffset,
    viewportRef,
  };
}
