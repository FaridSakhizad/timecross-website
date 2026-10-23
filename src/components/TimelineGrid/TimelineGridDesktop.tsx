import './desktop/style.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Hand } from 'lucide-react';
import { PAN_CONTROLS_VISIBLE, usePanPreference } from '../../usePanPreference';
import { useI18n } from '../../i18n';
import CustomScrollbar from '../CustomScrollbar';
import TimelineGridActiveHourIndicator from './TimelineGridActiveHourIndicator';
import { TimelineGridTimeline, TimelineGridToolbar } from './TimelineGridContent';
import type { TimelineGridShellProps } from './types';
import { useTimelineGridElementActiveHourIndicator } from './useTimelineGridActiveHourIndicator';
import { useTimelineGridElementSnap } from './useTimelineGridSnap';
import { useDesktopGridPan } from './desktop/useDesktopGridPan';

export default function TimelineGridDesktop(props: TimelineGridShellProps) {
  const timelineGridViewportRef = useRef<HTMLDivElement>(null);
  const [panEnabled, setPanEnabled] = usePanPreference('desktop');
  const [isScrollbarDragging, setIsScrollbarDragging] = useState(false);
  const scrollbarInteractionRef = useRef(false);
  const { t } = useI18n();
  const canPan = panEnabled && !props.isEditMode && !props.isDragging;
  const { isPanning, interactionRef, cancelPan } = useDesktopGridPan(
    timelineGridViewportRef, canPan, undefined, props.isEditMode || props.isDragging,
  );
  const shouldSuspendSnap = useCallback(
    () => interactionRef.current || scrollbarInteractionRef.current,
    [interactionRef],
  );
  const interactionActive = isPanning || isScrollbarDragging;

  useEffect(() => {
    if (!panEnabled) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        cancelPan();
        setPanEnabled(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [cancelPan, panEnabled, setPanEnabled]);

  const resetGridScroll = useTimelineGridElementSnap(
    timelineGridViewportRef,
    props.currentUserHourIndex,
    props.isDragging || props.isEditMode || interactionActive,
    shouldSuspendSnap,
  );
  const {
    direction: activeHourDirection,
    scrollActiveHourIntoView,
  } = useTimelineGridElementActiveHourIndicator(
    timelineGridViewportRef,
    props.isDragging || props.isEditMode || interactionActive,
  );

  return (
    <div
      className={[
        'timelineGrid',
        canPan ? 'timelineGrid_panEnabled' : '',
        props.isEditMode ? 'timelineGrid_editMode' : '',
        props.isDragging ? 'timelineGrid_dragging' : '',
      ].filter(Boolean).join(' ')}
    >
      <TimelineGridToolbar
        colorMode={props.colorMode}
        isEditMode={props.isEditMode}
        mode="desktop"
        timeFormat={props.timeFormat}
        onAddCityClick={props.onAddCityClick}
        onColorModeButtonClick={props.onColorModeButtonClick}
        onEditModeToggle={() => {
          cancelPan();
          setPanEnabled(false);
          props.onEditModeToggle();
        }}
        onResetClick={() => {
          cancelPan();
          resetGridScroll();
        }}
        afterResetControl={PAN_CONTROLS_VISIBLE && (
          <button
            className={`citiesHeaderButton timelineGridPanButton ${canPan ? 'isActive' : ''}`}
            type="button"
            aria-label={t('common.panMode')}
            title={t('common.panMode')}
            aria-pressed={canPan}
            disabled={props.isEditMode || props.isDragging}
            onClick={() => {
              cancelPan();
              setPanEnabled((value) => !value);
            }}
          >
            <Hand size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
        onTimeFormatButtonClick={props.onTimeFormatButtonClick}
      />
      <CustomScrollbar
        className="timelineGrid-scroll"
        contentClassName="timelineGrid-scrollViewport"
        contentRef={(element) => {
          timelineGridViewportRef.current = element;
        }}
        mode="both"
        onThumbDragStart={() => {
          scrollbarInteractionRef.current = true;
          setIsScrollbarDragging(true);
        }}
        onThumbDragEnd={() => {
          scrollbarInteractionRef.current = false;
          setIsScrollbarDragging(false);
        }}
      >
        <TimelineGridTimeline
          baseDate={props.baseDate}
          browserTimezone={props.browserTimezone}
          cities={props.cities}
          currentUserHourIndex={props.currentUserHourIndex}
          isEditMode={props.isEditMode}
          mode="desktop"
          timelineDates={props.timelineDates}
          timeFormat={props.timeFormat}
          userCells={props.userCells}
          onAddCityClick={props.onAddCityClick}
          onDeleteCity={props.onDeleteCity}
        />
      </CustomScrollbar>
      <TimelineGridActiveHourIndicator
        direction={activeHourDirection}
        onClick={scrollActiveHourIntoView}
      />
    </div>
  );
}
