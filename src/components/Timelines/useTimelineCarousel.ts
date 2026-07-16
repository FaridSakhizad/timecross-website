import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  TIMELINE_HOUR_WIDTH,
  TIMELINE_SCROLL_ANIMATION_MS,
  TIMELINE_SNAP_DELAY_MS,
  TIMELINE_SNAP_RELEASE_MS,
} from './constants';
import { initHorizontalDragScroll } from './dragScroll';

type TimelineCarouselOptions = {
  currentHourIndex: number;
  maxHourIndex: number;
  minHourIndex: number;
};

function getSidePad(viewport: HTMLDivElement) {
  return Math.max(0, viewport.clientWidth / 2 - TIMELINE_HOUR_WIDTH / 2);
}

function getHourIndexAtCenter(viewport: HTMLDivElement) {
  const centerX = viewport.scrollLeft + viewport.clientWidth / 2;

  return Math.round((centerX - getSidePad(viewport) - TIMELINE_HOUR_WIDTH / 2) / TIMELINE_HOUR_WIDTH);
}

function getScrollLeftForHourIndex(viewport: HTMLDivElement, hourIndex: number) {
  return getSidePad(viewport)
    + hourIndex * TIMELINE_HOUR_WIDTH
    + TIMELINE_HOUR_WIDTH / 2
    - viewport.clientWidth / 2;
}

function getBoundedHourIndex(hourIndex: number, minHourIndex: number, maxHourIndex: number) {
  return Math.max(minHourIndex, Math.min(maxHourIndex, hourIndex));
}

function getClampedScrollLeftForHourIndex(
  viewport: HTMLDivElement,
  hourIndex: number,
  minHourIndex: number,
  maxHourIndex: number,
) {
  const scrollLeft = getScrollLeftForHourIndex(
    viewport,
    getBoundedHourIndex(hourIndex, minHourIndex, maxHourIndex),
  );
  const minScrollLeft = getScrollLeftForHourIndex(viewport, minHourIndex);
  const maxScrollLeft = getScrollLeftForHourIndex(viewport, maxHourIndex);

  return Math.max(minScrollLeft, Math.min(maxScrollLeft, scrollLeft));
}

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
}

