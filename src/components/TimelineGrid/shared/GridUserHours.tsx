import TimelineCellLabel from '../../Timelines/TimelineCellLabel';
import type { TimelineCell } from '../../Timelines/types';

const DAY_PERIOD_SUFFIX_PATTERN = /\s(?:AM|PM)$/;

export default function GridUserHours({ userCells, className }: { userCells: TimelineCell[]; className: string }) {
  return (
    <div className={`timelineGrid-userHours ${className}`}>
        {userCells.map((cell, index) => {
          const shouldShowCurrentMinutes = cell.isCurrentHour && !cell.isDateLabel;
          const shouldShowCurrentDateTime = cell.isCurrentHour && cell.isDateLabel;
          const cellLabel = shouldShowCurrentMinutes
            ? cell.label.replace(DAY_PERIOD_SUFFIX_PATTERN, '')
            : cell.label;
          const currentTimeLabel = cell.periodLabel
            ? cell.currentTimeLabel.replace(cell.periodLabel, '')
            : cell.currentTimeLabel;

          return (
            <span
              className={[
                'timelineGrid-hour',
                cell.isCurrentHour ? 'timelineGrid-hour_current' : '',
                cell.isDateLabel ? 'timelineGrid-hour_date' : '',
                shouldShowCurrentMinutes ? 'timelineGrid-hour_withTime' : '',
                shouldShowCurrentDateTime ? 'timelineGrid-hour_withDateTime' : '',
              ].filter(Boolean).join(' ')}
              key={`user-${cell.date.toISOString()}-${index}`}
            >
              {shouldShowCurrentDateTime ? (
                <>
                  <span className="timelineGrid-hourDateValue">{cell.label}</span>
                  <span className="timelineGrid-hourCurrentTime">
                    <span className="timelineGrid-hourCurrentValue">{currentTimeLabel}</span>
                    {cell.periodLabel && (
                      <span className="timelineGrid-hourCurrentPeriod">{cell.periodLabel}</span>
                    )}
                  </span>
                </>
              ) : shouldShowCurrentMinutes ? (
                <span className="timelineGrid-hourCurrentTime">
                  <span className="timelineGrid-hourCurrentValue">{currentTimeLabel}</span>
                  {cell.periodLabel && (
                    <span className="timelineGrid-hourCurrentPeriod">{cell.periodLabel}</span>
                  )}
                </span>
              ) : (
                <TimelineCellLabel label={cellLabel} periodClassName="timelineGrid-periodMarker" />
              )}
            </span>
          );
        })}
    </div>
  );
}
