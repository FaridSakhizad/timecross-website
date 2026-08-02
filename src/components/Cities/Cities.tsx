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
import { useCallback, useMemo, useState } from 'react';
import { getOrderedFavoriteCities, type FavoriteCity } from './fixtures';
import { getSettings, updateSettings, type TimeFormat } from '../../settings';
import { useI18n } from '../../i18n';
import { useTimeRulerScroll } from './useTimeRulerScroll';

const PIXELS_IN_MINUTE = 1;
const TIME_RULER_RANGE_MINUTES = 24 * 60;
const TIME_RULER_TICK_STEP_MINUTES = 15;
const TIME_RULER_HOUR_STEP_MINUTES = 60;

const zonedDatePartsFormatters = new Map<string, Intl.DateTimeFormat>();
const rulerTimeFormatters = new Map<TimeFormat, Intl.DateTimeFormat>();
let browserTimezoneCache: string | null = null;

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
  dayShift: 'yesterday' | 'tomorrow' | null;
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
  moveLabel: string;
  tomorrowLabel: string;
  yesterdayLabel: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getZonedDatePartsFormatter(timezone: string) {
  const cachedFormatter = zonedDatePartsFormatters.get(timezone);

  if (cachedFormatter) {
    return cachedFormatter;
  }

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

  zonedDatePartsFormatters.set(timezone, formatter);

  return formatter;
}

function getRulerTimeFormatter(timeFormat: TimeFormat) {
  const cachedFormatter = rulerTimeFormatters.get(timeFormat);

  if (cachedFormatter) {
    return cachedFormatter;
  }

  const formatter = new Intl.DateTimeFormat(timeFormat === '24h' ? 'en-GB' : 'en-US', {
    hour: timeFormat === '24h' ? '2-digit' : 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h',
    hourCycle: 'h23',
  });

  rulerTimeFormatters.set(timeFormat, formatter);

  return formatter;
}

function getZonedDateParts(timezone: string, date: Date): ZonedDateParts {
  const formatter = getZonedDatePartsFormatter(timezone);
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

  return getTimeZoneOffsetMinutesFromParts(dateParts, date);
}

