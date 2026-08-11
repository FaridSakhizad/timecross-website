import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';

const TIMELINE_GRID_SNAP_DELAY_MS = 500;
const TIMELINE_GRID_SNAP_EPSILON = 0.5;

type TimelineGridScrollTarget =
  | { type: 'page' }
  | { type: 'element'; element: HTMLDivElement };

function getTimelineGridPageScroller() {
  return document.scrollingElement;
}

function getTimelineGridScrollLeft(scrollTarget: TimelineGridScrollTarget) {
  return scrollTarget.type === 'page'
    ? window.scrollX
    : scrollTarget.element.scrollLeft;
}

function getTimelineGridViewportWidth(scrollTarget: TimelineGridScrollTarget) {
  return scrollTarget.type === 'page'
    ? window.innerWidth
    : scrollTarget.element.clientWidth;
}

function getTimelineGridAnchorCenter(anchor: HTMLElement, scrollTarget: TimelineGridScrollTarget) {
  if (scrollTarget.type === 'page') {
    const anchorRect = anchor.getBoundingClientRect();

    return window.scrollX + anchorRect.left + anchorRect.width / 2;
  }

  return anchor.offsetLeft + anchor.offsetWidth / 2;
}

function getTimelineGridAnchorScrollLeft(anchor: HTMLElement, scrollTarget: TimelineGridScrollTarget) {
  return getTimelineGridAnchorCenter(anchor, scrollTarget)
    - getTimelineGridViewportWidth(scrollTarget) / 2;
}

function scrollTimelineGridToLeft(scrollTarget: TimelineGridScrollTarget, nextScrollLeft: number) {
  if (scrollTarget.type === 'page') {
    const pageScroller = getTimelineGridPageScroller();

    if (!pageScroller) {
      return;
    }

    pageScroller.scrollTo({
      left: nextScrollLeft,
      top: window.scrollY,
      behavior: 'smooth',
    });
    return;
  }

  scrollTarget.element.scrollTo({
    left: nextScrollLeft,
    top: scrollTarget.element.scrollTop,
    behavior: 'smooth',
  });
}

function setTimelineGridScrollLeft(scrollTarget: TimelineGridScrollTarget, nextScrollLeft: number) {
  if (scrollTarget.type === 'page') {
    const pageScroller = getTimelineGridPageScroller();

    if (!pageScroller) {
      return;
    }

    pageScroller.scrollLeft = nextScrollLeft;
    return;
  }

  scrollTarget.element.scrollLeft = nextScrollLeft;
}

function getTimelineGridRoot(scrollTarget: TimelineGridScrollTarget) {
  return scrollTarget.type === 'page' ? document : scrollTarget.element;
}

function getTimelineGridSnapTargets(scrollTarget: TimelineGridScrollTarget) {
  const root = getTimelineGridRoot(scrollTarget);
  const firstCellsRow = root.querySelector<HTMLElement>('.timelineGrid-cells');

  if (!firstCellsRow) {
    return [];
  }

  return Array.from(firstCellsRow.querySelectorAll<HTMLElement>('.timelineGrid-cell'));
}

function getTimelineGridCurrentTarget(scrollTarget: TimelineGridScrollTarget) {
  const root = getTimelineGridRoot(scrollTarget);
  const firstCellsRow = root.querySelector<HTMLElement>('.timelineGrid-cells');

  return firstCellsRow?.querySelector<HTMLElement>('.timelineGrid-cell_current') ?? null;
}

function getTimelineGridNearestSnapTarget(scrollTarget: TimelineGridScrollTarget) {
  const snapTargets = getTimelineGridSnapTargets(scrollTarget);

  if (snapTargets.length === 0) {
    return null;
  }

  const centerX = getTimelineGridScrollLeft(scrollTarget)
    + getTimelineGridViewportWidth(scrollTarget) / 2;
  let nearestTarget = snapTargets[0];
  let nearestDistance = Number.POSITIVE_INFINITY;

  snapTargets.forEach((snapTarget) => {
    const anchorCenterX = getTimelineGridAnchorCenter(snapTarget, scrollTarget);
    const distance = Math.abs(anchorCenterX - centerX);

    if (distance < nearestDistance) {
      nearestTarget = snapTarget;
      nearestDistance = distance;
    }
  });

  return nearestTarget;
}

function getTimelineGridSnapTargetIndex(target: HTMLElement, scrollTarget: TimelineGridScrollTarget) {
  return getTimelineGridSnapTargets(scrollTarget).indexOf(target);
}

function getTimelineGridSnapTargetByIndex(index: number, scrollTarget: TimelineGridScrollTarget) {
  return getTimelineGridSnapTargets(scrollTarget)[index] ?? null;
}

function snapTimelineGridToTarget(scrollTarget: TimelineGridScrollTarget, snapTarget: HTMLElement) {
  const nextScrollLeft = getTimelineGridAnchorScrollLeft(snapTarget, scrollTarget);

  if (
    Math.abs(nextScrollLeft - getTimelineGridScrollLeft(scrollTarget))
    <= TIMELINE_GRID_SNAP_EPSILON
  ) {
    return;
  }

  scrollTimelineGridToLeft(scrollTarget, nextScrollLeft);
}

