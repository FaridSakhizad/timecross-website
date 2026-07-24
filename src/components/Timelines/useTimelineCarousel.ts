import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  TIMELINE_HOUR_WIDTH,
  TIMELINE_SCROLL_ANIMATION_MS,
  TIMELINE_SNAP_DELAY_MS,
  TIMELINE_SNAP_RELEASE_MS,
} from './constants';

type TimelineCarouselOptions = {
  currentHourIndex: number;
  maxHourIndex: number;
  minHourIndex: number;
};

type TouchGesture = {
  mode: 'pending' | 'horizontal' | 'vertical';
  startScrollLeft: number;
  startX: number;
  startY: number;
};

const TOUCH_AXIS_LOCK_THRESHOLD = 8;
const TOUCH_AXIS_LOCK_RATIO = 1.2;

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
  const animationTokenRef = useRef(0);
  const snapTimerRef = useRef<number | undefined>(undefined);
  const releaseTimerRef = useRef<number | undefined>(undefined);
  const touchGestureRef = useRef<TouchGesture | null>(null);
  const isUserInteractingRef = useRef(false);

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

    cancelProgrammaticMotion();
    isProgrammaticScrollRef.current = true;
    animateScrollLeft(targetScrollLeft);
  }, [animateScrollLeft, cancelProgrammaticMotion, maxHourIndex, minHourIndex]);

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

      if (
        isUserInteractingRef.current
        || isProgrammaticScrollRef.current
        || Math.abs(viewport.scrollLeft - previousScrollLeft) < 0.5
      ) {
        return;
      }

      clearSnapTimer();
      clearScrollAnimation();
      snapTimerRef.current = window.setTimeout(snapToNearestHour, TIMELINE_SNAP_DELAY_MS);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        touchGestureRef.current = null;
        return;
      }

      cancelProgrammaticMotion();
      isUserInteractingRef.current = true;

      const touch = event.touches[0];

      touchGestureRef.current = {
        mode: 'pending',
        startScrollLeft: viewport.scrollLeft,
        startX: touch.clientX,
        startY: touch.clientY,
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      const gesture = touchGestureRef.current;

      if (!gesture || event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];
      const deltaX = touch.clientX - gesture.startX;
      const deltaY = touch.clientY - gesture.startY;
      const absoluteX = Math.abs(deltaX);
      const absoluteY = Math.abs(deltaY);

      if (gesture.mode === 'pending') {
        if (
          absoluteX < TOUCH_AXIS_LOCK_THRESHOLD
          && absoluteY < TOUCH_AXIS_LOCK_THRESHOLD
        ) {
          return;
        }

        gesture.mode = absoluteX > absoluteY * TOUCH_AXIS_LOCK_RATIO
          ? 'horizontal'
          : 'vertical';
      }

      if (gesture.mode === 'vertical') {
        return;
      }

      event.preventDefault();
      viewport.scrollLeft = gesture.startScrollLeft - deltaX;
      syncLayout();
    };

    const handleTouchEnd = () => {
      const gesture = touchGestureRef.current;

      touchGestureRef.current = null;
      isUserInteractingRef.current = false;

      if (gesture?.mode === 'horizontal') {
        clearSnapTimer();
        snapTimerRef.current = window.setTimeout(snapToNearestHour, TIMELINE_SNAP_DELAY_MS);
      }
    };

    const handleWheel = () => {
      cancelProgrammaticMotion();
      isUserInteractingRef.current = false;
    };

    const resizeObserver = new ResizeObserver(syncLayout);

    syncLayout();
    lastScrollLeftRef.current = viewport.scrollLeft;
    viewport.addEventListener('scroll', handleScroll, { passive: true });
    viewport.addEventListener('touchstart', handleTouchStart, { passive: true });
    viewport.addEventListener('touchmove', handleTouchMove, { passive: false });
    viewport.addEventListener('touchend', handleTouchEnd);
    viewport.addEventListener('touchcancel', handleTouchEnd);
    viewport.addEventListener('wheel', handleWheel, { passive: true });
    resizeObserver.observe(viewport);

    return () => {
      cancelProgrammaticMotion();
      isUserInteractingRef.current = false;
      touchGestureRef.current = null;

      resizeObserver.disconnect();
      viewport.removeEventListener('scroll', handleScroll);
      viewport.removeEventListener('touchstart', handleTouchStart);
      viewport.removeEventListener('touchmove', handleTouchMove);
      viewport.removeEventListener('touchend', handleTouchEnd);
      viewport.removeEventListener('touchcancel', handleTouchEnd);
      viewport.removeEventListener('wheel', handleWheel);
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
