import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  TIMELINE_HOUR_WIDTH,
  TIMELINE_SCROLL_ANIMATION_MS,
  TIMELINE_SNAP_RELEASE_MS,
} from './constants';
import {
  getClampedTimelineScrollLeftForHourIndex,
  getTimelineEaseOutCubic,
  getTimelineHourIndexAtCenter,
  getTimelineSidePad,
} from './timelineScrollMath';

type TimelineMobileCarouselOptions = {
  currentHourIndex: number;
  freePanMode: boolean;
  maxHourIndex: number;
  minHourIndex: number;
};

export function useTimelineMobileCarousel({
  currentHourIndex,
  freePanMode,
  maxHourIndex,
  minHourIndex,
}: TimelineMobileCarouselOptions) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hasInitialScrollRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const lastScrollLeftRef = useRef(0);
  const virtualScrollLeftRef = useRef(0);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const animationTokenRef = useRef(0);
  const releaseTimerRef = useRef<number | undefined>(undefined);

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

    const scrollLeft = freePanMode ? viewport.scrollLeft : virtualScrollLeftRef.current;

    widget.style.setProperty('--timeline-side-pad', `${getTimelineSidePad(viewport)}px`);
    widget.style.setProperty('--timeline-scroll-left', `${-scrollLeft}px`);
    widget.style.setProperty('--timeline-viewport-width', `${viewport.clientWidth}px`);
  }, [freePanMode]);

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
    clearScrollAnimation();
    clearReleaseTimer();
    isProgrammaticScrollRef.current = false;
  }, [clearReleaseTimer, clearScrollAnimation]);

  const releaseProgrammaticScroll = useCallback(() => {
    clearReleaseTimer();

    releaseTimerRef.current = window.setTimeout(() => {
      const viewport = viewportRef.current;

      isProgrammaticScrollRef.current = false;

      if (viewport) {
        lastScrollLeftRef.current = freePanMode ? viewport.scrollLeft : virtualScrollLeftRef.current;
        syncLayout();
      }

      releaseTimerRef.current = undefined;
    }, TIMELINE_SNAP_RELEASE_MS);
  }, [clearReleaseTimer, freePanMode, syncLayout]);

  const animateScrollLeft = useCallback((targetScrollLeft: number) => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const startScrollLeft = freePanMode ? viewport.scrollLeft : virtualScrollLeftRef.current;
    const distance = targetScrollLeft - startScrollLeft;
    const startTime = performance.now();
    const animationToken = animationTokenRef.current + 1;

    clearScrollAnimation();
    animationTokenRef.current = animationToken;

    if (Math.abs(distance) < 0.5) {
      if (freePanMode) {
        viewport.scrollLeft = targetScrollLeft;
      } else {
        virtualScrollLeftRef.current = targetScrollLeft;
      }

      syncLayout();
      releaseProgrammaticScroll();
      return;
    }

    const step = (time: number) => {
      if (animationTokenRef.current !== animationToken) {
        return;
      }

      const progress = Math.min((time - startTime) / TIMELINE_SCROLL_ANIMATION_MS, 1);
      const nextScrollLeft = startScrollLeft + distance * getTimelineEaseOutCubic(progress);

      if (freePanMode) {
        viewport.scrollLeft = nextScrollLeft;
      } else {
        virtualScrollLeftRef.current = nextScrollLeft;
      }

      syncLayout();

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(step);
        return;
      }

      if (freePanMode) {
        viewport.scrollLeft = targetScrollLeft;
      } else {
        virtualScrollLeftRef.current = targetScrollLeft;
      }

      animationFrameRef.current = undefined;
      syncLayout();
      releaseProgrammaticScroll();
    };

    animationFrameRef.current = window.requestAnimationFrame(step);
  }, [clearScrollAnimation, freePanMode, releaseProgrammaticScroll, syncLayout]);

  const scrollToHourIndex = useCallback((hourIndex: number) => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

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

    const centerHourIndex = freePanMode
      ? getTimelineHourIndexAtCenter(viewport)
      : Math.round(
        (
          virtualScrollLeftRef.current
          + viewport.clientWidth / 2
          - getTimelineSidePad(viewport)
          - TIMELINE_HOUR_WIDTH / 2
        ) / TIMELINE_HOUR_WIDTH,
      );

    scrollToHourIndex(centerHourIndex + hours);
  }, [freePanMode, scrollToHourIndex]);

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

    const initialScrollLeft = getClampedTimelineScrollLeftForHourIndex(
      viewport,
      currentHourIndex,
      minHourIndex,
      maxHourIndex,
    );

    virtualScrollLeftRef.current = initialScrollLeft;
    viewport.scrollLeft = freePanMode ? initialScrollLeft : 0;
    hasInitialScrollRef.current = true;
    lastScrollLeftRef.current = initialScrollLeft;
    syncLayout();
  }, [currentHourIndex, freePanMode, maxHourIndex, minHourIndex, syncLayout]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const snapToNearestHour = () => {
      const targetScrollLeft = getClampedTimelineScrollLeftForHourIndex(
        viewport,
        getTimelineHourIndexAtCenter(viewport),
        minHourIndex,
        maxHourIndex,
      );

      if (Math.abs(targetScrollLeft - viewport.scrollLeft) < 0.5) {
        return;
      }

      isProgrammaticScrollRef.current = true;
      animateScrollLeft(targetScrollLeft);
    };

    const handleScroll = () => {
      lastScrollLeftRef.current = viewport.scrollLeft;
      syncLayout();
    };

    const handleScrollEnd = () => {
      if (!freePanMode || isProgrammaticScrollRef.current) {
        return;
      }

      snapToNearestHour();
    };

    const resizeObserver = new ResizeObserver(syncLayout);

    cancelProgrammaticMotion();

    if (freePanMode) {
      viewport.scrollLeft = virtualScrollLeftRef.current;
    } else {
      virtualScrollLeftRef.current = viewport.scrollLeft || virtualScrollLeftRef.current;
      viewport.scrollLeft = 0;
    }

    syncLayout();
    lastScrollLeftRef.current = freePanMode ? viewport.scrollLeft : virtualScrollLeftRef.current;
    resizeObserver.observe(viewport);

    if (freePanMode) {
      viewport.addEventListener('scroll', handleScroll, { passive: true });
      viewport.addEventListener('scrollend', handleScrollEnd);
    }

    return () => {
      cancelProgrammaticMotion();
      resizeObserver.disconnect();

      if (freePanMode) {
        viewport.removeEventListener('scroll', handleScroll);
        viewport.removeEventListener('scrollend', handleScrollEnd);
      }
    };
  }, [
    animateScrollLeft,
    cancelProgrammaticMotion,
    freePanMode,
    maxHourIndex,
    minHourIndex,
    syncLayout,
  ]);

  return {
    resetScroll,
    scrollByHours,
    setViewportRef,
    widgetRef,
  };
}
