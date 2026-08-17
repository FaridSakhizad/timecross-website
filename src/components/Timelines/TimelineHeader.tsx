import type { TimelineCell } from './types';
import TimelineCellLabel from './TimelineCellLabel';
import { getTimelineCellsStyle } from './utils';

const DAY_PERIOD_SUFFIX_PATTERN = /\s(?:AM|PM)$/;

type TimelineHeaderProps = {
  userCells: TimelineCell[];
};

export default function TimelineHeader({ userCells }: TimelineHeaderProps) {
  return (
    <div className="timelines-row timelines-row_header">
      <div className="timelines-trackClip">
        <div className="timelines-cells" style={getTimelineCellsStyle(0)}>
          {userCells.map((cell, index) => {
            const shouldShowCurrentTime = cell.isCurrentHour;
            const shouldShowCurrentDateTime = cell.isCurrentHour && cell.isDateLabel;
            const cellLabel = shouldShowCurrentTime
              ? cell.label.replace(DAY_PERIOD_SUFFIX_PATTERN, '')
              : cell.label;
            const currentTimeLabel = cell.periodLabel
              ? cell.currentTimeLabel.replace(cell.periodLabel, '')
              : cell.currentTimeLabel;

            return (
              <span
                className={[
                  'timelines-hour',
                  cell.isCurrentHour ? 'timelines-hour_current' : '',
                  cell.isDateLabel ? 'timelines-hour_date' : '',
                  shouldShowCurrentTime && !cell.isDateLabel ? 'timelines-hour_withTime' : '',
                  shouldShowCurrentDateTime ? 'timelines-hour_withDateTime' : '',
                ].filter(Boolean).join(' ')}
                key={`user-${cell.date.toISOString()}-${index}`}
              >
                {shouldShowCurrentDateTime ? (
                  <>
                    <span className="timelines-hourDateValue">{cell.label}</span>
                    <span className="timelines-hourCurrentTime">
                      <span className="timelines-hourCurrentValue">{currentTimeLabel}</span>
                      {cell.periodLabel && (
                        <span className="timelines-hourCurrentPeriod">{cell.periodLabel}</span>
                      )}
                    </span>
                  </>
                ) : shouldShowCurrentTime ? (
                  <span className="timelines-hourCurrentTime">
                    <span className="timelines-hourCurrentValue">{currentTimeLabel}</span>
                    {cell.periodLabel && (
                      <span className="timelines-hourCurrentPeriod">{cell.periodLabel}</span>
                    )}
                  </span>
                ) : (
                  <TimelineCellLabel label={cellLabel} periodClassName="timelines-periodMarker" />
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
