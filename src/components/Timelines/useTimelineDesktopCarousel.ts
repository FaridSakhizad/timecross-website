import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  TIMELINE_DESKTOP_SCROLLBAR_THUMB_WIDTH,
  TIMELINE_HOUR_WIDTH,
  TIMELINE_SCROLL_ANIMATION_MS,
  TIMELINE_SNAP_DELAY_MS,
  TIMELINE_SNAP_RELEASE_MS,
} from './constants';
import {
  getClampedTimelineScrollLeftForHourIndex,
  getTimelineEaseOutCubic,
  getTimelineHourIndexAtCenter,
  getTimelineScrollLeftForHourIndex,
  getTimelineSidePad,
} from './timelineScrollMath';

type TimelineDesktopCarouselOptions = {
  currentHourIndex: number;
  maxHourIndex: number;
  minHourIndex: number;
};

export function useTimelineDesktopCarousel({
  currentHourIndex,
  maxHourIndex,
  minHourIndex,
}: TimelineDesktopCarouselOptions) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hasInitialScrollRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const isScrollbarThumbDraggingRef = useRef(false);
  const lastScrollLeftRef = useRef(0);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const animationTokenRef = useRef(0);
  const snapTimerRef = useRef<number | undefined>(undefined);
  const releaseTimerRef = useRef<number | undefined>(undefined);
  const centeredHourIndexRef = useRef(currentHourIndex);

  const setViewportRef = useCallback((element: HTMLDivElement | null) => {
    if (viewportRef.current !== element) {
      hasInitialScrollRef.current = false;
    }

    viewportRef.current = element;
  }, []);

  const syncLayout = useCallback(() => {
    const widget = widgetRef.current;
    const viewport = viewportRef.current;

    if (!widget || !viewport) {
      return;
    }

    widget.style.setProperty('--timeline-side-pad', `${getTimelineSidePad(viewport)}px`);
    widget.style.setProperty('--timeline-scroll-left', `${-viewport.scrollLeft}px`);
    widget.style.setProperty('--timeline-viewport-width', `${viewport.clientWidth}px`);
  }, []);

  const clearSnapTimer = useCallback(() => {
    if (snapTimerRef.current === undefined) {
      return;
    }

    window.clearTimeout(snapTimerRef.current);
    snapTimerRef.current = undefined;
  }, []);

  const clearScrollAnimation = useCallback(() => {
    animationTokenRef.current += 1;

    if (animationFrameRef.current === undefined) {
      return;
    }

    window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = undefined;
  }, []);

  const clearReleaseTimer = useCallback(() => {
    if (releaseTimerRef.current === undefined) {
      return;
    }

    window.clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = undefined;
  }, []);

  const cancelProgrammaticMotion = useCallback(() => {
    clearSnapTimer();
    clearScrollAnimation();
    clearReleaseTimer();
    isProgrammaticScrollRef.current = false;
  }, [clearReleaseTimer, clearScrollAnimation, clearSnapTimer]);

  const releaseProgrammaticScroll = useCallback(() => {
    clearReleaseTimer();

    releaseTimerRef.current = window.setTimeout(() => {
      const viewport = viewportRef.current;

      isProgrammaticScrollRef.current = false;

      if (viewport) {
        lastScrollLeftRef.current = viewport.scrollLeft;
        syncLayout();
      }

      releaseTimerRef.current = undefined;
    }, TIMELINE_SNAP_RELEASE_MS);
  }, [clearReleaseTimer, syncLayout]);

  const animateScrollLeft = useCallback((targetScrollLeft: number) => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const startScrollLeft = viewport.scrollLeft;
    const distance = targetScrollLeft - startScrollLeft;
    const startTime = performance.now();
    const animationToken = animationTokenRef.current + 1;

    clearScrollAnimation();
    animationTokenRef.current = animationToken;

    if (Math.abs(distance) < 0.5) {
      viewport.scrollLeft = targetScrollLeft;
      syncLayout();
      releaseProgrammaticScroll();
      return;
    }

    const step = (time: number) => {
      if (animationTokenRef.current !== animationToken) {
        return;
      }

      const progress = Math.min((time - startTime) / TIMELINE_SCROLL_ANIMATION_MS, 1);

      viewport.scrollLeft = startScrollLeft + distance * getTimelineEaseOutCubic(progress);
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

    centeredHourIndexRef.current = Math.max(minHourIndex, Math.min(maxHourIndex, hourIndex));

    const targetScrollLeft = getClampedTimelineScrollLeftForHourIndex(
      viewport,
      hourIndex,
      minHourIndex,
      maxHourIndex,
    );

    cancelProgrammaticMotion();
    isProgrammaticScrollRef.current = true;
    animateScrollLeft(targetScrollLeft);
  }, [animateScrollLeft, cancelProgrammaticMotion, maxHourIndex, minHourIndex]);

  const scrollByHours = useCallback((hours: number) => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    scrollToHourIndex(getTimelineHourIndexAtCenter(viewport) + hours);
  }, [scrollToHourIndex]);

  const resetScroll = useCallback(() => {
    if (currentHourIndex < 0) {
      return;
    }

    scrollToHourIndex(currentHourIndex);
  }, [currentHourIndex, scrollToHourIndex]);

  const scrollCurrentHourToEdge = useCallback((direction: 'left' | 'right') => {
    const viewport = viewportRef.current;

    if (!viewport || currentHourIndex < 0) {
      return;
    }

    const edgeDistance = Math.max(
      0,
      Math.floor((viewport.clientWidth / 2 - TIMELINE_HOUR_WIDTH / 2) / TIMELINE_HOUR_WIDTH),
    );
    const targetHourIndex = direction === 'left'
      ? currentHourIndex + edgeDistance
      : currentHourIndex - edgeDistance;

    scrollToHourIndex(targetHourIndex);
  }, [currentHourIndex, scrollToHourIndex]);

  const getScrollbarMetrics = useCallback((axis: 'horizontal' | 'vertical', viewport: HTMLDivElement) => {
    if (axis === 'vertical' || currentHourIndex < 0) {
      return undefined;
    }

    return {
      centerScrollOffset: getClampedTimelineScrollLeftForHourIndex(
        viewport,
        currentHourIndex,
        minHourIndex,
        maxHourIndex,
      ),
      maxScrollOffset: getTimelineScrollLeftForHourIndex(viewport, maxHourIndex),
      minScrollOffset: getTimelineScrollLeftForHourIndex(viewport, minHourIndex),
      thumbLength: TIMELINE_DESKTOP_SCROLLBAR_THUMB_WIDTH,
    };
  }, [currentHourIndex, maxHourIndex, minHourIndex]);

  const snapToNearestHour = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport || isScrollbarThumbDraggingRef.current) {
      return;
    }

    const targetScrollLeft = getClampedTimelineScrollLeftForHourIndex(
      viewport,
      getTimelineHourIndexAtCenter(viewport),
      minHourIndex,
      maxHourIndex,
    );

    snapTimerRef.current = undefined;

    if (Math.abs(targetScrollLeft - viewport.scrollLeft) < 0.5) {
      return;
    }

    centeredHourIndexRef.current = getTimelineHourIndexAtCenter(viewport);
    isProgrammaticScrollRef.current = true;
    animateScrollLeft(targetScrollLeft);
  }, [animateScrollLeft, maxHourIndex, minHourIndex]);

  const handleScrollbarThumbDragStart = useCallback(() => {
    isScrollbarThumbDraggingRef.current = true;
    cancelProgrammaticMotion();
  }, [cancelProgrammaticMotion]);

  const handleScrollbarThumbDragEnd = useCallback((axis: 'horizontal' | 'vertical') => {
    const viewport = viewportRef.current;

    isScrollbarThumbDraggingRef.current = false;

    if (!viewport) {
      return;
    }

    lastScrollLeftRef.current = viewport.scrollLeft;
    centeredHourIndexRef.current = getTimelineHourIndexAtCenter(viewport);
    syncLayout();

    if (axis === 'horizontal') {
      window.requestAnimationFrame(snapToNearestHour);
    }
  }, [snapToNearestHour, syncLayout]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || hasInitialScrollRef.current || currentHourIndex < 0) {
      return;
    }

    viewport.scrollLeft = getClampedTimelineScrollLeftForHourIndex(
      viewport,
      currentHourIndex,
      minHourIndex,
      maxHourIndex,
    );
    hasInitialScrollRef.current = true;
    centeredHourIndexRef.current = currentHourIndex;
    lastScrollLeftRef.current = viewport.scrollLeft;
    syncLayout();
  }, [currentHourIndex, maxHourIndex, minHourIndex, syncLayout]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const scheduleSnapToNearestHour = (delay = TIMELINE_SNAP_DELAY_MS) => {
      if (isProgrammaticScrollRef.current || isScrollbarThumbDraggingRef.current) {
        return;
      }

      clearSnapTimer();
      clearScrollAnimation();
      snapTimerRef.current = window.setTimeout(snapToNearestHour, delay);
    };

    const handleScroll = () => {
      const previousScrollLeft = lastScrollLeftRef.current;
      const minScrollLeft = getTimelineScrollLeftForHourIndex(viewport, minHourIndex);
      const maxScrollLeft = getTimelineScrollLeftForHourIndex(viewport, maxHourIndex);

      if (viewport.scrollLeft < minScrollLeft || viewport.scrollLeft > maxScrollLeft) {
        viewport.scrollLeft = Math.max(minScrollLeft, Math.min(maxScrollLeft, viewport.scrollLeft));
        lastScrollLeftRef.current = viewport.scrollLeft;
        centeredHourIndexRef.current = getTimelineHourIndexAtCenter(viewport);
        syncLayout();
        return;
      }

      lastScrollLeftRef.current = viewport.scrollLeft;
      centeredHourIndexRef.current = getTimelineHourIndexAtCenter(viewport);
      syncLayout();

      if (
        isProgrammaticScrollRef.current
        || isScrollbarThumbDraggingRef.current
        || Math.abs(viewport.scrollLeft - previousScrollLeft) < 0.5
      ) {
        return;
      }

      scheduleSnapToNearestHour();
    };

    const handleScrollEnd = () => {
      if (isProgrammaticScrollRef.current) {
        return;
      }

      scheduleSnapToNearestHour(0);
    };

    const handleWheel = () => {
      cancelProgrammaticMotion();
    };

    const recenterAfterResize = () => {
      cancelProgrammaticMotion();
      viewport.scrollLeft = getClampedTimelineScrollLeftForHourIndex(
        viewport,
        centeredHourIndexRef.current,
        minHourIndex,
        maxHourIndex,
      );
      lastScrollLeftRef.current = viewport.scrollLeft;
      syncLayout();
    };

    const resizeObserver = new ResizeObserver(recenterAfterResize);

    syncLayout();
    lastScrollLeftRef.current = viewport.scrollLeft;
    viewport.addEventListener('scroll', handleScroll, { passive: true });
    viewport.addEventListener('scrollend', handleScrollEnd);
    viewport.addEventListener('wheel', handleWheel, { passive: true });
    resizeObserver.observe(viewport);

    return () => {
      cancelProgrammaticMotion();
      resizeObserver.disconnect();
      viewport.removeEventListener('scroll', handleScroll);
      viewport.removeEventListener('scrollend', handleScrollEnd);
      viewport.removeEventListener('wheel', handleWheel);
    };
  }, [
    animateScrollLeft,
    cancelProgrammaticMotion,
    clearScrollAnimation,
    clearSnapTimer,
    maxHourIndex,
    minHourIndex,
    snapToNearestHour,
    syncLayout,
  ]);

  return {
    handleScrollbarThumbDragEnd,
    handleScrollbarThumbDragStart,
    getScrollbarMetrics,
    resetScroll,
    scrollCurrentHourToEdge,
    scrollByHours,
    setViewportRef,
    widgetRef,
  };
}
