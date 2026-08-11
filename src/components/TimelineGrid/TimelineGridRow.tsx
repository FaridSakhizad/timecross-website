import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useI18n } from '../../i18n';
import type { TimeFormat } from '../../settings';
import type { FavoriteCity } from '../Cities/fixtures';
import {
  formatOffset,
  formatTime,
  getRelativeDayMarker,
  getTimelineCells,
  getTimeZoneOffsetMinutes,
} from '../Timelines/utils';
import type { TimelineGridMode } from './types';

type TimelineGridRowProps = {
  baseDate: Date;
  browserTimezone: string;
  city: FavoriteCity;
  isEditMode: boolean;
  mode: TimelineGridMode;
  timelineDates: Date[];
  timeFormat: TimeFormat;
  onDelete: (cityId: string) => void;
};

export default function TimelineGridRow({
  baseDate,
  browserTimezone,
  city,
  isEditMode,
  mode,
  timelineDates,
  timeFormat,
  onDelete,
}: TimelineGridRowProps) {
  const { t } = useI18n();
  const cells = getTimelineCells(city.timezone, baseDate, timelineDates, timeFormat);
  const offsetMinutes = getTimeZoneOffsetMinutes(city.timezone, baseDate)
    - getTimeZoneOffsetMinutes(browserTimezone, baseDate);
  const offset = formatOffset(offsetMinutes, t('cities.sameOffset'));
  const relativeDayMarker = getRelativeDayMarker(city.timezone, browserTimezone, baseDate);
  const cityModeClassName = mode === 'mobile' ? 'timelineGrid-city_mobile' : 'timelineGrid-city_desktop';
  const cellsModeClassName = mode === 'mobile' ? 'timelineGrid-cells_mobile' : 'timelineGrid-cells_desktop';
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({
    id: city.id,
    disabled: !isEditMode,
  });
  const verticalTransform = transform ? { ...transform, x: 0 } : null;
  const style = {
    transform: CSS.Transform.toString(verticalTransform),
    transition: undefined,
  };

  return (
    <div
      className={[
        'timelineGrid-row',
        mode === 'mobile' ? 'timelineGrid-row_mobile' : 'timelineGrid-row_desktop',
        isDragging ? 'timelineGrid-row_dragging' : '',
      ].filter(Boolean).join(' ')}
      ref={setNodeRef}
      style={style}
    >
      <div className={`timelineGrid-city ${cityModeClassName}`}>
        <div className="timelineGrid-cityInner">
          {isEditMode && (
            <button
              className="timelineGrid-dragButton"
              type="button"
              aria-label={t('cities.moveCity', { city: city.customName || city.city })}
              {...attributes}
              {...listeners}
            />
          )}

          <span className="timelineGrid-cityName">
            {city.customName || city.city}, <span className="timelineGrid-cityOffset">{offset}</span>
          </span>

          {relativeDayMarker && (
            <span className={`timelineGrid-dayMarker timelineGrid-dayMarker_${relativeDayMarker}`}>
              {relativeDayMarker === 'tomorrow' ? t('cities.tomorrow') : t('cities.yesterday')}
            </span>
          )}

          <span className="timelineGrid-cityTime">{formatTime(baseDate, city.timezone, timeFormat)}</span>

          {isEditMode && (
            <button
              className="timelineGrid-deleteButton"
              type="button"
              aria-label={t('cities.deleteCity', { city: city.customName || city.city })}
              onClick={() => onDelete(city.id)}
            />
          )}
        </div>
      </div>

      <div className={`timelineGrid-cells ${cellsModeClassName}`}>
        {cells.map((cell, index) => (
          <span
            className={[
              'timelineGrid-cell',
              cell.isAdjacentDay ? 'timelineGrid-cell_adjacentDay' : '',
              cell.isCurrentHour ? 'timelineGrid-cell_current' : '',
              cell.isDateLabel ? 'timelineGrid-cell_date' : '',
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
