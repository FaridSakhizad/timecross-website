import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  TIMELINE_SCROLL_ANIMATION_MS,
  TIMELINE_SNAP_DELAY_MS,
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
  maxHourIndex: number;
  minHourIndex: number;
};

export function useTimelineMobileCarousel({
  currentHourIndex,
  maxHourIndex,
  minHourIndex,
}: TimelineMobileCarouselOptions) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const hasInitialScrollRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);
  const lastScrollLeftRef = useRef(0);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const animationTokenRef = useRef(0);
  const snapTimerRef = useRef<number | undefined>(undefined);
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
    lastScrollLeftRef.current = viewport.scrollLeft;
    syncLayout();
  }, [currentHourIndex, maxHourIndex, minHourIndex, syncLayout]);

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

      snapTimerRef.current = undefined;

      if (Math.abs(targetScrollLeft - viewport.scrollLeft) < 0.5) {
        return;
      }

      isProgrammaticScrollRef.current = true;
      animateScrollLeft(targetScrollLeft);
    };

    const scheduleSnapToNearestHour = (delay = TIMELINE_SNAP_DELAY_MS) => {
      if (isProgrammaticScrollRef.current) {
        return;
      }

      clearSnapTimer();
      clearScrollAnimation();
      snapTimerRef.current = window.setTimeout(snapToNearestHour, delay);
    };

    const handleScroll = () => {
      lastScrollLeftRef.current = viewport.scrollLeft;
      syncLayout();
      scheduleSnapToNearestHour();
    };

    const handleScrollEnd = () => {
      scheduleSnapToNearestHour(0);
    };
    const resizeObserver = new ResizeObserver(syncLayout);

    cancelProgrammaticMotion();
    syncLayout();
    lastScrollLeftRef.current = viewport.scrollLeft;
    viewport.addEventListener('scroll', handleScroll, { passive: true });
    viewport.addEventListener('scrollend', handleScrollEnd);
    resizeObserver.observe(viewport);

    return () => {
      cancelProgrammaticMotion();
      resizeObserver.disconnect();
      viewport.removeEventListener('scroll', handleScroll);
      viewport.removeEventListener('scrollend', handleScrollEnd);
    };
  }, [
    animateScrollLeft,
    cancelProgrammaticMotion,
    clearScrollAnimation,
    clearSnapTimer,
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
