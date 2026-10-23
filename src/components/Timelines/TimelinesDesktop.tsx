import { useEffect, type ReactNode } from 'react';
import { usePanPreference } from '../../usePanPreference';
import { useDesktopGridPan } from '../TimelineGrid/desktop/useDesktopGridPan';
import CustomScrollbar from '../CustomScrollbar';
import { useI18n } from '../../i18n';
import { TIMELINE_EDGE_FADE_HOURS, TIMELINE_TOTAL_HOURS } from './constants';
import TimelineActiveHourIndicator from './TimelineActiveHourIndicator';
import TimelineHeader from './TimelineHeader';
import TimelinesTopControls from './TimelinesTopControls';
import { useTimelineActiveHourIndicator } from './useTimelineActiveHourIndicator';
import { useTimelineDesktopCarousel } from './useTimelineDesktopCarousel';
import type { TimelineCell } from './types';

type TimelinesDesktopProps = {
  currentUserHourIndex: number;
  initialHourIndex?: number;
  onHourChange?: (index: number) => void;
  onReset?: () => void;
  isDragging: boolean;
  isEditMode: boolean;
  onAddCityClick: () => void;
  onEditModeToggle: () => void;
  timelineRows: ReactNode;
  userCells: TimelineCell[];
};

export default function TimelinesDesktop({
  currentUserHourIndex,
  initialHourIndex,
  onHourChange,
  onReset,
  isDragging,
  isEditMode,
  onAddCityClick,
  onEditModeToggle,
  timelineRows,
  userCells,
}: TimelinesDesktopProps) {
  const { t } = useI18n();
  const [panEnabled, setPanEnabled] = usePanPreference('desktop');
  const {
    handlePanInteractionChange,
    viewportRef,
    getScrollbarMetrics,
    handleScrollbarThumbDragEnd,
    handleScrollbarThumbDragStart,
    resetScroll,
    scrollCurrentHourToEdge,
    scrollByHours,
    setViewportRef,
    widgetRef,
  } = useTimelineDesktopCarousel({
    currentHourIndex: currentUserHourIndex,
    initialHourIndex,
    onHourChange,
    minHourIndex: TIMELINE_EDGE_FADE_HOURS,
    maxHourIndex: TIMELINE_EDGE_FADE_HOURS + TIMELINE_TOTAL_HOURS - 1,
  });
  const canPan = panEnabled && !isEditMode && !isDragging;
  const { isPanning, cancelPan } = useDesktopGridPan(
    viewportRef, canPan, handlePanInteractionChange, isEditMode || isDragging,
  );
  useEffect(() => {
    if (!panEnabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancelPan();
        setPanEnabled(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelPan, panEnabled, setPanEnabled]);
  const activeHourDirection = useTimelineActiveHourIndicator(
    widgetRef,
    isDragging || isEditMode || isPanning,
  );

  return (
    <>
      <TimelinesTopControls
        isEditMode={isEditMode}
        onAddCityClick={onAddCityClick}
        onEditModeToggle={() => {
          cancelPan();
          setPanEnabled(false);
          onEditModeToggle();
        }}
        isPanEnabled={canPan}
        isPanDisabled={isEditMode || isDragging}
        onPanToggle={() => setPanEnabled((enabled) => !enabled)}
        onResetClick={() => {
          cancelPan();
          resetScroll();
          onReset?.();
        }}
      />
      <div className="timelinesWidgetWrapper timelinesWidgetWrapper_desktop">
        <div
          className={[
            'timelinesWidget',
            isEditMode ? 'timelinesWidget_editMode' : '',
            isDragging ? 'timelinesWidget_dragging' : '',
            canPan ? 'timelinesWidget_panEnabled' : '',
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

              <button
                className="timelinesAddTimezoneButton"
                type="button"
                onClick={onAddCityClick}
              >
                <i className="timelinesAddTimezoneButtonIcon" />
                <span className="timelinesAddTimezoneButtonText">{t('common.addCity')}</span>
              </button>

            </CustomScrollbar>
            <div className="timelinesMiddleMarker" />
          </div>
          <TimelineActiveHourIndicator
            direction={activeHourDirection}
            onClick={() => {
              if (activeHourDirection) {
                scrollCurrentHourToEdge(activeHourDirection);
              }
            }}
          />

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
