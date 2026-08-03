import { useState, type ReactNode } from 'react';
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

  const [freePanMode, setFreePanMode] = useState(false);

  const {
    resetScroll,
    scrollByHours,
    setViewportRef,
    widgetRef
  } = useTimelineMobileCarousel({
    currentHourIndex: currentUserHourIndex,
    freePanMode,
    minHourIndex: TIMELINE_EDGE_FADE_HOURS,
    maxHourIndex: TIMELINE_EDGE_FADE_HOURS + TIMELINE_TOTAL_HOURS - 1,
  });

  return (
    <>
      <div className="timelinesTopControls">
        <div className="timelinesMobileStepControls timelinesMobileStepControls_visible">
          {[-3, -2, -1].map((hours) => (
            <button
              className="timelinesStepButton"
              type="button"
              key={hours}
              onClick={() => scrollByHours(hours)}
              aria-label={`${t('common.previousHour')} ${Math.abs(hours)}`}
              title={`${t('common.previousHour')} ${Math.abs(hours)}`}
            >
              {hours}
            </button>
          ))}
        </div>
        <button
          className="timelinesReset"
          type="button"
          onClick={resetScroll}
          aria-label={t('common.reset')}
        />
        <div className="timelinesMobileStepControls timelinesMobileStepControls_visible">
          {[1, 2, 3].map((hours) => (
            <button
              className="timelinesStepButton"
              type="button"
              key={hours}
              onClick={() => scrollByHours(hours)}
              aria-label={`${t('common.nextHour')} ${hours}`}
              title={`${t('common.nextHour')} ${hours}`}
            >
              +{hours}
            </button>
          ))}
        </div>
      </div>
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
                className={`timelinesViewport${freePanMode ? ' timelinesViewport_freePan' : ''}`}
                ref={setViewportRef}
              >
                {timelineRows}
              </div>
            </div>
            <div className="timelinesMiddleMarker" />
          </div>

          <button
            className={`timelinesPanButton${freePanMode ? ' timelinesPanButton_active' : ''}`}
            type="button"
            aria-pressed={freePanMode}
            onClick={() => setFreePanMode((value) => !value)}
          >
            {t(freePanMode ? 'common.scrollMode' : 'common.panMode')}
          </button>
        </div>
      </div>
    </>
  );
}
