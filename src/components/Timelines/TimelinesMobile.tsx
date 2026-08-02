import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { TIMELINE_EDGE_FADE_HOURS, TIMELINE_TOTAL_HOURS } from './constants';
import TimelineHeader from './TimelineHeader';
import { useTimelineMobileCarousel } from './useTimelineMobileCarousel';
import type { TimelineCell } from './types';

type TimelinesMobileProps = {
  currentUserHourIndex: number;
  timelineRows: ReactNode;
  userCells: TimelineCell[];
};

export default function TimelinesMobile({
  currentUserHourIndex,
  timelineRows,
  userCells,
}: TimelinesMobileProps) {
  const { t } = useI18n();
  const { resetScroll, scrollByHours, setViewportRef, widgetRef } = useTimelineMobileCarousel({
    currentHourIndex: currentUserHourIndex,
    minHourIndex: TIMELINE_EDGE_FADE_HOURS,
    maxHourIndex: TIMELINE_EDGE_FADE_HOURS + TIMELINE_TOTAL_HOURS - 1,
  });

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
            <div className="timelinesScroller">
              <div
                className="timelinesViewport"
                ref={setViewportRef}
              >
                {timelineRows}
              </div>
            </div>
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
