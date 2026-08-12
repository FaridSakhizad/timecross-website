import './cities.css';

import {
  DndContext,
  PointerSensor,
  TouchSensor,
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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type { FavoriteCity } from './fixtures';
import { getSettings, type TimeFormat } from '../../settings';
import { useI18n } from '../../i18n';
import { formatPartsInTimezone } from '../../utils/abstractTimezone';
import AddCityModal from './AddCityModal';
import {
  createFavoriteCityFromSearchResult,
  getOrderedSelectedCities,
  saveSelectedCities,
} from './selectedCities';
import { useTimeRulerScroll } from './useTimeRulerScroll';
import RenameCityModal from './RenameCityModal';

const PIXELS_IN_MINUTE = 1;
const TIME_RULER_RANGE_MINUTES = 24 * 60;
const TIME_RULER_TICK_STEP_MINUTES = 15;
const TIME_RULER_HOUR_STEP_MINUTES = 60;
const MOBILE_CITIES_QUERY = '(width < 720px)';

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
  customClassNames?: string;
  showHomeButton?: boolean;
  showStandaloneButton?: boolean;
  timeFormat: TimeFormat;
};

function getOrderedCities(storedOrder: string[]) {
  return getOrderedSelectedCities(storedOrder);
}

function getIsMobileCitiesMode() {
  return typeof window !== 'undefined'
    && window.matchMedia(MOBILE_CITIES_QUERY).matches;
}

type SortableCityItemProps = {
  deleteLabel: string;
  favoriteCity: CityView;
  moveLabel: string;
  onDelete: (cityId: string) => void;
  onRename: (cityId: string, customName: string) => void;
  onRequestRename: (city: CityView) => void;
  clearNameLabel: string;
  customNamePlaceholder: string;
  isMobileRenameMode: boolean;
  renameLabel: string;
  saveNameLabel: string;
  tomorrowLabel: string;
  yesterdayLabel: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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
  const parts = formatPartsInTimezone(date, timezone, 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });
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
  deleteLabel,
  favoriteCity,
  moveLabel,
  onDelete,
  onRename,
  onRequestRename,
  clearNameLabel,
  customNamePlaceholder,
  isMobileRenameMode,
  renameLabel,
  saveNameLabel,
  tomorrowLabel,
  yesterdayLabel,
}: SortableCityItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const renameBoxRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
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
  const displayName = favoriteCity.customName || favoriteCity.city;

  useEffect(() => {
    if (!isRenaming) {
      return;
    }

    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [isRenaming]);

  useEffect(() => {
    if (!isRenaming) {
      return;
    }

    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (renameBoxRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsRenaming(false);
      setRenameValue('');
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown, true);
    };
  }, [isRenaming]);

  const startRenaming = () => {
    if (isMobileRenameMode) {
      onRequestRename(favoriteCity);
      return;
    }

    setRenameValue(favoriteCity.customName || '');
    setIsRenaming(true);
  };

  const finishRenaming = () => {
    const nextCustomName = renameValue.trim();

    onRename(favoriteCity.id, nextCustomName === favoriteCity.city ? '' : nextCustomName);
    setIsRenaming(false);
  };

  const cancelRenaming = () => {
    setIsRenaming(false);
    setRenameValue('');
  };

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      finishRenaming();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelRenaming();
    }
  };

  const clearCustomName = () => {
    setRenameValue('');
    onRename(favoriteCity.id, '');
    setIsRenaming(false);
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
      <button
        className="citiesList-dragButtonMobile"
        type="button"
        aria-label={moveLabel}
        {...attributes}
        {...listeners}
      />
      <i className={`citiesList-periodIcon citiesList-periodIcon_${favoriteCity.currentPeriod}`} />
      <div className="citiesList-city">
        {isRenaming ? (
          <div className="citiesList-nameInputBox" ref={renameBoxRef}>
            <input
              className="citiesList-nameInput"
              ref={renameInputRef}
              value={renameValue}
              aria-label={renameLabel}
              placeholder={customNamePlaceholder}
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={handleRenameKeyDown}
            />
            {renameValue.length > 0 && (
              <button
                type="button"
                className="citiesList-nameClear"
                aria-label={clearNameLabel}
                onPointerDown={(event) => event.preventDefault()}
                onClick={clearCustomName}
              />
            )}
            <button
              type="button"
              className="citiesList-nameSave"
              aria-label={saveNameLabel}
              onClick={finishRenaming}
            />
          </div>
        ) : (
          <button
            className="citiesList-nameButton"
            type="button"
            onClick={startRenaming}
            aria-label={renameLabel}
          >
            <span className="citiesList-name">
              {displayName}
              {favoriteCity.customName && (<span className="citiesList-originalName"> ({favoriteCity.city})</span>)}
            </span>
          </button>
        )}
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

      <button
        className="citiesList-deleteButton"
        type="button"
        aria-label={deleteLabel}
        onClick={() => onDelete(favoriteCity.id)}
      />
    </div>
  );
}

