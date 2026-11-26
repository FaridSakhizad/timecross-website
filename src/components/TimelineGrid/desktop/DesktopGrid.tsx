import './style.css';
import { Plus, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { usePreferences } from '../../../hooks/usePreferences';
import { useI18n } from '../../../i18n';
import { cx } from '../../../utils/classNames';
import CustomScrollbar from '../../CustomScrollbar';
import { TIMELINE_DESKTOP_SCROLLBAR_THUMB_WIDTH } from '../shared/constants';
import TimelineGridActiveHourIndicator from '../shared/GridActiveHourIndicator';
import GridDateButton from '../shared/GridDateButton';
import { getSelectedHourStarts, gridSlotKey } from '../shared/gridSelection';
import SelectionCard from '../shared/SelectionCard';
import type { TimelineGridShellProps } from '../shared/types';
import { useSelectionCardCollapse } from '../shared/useSelectionCardCollapse';

import DesktopSelectionOverlay from './DesktopSelectionOverlay';
import DesktopTimeline from './DesktopTimeline';
import DesktopToolbar from './DesktopToolbar';
import HourNavButton from './HourNavButton';
import { useDesktopGridPan } from './useDesktopGridPan';
import { useDesktopGridActiveHourIndicator, useDesktopGridScrollPosition } from './useDesktopGridScroll';
import { useGridSelection } from './useGridSelection';
import { useSelectionCardPosition } from './useSelectionCardPosition';

const GRID_VERTICAL_SCROLLBAR_TOP = 50;
const GRID_VERTICAL_SCROLLBAR_BOTTOM = 12;
const GRID_HORIZONTAL_SCROLLBAR_LEFT = 12;
const GRID_HORIZONTAL_SCROLLBAR_RIGHT = 12;

export default function DesktopGrid(props: TimelineGridShellProps) {
  const timelineGridViewportRef = useRef<HTMLDivElement>(null);
  const {
    isPlannerPanEnabled: panEnabled,
    setPlannerPanEnabled: setPanEnabled,
  } = usePreferences();
  const [isScrollbarDragging, setIsScrollbarDragging] = useState(false);
  const scrollbarInteractionRef = useRef(false);
  const { t } = useI18n();
  const canPan = panEnabled && !props.isEditMode && !props.isDragging;
  const { selectedHours, isSelecting, isResizing, interactionRef: selectionInteractionRef, overlayRef, frameRef, clearSelection, createSelection } = useGridSelection(
    timelineGridViewportRef,
    !panEnabled && !props.isEditMode && !props.isDragging,
    JSON.stringify([props.timelineDates[0]?.getTime(), props.cities.map((city) => city.id)]),
    props.isEditMode || props.isDragging,
    props.initialSelectedHours,
    props.onSelectionChange,
  );
  const selectedSlotKeys = useMemo(() => new Set(selectedHours.map(gridSlotKey)), [selectedHours]);
  const selectedHourStarts = useMemo(() => getSelectedHourStarts(selectedHours), [selectedHours]);
  const selectionCardRef = useRef<HTMLDivElement>(null);
  // While an edge of the frame is dragged, the card slides along; a new frame is drawn without it.
  const showSelectionCard = selectedHours.length > 0 && (!isSelecting || isResizing) && !props.isEditMode && !props.isDragging;
  const [isSelectionCardCollapsed, setSelectionCardCollapsed] = useSelectionCardCollapse(selectedHours.length > 0);

  useSelectionCardPosition(
    timelineGridViewportRef,
    frameRef,
    selectionCardRef,
    showSelectionCard ? JSON.stringify([selectedHours, props.cities.length, isSelectionCardCollapsed]) : '',
  );
  const { isPanning, interactionRef, cancelPan } = useDesktopGridPan(
    timelineGridViewportRef,
    canPan,
    undefined,
    props.isEditMode || props.isDragging,
  );
  const isInteracting = useCallback(
    () => interactionRef.current || scrollbarInteractionRef.current || selectionInteractionRef.current,
    [interactionRef, selectionInteractionRef],
  );
  const interactionActive = isPanning || isScrollbarDragging || isSelecting;
  const scrollbarCenterHourIndex = props.initialFocusHourIndex ?? props.currentUserHourIndex;
  const getScrollbarMetrics = useCallback((axis: 'horizontal' | 'vertical', viewport: HTMLDivElement) => {
    if (axis === 'vertical') {
      return undefined;
    }

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
    if (!panEnabled) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        cancelPan();
        setPanEnabled(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [cancelPan, panEnabled, setPanEnabled]);

  const scrollToCurrentHour = useDesktopGridScrollPosition(
    timelineGridViewportRef,
    props.currentUserHourIndex,
    props.isDragging || props.isEditMode || interactionActive,
    isInteracting,
    props.initialFocusHourIndex,
    props.onHourChange,
  );
  // Shown as soon as the current hour leaves the view, also while the grid is still being dragged.
  const { direction: activeHourDirection } = useDesktopGridActiveHourIndicator(
    timelineGridViewportRef,
    props.isDragging || props.isEditMode,
  );

  const toolbar = (
    <DesktopToolbar
      {...props}
      citiesLocked={selectedHours.length > 0}
      panEnabled={canPan}
      panDisabled={props.isEditMode || props.isDragging}
      onPanToggle={() => {
        cancelPan();
        setPanEnabled((value) => !value);
      }}
      onEditModeToggle={() => {
        clearSelection();
        cancelPan();
        setPanEnabled(false);
        props.onEditModeToggle();
      }}
      // Back to the current hour; the selection stays (a grid moved to today drops hours of another day itself).
      onResetClick={() => {
        cancelPan();
        scrollToCurrentHour();
        props.onReset?.();
      }}
    />
  );

  return (
    <div className={props.presentation === 'embedded' ? 'widget timelinesEmbedded' : 'widget timelinesZen'}>
      {toolbar}
      <div className={cx(
        'widgetContent timelineGrid',
        canPan && 'isPanEnabled',
        props.isEditMode && 'isEditing',
        props.isDragging && 'isDragging',
      )}
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
          <div className="timelineGrid-content">
            <DesktopTimeline
              baseDate={props.baseDate}
              browserTimezone={props.browserTimezone}
              cities={props.cities}
              isEditMode={props.isEditMode}
              timelineDates={props.timelineDates}
              timeFormat={props.timeFormat}
              userCells={props.userCells}
              selectedSlotKeys={selectedSlotKeys}
              selectedHourStarts={selectedHourStarts}
              meetingExcludedIds={props.meetingExcludedIds}
              onDeleteCity={props.onDeleteCity}
            />
            <DesktopSelectionOverlay
              overlayRef={overlayRef}
              frameRef={frameRef}
            />
          </div>
          <div className="timelineCitiesBackdrop" />
        </CustomScrollbar>
        {/* Outside the scrolling viewport, see useSelectionCardPosition. */}
        {showSelectionCard && (
          <SelectionCard
            cardRef={selectionCardRef}
            cities={props.cities}
            hours={selectedHours}
            browserTimezone={props.browserTimezone}
            participantIds={props.meetingParticipantIds}
            onParticipantChange={props.onMeetingParticipantChange}
            collapsed={isSelectionCardCollapsed}
            onCollapsedChange={setSelectionCardCollapsed}
            onClear={clearSelection}
          />
        )}
        <TimelineGridActiveHourIndicator
          direction={activeHourDirection}
          onClick={scrollToCurrentHour}
        />
      </div>
      <div className="widgetFooter">
        <div className="widgetFooter-backdrop">
          <i className="widgetFooter-backdropCorner tll" />
          <i className="widgetFooter-backdropCorner tlr" />
          <i className="widgetFooter-backdropCorner trl" />
          <i className="widgetFooter-backdropCorner trr" />
        </div>
        <div className="widgetFooterStart">
          <HourNavButton
            direction="prev"
            viewportRef={timelineGridViewportRef}
          />
        </div>
        <div className="widgetFooterMiddle">
          {/* Another day also with hours selected: they move to it. */}
          <GridDateButton
            date={props.focusedDate}
            timezone={props.browserTimezone}
            disabled={props.isEditMode || props.isDragging}
            onSelect={props.onDateSelect}
          />
          {/* With hours selected, their card beside the frame has the actions. */}
          {!selectedHours.length && (
            <button
              className="widgetHeaderButton widgetHeaderButton_label"
              type="button"
              disabled={props.isEditMode || props.isDragging || !props.cities.length}
              onClick={() => {
                cancelPan();

                if (createSelection()) {
                  setPanEnabled(false);
                }
              }}
            >
              <Plus
                size={16}
                aria-hidden="true"
              />
              {t('common.selectMeetingHours')}
            </button>
          )}
          {/* As on a phone, the only way to drop the selection: clicks on the grid and Escape keep it. */}
          {selectedHours.length > 0 && (
            <button
              className="widgetHeaderButton"
              type="button"
              aria-label={t('common.clearSelection')}
              data-tooltip={t('common.clearSelection')}
              onClick={clearSelection}
            >
              <X
                size={16}
                aria-hidden="true"
              />
            </button>
          )}
        </div>
        <div className="widgetFooterEnd">
          <HourNavButton
            direction="next"
            viewportRef={timelineGridViewportRef}
          />
        </div>
      </div>
    </div>
  );
}
