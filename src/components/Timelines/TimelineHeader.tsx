import type { TimelineCell } from './types';
import { getTimelineCellsStyle } from './utils';

type TimelineHeaderProps = {
  userCells: TimelineCell[];
};

export default function TimelineHeader({ userCells }: TimelineHeaderProps) {
  return (
    <div className="timelines-row timelines-row_header">
      {/*
      <div className="timelines-city timelines-city_header">
        <div className="container timelines-cityContainer">
          <span>Your Time</span>
          <span className="timelines-cityTime">{formatTime(baseDate, browserTimezone, timeFormat)}</span>
        </div>
      </div>
      */}
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
  );
}
