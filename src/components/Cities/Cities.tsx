import './cities.css';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import CustomScrollbar from '../CustomScrollbar';
import { getOrderedFavoriteCities, type FavoriteCity } from './fixtures';
import { getSettings, updateSettings, type TimeFormat } from '../../settings';

const PIXELS_IN_MINUTE = 1;
const TIME_RULER_RANGE_MINUTES = 24 * 60;
const TIME_RULER_TICK_STEP_MINUTES = 15;
const TIME_RULER_HOUR_STEP_MINUTES = 60;

type TimeRulerDrag = {
  pointerId: number;
  pointerStartX: number;
  timeOffsetStartMinutes: number;
};

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

type CityView = FavoriteCity & {
  currentTime: string;
  currentPeriod: FavoriteCity['period'];
  dayShiftLabel: 'Yesterday' | 'Tomorrow' | null;
  relativeTimeOffset: string;
};

type CitiesProps = {
  timeFormat: TimeFormat;
};

function getOrderedCities(storedOrder: string[]) {
  return getOrderedFavoriteCities(storedOrder);
}

function saveCityOrder(cities: FavoriteCity[]) {
  updateSettings((settings) => ({
    ...settings,
    cityOrder: cities.map((city) => city.id),
  }));
}

type SortableCityItemProps = {
  favoriteCity: CityView;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getZonedDateParts(timezone: string, date: Date): ZonedDateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const dateParts = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  ) as ZonedDateParts;

  return dateParts;
}

function getTimeZoneOffsetMinutes(timezone: string, date: Date) {
  const dateParts = getZonedDateParts(timezone, date);
  const zonedTime = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    dateParts.hour,
    dateParts.minute,
    dateParts.second,
  );

  return Math.round((zonedTime - date.getTime()) / 60000);
}

function formatRelativeTimeOffset(offsetMinutes: number) {
  if (offsetMinutes === 0) {
    return 'same';
  }

  const sign = offsetMinutes > 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  return `${sign}${hours}${minutes > 0 ? `:${String(minutes).padStart(2, '0')}` : ''}`;
}

function formatTimeRulerOffset(offsetMinutes: number) {
  return offsetMinutes === 0 ? '+0' : formatRelativeTimeOffset(offsetMinutes);
}

function getBrowserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getRelativeTimeOffset(timezone: string, fallback: string, date: Date) {
  try {
    const browserTimezone = getBrowserTimezone();
    const browserOffset = getTimeZoneOffsetMinutes(browserTimezone, date);
    const cityOffset = getTimeZoneOffsetMinutes(timezone, date);

    return formatRelativeTimeOffset(cityOffset - browserOffset);
  } catch {
    return fallback.replace(/h$/i, '');
  }
}

function formatTimeInTimezone(timezone: string, date: Date, timeFormat: TimeFormat) {
  return new Intl.DateTimeFormat(timeFormat === '24h' ? 'en-GB' : 'en-US', {
    timeZone: timezone,
    hour: timeFormat === '24h' ? '2-digit' : 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
    hourCycle: 'h23',
  }).format(date);
}

function getPeriodFromHour(hour: number): FavoriteCity['period'] {
  if (hour >= 5 && hour < 11) {
    return 'morning';
  }

  if (hour >= 11 && hour < 18) {
    return 'day';
  }

  if (hour >= 18 && hour < 22) {
    return 'evening';
  }

  return 'night';
}

function getDateSerial(dateParts: Pick<ZonedDateParts, 'year' | 'month' | 'day'>) {
  return Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day) / 86400000;
}

function getDayShiftLabel(timezone: string, browserTimezone: string, date: Date) {
  const browserDate = getZonedDateParts(browserTimezone, date);
  const cityDate = getZonedDateParts(timezone, date);
  const dayDiff = getDateSerial(cityDate) - getDateSerial(browserDate);

  if (dayDiff > 0) {
    return 'Tomorrow';
  }

  if (dayDiff < 0) {
    return 'Yesterday';
  }

  return null;
}

