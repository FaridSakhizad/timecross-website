import TimelineCellLabel from '../../Timelines/TimelineCellLabel';
import type { TimelineCell } from '../../Timelines/types';

export default function GridUserHours({ userCells, className }: { userCells: TimelineCell[]; className: string }) {
  return (
    <div className={`timelineGrid-userHours ${className}`}>
      {userCells.map((cell, index) => {
        const shouldShowCurrentMinutes = cell.isCurrentHour && !cell.isDateLabel;
        const shouldShowCurrentDateTime = cell.isCurrentHour && cell.isDateLabel;

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
            {shouldShowCurrentDateTime && (
              <span className="timelineGrid-hourDateValue">{cell.label}</span>
            )}
            {cell.isCurrentHour
              ? (
                  <span className="timelineGrid-hourCurrentTime">
                    <span className="timelineGrid-hourCurrentValue">{cell.currentTimeLabel}</span>
                    {cell.periodLabel && (
                      <span className="timelineGrid-hourCurrentPeriod">{cell.periodLabel}</span>
                    )}
                  </span>
                )
              : (
                  <TimelineCellLabel
                    label={cell.label}
                    period={cell.labelPeriod}
                    periodClassName="timelineGrid-periodMarker"
                  />
                )}
          </span>
        );
      })}
    </div>
  );
}
