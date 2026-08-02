import './style.css';
import { useEffect, useMemo, useState } from 'react';
import { getSettings, type TimeFormat } from '../../settings';
import CustomScrollbar from '../CustomScrollbar';
import { getOrderedFavoriteCities } from '../Cities/fixtures';
import { useI18n } from '../../i18n';
import { TIMELINE_EDGE_FADE_HOURS, TIMELINE_TOTAL_HOURS } from './constants';
import TimelineHeader from './TimelineHeader';
import TimelineRow from './TimelineRow';
import { useTimelineCarousel } from './useTimelineCarousel';
import { getBrowserTimezone, getTimelineCells, getTimelineDates } from './utils';

type TimelinesProps = {
  timeFormat: TimeFormat;
};

const NATIVE_SCROLL_TIMELINE_QUERY = '(max-width: 1023px), (hover: none) and (pointer: coarse)';

function getUsesNativeTimelineScroll() {
  return typeof window !== 'undefined'
    && window.matchMedia(NATIVE_SCROLL_TIMELINE_QUERY).matches;
}

function useUsesNativeTimelineScroll() {
  const [usesNativeScroll, setUsesNativeScroll] = useState(getUsesNativeTimelineScroll);

  useEffect(() => {
    const mediaQuery = window.matchMedia(NATIVE_SCROLL_TIMELINE_QUERY);
    const updateUsesNativeScroll = () => setUsesNativeScroll(mediaQuery.matches);

    updateUsesNativeScroll();
    mediaQuery.addEventListener('change', updateUsesNativeScroll);

    return () => {
      mediaQuery.removeEventListener('change', updateUsesNativeScroll);
    };
  }, []);

  return usesNativeScroll;
}

export default function Timelines({ timeFormat }: TimelinesProps) {
  const { t } = useI18n();
  const baseDate = useMemo(() => new Date(), []);
  const browserTimezone = useMemo(() => getBrowserTimezone(), []);
  const cities = useMemo(() => getOrderedFavoriteCities(getSettings().cityOrder), []);
  const usesNativeScroll = useUsesNativeTimelineScroll();

  const timelineDates = useMemo(
    () => getTimelineDates(browserTimezone, baseDate),
    [baseDate, browserTimezone],
  );

  const userCells = useMemo(
    () => getTimelineCells(browserTimezone, baseDate, timelineDates, timeFormat),
    [baseDate, browserTimezone, timelineDates, timeFormat],
  );

  const currentUserHourIndex = userCells.findIndex((cell) => cell.isCurrentHour);

  const { resetScroll, scrollByHours, setViewportRef, widgetRef } = useTimelineCarousel({
    currentHourIndex: currentUserHourIndex,
    disableScrollEffects: usesNativeScroll,
    minHourIndex: TIMELINE_EDGE_FADE_HOURS,
    maxHourIndex: TIMELINE_EDGE_FADE_HOURS + TIMELINE_TOTAL_HOURS - 1,
  });

  const timelineRows = cities.map((city) => (
    <TimelineRow
      baseDate={baseDate}
      browserTimezone={browserTimezone}
      city={city}
      key={city.id}
      timelineDates={timelineDates}
      timeFormat={timeFormat}
    />
  ));

  return (
    <>
      <button
        className="timelinesReset"
        type="button"
        onClick={resetScroll}
        aria-label={t('common.reset')}
      />
      <div className="timelinesWidgetWrapper">
        <div
          className="timelinesWidget"
          ref={widgetRef}
        >
          <div className="timelinesPanel">
            <div className="timelinesHeaderViewport">
              <TimelineHeader userCells={userCells} />
            </div>
            {usesNativeScroll ? (
              <div className="timelinesScroller">
                <div
                  className="timelinesViewport"
                  ref={setViewportRef}
                >
                  {timelineRows}
                </div>
              </div>
            ) : (
              <CustomScrollbar
                className="timelinesScroller"
                contentClassName="timelinesViewport"
                contentRef={setViewportRef}
                mode="vertical"
              >
                {timelineRows}
              </CustomScrollbar>
            )}
            <div className="timelinesMiddleMarker" />
          </div>

          <button
            className="timelinesNav timelinesNav_prev"
            type="button"
            aria-label={t('common.previousHour')}
            title={t('common.previousHour')}
            onClick={() => scrollByHours(-1)}
          >
            <svg
              className="timelinesNavIcon"
              width="48"
              height="48"
              viewBox="0 0 48 48"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M27 14l-10 10 10 10" />
            </svg>
          </button>
          <button
            className="timelinesNav timelinesNav_next"
            type="button"
            aria-label={t('common.nextHour')}
            title={t('common.nextHour')}
            onClick={() => scrollByHours(1)}
          >
            <svg
              className="timelinesNavIcon"
              width="48"
              height="48"
              viewBox="0 0 48 48"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M21 14l10 10-10 10" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
