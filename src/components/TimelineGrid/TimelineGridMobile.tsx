import TimelineGridContent from './TimelineGridContent';
import type { TimelineGridShellProps } from './types';
import { useTimelineGridPageSnap } from './useTimelineGridSnap';

export default function TimelineGridMobile(props: TimelineGridShellProps) {
  useTimelineGridPageSnap(props.currentUserHourIndex);

  return <TimelineGridContent {...props} mode="mobile" />;
}
