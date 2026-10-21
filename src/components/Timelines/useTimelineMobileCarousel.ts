import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  TIMELINE_HOUR_WIDTH,
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
  initialHourIndex?: number;
  onHourChange?: (index: number) => void;
  freePanMode: boolean;
  maxHourIndex: number;
  minHourIndex: number;
};

const MOBILE_TIMELINE_SCROLL_ANIMATION_MS = 200;

export function useTimelineMobileCarousel({
  currentHourIndex,
  initialHourIndex,
  onHourChange,
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
  const centeredHourIndexRef = useRef(currentHourIndex);
  const hasUserInteractedRef = useRef(false);

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

      const progress = Math.min((time - startTime) / MOBILE_TIMELINE_SCROLL_ANIMATION_MS, 1);
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

    centeredHourIndexRef.current = Math.max(minHourIndex, Math.min(maxHourIndex, hourIndex));
    hasUserInteractedRef.current = true;
    onHourChange?.(centeredHourIndexRef.current);

    const targetScrollLeft = getClampedTimelineScrollLeftForHourIndex(
      viewport,
      hourIndex,
      minHourIndex,
      maxHourIndex,
    );

    cancelProgrammaticMotion();
    isProgrammaticScrollRef.current = true;
    animateScrollLeft(targetScrollLeft);
  }, [animateScrollLeft, cancelProgrammaticMotion, maxHourIndex, minHourIndex, onHourChange]);

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

  const cancelScrollAnimation = useCallback(() => {
    cancelProgrammaticMotion();
    syncLayout();
  }, [cancelProgrammaticMotion, syncLayout]);

  const isScrollAnimating = useCallback(() => animationFrameRef.current !== undefined, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;

    const initialIndex = initialHourIndex ?? currentHourIndex;
    if (!viewport || hasInitialScrollRef.current || initialIndex < 0) {
      return;
    }

    const initialScrollLeft = getClampedTimelineScrollLeftForHourIndex(
      viewport,
      initialIndex,
      minHourIndex,
      maxHourIndex,
    );

    virtualScrollLeftRef.current = initialScrollLeft;
    viewport.scrollLeft = freePanMode ? initialScrollLeft : 0;
    hasInitialScrollRef.current = true;
    centeredHourIndexRef.current = initialIndex;
    lastScrollLeftRef.current = initialScrollLeft;
    syncLayout();
  }, [currentHourIndex, initialHourIndex, freePanMode, maxHourIndex, minHourIndex, syncLayout]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const snapToNearestHour = () => {
      const targetHourIndex = getTimelineHourIndexAtCenter(viewport);
      if (hasUserInteractedRef.current) {
        onHourChange?.(Math.max(minHourIndex, Math.min(maxHourIndex, targetHourIndex)));
      }
      const targetScrollLeft = getClampedTimelineScrollLeftForHourIndex(
        viewport,
        targetHourIndex,
        minHourIndex,
        maxHourIndex,
      );

      if (Math.abs(targetScrollLeft - viewport.scrollLeft) < 0.5) {
        return;
      }

      centeredHourIndexRef.current = targetHourIndex;
      isProgrammaticScrollRef.current = true;
      animateScrollLeft(targetScrollLeft);
    };

    const handleScroll = () => {
      lastScrollLeftRef.current = viewport.scrollLeft;
      centeredHourIndexRef.current = getTimelineHourIndexAtCenter(viewport);
      syncLayout();
    };

    const handleScrollEnd = () => {
      if (!freePanMode || isProgrammaticScrollRef.current) {
        return;
      }

      snapToNearestHour();
    };

    const recenterAfterResize = () => {
      cancelProgrammaticMotion();

      const targetScrollLeft = getClampedTimelineScrollLeftForHourIndex(
        viewport,
        centeredHourIndexRef.current,
        minHourIndex,
        maxHourIndex,
      );

      if (freePanMode) {
        viewport.scrollLeft = targetScrollLeft;
      } else {
        virtualScrollLeftRef.current = targetScrollLeft;
        viewport.scrollLeft = 0;
      }

      lastScrollLeftRef.current = targetScrollLeft;
      syncLayout();
    };

    const resizeObserver = new ResizeObserver(recenterAfterResize);

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

    const markUserInteraction = () => { hasUserInteractedRef.current = true; };
    if (freePanMode) {
      viewport.addEventListener('pointerdown', markUserInteraction, { passive: true });
      viewport.addEventListener('wheel', markUserInteraction, { passive: true });
      viewport.addEventListener('scroll', handleScroll, { passive: true });
      viewport.addEventListener('scrollend', handleScrollEnd);
    }

    return () => {
      cancelProgrammaticMotion();
      resizeObserver.disconnect();

      if (freePanMode) {
        viewport.removeEventListener('pointerdown', markUserInteraction);
        viewport.removeEventListener('wheel', markUserInteraction);
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
    onHourChange,
    syncLayout,
  ]);

  return {
    cancelScrollAnimation,
    isScrollAnimating,
    resetScroll,
    scrollCurrentHourToEdge,
    scrollByHours,
    setViewportRef,
    widgetRef,
  };
}
