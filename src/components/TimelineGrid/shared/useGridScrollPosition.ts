import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/** How long the grid stays still before its middle hour counts: the end of a scroll or a fling. */
const SETTLE_DELAY_MS = 200;
/** Less than this, in pixels, is not a scroll. */
const SCROLL_EPSILON = 0.5;

export type TimelineGridScrollTarget = | { type: 'page' }
  | { type: 'element'; element: HTMLDivElement };

function getScrollLeft(scrollTarget: TimelineGridScrollTarget) {
  return scrollTarget.type === 'page'
    ? window.scrollX
    : scrollTarget.element.scrollLeft;
}

function getViewportWidth(scrollTarget: TimelineGridScrollTarget) {
  return scrollTarget.type === 'page'
    ? window.innerWidth
    : scrollTarget.element.clientWidth;
}

function getHourCenter(hour: HTMLElement, scrollTarget: TimelineGridScrollTarget) {
  if (scrollTarget.type === 'page') {
    const rect = hour.getBoundingClientRect();

    return window.scrollX + rect.left + rect.width / 2;
  }

  return hour.offsetLeft + hour.offsetWidth / 2;
}

/** The scroll position that puts `hour` in the middle of the view. */
function getCenteringScrollLeft(hour: HTMLElement, scrollTarget: TimelineGridScrollTarget) {
  return getHourCenter(hour, scrollTarget) - getViewportWidth(scrollTarget) / 2;
}

function scrollToLeft(scrollTarget: TimelineGridScrollTarget, left: number, behavior: ScrollBehavior) {
  const scroller = scrollTarget.type === 'page' ? document.scrollingElement : scrollTarget.element;

  scroller?.scrollTo({ left, top: scroller.scrollTop, behavior });
}

/** The first row's hour cells: their order is the timeline's. */
function getHourCells(scrollTarget: TimelineGridScrollTarget) {
  const root = scrollTarget.type === 'page' ? document : scrollTarget.element;
  const firstRow = root.querySelector<HTMLElement>('.timelineGrid-cells');

  return firstRow ? Array.from(firstRow.querySelectorAll<HTMLElement>('.timelineGrid-cell')) : [];
}

function getCurrentHourCell(scrollTarget: TimelineGridScrollTarget) {
  const root = scrollTarget.type === 'page' ? document : scrollTarget.element;

  return root.querySelector<HTMLElement>('.timelineGrid-cells .timelineGrid-cell_current');
}

/** The index of the hour nearest to the middle of the view; -1 without cells. */
function getMiddleHourIndex(scrollTarget: TimelineGridScrollTarget) {
  const middle = getScrollLeft(scrollTarget) + getViewportWidth(scrollTarget) / 2;
  let nearestIndex = -1;
  let nearestDistance = Number.POSITIVE_INFINITY;

  getHourCells(scrollTarget).forEach((hour, index) => {
    const distance = Math.abs(getHourCenter(hour, scrollTarget) - middle);

    if (distance < nearestDistance) {
      nearestIndex = index;
      nearestDistance = distance;
    }
  });

  return nearestIndex;
}

/**
 * Where the grid is scrolled to. It opens with an hour in the middle (`initialFocusHourIndex`, else
 * the current hour); the returned function brings the current hour back. The grid is never moved
 * on its own after a scroll: when it has settled, the hour now in the middle is reported
 * (`onHourChange`), for the date in the footer and the address. A window resize keeps that hour in
 * the middle.
 */
export function useTimelineGridScrollPosition(
  getScrollTarget: () => TimelineGridScrollTarget | null,
  currentUserHourIndex: number,
  disabled = false,
  /** During a drag (panning, selecting) the grid is not considered settled. */
  isInteracting?: () => boolean,
  initialFocusHourIndex?: number,
  onHourChange?: (index: number) => void,
) {
  const middleIndexRef = useRef(currentUserHourIndex);

  const scrollToCurrentHour = useCallback(() => {
    const scrollTarget = getScrollTarget();
    const currentHour = scrollTarget && getCurrentHourCell(scrollTarget);

    if (!scrollTarget || !currentHour || isInteracting?.()) {
      return;
    }

    scrollToLeft(scrollTarget, getCenteringScrollLeft(currentHour, scrollTarget), 'smooth');
  }, [getScrollTarget, isInteracting]);

  useLayoutEffect(() => {
    const scrollTarget = getScrollTarget();

    if (!scrollTarget || (initialFocusHourIndex === undefined && currentUserHourIndex < 0) || isInteracting?.()) {
      return;
    }

    const hour = initialFocusHourIndex === undefined
      ? getCurrentHourCell(scrollTarget)
      : getHourCells(scrollTarget)[initialFocusHourIndex];

    if (!hour) {
      return;
    }

    middleIndexRef.current = getHourCells(scrollTarget).indexOf(hour);
    scrollToLeft(scrollTarget, getCenteringScrollLeft(hour, scrollTarget), 'instant');
  }, [currentUserHourIndex, getScrollTarget, isInteracting, initialFocusHourIndex]);

  useEffect(() => {
    const scrollTarget = getScrollTarget();

    if (disabled || !scrollTarget) {
      return undefined;
    }

    const eventTarget = scrollTarget.type === 'page' ? window : scrollTarget.element;
    let lastScrollLeft = getScrollLeft(scrollTarget);
    let lastViewportWidth = getViewportWidth(scrollTarget);
    let settleTimeoutId: number | undefined;

    const reportMiddleHour = () => {
      settleTimeoutId = undefined;

      if (isInteracting?.()) {
        return;
      }

      const index = getMiddleHourIndex(scrollTarget);

      if (index >= 0 && index !== middleIndexRef.current) {
        middleIndexRef.current = index;
        onHourChange?.(index);
      }
    };

    const scheduleReport = () => {
      window.clearTimeout(settleTimeoutId);
      settleTimeoutId = window.setTimeout(reportMiddleHour, SETTLE_DELAY_MS);
    };

    const handleScroll = () => {
      const scrollLeft = getScrollLeft(scrollTarget);

      if (Math.abs(scrollLeft - lastScrollLeft) <= SCROLL_EPSILON) {
        return;
      }

      lastScrollLeft = scrollLeft;
      scheduleReport();
    };

    const keepMiddleHourOnResize = () => {
      const viewportWidth = getViewportWidth(scrollTarget);
      const hour = getHourCells(scrollTarget)[middleIndexRef.current];

      if (Math.abs(viewportWidth - lastViewportWidth) <= SCROLL_EPSILON || !hour || isInteracting?.()) {
        return;
      }

      lastViewportWidth = viewportWidth;
      scrollToLeft(scrollTarget, getCenteringScrollLeft(hour, scrollTarget), 'instant');
      lastScrollLeft = getScrollLeft(scrollTarget);
    };

    eventTarget.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', keepMiddleHourOnResize);

    // A drag that ended without a scroll after it still settles the grid.
    if (isInteracting) {
      scheduleReport();
    }

    return () => {
      window.clearTimeout(settleTimeoutId);
      eventTarget.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', keepMiddleHourOnResize);
    };
  }, [disabled, getScrollTarget, isInteracting, onHourChange]);

  return scrollToCurrentHour;
}
