import { useMobileWidgetLayout } from '../../useMobileWidgetLayout';
import TimelineGridSession from '../TimelineGrid/shared/TimelineGridSession';
import DesktopGrid from '../TimelineGrid/desktop/DesktopGrid';
import MobileGrid from '../TimelineGrid/mobile/MobileGrid';
import type { TimelineGridProps } from '../TimelineGrid/shared/types';
import { resolvePlannerLayout, type PlannerLayout } from './plannerLayout';

export type PlannerProps = TimelineGridProps & { layout?: PlannerLayout };

export default function Planner({ layout = 'auto', ...props }: PlannerProps) {
  const touchLayout = useMobileWidgetLayout();
  const View = resolvePlannerLayout(layout, touchLayout) === 'mobile' ? MobileGrid : DesktopGrid;
  return <TimelineGridSession {...props} View={View} />;
}
