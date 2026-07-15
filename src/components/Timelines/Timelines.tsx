import './style.css';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { getSettings, type TimeFormat } from '../../settings';
import CustomScrollbar from '../CustomScrollbar';
import { getOrderedFavoriteCities } from '../Cities/fixtures';
import {
  TIMELINE_EXTRA_DAY_HOURS,
  TIMELINE_HOUR_WIDTH,
  TIMELINE_SNAP_DELAY_MS,
  TIMELINE_SNAP_RELEASE_MS,
} from './constants';
import { initHorizontalDragScroll } from './dragScroll';
import TimelineHeader from './TimelineHeader';
import TimelineRow from './TimelineRow';
import { getBrowserTimezone, getTimelineCells, getTimelineDates } from './utils';

type TimelinesProps = {
  timeFormat: TimeFormat;
};

export default function Timelines({ timeFormat }: TimelinesProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const hasCenteredTimelineRef = useRef(false);
  const isSnappingTimelineRef = useRef(false);
  const lastTimelineScrollLeftRef = useRef(0);
  const baseDate = useMemo(() => new Date(), []);
  const browserTimezone = getBrowserTimezone();
  const cities = useMemo(() => getOrderedFavoriteCities(getSettings().cityOrder), []);
  const timelineDates = useMemo(
    () => getTimelineDates(browserTimezone, baseDate),
    [baseDate, browserTimezone],
  );
  const userCells = useMemo(
    () => getTimelineCells(browserTimezone, baseDate, timelineDates, timeFormat),
    [baseDate, browserTimezone, timelineDates, timeFormat],
  );
  const currentUserHourIndex = userCells.findIndex((cell) => cell.isCurrentHour);
  const setViewportRef = useCallback((element: HTMLDivElement | null) => {
    viewportRef.current = element;
  }, []);

  const getTimelineSidePad = useCallback((viewport: HTMLDivElement) => (
    Math.max(0, viewport.clientWidth / 2 - TIMELINE_HOUR_WIDTH / 2)
  ), []);

  const getScrollLeftForHourIndex = useCallback((viewport: HTMLDivElement, hourIndex: number) => {
    const sidePad = getTimelineSidePad(viewport);

    return sidePad + hourIndex * TIMELINE_HOUR_WIDTH + TIMELINE_HOUR_WIDTH / 2 - viewport.clientWidth / 2;
  }, [getTimelineSidePad]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport || hasCenteredTimelineRef.current || currentUserHourIndex < 0) {
      return;
    }

    viewport.style.setProperty('--timeline-side-pad', `${getTimelineSidePad(viewport)}px`);
    viewport.scrollLeft = getScrollLeftForHourIndex(
      viewport,
      currentUserHourIndex >= 0 ? currentUserHourIndex : TIMELINE_EXTRA_DAY_HOURS,
    );
    hasCenteredTimelineRef.current = true;
    lastTimelineScrollLeftRef.current = viewport.scrollLeft;
  }, [currentUserHourIndex, getScrollLeftForHourIndex, getTimelineSidePad]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    let snapTimer: number | undefined;
    let releaseTimer: number | undefined;

    const clearTimers = () => {
      if (snapTimer !== undefined) {
        window.clearTimeout(snapTimer);
      }

      if (releaseTimer !== undefined) {
        window.clearTimeout(releaseTimer);
      }
    };

    const snapToNearestHour = () => {
      const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;

      if (maxScrollLeft <= 0) {
        return;
      }

      const centerX = viewport.scrollLeft + viewport.clientWidth / 2;
      const sidePad = getTimelineSidePad(viewport);
      const nearestHourIndex = Math.round(
        (centerX - sidePad - TIMELINE_HOUR_WIDTH / 2) / TIMELINE_HOUR_WIDTH,
      );
      const targetScrollLeft = Math.max(
        0,
        Math.min(
          maxScrollLeft,
          getScrollLeftForHourIndex(viewport, nearestHourIndex),
        ),
      );

      if (Math.abs(targetScrollLeft - viewport.scrollLeft) < 0.5) {
        return;
      }

      isSnappingTimelineRef.current = true;
      viewport.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth',
      });

      releaseTimer = window.setTimeout(() => {
        isSnappingTimelineRef.current = false;
        lastTimelineScrollLeftRef.current = viewport.scrollLeft;
      }, TIMELINE_SNAP_RELEASE_MS);
    };

    const handleTimelineScroll = () => {
      const previousScrollLeft = lastTimelineScrollLeftRef.current;

      lastTimelineScrollLeftRef.current = viewport.scrollLeft;

      if (isSnappingTimelineRef.current || Math.abs(viewport.scrollLeft - previousScrollLeft) < 0.5) {
        return;
      }

      if (snapTimer !== undefined) {
        window.clearTimeout(snapTimer);
      }

      snapTimer = window.setTimeout(snapToNearestHour, TIMELINE_SNAP_DELAY_MS);
    };

    viewport.style.setProperty('--timeline-side-pad', `${getTimelineSidePad(viewport)}px`);
    lastTimelineScrollLeftRef.current = viewport.scrollLeft;
    viewport.addEventListener('scroll', handleTimelineScroll, { passive: true });

    return () => {
      clearTimers();
      viewport.removeEventListener('scroll', handleTimelineScroll);
    };
  }, [getScrollLeftForHourIndex, getTimelineSidePad]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    return initHorizontalDragScroll(viewport, {
      draggingClassName: 'timelinesViewport_dragging',
    });
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
          timelineDates={timelineDates}
          timeFormat={timeFormat}
        />
      ))}

      <div className="timelinesWidgets-middleMarker" />
    </CustomScrollbar>
  );
}