function getCityView(
  city: FavoriteCity,
  selectedDate: Date,
  browserTimezone: string,
  timeFormat: TimeFormat,
): CityView {
  const cityDateParts = getZonedDateParts(city.timezone, selectedDate);

  return {
    ...city,
    currentTime: formatTimeInTimezone(city.timezone, selectedDate, timeFormat),
    currentPeriod: getPeriodFromHour(cityDateParts.hour),
    dayShiftLabel: getDayShiftLabel(city.timezone, browserTimezone, selectedDate),
    relativeTimeOffset: getRelativeTimeOffset(city.timezone, city.timeOffset, selectedDate),
  };
}

function formatRulerTime(date: Date, timeFormat: TimeFormat) {
  return new Intl.DateTimeFormat(timeFormat === '24h' ? 'en-GB' : 'en-US', {
    hour: timeFormat === '24h' ? '2-digit' : 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
    hourCycle: 'h23',
  }).format(date);
}

function getDateWithTimeOffset(baseDate: Date, offsetMinutes: number) {
  return new Date(baseDate.getTime() + offsetMinutes * 60000);
}

function SortableCityItem({ favoriteCity }: SortableCityItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: favoriteCity.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      className={`citiesList-item ${isDragging ? 'citiesList-item_dragging' : ''}`}
      ref={setNodeRef}
      style={style}
    >
      <button
        className="citiesList-dragButton"
        type="button"
        aria-label={`Move ${favoriteCity.customName || favoriteCity.city}`}
        {...attributes}
        {...listeners}
      />
      <i className={`citiesList-periodIcon citiesList-periodIcon_${favoriteCity.currentPeriod}`} />
      <div className="citiesList-city">
        <h4 className="citiesList-name">
          {favoriteCity.customName || favoriteCity.city}
          {favoriteCity.customName && (<span className="citiesList-originalName"> ({favoriteCity.city})</span>)}
        </h4>
        <span className="citiesList-timeOffset">
          {favoriteCity.relativeTimeOffset}
          {favoriteCity.dayShiftLabel && (
            <span className="citiesList-dayBadge">{favoriteCity.dayShiftLabel}</span>
          )}
        </span>
      </div>
      <span className="citiesList-time">{favoriteCity.currentTime}</span>
    </div>
  );
}