function getTimeZoneOffsetMinutesFromParts(dateParts: ZonedDateParts, date: Date) {
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

function formatRelativeTimeOffset(offsetMinutes: number, sameLabel: string) {
  if (offsetMinutes === 0) {
    return sameLabel;
  }

  const sign = offsetMinutes > 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  return `${sign}${hours}${minutes > 0 ? `:${String(minutes).padStart(2, '0')}` : ''}`;
}

function formatTimeRulerOffset(offsetMinutes: number) {
  return offsetMinutes === 0 ? '+0' : formatRelativeTimeOffset(offsetMinutes, 'same');
}

function getBrowserTimezone() {
  if (!browserTimezoneCache) {
    browserTimezoneCache = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  return browserTimezoneCache;
}

function formatTimeFromDateParts(dateParts: ZonedDateParts, timeFormat: TimeFormat) {
  if (timeFormat === '24h') {
    const { hour, minute } = dateParts;

    return `${hour === 0 ? '00' : hour}:${String(minute).padStart(2, '0')}`;
  }

  const hour = dateParts.hour % 12 || 12;
  const dayPeriod = dateParts.hour >= 12 ? 'PM' : 'AM';

  return `${hour}:${String(dateParts.minute).padStart(2, '0')} ${dayPeriod}`;
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

function getDayShiftLabel(cityDateParts: ZonedDateParts, baseBrowserDateParts: ZonedDateParts) {
  const dayDiff = getDateSerial(cityDateParts) - getDateSerial(baseBrowserDateParts);

  if (dayDiff > 0) {
    return 'tomorrow';
  }

  if (dayDiff < 0) {
    return 'yesterday';
  }

  return null;
}

function getCityView(
  city: FavoriteCity,
  selectedDate: Date,
  baseBrowserDateParts: ZonedDateParts,
  browserOffsetMinutes: number,
  timeFormat: TimeFormat,
  sameLabel: string,
): CityView {
  const cityDateParts = getZonedDateParts(city.timezone, selectedDate);

  return {
    ...city,
    currentTime: formatTimeFromDateParts(cityDateParts, timeFormat),
    currentPeriod: getPeriodFromHour(cityDateParts.hour),
    dayShift: getDayShiftLabel(cityDateParts, baseBrowserDateParts),
    relativeTimeOffset: formatRelativeTimeOffset(
      getTimeZoneOffsetMinutesFromParts(cityDateParts, selectedDate) - browserOffsetMinutes,
      sameLabel,
    ),
  };
}

function formatRulerTime(date: Date, timeFormat: TimeFormat) {
  return getRulerTimeFormatter(timeFormat).format(date);
}

function getDateWithTimeOffset(baseDate: Date, offsetMinutes: number) {
  return new Date(baseDate.getTime() + offsetMinutes * 60000);
}

function SortableCityItem({
  favoriteCity,
  moveLabel,
  tomorrowLabel,
  yesterdayLabel,
}: SortableCityItemProps) {
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
        aria-label={moveLabel}
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
          {favoriteCity.dayShift && (
            <span className="citiesList-dayBadge">
              {favoriteCity.dayShift === 'tomorrow' ? tomorrowLabel : yesterdayLabel}
            </span>
          )}
        </span>
      </div>
      <span className="citiesList-time">{favoriteCity.currentTime}</span>
    </div>
  );
}

export default function Cities({ timeFormat }: CitiesProps) {
  const { t } = useI18n();
  const [cities, setCities] = useState(() => getOrderedCities(getSettings().cityOrder));
  const [baseDate] = useState(() => new Date());
  const [timeOffsetMinutes, setTimeOffsetMinutes] = useState(0);

  const cityIds = useMemo(() => cities.map((city) => city.id), [cities]);
  const selectedDate = useMemo(
    () => getDateWithTimeOffset(baseDate, timeOffsetMinutes),
    [baseDate, timeOffsetMinutes],
  );
  const isTimeRulerAdjusted = timeOffsetMinutes !== 0;

  const cityViews = useMemo(() => {
    const browserTimezone = getBrowserTimezone();
    const baseBrowserDateParts = getZonedDateParts(browserTimezone, baseDate);
    const browserOffsetMinutes = getTimeZoneOffsetMinutes(browserTimezone, selectedDate);

    return cities.map((city) => getCityView(
      city,
      selectedDate,
      baseBrowserDateParts,
      browserOffsetMinutes,
      timeFormat,
      t('cities.sameOffset'),
    ));
  }, [baseDate, cities, selectedDate, timeFormat, t]);

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

  const updateTimeOffset = useCallback((nextTimeOffsetMinutes: number) => {
    setTimeOffsetMinutes(clamp(
      Math.round(nextTimeOffsetMinutes),
      -TIME_RULER_RANGE_MINUTES,
      TIME_RULER_RANGE_MINUTES,
    ));
  }, []);

  const {
    isDragging: isTimeRulerDragging,
    scrollToOffset: scrollTimeRulerToOffset,
    viewportRef: timeRulerScaleRef,
  } = useTimeRulerScroll({
    offsetMinutes: timeOffsetMinutes,
    pixelsInMinute: PIXELS_IN_MINUTE,
    rangeMinutes: TIME_RULER_RANGE_MINUTES,
    onOffsetChange: updateTimeOffset,
  });

  const handleTimeRulerReset = () => {
    scrollTimeRulerToOffset(0, true);
  };

  return (
    <div className="cities">
      <div className="citiesHeader"></div>
      <div className="citiesListBox scrollControl">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="citiesList">
            <SortableContext items={cityIds} strategy={verticalListSortingStrategy}>
              {cityViews.map((favoriteCity) => (
                <SortableCityItem
                  favoriteCity={favoriteCity}
                  key={favoriteCity.id}
                  moveLabel={t('cities.moveCity', { city: favoriteCity.customName || favoriteCity.city })}
                  tomorrowLabel={t('cities.tomorrow')}
                  yesterdayLabel={t('cities.yesterday')}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      </div>
      <div className="timeRuler">
        <button
          className="timeRuler-reset"
          type="button"
          aria-label={t('cities.resetSelectedTime')}
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
          ref={timeRulerScaleRef}
          role="slider"
          aria-label={t('cities.selectedTimeOffset')}
          aria-valuemin={-TIME_RULER_RANGE_MINUTES}
          aria-valuemax={TIME_RULER_RANGE_MINUTES}
          aria-valuenow={timeOffsetMinutes}
        >
          <div
            className="timeRuler-track"
            style={{
              width: `${TIME_RULER_RANGE_MINUTES * 2 * PIXELS_IN_MINUTE}px`,
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
