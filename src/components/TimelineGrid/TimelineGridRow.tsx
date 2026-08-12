import { useEffect, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useI18n } from '../../i18n';
import type { TimeFormat } from '../../settings';
import type { FavoriteCity } from '../Cities/fixtures';
import TimelineCellLabel from '../Timelines/TimelineCellLabel';
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

function isTimelineGridDragPressTarget(target: EventTarget | null) {
  return target instanceof Element
    && Boolean(target.closest('.timelineGrid-dragButton, .timelineGrid-cellsSpacer'));
}

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
  const [isPressed, setIsPressed] = useState(false);
  const shouldRenderCells = !isEditMode;
  const cells = shouldRenderCells
    ? getTimelineCells(city.timezone, baseDate, timelineDates, timeFormat)
    : [];
  const offsetMinutes = getTimeZoneOffsetMinutes(city.timezone, baseDate)
    - getTimeZoneOffsetMinutes(browserTimezone, baseDate);
  const offset = formatOffset(offsetMinutes, t('cities.sameOffset'));
  const relativeDayMarker = getRelativeDayMarker(city.timezone, browserTimezone, baseDate);
  const cityModeClassName = mode === 'mobile' ? 'timelineGrid-city_mobile' : 'timelineGrid-city_desktop';
  const cellsModeClassName = mode === 'mobile' ? 'timelineGrid-cells_mobile' : 'timelineGrid-cells_desktop';
  const cellsSpacerModeClassName = mode === 'mobile'
    ? 'timelineGrid-cellsSpacer_mobile'
    : 'timelineGrid-cellsSpacer_desktop';
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
    if (!isEditMode || !isTimelineGridDragPressTarget(target)) {
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
        'timelineGrid-row',
        mode === 'mobile' ? 'timelineGrid-row_mobile' : 'timelineGrid-row_desktop',
        isEditMode ? 'timelineGrid-row_reorder' : '',
        isPressed && !isDragging ? 'timelineGrid-row_pressed' : '',
        isDragging ? 'timelineGrid-row_dragging' : '',
      ].filter(Boolean).join(' ')}
      onPointerDown={(event) => handlePressStart(event.target)}
      onTouchStart={(event) => handlePressStart(event.target)}
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

      {shouldRenderCells && (
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
              <TimelineCellLabel label={cell.label} periodClassName="timelineGrid-periodMarker" />
            </span>
          ))}
        </div>
      )}

      {!shouldRenderCells && (
        <div
          className={`timelineGrid-cellsSpacer ${cellsSpacerModeClassName}`}
          aria-label={t('cities.moveCity', { city: city.customName || city.city })}
          style={{
            width: `calc(${timelineDates.length} * var(--timeline-grid-hour-width))`,
          }}
          {...attributes}
          {...listeners}
        />
      )}
    </div>
  );
}