export function useTimelineCarousel({
  currentHourIndex,
  maxHourIndex,
  minHourIndex,
}: TimelineCarouselOptions) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hasInitialScrollRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const lastScrollLeftRef = useRef(0);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const snapTimerRef = useRef<number | undefined>(undefined);
  const releaseTimerRef = useRef<number | undefined>(undefined);

  const setViewportRef = useCallback((element: HTMLDivElement | null) => {
    viewportRef.current = element;
  }, []);

  const syncLayout = useCallback(() => {
    const widget = widgetRef.current;
    const viewport = viewportRef.current;

    if (!widget || !viewport) {
      return;
    }

    widget.style.setProperty('--timeline-side-pad', `${getSidePad(viewport)}px`);
    widget.style.setProperty('--timeline-scroll-left', `${-viewport.scrollLeft}px`);
  }, []);

  const clearSnapTimer = useCallback(() => {
    if (snapTimerRef.current === undefined) {
      return;
    }

    window.clearTimeout(snapTimerRef.current);
    snapTimerRef.current = undefined;
  }, []);

  const clearScrollAnimation = useCallback(() => {
    if (animationFrameRef.current === undefined) {
      return;
    }

    window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = undefined;
  }, []);

  const releaseProgrammaticScroll = useCallback(() => {
    if (releaseTimerRef.current !== undefined) {
      window.clearTimeout(releaseTimerRef.current);
    }

    releaseTimerRef.current = window.setTimeout(() => {
      const viewport = viewportRef.current;

      isProgrammaticScrollRef.current = false;

      if (viewport) {
        lastScrollLeftRef.current = viewport.scrollLeft;
        syncLayout();
      }

      releaseTimerRef.current = undefined;
    }, TIMELINE_SNAP_RELEASE_MS);
  }, [syncLayout]);

  const animateScrollLeft = useCallback((targetScrollLeft: number) => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const startScrollLeft = viewport.scrollLeft;
    const distance = targetScrollLeft - startScrollLeft;
    const startTime = performance.now();

    clearScrollAnimation();

    if (Math.abs(distance) < 0.5) {
      viewport.scrollLeft = targetScrollLeft;
      syncLayout();
      releaseProgrammaticScroll();
      return;
    }

    const step = (time: number) => {
      const progress = Math.min((time - startTime) / TIMELINE_SCROLL_ANIMATION_MS, 1);

      viewport.scrollLeft = startScrollLeft + distance * easeOutCubic(progress);
      syncLayout();

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(step);
        return;
      }

      viewport.scrollLeft = targetScrollLeft;
      animationFrameRef.current = undefined;
      syncLayout();
      releaseProgrammaticScroll();
    };

    animationFrameRef.current = window.requestAnimationFrame(step);
  }, [clearScrollAnimation, releaseProgrammaticScroll, syncLayout]);

  const scrollToHourIndex = useCallback((hourIndex: number) => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const targetScrollLeft = getClampedScrollLeftForHourIndex(
      viewport,
      hourIndex,
      minHourIndex,
      maxHourIndex,
    );

    clearSnapTimer();
    isProgrammaticScrollRef.current = true;
    animateScrollLeft(targetScrollLeft);
  }, [animateScrollLeft, clearSnapTimer, maxHourIndex, minHourIndex]);

  const scrollByHours = useCallback((hours: number) => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    scrollToHourIndex(getHourIndexAtCenter(viewport) + hours);
  }, [scrollToHourIndex]);

  const resetScroll = useCallback(() => {
    if (currentHourIndex < 0) {
      return;
    }

    scrollToHourIndex(currentHourIndex);
  }, [currentHourIndex, scrollToHourIndex]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || hasInitialScrollRef.current || currentHourIndex < 0) {
      return;
    }

    viewport.scrollLeft = getClampedScrollLeftForHourIndex(
      viewport,
      currentHourIndex,
      minHourIndex,
      maxHourIndex,
    );
    hasInitialScrollRef.current = true;
    lastScrollLeftRef.current = viewport.scrollLeft;
    syncLayout();
  }, [currentHourIndex, maxHourIndex, minHourIndex, syncLayout]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const snapToNearestHour = () => {
      const targetScrollLeft = getClampedScrollLeftForHourIndex(
        viewport,
        getHourIndexAtCenter(viewport),
        minHourIndex,
        maxHourIndex,
      );

      snapTimerRef.current = undefined;

      if (Math.abs(targetScrollLeft - viewport.scrollLeft) < 0.5) {
        return;
      }

      isProgrammaticScrollRef.current = true;
      animateScrollLeft(targetScrollLeft);
    };

    const handleScroll = () => {
      const previousScrollLeft = lastScrollLeftRef.current;
      const minScrollLeft = getScrollLeftForHourIndex(viewport, minHourIndex);
      const maxScrollLeft = getScrollLeftForHourIndex(viewport, maxHourIndex);

      if (viewport.scrollLeft < minScrollLeft || viewport.scrollLeft > maxScrollLeft) {
        viewport.scrollLeft = Math.max(minScrollLeft, Math.min(maxScrollLeft, viewport.scrollLeft));
        lastScrollLeftRef.current = viewport.scrollLeft;
        syncLayout();
        return;
      }

      lastScrollLeftRef.current = viewport.scrollLeft;
      syncLayout();

      if (isProgrammaticScrollRef.current || Math.abs(viewport.scrollLeft - previousScrollLeft) < 0.5) {
        return;
      }

      clearSnapTimer();
      clearScrollAnimation();
      snapTimerRef.current = window.setTimeout(snapToNearestHour, TIMELINE_SNAP_DELAY_MS);
    };

    const resizeObserver = new ResizeObserver(syncLayout);

    syncLayout();
    lastScrollLeftRef.current = viewport.scrollLeft;
    viewport.addEventListener('scroll', handleScroll, { passive: true });
    resizeObserver.observe(viewport);

    return () => {
      clearSnapTimer();
      clearScrollAnimation();

      if (releaseTimerRef.current !== undefined) {
        window.clearTimeout(releaseTimerRef.current);
      }

      resizeObserver.disconnect();
      viewport.removeEventListener('scroll', handleScroll);
    };
  }, [animateScrollLeft, clearScrollAnimation, clearSnapTimer, maxHourIndex, minHourIndex, syncLayout]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    return initHorizontalDragScroll(viewport, {
      draggingClassName: 'timelinesViewport_dragging',
    });
  }, []);

  return {
    resetScroll,
    scrollByHours,
    setViewportRef,
    widgetRef,
  };
}
