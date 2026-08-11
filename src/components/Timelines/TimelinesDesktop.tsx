import type { ReactNode } from 'react';
import CustomScrollbar from '../CustomScrollbar';
import { useI18n } from '../../i18n';
import { TIMELINE_EDGE_FADE_HOURS, TIMELINE_TOTAL_HOURS } from './constants';
import TimelineHeader from './TimelineHeader';
import TimelinesTopControls from './TimelinesTopControls';
import { useTimelineDesktopCarousel } from './useTimelineDesktopCarousel';
import type { TimelineCell } from './types';

type TimelinesDesktopProps = {
  currentUserHourIndex: number;
  isDragging: boolean;
  isEditMode: boolean;
  onAddCityClick: () => void;
  onEditModeToggle: () => void;
  timelineRows: ReactNode;
  userCells: TimelineCell[];
};

export default function TimelinesDesktop({
  currentUserHourIndex,
  isDragging,
  isEditMode,
  onAddCityClick,
  onEditModeToggle,
  timelineRows,
  userCells,
}: TimelinesDesktopProps) {
  const { t } = useI18n();
  const {
    getScrollbarMetrics,
    handleScrollbarThumbDragEnd,
    handleScrollbarThumbDragStart,
    resetScroll,
    scrollByHours,
    setViewportRef,
    widgetRef,
  } = useTimelineDesktopCarousel({
    currentHourIndex: currentUserHourIndex,
    minHourIndex: TIMELINE_EDGE_FADE_HOURS,
    maxHourIndex: TIMELINE_EDGE_FADE_HOURS + TIMELINE_TOTAL_HOURS - 1,
  });

  return (
    <>
      <TimelinesTopControls
        isEditMode={isEditMode}
        onAddCityClick={onAddCityClick}
        onEditModeToggle={onEditModeToggle}
        onResetClick={resetScroll}
      />
      <div className="timelinesWidgetWrapper timelinesWidgetWrapper_desktop">
        <div
          className={[
            'timelinesWidget',
            isEditMode ? 'timelinesWidget_editMode' : '',
            isDragging ? 'timelinesWidget_dragging' : '',
          ].filter(Boolean).join(' ')}
          ref={widgetRef}
        >
          <div className="timelinesPanel">
            <div className="timelinesHeaderViewport">
              <TimelineHeader userCells={userCells} />
            </div>
            <CustomScrollbar
              className="timelinesScroller"
              contentClassName="timelinesViewport"
              contentRef={setViewportRef}
              getScrollbarMetrics={getScrollbarMetrics}
              mode="both"
              onThumbDragEnd={handleScrollbarThumbDragEnd}
              onThumbDragStart={handleScrollbarThumbDragStart}
            >
              {timelineRows}
            </CustomScrollbar>
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
