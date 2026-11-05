import { useMobileWidgetLayout } from '../../hooks/useMobileWidgetLayout';

import DesktopGrid from './desktop/DesktopGrid';
import { resolveTimelineGridLayout, type TimelineGridLayout } from './layout';
import MobileGrid from './mobile/MobileGrid';
import TimelineGridSession from './shared/TimelineGridSession';
import type { TimelineGridSessionProps } from './shared/types';

export type TimelineGridProps = TimelineGridSessionProps & { layout?: TimelineGridLayout };

/** The planner: picks the desktop or the touch view. Session state lives above it and survives a switch. */
export default function TimelineGrid({ layout = 'auto', ...props }: TimelineGridProps) {
  const touchLayout = useMobileWidgetLayout();
  const View = resolveTimelineGridLayout(layout, touchLayout) === 'mobile' ? MobileGrid : DesktopGrid;

  return (
    <TimelineGridSession
      {...props}
      View={View}
    />
  );
}
