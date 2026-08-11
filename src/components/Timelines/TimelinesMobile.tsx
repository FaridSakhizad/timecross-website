import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
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

type TimelineSwipeState = {
  axis: 'pending' | 'horizontal' | 'vertical';
  pointerId: number;
  startX: number;
  startY: number;
};

const TIMELINE_SWIPE_MIN_DISTANCE = 56;
const TIMELINE_SWIPE_AXIS_BIAS = 1.35;

const renderStepArrows = (hours: number) => {
  const direction = hours < 0 ? 'prev' : 'next';

  return Array.from({ length: Math.abs(hours) }, (_, index) => (
    <svg
      className="timelinesStepButtonIcon"
      width="8"
      height="14"
      viewBox="0 0 8 14"
      aria-hidden="true"
      focusable="false"
      key={`${direction}-${index}`}
    >
      <path d={direction === 'prev' ? 'M7 1L1 7l6 6' : 'M1 1l6 6-6 6'} />
    </svg>
  ));
}

export default function TimelinesMobile({
  currentUserHourIndex,
  timelineRows,
  userCells,
}: TimelinesMobileProps) {
  const { t } = useI18n();

  const [freePanMode, setFreePanMode] = useState(false);
  const swipeStateRef = useRef<TimelineSwipeState | null>(null);

  const {
    cancelScrollAnimation,
    isScrollAnimating,
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

  const resolveSwipeAxis = (
    swipeState: TimelineSwipeState,
    clientX: number,
    clientY: number,
  ) => {
    if (swipeState.axis !== 'pending') {
      return swipeState.axis;
    }

    const distanceX = clientX - swipeState.startX;
    const distanceY = clientY - swipeState.startY;
    const absX = Math.abs(distanceX);
    const absY = Math.abs(distanceY);

    if (absX < TIMELINE_SWIPE_MIN_DISTANCE && absY < TIMELINE_SWIPE_MIN_DISTANCE) {
      return 'pending';
    }

    if (absX >= TIMELINE_SWIPE_MIN_DISTANCE && absX >= absY * TIMELINE_SWIPE_AXIS_BIAS) {
      return 'horizontal';
    }

    if (absY >= TIMELINE_SWIPE_MIN_DISTANCE && absY >= absX * TIMELINE_SWIPE_AXIS_BIAS) {
      return 'vertical';
    }

    return 'pending';
  }

  const handleSwipePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (
      freePanMode
      || event.pointerType !== 'touch'
      || !event.isPrimary
    ) {
      return;
    }

    if (isScrollAnimating()) {
      cancelScrollAnimation();
    }

    swipeStateRef.current = {
      axis: 'pending',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  const handleSwipePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const swipeState = swipeStateRef.current;

    if (
      !swipeState
      || freePanMode
      || event.pointerId !== swipeState.pointerId
      || event.pointerType !== 'touch'
    ) {
      return;
    }

    swipeState.axis = resolveSwipeAxis(swipeState, event.clientX, event.clientY);
  }

  const finishSwipe = (event: PointerEvent<HTMLDivElement>) => {
    const swipeState = swipeStateRef.current;

    if (!swipeState || event.pointerId !== swipeState.pointerId) {
      return;
    }

    swipeStateRef.current = null;

    if (freePanMode || isScrollAnimating() || swipeState.axis !== 'horizontal') {
      return;
    }

    const distanceX = event.clientX - swipeState.startX;

    if (Math.abs(distanceX) < TIMELINE_SWIPE_MIN_DISTANCE) {
      return;
    }

    scrollByHours(distanceX < 0 ? 1 : -1);
  }

  const cancelSwipe = (event: PointerEvent<HTMLDivElement>) => {
    if (swipeStateRef.current?.pointerId !== event.pointerId) {
      return;
    }

    swipeStateRef.current = null;
  }

  return (
    <>
      <div className="timelinesTopControls">
        <button
          className="timelinesReset"
          type="button"
          onClick={resetScroll}
          aria-label={t('common.reset')}
        />
      </div>
      <div className="timelinesWidgetWrapper timelinesWidgetWrapper_mobile">
        <div
          className="timelinesWidget"
          ref={widgetRef}
        >
          <div
            className="timelinesPanel"
            onPointerDown={handleSwipePointerDown}
            onPointerMove={handleSwipePointerMove}
            onPointerUp={finishSwipe}
            onPointerCancel={cancelSwipe}
          >
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
        </div>
      </div>

      <div className="timelinesBottomControls timelinesWidgetWrapper_mobile">
        <button
          className="timelinesStepButton timelinesStepButton_prev"
          type="button"
          onClick={() => scrollByHours(-1)}
          aria-label={t('common.previousHour')}
          title={t('common.previousHour')}
        >
          {renderStepArrows(-1)}
        </button>
        <button
          className={`timelinesPanButton${freePanMode ? ' timelinesPanButton_active' : ''}`}
          type="button"
          aria-pressed={freePanMode}
          onClick={() => setFreePanMode((value) => !value)}
        >
          {t(freePanMode ? 'common.scrollMode' : 'common.panMode')}
        </button>
        <button
          className="timelinesStepButton timelinesStepButton_next"
          type="button"
          onClick={() => scrollByHours(1)}
          aria-label={t('common.nextHour')}
          title={t('common.nextHour')}
        >
          {renderStepArrows(1)}
        </button>
      </div>
    </>
  );
}
