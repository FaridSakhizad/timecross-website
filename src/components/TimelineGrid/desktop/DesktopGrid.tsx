import './style.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Scan, X } from 'lucide-react';
import { usePanPreference } from '../../../usePanPreference';
import { useI18n } from '../../../i18n';
import CustomScrollbar from '../../CustomScrollbar';
import { TIMELINE_DESKTOP_SCROLLBAR_THUMB_WIDTH, TIMELINE_HOUR_WIDTH } from '../../Timelines/constants';
import TimelineGridActiveHourIndicator from '../shared/GridActiveHourIndicator';
import DesktopTimeline from './DesktopTimeline';
import DesktopToolbar from './DesktopToolbar';
import GridCalendarActions from '../shared/GridCalendarActions';
import DesktopSelectionOverlay from './DesktopSelectionOverlay';
import type { TimelineGridShellProps } from '../shared/types';
import { useDesktopGridActiveHourIndicator, useDesktopGridSnap } from './useDesktopGridScroll';
import { useDesktopGridPan } from './useDesktopGridPan';
import { useGridSelection } from './useGridSelection';
import { buildGridCalendarEvent, gridHourKey } from '../shared/gridSelection';
import { getCityDisplayName } from '../../Cities/useLocalizedCities';

const GRID_VERTICAL_SCROLLBAR_TOP = 50;
const GRID_VERTICAL_SCROLLBAR_BOTTOM = 12;
const GRID_HORIZONTAL_SCROLLBAR_LEFT = 12;
const GRID_HORIZONTAL_SCROLLBAR_RIGHT = 12;

