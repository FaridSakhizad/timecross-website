import TimelineGridContent from './TimelineGridContent';
import type { TimelineGridShellProps } from './types';
import { useTimelineGridPageSnap } from './useTimelineGridSnap';

export default function TimelineGridMobile(props: TimelineGridShellProps) {
  const resetGridScroll = useTimelineGridPageSnap(
    props.currentUserHourIndex,
    props.isDragging || props.isEditMode,
  );

  return <TimelineGridContent {...props} mode="mobile" onResetClick={resetGridScroll} />;
}
