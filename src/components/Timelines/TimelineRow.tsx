import type { TimeFormat } from '../../settings';
import type { FavoriteCity } from '../Cities/fixtures';
import {
  formatOffset,
  formatTime,
  getRelativeDayMarker,
  getTimelineCells,
  getTimelineCurrentPosition,
  getTimelineCellsStyle,
  getTimelineDates,
  getTimeZoneOffsetMinutes,
} from './utils';

type TimelineRowProps = {
  city: FavoriteCity;
  baseDate: Date;
  browserTimezone: string;
  timelineStartPosition: number;
  timeFormat: TimeFormat;
};

export default function TimelineRow({
  city,
  baseDate,
  browserTimezone,
  timelineStartPosition,
  timeFormat,
}: TimelineRowProps) {
  const cells = getTimelineCells(city.timezone, baseDate, getTimelineDates(city.timezone, baseDate), timeFormat);
  const offsetMinutes = getTimeZoneOffsetMinutes(city.timezone, baseDate)
    - getTimeZoneOffsetMinutes(browserTimezone, baseDate);
  const offset = formatOffset(offsetMinutes);
  const relativeDayMarker = getRelativeDayMarker(city.timezone, browserTimezone, baseDate);
  const timelinePositionOffset = getTimelineCurrentPosition(browserTimezone, baseDate)
    - getTimelineCurrentPosition(city.timezone, baseDate);
  const timelineVisualOffset = timelinePositionOffset - timelineStartPosition;

  return (
    <div className="timelines-row">
      <div className="timelines-city">
        <div className="container timelines-cityContainer">
          <span className="timelines-cityName">
            {city.customName || city.city}, <span className="timelines-cityOffset">{offset}</span>
          </span>
          {relativeDayMarker && (
            <span
              className={`timelines-cityDayMarker timelines-cityDayMarker_${relativeDayMarker}`}
            >
              {relativeDayMarker}
            </span>
          )}

          <span className="timelines-cityTime">{formatTime(baseDate, city.timezone, timeFormat)}</span>
        </div>
      </div>
      <div className="timelines-cells" style={getTimelineCellsStyle(timelineVisualOffset)}>
        {cells.map((cell, index) => (
          <span
            className={[
              'timelines-cell',
              cell.isAdjacentDay ? 'timelines-cell_adjacentDay' : '',
              cell.isCurrentHour ? 'timelines-cell_current' : '',
              cell.isDateLabel ? 'timelines-cell_date' : '',
            ].filter(Boolean).join(' ')}
            key={`${city.id}-${cell.date.toISOString()}-${index}`}
          >
            {cell.label}
          </span>
        ))}
      </div>
    </div>
  );
}
