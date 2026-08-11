import { useRef } from 'react';
import CustomScrollbar from '../CustomScrollbar';
import { TimelineGridTimeline, TimelineGridToolbar } from './TimelineGridContent';
import type { TimelineGridShellProps } from './types';
import { useTimelineGridElementSnap } from './useTimelineGridSnap';

export default function TimelineGridDesktop(props: TimelineGridShellProps) {
  const timelineGridViewportRef = useRef<HTMLDivElement>(null);

  useTimelineGridElementSnap(timelineGridViewportRef, props.currentUserHourIndex);

  return (
    <div
      className={`timelineGrid ${props.isEditMode ? 'timelineGrid_editMode' : ''}`}
    >
      <TimelineGridToolbar
        isEditMode={props.isEditMode}
        mode="desktop"
        onAddCityClick={props.onAddCityClick}
        onEditModeToggle={props.onEditModeToggle}
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
          onDeleteCity={props.onDeleteCity}
        />
      </CustomScrollbar>
    </div>
  );
}
