import './style.css';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { getSettings, type TimeFormat } from '../../settings';
import CustomScrollbar from '../CustomScrollbar';
import { getOrderedFavoriteCities } from '../Cities/fixtures';
import { TIMELINE_DRAG_ENABLED, TIMELINE_HOUR_WIDTH, TIMELINE_TOTAL_HOURS } from './constants';
import TimelineHeader from './TimelineHeader';
import TimelineRow from './TimelineRow';
import type { TimelineDragState } from './types';
import { getBrowserTimezone, getTimelineCells, getTimelineCurrentPosition, getTimelineDates } from './utils';

type TimelinesProps = {
  timeFormat: TimeFormat;
};

export default function Timelines({ timeFormat }: TimelinesProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const hasCenteredTimelineRef = useRef(false);
  const baseDate = useMemo(() => new Date(), []);
  const browserTimezone = getBrowserTimezone();
  const cities = useMemo(() => getOrderedFavoriteCities(getSettings().cityOrder), []);
  const userTimelinePosition = getTimelineCurrentPosition(browserTimezone, baseDate);
  const timelineCoverage = useMemo(() => {
    const cityOffsets = cities.map((city) => (
      userTimelinePosition - getTimelineCurrentPosition(city.timezone, baseDate)
    ));
    const minPosition = Math.min(0, ...cityOffsets);
    const maxPosition = Math.max(
      TIMELINE_TOTAL_HOURS,
      ...cityOffsets.map((offset) => offset + TIMELINE_TOTAL_HOURS),
    );
    const startPosition = Math.floor(minPosition);
    const endPosition = Math.ceil(maxPosition);

    return {
      startPosition,
      hoursCount: endPosition - startPosition,
    };
  }, [baseDate, cities, userTimelinePosition]);
  const timelineDates = useMemo(
    () => getTimelineDates(
      browserTimezone,
      baseDate,
      timelineCoverage.startPosition,
      timelineCoverage.hoursCount,
    ),
    [baseDate, browserTimezone, timelineCoverage],
  );
  const userCells = useMemo(
    () => getTimelineCells(browserTimezone, baseDate, timelineDates, timeFormat),
    [baseDate, browserTimezone, timelineDates, timeFormat],
  );
  const currentUserHourIndex = userCells.findIndex((cell) => cell.isCurrentHour);
  const setViewportRef = useCallback((element: HTMLDivElement | null) => {
    viewportRef.current = element;
  }, []);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || hasCenteredTimelineRef.current || currentUserHourIndex < 0) {
      return;
    }

    viewport.scrollLeft = (
      currentUserHourIndex * TIMELINE_HOUR_WIDTH
      + TIMELINE_HOUR_WIDTH / 2
      - viewport.clientWidth / 2
    );
    hasCenteredTimelineRef.current = true;
  }, [currentUserHourIndex]);

  useEffect(() => {
    if (!TIMELINE_DRAG_ENABLED) {
      return;
    }

    const viewport = viewportRef.current;
    let drag: TimelineDragState | null = null;

    if (!viewport) {
      return;
    }

    const endDrag = () => {
      if (!drag) {
        return;
      }

      drag = null;
      viewport.classList.remove('timelinesViewport_dragging');
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
      window.removeEventListener('blur', handleWindowBlur);
    };

    const handleWindowPointerMove = (event: globalThis.PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      if (event.buttons === 0) {
        endDrag();
        return;
      }

      event.preventDefault();
      viewport.scrollLeft -= event.clientX - drag.lastX;
      viewport.scrollTop -= event.clientY - drag.lastY;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
    };

    const handleWindowPointerUp = (event: globalThis.PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }

      viewport.scrollLeft -= event.clientX - drag.lastX;
      viewport.scrollTop -= event.clientY - drag.lastY;
      endDrag();
    };

    const handleWindowBlur = () => {
      endDrag();
    };

    const handleViewportPointerDown = (event: globalThis.PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      endDrag();
      drag = {
        pointerId: event.pointerId,
        lastX: event.clientX,
        lastY: event.clientY,
      };
      viewport.classList.add('timelinesViewport_dragging');
      window.addEventListener('pointermove', handleWindowPointerMove, { passive: false });
      window.addEventListener('pointerup', handleWindowPointerUp);
      window.addEventListener('pointercancel', handleWindowPointerUp);
      window.addEventListener('blur', handleWindowBlur);
    };

    viewport.addEventListener('pointerdown', handleViewportPointerDown);

    return () => {
      viewport.removeEventListener('pointerdown', handleViewportPointerDown);
      endDrag();
    };
  }, []);

  return (
    <CustomScrollbar
      className="timelinesWidget"
      contentClassName="timelinesViewport"
      contentRef={setViewportRef}
      mode="both"
    >
      <TimelineHeader userCells={userCells} />
      {cities.map((city) => (
        <TimelineRow
          baseDate={baseDate}
          browserTimezone={browserTimezone}
          city={city}
          key={city.id}
          timelineStartPosition={timelineCoverage.startPosition}
          timeFormat={timeFormat}
        />
      ))}

      <div className="timelinesWidgets-middleMarker" />
    </CustomScrollbar>
  );
}