function snapTimelineGridToNearestHour(scrollTarget: TimelineGridScrollTarget) {
  const nearestTarget = getTimelineGridNearestSnapTarget(scrollTarget);

  if (!nearestTarget) {
    return null;
  }

  snapTimelineGridToTarget(scrollTarget, nearestTarget);

  return nearestTarget;
}

function useTimelineGridSnap(
  getScrollTarget: () => TimelineGridScrollTarget | null,
  currentUserHourIndex: number,
) {
  const centeredTargetIndexRef = useRef(currentUserHourIndex);

  const resetToCurrentHour = useCallback(() => {
    const scrollTarget = getScrollTarget();

    if (!scrollTarget || currentUserHourIndex < 0) {
      return;
    }

    const currentTarget = getTimelineGridCurrentTarget(scrollTarget);

    if (!currentTarget) {
      return;
    }

    centeredTargetIndexRef.current = getTimelineGridSnapTargetIndex(currentTarget, scrollTarget);
    scrollTimelineGridToLeft(scrollTarget, getTimelineGridAnchorScrollLeft(currentTarget, scrollTarget));
  }, [currentUserHourIndex, getScrollTarget]);

  useLayoutEffect(() => {
    const scrollTarget = getScrollTarget();

    if (!scrollTarget || currentUserHourIndex < 0) {
      return;
    }

    const currentTarget = getTimelineGridCurrentTarget(scrollTarget);

    if (!currentTarget) {
      return;
    }

    centeredTargetIndexRef.current = getTimelineGridSnapTargetIndex(currentTarget, scrollTarget);
    setTimelineGridScrollLeft(scrollTarget, getTimelineGridAnchorScrollLeft(currentTarget, scrollTarget));
  }, [currentUserHourIndex, getScrollTarget]);

  useEffect(() => {
    const scrollTarget = getScrollTarget();

    if (!scrollTarget) {
      return undefined;
    }

    const eventTarget = scrollTarget.type === 'page' ? window : scrollTarget.element;
    let lastScrollLeft = getTimelineGridScrollLeft(scrollTarget);
    let snapTimeoutId: number | undefined;

    const clearSnapTimeout = () => {
      if (snapTimeoutId === undefined) {
        return;
      }

      window.clearTimeout(snapTimeoutId);
      snapTimeoutId = undefined;
    };

    const scheduleSnap = () => {
      clearSnapTimeout();
      snapTimeoutId = window.setTimeout(() => {
        snapTimeoutId = undefined;
        const snapTarget = snapTimelineGridToNearestHour(scrollTarget);

        if (snapTarget) {
          centeredTargetIndexRef.current = getTimelineGridSnapTargetIndex(snapTarget, scrollTarget);
        }
      }, TIMELINE_GRID_SNAP_DELAY_MS);
    };

    const handleScroll = () => {
      const scrollLeft = getTimelineGridScrollLeft(scrollTarget);
      const scrollLeftDelta = Math.abs(scrollLeft - lastScrollLeft);

      lastScrollLeft = scrollLeft;

      const nearestTarget = getTimelineGridNearestSnapTarget(scrollTarget);

      if (nearestTarget) {
        centeredTargetIndexRef.current = getTimelineGridSnapTargetIndex(nearestTarget, scrollTarget);
      }

      if (scrollLeftDelta <= TIMELINE_GRID_SNAP_EPSILON) {
        return;
      }

      scheduleSnap();
    };

    const handleScrollEnd = () => {
      scheduleSnap();
    };

    const recenterAfterResize = () => {
      const snapTarget = getTimelineGridSnapTargetByIndex(centeredTargetIndexRef.current, scrollTarget);

      if (!snapTarget) {
        return;
      }

      clearSnapTimeout();
      setTimelineGridScrollLeft(scrollTarget, getTimelineGridAnchorScrollLeft(snapTarget, scrollTarget));
      lastScrollLeft = getTimelineGridScrollLeft(scrollTarget);
    };

    eventTarget.addEventListener('scroll', handleScroll, { passive: true });
    eventTarget.addEventListener('scrollend', handleScrollEnd);
    window.addEventListener('resize', recenterAfterResize);
    window.visualViewport?.addEventListener('resize', recenterAfterResize);

    return () => {
      clearSnapTimeout();
      eventTarget.removeEventListener('scroll', handleScroll);
      eventTarget.removeEventListener('scrollend', handleScrollEnd);
      window.removeEventListener('resize', recenterAfterResize);
      window.visualViewport?.removeEventListener('resize', recenterAfterResize);
    };
  }, [getScrollTarget]);

  return resetToCurrentHour;
}

export function useTimelineGridPageSnap(currentUserHourIndex: number) {
  const getScrollTarget = useCallback(() => ({ type: 'page' }) as const, []);

  return useTimelineGridSnap(getScrollTarget, currentUserHourIndex);
}

export function useTimelineGridElementSnap(
  timelineGridRef: RefObject<HTMLDivElement | null>,
  currentUserHourIndex: number,
) {
  const getScrollTarget = useCallback(
    () => (
      timelineGridRef.current
        ? { type: 'element', element: timelineGridRef.current }
        : null
    ),
    [timelineGridRef],
  ) satisfies () => TimelineGridScrollTarget | null;

  return useTimelineGridSnap(getScrollTarget, currentUserHourIndex);
}
