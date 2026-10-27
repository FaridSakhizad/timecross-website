import './desktop/style.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Hand, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { PAN_CONTROLS_VISIBLE, usePanPreference } from '../../usePanPreference';
import { useI18n } from '../../i18n';
import CustomScrollbar from '../CustomScrollbar';
import TimelineGridActiveHourIndicator from './TimelineGridActiveHourIndicator';
import { TimelineGridTimeline, TimelineGridToolbar } from './TimelineGridContent';
import type { TimelineGridShellProps } from './types';
import { useTimelineGridElementActiveHourIndicator } from './useTimelineGridActiveHourIndicator';
import { useTimelineGridElementSnap } from './useTimelineGridSnap';
import { useDesktopGridPan } from './desktop/useDesktopGridPan';
import { useGridSelection } from './desktop/useGridSelection';
import { buildGridCalendarEvent, gridHourKey } from './desktop/gridSelection';
import { getCityDisplayName } from '../Cities/useLocalizedCities';
import GridCalendarActions from './GridCalendarActions';

export default function TimelineGridDesktop(props: TimelineGridShellProps) {
  const timelineGridViewportRef = useRef<HTMLDivElement>(null);
  const [panEnabled, setPanEnabled] = usePanPreference('desktop');
  const [isScrollbarDragging, setIsScrollbarDragging] = useState(false);
  const scrollbarInteractionRef = useRef(false);
  const { t } = useI18n();
  const canPan = panEnabled && !props.isEditMode && !props.isDragging;
  const { selectedHours, isSelecting, interactionRef: selectionInteractionRef, overlayRef, frameLayerRef, clearSelection } = useGridSelection(
    timelineGridViewportRef, !panEnabled && !props.isEditMode && !props.isDragging,
    JSON.stringify([props.timelineDates[0]?.getTime(), props.cities.map((city) => city.id)]),
    props.isEditMode || props.isDragging,
    props.initialSelectedHours,
    props.onSelectionChange,
  );
  const selectedHourKeys = useMemo(() => new Set(selectedHours.map(gridHourKey)), [selectedHours]);
  const calendarEvent = buildGridCalendarEvent(selectedHours,
    props.cities.map((city) => ({ id: city.id, name: getCityDisplayName(city), timezone: city.timezone })),
    props.browserTimezone, t('common.calendarEventTitle'));
  const { isPanning, interactionRef, cancelPan } = useDesktopGridPan(
    timelineGridViewportRef, canPan, undefined, props.isEditMode || props.isDragging,
  );
  const shouldSuspendSnap = useCallback(
    () => interactionRef.current || scrollbarInteractionRef.current || selectionInteractionRef.current,
    [interactionRef, selectionInteractionRef],
  );
  const interactionActive = isPanning || isScrollbarDragging || isSelecting;

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
    props.initialFocusHourIndex,
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
          clearSelection();
          cancelPan();
          setPanEnabled(false);
          props.onEditModeToggle();
        }}
        onResetClick={() => {
          clearSelection();
          cancelPan();
          resetGridScroll();
        }}
        afterResetControl={(
          <>
            {PAN_CONTROLS_VISIBLE && (
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
            {calendarEvent && !props.isEditMode && (
              <>
                <GridCalendarActions event={calendarEvent} cities={props.cities} hours={selectedHours} />
                <button
                  className="citiesHeaderButton timelineGridClearSelectionButton"
                  hidden
                  type="button"
                  aria-label={t('common.clearSelection')}
                  title={t('common.clearSelection')}
                  onClick={clearSelection}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </>
            )}
          </>
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
          selectedHourKeys={selectedHourKeys}
          onAddCityClick={props.onAddCityClick}
          onDeleteCity={props.onDeleteCity}
        />
      </CustomScrollbar>
      {typeof document !== 'undefined' && createPortal(
        <>
          <div ref={overlayRef} className="timelineGridSelectionRectangle" hidden aria-hidden="true" />
          <div ref={frameLayerRef} className="timelineGridSelectionLayer" hidden>
            <div className="timelineGridSelectionFrame" data-grid-selection-frame>
              {(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const).map((direction) => (
                <button
                  key={direction}
                  type="button"
                  data-grid-resize={direction}
                  className={`timelineGridSelectionHandle timelineGridSelectionHandle_${direction}`}
                  aria-label={`${t('common.resizeSelection')} (${direction})`}
                  title={t('common.resizeSelection')}
                />
              ))}
            </div>
          </div>
        </>,
        document.body,
      )}
      <TimelineGridActiveHourIndicator
        direction={activeHourDirection}
        onClick={scrollActiveHourIntoView}
      />
    </div>
  );
}
