import type { TimelineCell } from './types';
import { getTimelineCellsStyle } from './utils';

type TimelineHeaderProps = {
  userCells: TimelineCell[];
};

export default function TimelineHeader({ userCells }: TimelineHeaderProps) {
  return (
    <div className="timelines-row timelines-row_header">
      <div className="timelines-trackClip">
        <div className="timelines-cells" style={getTimelineCellsStyle(0)}>
          {userCells.map((cell, index) => (
            <span
              className={[
                'timelines-hour',
                cell.isCurrentHour ? 'timelines-hour_current' : '',
                cell.isDateLabel ? 'timelines-hour_date' : '',
              ].filter(Boolean).join(' ')}
              key={`user-${cell.date.toISOString()}-${index}`}
            >
              {cell.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
