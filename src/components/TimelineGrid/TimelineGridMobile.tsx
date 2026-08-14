import TimelineGridActiveHourIndicator from './TimelineGridActiveHourIndicator';
import TimelineGridContent from './TimelineGridContent';
import type { TimelineGridShellProps } from './types';
import { useTimelineGridPageActiveHourIndicator } from './useTimelineGridActiveHourIndicator';
import { useTimelineGridPageSnap } from './useTimelineGridSnap';

export default function TimelineGridMobile(props: TimelineGridShellProps) {
  const resetGridScroll = useTimelineGridPageSnap(
    props.currentUserHourIndex,
    props.isDragging || props.isEditMode,
  );
  const {
    direction: activeHourDirection,
    scrollActiveHourIntoView,
  } = useTimelineGridPageActiveHourIndicator(
    props.isDragging || props.isEditMode,
  );

  return (
    <>
      <TimelineGridContent {...props} mode="mobile" onResetClick={resetGridScroll} />
      <TimelineGridActiveHourIndicator
        direction={activeHourDirection}
        onClick={scrollActiveHourIntoView}
      />
    </>
  );
}
