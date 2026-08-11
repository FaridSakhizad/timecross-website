import TimelineGrid from '../components/TimelineGrid';
import type { TimeFormat } from '../settings';

type GridPageProps = {
  timeFormat: TimeFormat;
};

export default function GridPage({ timeFormat }: GridPageProps) {
  return (
    <TimelineGrid timeFormat={timeFormat} />
  );
}
