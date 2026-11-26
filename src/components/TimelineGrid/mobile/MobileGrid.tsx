import './style.css';
import { useCallback, useMemo, useRef, useState } from 'react';

import TimelineGridActiveHourIndicator from '../shared/GridActiveHourIndicator';
import { getSelectedHourStarts, gridSlotKey } from '../shared/gridSelection';
import SelectionCard from '../shared/SelectionCard';
import type { TimelineGridShellProps } from '../shared/types';
import { useTimelineGridActiveHourIndicator } from '../shared/useGridActiveHourIndicator';
import { useTimelineGridScrollPosition } from '../shared/useGridScrollPosition';
import { useSelectionCardCollapse } from '../shared/useSelectionCardCollapse';

import MobileMeetingDialog from './MobileMeetingDialog';
import MobileSelectionControls from './MobileSelectionControls';
import MobileSelectionOverlay from './MobileSelectionOverlay';
import MobileTimeline from './MobileTimeline';
import MobileToolbar from './MobileToolbar';
import { useMobileGridHorizontalScrollLock } from './useMobileGridHorizontalScrollLock';
import { useMobileGridSelection } from './useMobileGridSelection';
import { useMobileSelectionCardPosition } from './useMobileSelectionCardPosition';

const EMPTY_SELECTION: NonNullable<TimelineGridShellProps['initialSelectedHours']> = [];

export default function MobileGrid(props: TimelineGridShellProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const embedded = props.presentation === 'embedded';

  useMobileGridHorizontalScrollLock(!embedded && props.isEditMode);
  const getScrollTarget = useCallback(() => {
    if (!embedded) {
      return { type: 'page' as const };
    }

    return viewportRef.current ? { type: 'element' as const, element: viewportRef.current } : null;
  }, [embedded]);
  const selectedHours = props.initialSelectedHours ?? EMPTY_SELECTION;
  const { enabled, toggle, clear, frameRef, interactionRef, isResizing } = useMobileGridSelection(
    selectedHours,
    props.onSelectionChange,
    props.isEditMode || props.isDragging,
    JSON.stringify([props.timelineDates[0]?.getTime(), props.cities.map((city) => city.id)]),
    embedded ? viewportRef : undefined,
    contentRef,
  );
  const isInteracting = useCallback(() => interactionRef.current, [interactionRef]);
  const selectedSlotKeys = useMemo(() => new Set(selectedHours.map(gridSlotKey)), [selectedHours]);
  const selectedHourStarts = useMemo(() => getSelectedHourStarts(selectedHours), [selectedHours]);
  // The meeting's details and actions: in a dialog from the footer, and in the card by the frame,
  // folded at first so that it does not cover the grid.
  const [isEventDialogOpen, setEventDialogOpen] = useState(false);
  const selectionCardRef = useRef<HTMLDivElement>(null);
  const [isSelectionCardCollapsed, setSelectionCardCollapsed] = useSelectionCardCollapse(enabled, true);
  const showSelectionCard = enabled && !props.isEditMode && !props.isDragging;

  useMobileSelectionCardPosition(
    frameRef,
    selectionCardRef,
    embedded ? viewportRef : undefined,
    showSelectionCard ? JSON.stringify([selectedHours, props.cities.length, isSelectionCardCollapsed]) : '',
    isSelectionCardCollapsed,
  );

  // Adjusted while rendering: the dialog goes with the selection.
  if (!enabled && isEventDialogOpen) {
    setEventDialogOpen(false);
  }

  const scrollToCurrentHour = useTimelineGridScrollPosition(
    getScrollTarget,
    props.currentUserHourIndex,
    props.isDragging || props.isEditMode || isResizing,
    isInteracting,
    props.initialFocusHourIndex,
    props.onHourChange,
  );
  // Shown as soon as the current hour leaves the view, also while a handle is being dragged.
  const { direction: activeHourDirection } = useTimelineGridActiveHourIndicator(
    getScrollTarget,
    props.isDragging || props.isEditMode,
  );

  const toolbar = (
    <MobileToolbar
      {...props}
      selectedHours={selectedHours}
      citiesLocked={enabled}
      // Back to the current hour; the selection stays (a grid moved to today drops hours of another day itself).
      onResetClick={() => {
        scrollToCurrentHour();
        props.onReset?.();
      }}
      onEditModeToggle={() => {
        clear();
        props.onEditModeToggle();
      }}
      onAddCityClick={() => {
        clear();
        props.onAddCityClick();
      }}
    />
  );

  const timeline = (
    <>
      <div
        ref={contentRef}
        className="timelineGrid-content"
      >
        <MobileTimeline
          {...props}
          selectedSlotKeys={selectedSlotKeys}
          selectedHourStarts={selectedHourStarts}
        />
        <MobileSelectionOverlay
          enabled={enabled}
          frameRef={frameRef}
        />
        {/* By the frame, as on a desktop; it follows the frame while a handle is dragged. */}
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
          />
        )}
      </div>
    </>
  );

  return (
    <>
      {embedded
        ? (
            <div className="timelineGridMobileEmbedded">
              {toolbar}
              <div
                ref={viewportRef}
                className="timelineGrid-scrollViewport"
              >
                <div
                  className="timelineGridBackdrop"
                  aria-hidden="true"
                />
                {timeline}
                <TimelineGridActiveHourIndicator
                  direction={activeHourDirection}
                  onClick={scrollToCurrentHour}
                />
              </div>

              <div className="zenPageMobile-footer">
                <MobileSelectionControls
                  browserTimezone={props.browserTimezone}
                  focusedDate={props.focusedDate}
                  onDateSelect={props.onDateSelect}
                  selectionEnabled={enabled}
                  selectionDisabled={props.isEditMode || props.isDragging || !props.cities.length}
                  onSelectionToggle={toggle}
                  onCreateEvent={() => setEventDialogOpen(true)}
                />
              </div>
            </div>
          )
        : (
            <>
              <div className="zenPageMobile">
                <div
                  className="timelineGridBackdrop"
                  aria-hidden="true"
                />
                {toolbar}
                {timeline}
                <TimelineGridActiveHourIndicator
                  direction={activeHourDirection}
                  onClick={scrollToCurrentHour}
                />
                <div className="zenPageMobile-footer">
                  <MobileSelectionControls
                    browserTimezone={props.browserTimezone}
                    focusedDate={props.focusedDate}
                    onDateSelect={props.onDateSelect}
                    selectionEnabled={enabled}
                    selectionDisabled={props.isEditMode || props.isDragging || !props.cities.length}
                    onSelectionToggle={toggle}
                    onCreateEvent={() => setEventDialogOpen(true)}
                  />
                </div>
              </div>
              <div className="zenPageMobileBackdrop" />
            </>
          )}

      {enabled && (
        <MobileMeetingDialog
          isOpen={isEventDialogOpen}
          cities={props.cities}
          hours={selectedHours}
          browserTimezone={props.browserTimezone}
          participantIds={props.meetingParticipantIds}
          onParticipantChange={props.onMeetingParticipantChange}
          onClose={() => setEventDialogOpen(false)}
        />
      )}
    </>
  );
}
