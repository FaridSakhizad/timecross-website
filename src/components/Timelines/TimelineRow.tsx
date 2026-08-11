import { useEffect, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { TimeFormat } from '../../settings';
import { ENABLE_FRACTIONAL_TIMELINE_OFFSETS } from '../../config';
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
  isEditMode: boolean;
  timelineDates: Date[];
  timeFormat: TimeFormat;
  onDelete: (cityId: string) => void;
};

function isTimelineDragPressTarget(target: EventTarget | null) {
  return target instanceof Element
    && Boolean(target.closest('.timelines-dragButton, .timelines-cellsSpacer'));
}

export default function TimelineRow({
  city,
  baseDate,
  browserTimezone,
  isEditMode,
  timelineDates,
  timeFormat,
  onDelete,
}: TimelineRowProps) {
  const { t } = useI18n();
  const [isPressed, setIsPressed] = useState(false);
  const shouldRenderCells = !isEditMode;
  const cells = shouldRenderCells
    ? getTimelineCells(city.timezone, baseDate, timelineDates, timeFormat)
    : [];
  const offsetMinutes = getTimeZoneOffsetMinutes(city.timezone, baseDate)
    - getTimeZoneOffsetMinutes(browserTimezone, baseDate);
  const offset = formatOffset(offsetMinutes, t('cities.sameOffset'));
  const relativeDayMarker = getRelativeDayMarker(city.timezone, browserTimezone, baseDate);
  const timelineShiftMinutes = ENABLE_FRACTIONAL_TIMELINE_OFFSETS
    ? getTimelineTimezoneShiftMinutes(city.timezone, browserTimezone, baseDate)
    : 0;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: city.id,
    disabled: !isEditMode,
  });
  const verticalTransform = transform ? { ...transform, x: 0 } : null;
  const style = {
    transform: CSS.Transform.toString(verticalTransform),
    transition,
  };
  const handlePressStart = (target: EventTarget | null) => {
    if (!isEditMode || !isTimelineDragPressTarget(target)) {
      return;
    }

    setIsPressed(true);
  };

  useEffect(() => {
    if (!isPressed) {
      return undefined;
    }

    const handlePressEnd = () => setIsPressed(false);

    window.addEventListener('pointerup', handlePressEnd);
    window.addEventListener('pointercancel', handlePressEnd);
    window.addEventListener('touchend', handlePressEnd);
    window.addEventListener('touchcancel', handlePressEnd);

    return () => {
      window.removeEventListener('pointerup', handlePressEnd);
      window.removeEventListener('pointercancel', handlePressEnd);
      window.removeEventListener('touchend', handlePressEnd);
      window.removeEventListener('touchcancel', handlePressEnd);
    };
  }, [isPressed]);

  useEffect(() => {
    if (!isEditMode) {
      setIsPressed(false);
    }
  }, [isEditMode]);

  return (
    <div
      className={[
        'timelines-row',
        isEditMode ? 'timelines-row_reorder' : '',
        isPressed && !isDragging ? 'timelines-row_pressed' : '',
        isDragging ? 'timelines-row_dragging' : '',
      ].filter(Boolean).join(' ')}
      onPointerDown={(event) => handlePressStart(event.target)}
      onTouchStart={(event) => handlePressStart(event.target)}
      ref={setNodeRef}
      style={style}
    >
      <div className="timelines-city">
        <div className="container timelines-cityContainer">
          {isEditMode && (
            <button
              className="timelines-dragButton"
              type="button"
              aria-label={t('cities.moveCity', { city: city.customName || city.city })}
              {...attributes}
              {...listeners}
            />
          )}

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

          {isEditMode && (
            <button
              className="timelines-deleteButton"
              type="button"
              aria-label={t('cities.deleteCity', { city: city.customName || city.city })}
              onClick={() => onDelete(city.id)}
            />
          )}
        </div>
      </div>
      <div className="timelines-trackClip">
        {shouldRenderCells && (
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
        )}

        {!shouldRenderCells && (
          <div
            className="timelines-cellsSpacer"
            aria-label={t('cities.moveCity', { city: city.customName || city.city })}
            style={{
              width: `calc(${timelineDates.length} * 74px)`,
            }}
            {...attributes}
            {...listeners}
          />
        )}
      </div>
    </div>
  );
}
