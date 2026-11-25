import { useCallback, useEffect, useState } from 'react';

import type { TimelineGridScrollTarget } from './useGridScrollPosition';

export type TimelineGridActiveHourDirection = 'left' | 'right' | null;

const ACTIVE_HOUR_VISIBILITY_PADDING = 8;

function getTimelineGridRoot(scrollTarget: TimelineGridScrollTarget) {
  return scrollTarget.type === 'page' ? document : scrollTarget.element;
}

function getTimelineGridActiveHour(scrollTarget: TimelineGridScrollTarget) {
  return getTimelineGridRoot(scrollTarget)
    .querySelector<HTMLElement>('.timelineGrid-userHours .timelineGrid-hour_current');
}

function getElementActiveHourDirection(
  element: HTMLDivElement,
  activeHour: HTMLElement,
): TimelineGridActiveHourDirection {
  const activeHourLeft = activeHour.offsetLeft;
  const activeHourRight = activeHourLeft + activeHour.offsetWidth;
  const viewportLeft = element.scrollLeft + ACTIVE_HOUR_VISIBILITY_PADDING;
  const viewportRight = element.scrollLeft + element.clientWidth - ACTIVE_HOUR_VISIBILITY_PADDING;

  if (activeHourRight < viewportLeft) {
    return 'left';
  }

  if (activeHourLeft > viewportRight) {
    return 'right';
  }

  return null;
}

function getPageActiveHourDirection(activeHour: HTMLElement): TimelineGridActiveHourDirection {
  const activeHourRect = activeHour.getBoundingClientRect();
  const viewportLeft = ACTIVE_HOUR_VISIBILITY_PADDING;
  const viewportRight = window.innerWidth - ACTIVE_HOUR_VISIBILITY_PADDING;

  if (activeHourRect.right < viewportLeft) {
    return 'left';
  }

  if (activeHourRect.left > viewportRight) {
    return 'right';
  }

  return null;
}

function getTimelineGridActiveHourDirection(
  scrollTarget: TimelineGridScrollTarget,
): TimelineGridActiveHourDirection {
  const activeHour = getTimelineGridActiveHour(scrollTarget);

  if (!activeHour) {
    return null;
  }

  return scrollTarget.type === 'page'
    ? getPageActiveHourDirection(activeHour)
    : getElementActiveHourDirection(scrollTarget.element, activeHour);
}

export function useTimelineGridActiveHourIndicator(
  getScrollTarget: () => TimelineGridScrollTarget | null,
  disabled = false,
) {
  const [direction, setDirection] = useState<TimelineGridActiveHourDirection>(null);

  const updateDirection = useCallback(() => {
    if (disabled) {
      return;
    }

    const scrollTarget = getScrollTarget();

    setDirection(scrollTarget ? getTimelineGridActiveHourDirection(scrollTarget) : null);
  }, [disabled, getScrollTarget]);

  useEffect(() => {
    if (disabled) {
      return undefined;
    }

    const scrollTarget = getScrollTarget();

    if (!scrollTarget) {
      return undefined;
    }

    const eventTarget = scrollTarget.type === 'page' ? window : scrollTarget.element;
    let animationFrame = 0;

    const scheduleUpdate = () => {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        updateDirection();
      });
    };

    eventTarget.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    scheduleUpdate();

    return () => {
      eventTarget.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);

      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [disabled, getScrollTarget, updateDirection]);

  // Its arrow brings the current hour back to the middle, as the reset button does: see useTimelineGridScrollPosition.
  return { direction: disabled ? null : direction };
}
