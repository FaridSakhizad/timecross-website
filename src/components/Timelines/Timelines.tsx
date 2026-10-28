import './style.css';
import TimelineGrid from '../TimelineGrid';
import type { ColorMode, TimeFormat } from '../../settings';
import type { PlannerLayout } from '../Planner/plannerLayout';

type TimelinesProps = {
  colorMode: ColorMode;
  timeFormat: TimeFormat;
  syncUrl?: boolean;
  layout?: PlannerLayout;
  onColorModeButtonClick: () => void;
  onTimeFormatButtonClick: () => void;
};

export default function Timelines(props: TimelinesProps) {
  return <TimelineGrid {...props} presentation="embedded" />;
}
