import './style.css';
import TimelineGrid from '../TimelineGrid';
import type { PlannerLayout } from '../Planner/plannerLayout';

type TimelinesProps = {
  syncUrl?: boolean;
  layout?: PlannerLayout;
};

export default function Timelines(props: TimelinesProps) {
  return (
    <TimelineGrid
      {...props}
      presentation="embedded"
    />
  );
}
