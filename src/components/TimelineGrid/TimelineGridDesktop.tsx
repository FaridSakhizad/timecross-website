import { useRef } from 'react';
import CustomScrollbar from '../CustomScrollbar';
import TimelineGridActiveHourIndicator from './TimelineGridActiveHourIndicator';
import { TimelineGridTimeline, TimelineGridToolbar } from './TimelineGridContent';
import type { TimelineGridShellProps } from './types';
import { useTimelineGridElementActiveHourIndicator } from './useTimelineGridActiveHourIndicator';
import { useTimelineGridElementSnap } from './useTimelineGridSnap';

export default function TimelineGridDesktop(props: TimelineGridShellProps) {
  const timelineGridViewportRef = useRef<HTMLDivElement>(null);

  const resetGridScroll = useTimelineGridElementSnap(
    timelineGridViewportRef,
    props.currentUserHourIndex,
    props.isDragging || props.isEditMode,
  );
  const {
    direction: activeHourDirection,
    scrollActiveHourIntoView,
  } = useTimelineGridElementActiveHourIndicator(
    timelineGridViewportRef,
    props.isDragging || props.isEditMode,
  );

  return (
    <div
      className={[
        'timelineGrid',
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
        onEditModeToggle={props.onEditModeToggle}
        onResetClick={resetGridScroll}
        onTimeFormatButtonClick={props.onTimeFormatButtonClick}
      />
      <CustomScrollbar
        className="timelineGrid-scroll"
        contentClassName="timelineGrid-scrollViewport"
        contentRef={(element) => {
          timelineGridViewportRef.current = element;
        }}
        mode="both"
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