export default function Cities({ timeFormat }: CitiesProps) {
  const [cities, setCities] = useState(() => getOrderedCities(getSettings().cityOrder));
  const [baseDate] = useState(() => new Date());
  const [timeOffsetMinutes, setTimeOffsetMinutes] = useState(0);
  const [isTimeRulerDragging, setIsTimeRulerDragging] = useState(false);
  const timeRulerDragRef = useRef<TimeRulerDrag | null>(null);

  const cityIds = useMemo(() => cities.map((city) => city.id), [cities]);
  const selectedDate = useMemo(
    () => getDateWithTimeOffset(baseDate, timeOffsetMinutes),
    [baseDate, timeOffsetMinutes],
  );
  const isTimeRulerAdjusted = timeOffsetMinutes !== 0;

  const cityViews = useMemo(() => {
    const browserTimezone = getBrowserTimezone();

    return cities.map((city) => getCityView(city, selectedDate, browserTimezone, timeFormat));
  }, [cities, selectedDate, timeFormat]);

  const timeRulerTicks = useMemo(() => {
    const ticks = [];

    for (
      let minute = -TIME_RULER_RANGE_MINUTES;
      minute <= TIME_RULER_RANGE_MINUTES;
      minute += TIME_RULER_TICK_STEP_MINUTES
    ) {
      ticks.push(minute);
    }

    return ticks;
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    setCities((currentCities) => {
      const oldIndex = currentCities.findIndex((city) => city.id === active.id);
      const newIndex = currentCities.findIndex((city) => city.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return currentCities;
      }

      const nextCities = arrayMove(currentCities, oldIndex, newIndex);

      saveCityOrder(nextCities);

      return nextCities;
    });
  };

  const updateTimeOffset = (nextTimeOffsetMinutes: number) => {
    setTimeOffsetMinutes(clamp(
      Math.round(nextTimeOffsetMinutes),
      -TIME_RULER_RANGE_MINUTES,
      TIME_RULER_RANGE_MINUTES,
    ));
  };

  const endTimeRulerDrag = useCallback(() => {
    if (!timeRulerDragRef.current) {
      return;
    }

    timeRulerDragRef.current = null;
    setIsTimeRulerDragging(false);
  }, []);

  const handleTimeRulerPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    timeRulerDragRef.current = {
      pointerId: event.pointerId,
      pointerStartX: event.clientX,
      timeOffsetStartMinutes: timeOffsetMinutes,
    };
    setIsTimeRulerDragging(true);
  };

  const handleTimeRulerPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = timeRulerDragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    if (event.buttons === 0) {
      endTimeRulerDrag();
      return;
    }

    const pointerDelta = event.clientX - drag.pointerStartX;

    updateTimeOffset(drag.timeOffsetStartMinutes - pointerDelta / PIXELS_IN_MINUTE);
  };

  const handleTimeRulerPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = timeRulerDragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    endTimeRulerDrag();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleTimeRulerWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    updateTimeOffset(timeOffsetMinutes + (event.deltaY + event.deltaX) / PIXELS_IN_MINUTE);
  };

  const handleTimeRulerReset = () => {
    updateTimeOffset(0);
  };

  useEffect(() => {
    if (!isTimeRulerDragging) {
      return;
    }

    const handleWindowPointerUp = () => {
      endTimeRulerDrag();
    };

    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    window.addEventListener('blur', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
      window.removeEventListener('blur', handleWindowPointerUp);
    };
  }, [endTimeRulerDrag, isTimeRulerDragging]);

  return (
    <div className="cities">
      <div className="citiesHeader"></div>
      <CustomScrollbar className="citiesListBox" contentClassName="citiesList">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={cityIds} strategy={verticalListSortingStrategy}>
            {cityViews.map((favoriteCity) => (
              <SortableCityItem
                favoriteCity={favoriteCity}
                key={favoriteCity.id}
              />
            ))}
          </SortableContext>
        </DndContext>
      </CustomScrollbar>
      <div className="timeRuler">
        <button
          className="timeRuler-reset"
          type="button"
          aria-label="Reset selected time"
          onClick={handleTimeRulerReset}
        />
        <div className="timeRuler-info">
          {isTimeRulerAdjusted && (
            <span className="timeRuler-currentTime">{formatRulerTime(baseDate, timeFormat)}</span>
          )}
          <span className="timeRuler-selectedTime">{formatRulerTime(selectedDate, timeFormat)}</span>
          {isTimeRulerAdjusted && (
            <span className="timeRuler-offset">{formatTimeRulerOffset(timeOffsetMinutes)}</span>
          )}
        </div>
        <div
          className={`timeRuler-scale ${isTimeRulerDragging ? 'timeRuler-scale_dragging' : ''}`}
          role="slider"
          aria-label="Selected time offset"
          aria-valuemin={-TIME_RULER_RANGE_MINUTES}
          aria-valuemax={TIME_RULER_RANGE_MINUTES}
          aria-valuenow={timeOffsetMinutes}
          onPointerDown={handleTimeRulerPointerDown}
          onPointerMove={handleTimeRulerPointerMove}
          onPointerUp={handleTimeRulerPointerUp}
          onPointerCancel={handleTimeRulerPointerUp}
          onWheel={handleTimeRulerWheel}
        >
          <div
            className="timeRuler-track"
            style={{
              width: `${TIME_RULER_RANGE_MINUTES * 2 * PIXELS_IN_MINUTE}px`,
              transform: `translate3d(-${(timeOffsetMinutes + TIME_RULER_RANGE_MINUTES) * PIXELS_IN_MINUTE}px, 0, 0)`,
            }}
          >
            {timeRulerTicks.map((minute) => (
              <span
                className={[
                  'timeRuler-tick',
                  minute % TIME_RULER_HOUR_STEP_MINUTES === 0 ? 'timeRuler-tick_hour' : '',
                  minute === 0 ? 'timeRuler-tick_current' : '',
                ].filter(Boolean).join(' ')}
                key={minute}
                style={{ left: `${(minute + TIME_RULER_RANGE_MINUTES) * PIXELS_IN_MINUTE}px` }}
              >
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
