import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';

export type TimelineActiveHourDirection = 'left' | 'right' | null;

const ACTIVE_HOUR_VISIBILITY_PADDING = 8;

function getTimelineActiveHourDirection(widget: HTMLDivElement): TimelineActiveHourDirection {
  const panel = widget.querySelector<HTMLElement>('.timelinesPanel');
  const activeHour = widget.querySelector<HTMLElement>('.timelinesHeaderViewport .timelines-hour_current');

  if (!panel || !activeHour) {
    return null;
  }

  const panelRect = panel.getBoundingClientRect();
  const activeHourRect = activeHour.getBoundingClientRect();
  const viewportLeft = panelRect.left + ACTIVE_HOUR_VISIBILITY_PADDING;
  const viewportRight = panelRect.right - ACTIVE_HOUR_VISIBILITY_PADDING;

  if (activeHourRect.right < viewportLeft) {
    return 'left';
  }

  if (activeHourRect.left > viewportRight) {
    return 'right';
  }

  return null;
}

export function useTimelineActiveHourIndicator(
  widgetRef: RefObject<HTMLDivElement | null>,
  disabled = false,
) {
  const [direction, setDirection] = useState<TimelineActiveHourDirection>(null);

  const updateDirection = useCallback(() => {
    const widget = widgetRef.current;

    setDirection(!disabled && widget ? getTimelineActiveHourDirection(widget) : null);
  }, [disabled, widgetRef]);

  useLayoutEffect(() => {
    updateDirection();
  }, [updateDirection]);

  useEffect(() => {
    const widget = widgetRef.current;

    if (disabled || !widget) {
      setDirection(null);
      return undefined;
    }

    const viewport = widget.querySelector<HTMLElement>('.timelinesViewport');
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

    const styleObserver = new MutationObserver(scheduleUpdate);

    styleObserver.observe(widget, {
      attributeFilter: ['style'],
      attributes: true,
    });
    viewport?.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    scheduleUpdate();

    return () => {
      styleObserver.disconnect();
      viewport?.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);

      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [disabled, updateDirection, widgetRef]);

  return direction;
}