export default function Cities({
  customClassNames = '',
  showHomeButton = true,
  showStandaloneButton = true,
  timeFormat,
}: CitiesProps) {
  const {t} = useI18n();
  const customClassNameList = customClassNames.split(/\s+/).filter(Boolean);

  const [cities, setCities] = useState(() => getOrderedCities(getSettings().cityOrder));
  const [baseDate] = useState(() => new Date());
  const [isAddCityModalOpen, setIsAddCityModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isMobileRenameMode, setIsMobileRenameMode] = useState(getIsMobileCitiesMode);
  const [renamingCityId, setRenamingCityId] = useState<string | null>(null);
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
  const renamingCity = useMemo(
    () => cityViews.find((city) => city.id === renamingCityId) ?? null,
    [cityViews, renamingCityId],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_CITIES_QUERY);
    const updateMobileMode = () => setIsMobileRenameMode(mediaQuery.matches);

    updateMobileMode();
    mediaQuery.addEventListener('change', updateMobileMode);

    return () => {
      mediaQuery.removeEventListener('change', updateMobileMode);
    };
  }, []);

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
    useSensor(TouchSensor, {
      activationConstraint: {
        distance: 6,
      },
      onActivation: ({ event }) => {
        event.preventDefault();
      },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = cities.findIndex((city) => city.id === String(active.id));
    const newIndex = cities.findIndex((city) => city.id === String(over.id));

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const nextCities = arrayMove(cities, oldIndex, newIndex);

    setCities(nextCities);
    saveSelectedCities(nextCities);
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

  const handleAddCity = (city: Parameters<typeof createFavoriteCityFromSearchResult>[0]) => {
    if (cities.some((currentCity) => currentCity.id === String(city.id))) {
      setIsAddCityModalOpen(false);
      return;
    }

    const nextCities = [
      ...cities,
      createFavoriteCityFromSearchResult(city, cities.length),
    ];

    setCities(nextCities);
    saveSelectedCities(nextCities);
    setIsAddCityModalOpen(false);
  };

  const handleDeleteCity = useCallback((cityId: string) => {
    const nextCities = cities.filter((city) => city.id !== cityId);

    if (nextCities.length === cities.length) {
      return;
    }

    setCities(nextCities);
    saveSelectedCities(nextCities);
  }, [cities]);

  const handleRenameCity = useCallback((cityId: string, customName: string) => {
    const nextCities = cities.map((city) => (
      city.id === cityId
        ? { ...city, customName }
        : city
    ));

    setCities(nextCities);
    saveSelectedCities(nextCities);
  }, [cities]);

  const handleRenameCityFromModal = (customName: string) => {
    if (!renamingCity) {
      return;
    }

    handleRenameCity(renamingCity.id, customName);
    setRenamingCityId(null);
  };

  return (
    <div className={['cities', isEditMode ? 'cities_editMode' : '', ...customClassNameList].filter(Boolean).join(' ')}>
      <div className="citiesHeader">
        {showHomeButton && (
          <a
            href="/"
            className="citiesHeaderButton citiesHeaderButton_home"
          >
            <i className="citiesHeaderButton-icon citiesHeaderButton-icon_home" />
          </a>
        )}

        <button
          className={`citiesHeaderButton citiesHeaderButton_edit ${isEditMode ? 'isActive' : ''}`}
          type="button"
          aria-label="edit"
          aria-pressed={isEditMode}
          onClick={() => setIsEditMode((currentMode) => !currentMode)}
        >
          <i className="citiesHeaderButton-icon citiesHeaderButton-icon_edit" />
        </button>
        <button
          className="citiesHeaderButton"
          type="button"
          aria-label={t('common.addCity')}
          onClick={() => setIsAddCityModalOpen(true)}
        >
          <i className="citiesHeaderButton-icon citiesHeaderButton-icon_add" />
        </button>

        <a
          href="/grid"
          className="citiesHeaderButton citiesHeaderButton_grid"
        >
          <i className="citiesHeaderButton-icon citiesHeaderButton-icon_grid" />
        </a>

        {showStandaloneButton && (
          <a
            href="/cities"
            className="citiesHeaderButton"
          >
            <i className="citiesHeaderButton-icon citiesHeaderButton-icon_cities" />
          </a>
        )}
      </div>
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
                  clearNameLabel={t('cities.clearCustomName', { city: favoriteCity.customName || favoriteCity.city })}
                  customNamePlaceholder={t('cities.customNamePlaceholder')}
                  deleteLabel={t('cities.deleteCity', { city: favoriteCity.customName || favoriteCity.city })}
                  favoriteCity={favoriteCity}
                  isMobileRenameMode={isMobileRenameMode}
                  key={favoriteCity.id}
                  moveLabel={t('cities.moveCity', { city: favoriteCity.customName || favoriteCity.city })}
                  onDelete={handleDeleteCity}
                  onRename={handleRenameCity}
                  onRequestRename={(city) => setRenamingCityId(city.id)}
                  renameLabel={t('cities.renameCity', { city: favoriteCity.customName || favoriteCity.city })}
                  saveNameLabel={t('cities.saveCustomName', { city: favoriteCity.customName || favoriteCity.city })}
                  tomorrowLabel={t('cities.tomorrow')}
                  yesterdayLabel={t('cities.yesterday')}
                />
              ))}
            </SortableContext>
          </div>
        </DndContext>
      </div>
      <div className="timeRuler">
        {isTimeRulerAdjusted && (
          <button
            className="timeRuler-reset"
            type="button"
            aria-label={t('cities.resetSelectedTime')}
            onClick={handleTimeRulerReset}
          />
        )}

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
      <AddCityModal
        isOpen={isAddCityModalOpen}
        selectedCityIds={cityIds}
        onClose={() => setIsAddCityModalOpen(false)}
        onSave={handleAddCity}
      />
      <RenameCityModal
        key={renamingCity?.id ?? 'rename-city-modal'}
        isOpen={isMobileRenameMode && !!renamingCity}
        cityName={renamingCity?.city ?? ''}
        customName={renamingCity?.customName ?? ''}
        title={renamingCity ? t('cities.renameCity', { city: renamingCity.customName || renamingCity.city }) : ''}
        placeholder={t('cities.customNamePlaceholder')}
        clearLabel={renamingCity ? t('cities.clearCustomName', { city: renamingCity.customName || renamingCity.city }) : ''}
        closeLabel={t('common.close')}
        saveLabel={renamingCity ? t('cities.saveCustomName', { city: renamingCity.customName || renamingCity.city }) : ''}
        onClose={() => setRenamingCityId(null)}
        onSave={handleRenameCityFromModal}
      />
    </div>
  )
}