export default function DesktopGrid(props: TimelineGridShellProps) {
  const timelineGridViewportRef = useRef<HTMLDivElement>(null);
  const [panEnabled, setPanEnabled] = usePanPreference('desktop');
  const [isScrollbarDragging, setIsScrollbarDragging] = useState(false);
  const scrollbarInteractionRef = useRef(false);
  const { t } = useI18n();
  const canPan = panEnabled && !props.isEditMode && !props.isDragging;
  const { selectedHours, isSelecting, interactionRef: selectionInteractionRef, overlayRef, frameLayerRef, clearSelection, createSelection } = useGridSelection(
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
  const scrollbarCenterHourIndex = props.initialFocusHourIndex ?? props.currentUserHourIndex;
  const getScrollbarMetrics = useCallback((axis: 'horizontal' | 'vertical', viewport: HTMLDivElement) => {
    if (axis === 'vertical') return undefined;

    const anchor = viewport.querySelectorAll<HTMLElement>('.timelineGrid-hour')[scrollbarCenterHourIndex];
    const maxScrollOffset = Math.max(0, viewport.scrollWidth - viewport.clientWidth);

    return {
      thumbLength: TIMELINE_DESKTOP_SCROLLBAR_THUMB_WIDTH,
      centerScrollOffset: anchor
        ? Math.max(0, Math.min(maxScrollOffset, anchor.offsetLeft + anchor.offsetWidth / 2 - viewport.clientWidth / 2))
        : undefined,
    };
  }, [scrollbarCenterHourIndex]);

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

  const resetGridScroll = useDesktopGridSnap(
    timelineGridViewportRef,
    props.currentUserHourIndex,
    props.isDragging || props.isEditMode || interactionActive,
    shouldSuspendSnap,
    props.initialFocusHourIndex,
    props.onHourChange,
  );
  const {
    direction: activeHourDirection,
    scrollActiveHourIntoView,
  } = useDesktopGridActiveHourIndicator(
    timelineGridViewportRef,
    props.isDragging || props.isEditMode || interactionActive,
  );

  const toolbar = (
    <DesktopToolbar {...props}
      panEnabled={canPan} panDisabled={props.isEditMode || props.isDragging}
      onPanToggle={() => { cancelPan(); setPanEnabled((value) => !value); }}
      onEditModeToggle={() => {
        clearSelection();
        cancelPan();
        setPanEnabled(false);
        props.onEditModeToggle();
      }}
      onResetClick={() => { clearSelection(); cancelPan(); resetGridScroll(); props.onReset?.(); }} />
  );

  return (
    <div className={props.presentation === 'embedded' ? 'widget timelinesEmbedded' : 'widget timelinesZen'}>
      {toolbar}
      <div
        className={[
          'widgetContent timelineGrid',
          canPan ? 'timelineGrid_panEnabled' : '',
          props.isEditMode ? 'timelineGrid_editMode' : '',
          props.isDragging ? 'timelineGrid_dragging' : '',
        ].filter(Boolean).join(' ')}
      >
      <CustomScrollbar
        className="timelineGrid-scroll"
        contentClassName="timelineGrid-scrollViewport"
        contentRef={(element) => {
          timelineGridViewportRef.current = element;
        }}
        mode="both"
        verticalTrackTop={GRID_VERTICAL_SCROLLBAR_TOP}
        verticalTrackBottom={GRID_VERTICAL_SCROLLBAR_BOTTOM}
        horizontalTrackLeft={GRID_HORIZONTAL_SCROLLBAR_LEFT}
        horizontalTrackRight={GRID_HORIZONTAL_SCROLLBAR_RIGHT}
        getScrollbarMetrics={getScrollbarMetrics}
        onThumbDragStart={() => {
          scrollbarInteractionRef.current = true;
          setIsScrollbarDragging(true);
        }}
        onThumbDragEnd={() => {
          scrollbarInteractionRef.current = false;
          setIsScrollbarDragging(false);
        }}
      >
        <DesktopTimeline
          baseDate={props.baseDate}
          browserTimezone={props.browserTimezone}
          cities={props.cities}
          isEditMode={props.isEditMode}
         
          timelineDates={props.timelineDates}
          timeFormat={props.timeFormat}
          userCells={props.userCells}
          selectedHourKeys={selectedHourKeys}
          onAddCityClick={props.onAddCityClick}
          onDeleteCity={props.onDeleteCity}
        />
      </CustomScrollbar>
      <DesktopSelectionOverlay overlayRef={overlayRef} frameLayerRef={frameLayerRef} />
      <TimelineGridActiveHourIndicator
        direction={activeHourDirection}
        onClick={scrollActiveHourIntoView}
      />
      </div>
      <div className="widgetFooter">
        <div className="widgetFooter-backdrop">
          <i className="widgetFooter-backdropCorner tll" />
          <i className="widgetFooter-backdropCorner tlr" />
          <i className="widgetFooter-backdropCorner trl" />
          <i className="widgetFooter-backdropCorner trr" />
        </div>
        <div className="widgetFooterMiddle">
          <button
            className="widgetHeaderButton"
            type="button"
            disabled={props.isEditMode || props.isDragging || !props.cities.length}
            onClick={() => {
              if (selectedHours.length) { clearSelection(); return; }
              cancelPan();
              if (createSelection()) setPanEnabled(false);
            }}
            aria-label={t(selectedHours.length ? 'common.clearSelection' : 'common.selectHours')}
            title={t(selectedHours.length ? 'common.clearSelection' : 'common.selectHours')}
          >
            {selectedHours.length ? <X size={16} aria-hidden="true" /> : <Scan size={16} aria-hidden="true" />}
          </button>
          <GridCalendarActions
            event={props.isEditMode || props.isDragging ? null : calendarEvent}
            cities={props.cities} hours={selectedHours}
          />
        </div>
      </div>
      {props.presentation === 'embedded' && <>
        <button className="timelinesNav timelinesNav_prev" type="button"
          aria-label={t('common.previousHour')} title={t('common.previousHour')}
          onClick={() => timelineGridViewportRef.current?.scrollBy({ left: -TIMELINE_HOUR_WIDTH, behavior: 'smooth' })}>
          <ChevronLeft size={48} aria-hidden="true" />
        </button>
        <button className="timelinesNav timelinesNav_next" type="button"
          aria-label={t('common.nextHour')} title={t('common.nextHour')}
          onClick={() => timelineGridViewportRef.current?.scrollBy({ left: TIMELINE_HOUR_WIDTH, behavior: 'smooth' })}>
          <ChevronRight size={48} aria-hidden="true" />
        </button>
      </>}
    </div>
  );
}
