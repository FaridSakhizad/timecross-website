import type { TimeFormat } from '../../settings';
import { useI18n } from '../../i18n';
import type { FavoriteCity } from '../Cities/fixtures';
import {
  formatOffset,
  formatTime,
  getRelativeDayMarker,
  getTimelineCells,
  getTimelineCellsStyle,
  getTimelineTimezoneShiftMinutes,
  getTimeZoneOffsetMinutes,
} from './utils';

type TimelineRowProps = {
  city: FavoriteCity;
  baseDate: Date;
  browserTimezone: string;
  timelineDates: Date[];
  timeFormat: TimeFormat;
};

export default function TimelineRow({
  city,
  baseDate,
  browserTimezone,
  timelineDates,
  timeFormat,
}: TimelineRowProps) {
  const { t } = useI18n();
  const cells = getTimelineCells(city.timezone, baseDate, timelineDates, timeFormat);
  const offsetMinutes = getTimeZoneOffsetMinutes(city.timezone, baseDate)
    - getTimeZoneOffsetMinutes(browserTimezone, baseDate);
  const offset = formatOffset(offsetMinutes, t('cities.sameOffset'));
  const relativeDayMarker = getRelativeDayMarker(city.timezone, browserTimezone, baseDate);
  const timelineShiftMinutes = getTimelineTimezoneShiftMinutes(city.timezone, browserTimezone, baseDate);

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
              {relativeDayMarker === 'tomorrow' ? t('cities.tomorrow') : t('cities.yesterday')}
            </span>
          )}

          <span className="timelines-cityTime">{formatTime(baseDate, city.timezone, timeFormat)}</span>
        </div>
      </div>
      <div className="timelines-trackClip">
        <div className="timelines-cells" style={getTimelineCellsStyle(timelineShiftMinutes)}>
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
    </div>
  );
}
