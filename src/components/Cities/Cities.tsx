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
import { Link } from 'react-router';
import type { FavoriteCity } from './fixtures';
import type { ColorMode, TimeFormat } from '../../settings';
import { useCurrentMinuteDate } from '../../useCurrentMinuteDate';
import { useMobileWidgetLayout } from '../../useMobileWidgetLayout';
import { useI18n } from '../../i18n';
import { getCanonicalLanguagePath } from '../../i18n/languageRouting';
import { clamp } from '../../utils/number';
import {
  formatClockTime,
  formatRelativeOffset,
  getBrowserTimezone,
  getClockLabel,
  getDateSerial,
  getDayPeriod,
  getTimeZoneOffsetMinutes,
  getTimeZoneOffsetMinutesFromParts,
  getZonedDateParts,
  type ZonedDateParts,
} from '../../utils/time';
import AddCityModal from './AddCityModal';
import StandaloneMenuModal from '../StandaloneMenuModal';
import {
  createFavoriteCityFromSearchResult,
  getStoredOrderedSelectedCities,
  saveSelectedCities,
  subscribeSelectedCities,
} from './selectedCities';
import { useTimeRulerScroll } from './useTimeRulerScroll';
import RenameCityModal from './RenameCityModal';
import { getCityBaseName, getCityDisplayName, useLocalizedCities } from './useLocalizedCities';

const PIXELS_IN_MINUTE = 1;
const TIME_RULER_RANGE_MINUTES = 24 * 60;
const TIME_RULER_TICK_STEP_MINUTES = 15;
const TIME_RULER_HOUR_STEP_MINUTES = 60;


type CityView = FavoriteCity & {
  currentTime: string;
  currentPeriod: FavoriteCity['period'];
  dayShift: 'yesterday' | 'tomorrow' | null;
  relativeTimeOffset: string;
};

type CitiesProps = {
  colorMode?: ColorMode;
  customClassNames?: string;
  showHomeButton?: boolean;
  showStandaloneButton?: boolean;
  timeFormat: TimeFormat;
  onColorModeButtonClick?: () => void;
  onTimeFormatButtonClick?: () => void;
};

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

function formatTimeRulerOffset(offsetMinutes: number) {
  return offsetMinutes === 0 ? '+0' : formatRelativeOffset(offsetMinutes, 'same');
}

function formatTimeFromDateParts(dateParts: ZonedDateParts, timeFormat: TimeFormat) {
  const { time, period } = getClockLabel(dateParts.hour, dateParts.minute, timeFormat);

  return period ? `${time} ${period}` : time;
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
    currentPeriod: getDayPeriod(cityDateParts.hour),
    dayShift: getDayShiftLabel(cityDateParts, baseBrowserDateParts),
    relativeTimeOffset: formatRelativeOffset(
      getTimeZoneOffsetMinutesFromParts(cityDateParts, selectedDate) - browserOffsetMinutes,
      sameLabel,
    ),
  };
}

function formatRulerTime(date: Date, timeFormat: TimeFormat) {
  return formatClockTime(date, getBrowserTimezone(), timeFormat);
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
  const displayName = getCityDisplayName(favoriteCity);
  const baseName = getCityBaseName(favoriteCity);

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

    onRename(favoriteCity.id, nextCustomName === baseName ? '' : nextCustomName);
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
              {favoriteCity.customName && (<span className="citiesList-originalName"> ({baseName})</span>)}
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
  colorMode = 'day',
  customClassNames = '',
  showHomeButton = true,
  showStandaloneButton = true,
  timeFormat,
  onColorModeButtonClick,
  onTimeFormatButtonClick,
}: CitiesProps) {
  const {language, t} = useI18n();
  const customClassNameList = customClassNames.split(/\s+/).filter(Boolean);

  const [cities, setCities] = useState(getStoredOrderedSelectedCities);
  const baseDate = useCurrentMinuteDate();
  const [isAddCityModalOpen, setIsAddCityModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const isMobileRenameMode = useMobileWidgetLayout();
  const [renamingCityId, setRenamingCityId] = useState<string | null>(null);
  const [timeOffsetMinutes, setTimeOffsetMinutes] = useState(0);

  const localizedCities = useLocalizedCities(cities);

  // Picks up changes made by other widgets on the page and in other open tabs.
  useEffect(() => subscribeSelectedCities(() => {
    setCities(getStoredOrderedSelectedCities());
  }), []);

  const cityIds = useMemo(() => cities.map((city) => city.id), [cities]);
  const selectedDate = useMemo(
    () => getDateWithTimeOffset(baseDate, timeOffsetMinutes),
    [baseDate, timeOffsetMinutes],
  );
  const isTimeRulerAdjusted = timeOffsetMinutes !== 0;
  const hasStandaloneMenu = Boolean(
    showHomeButton
    && onColorModeButtonClick
    && onTimeFormatButtonClick,
  );

  const cityViews = useMemo(() => {
    const browserTimezone = getBrowserTimezone();
    const baseBrowserDateParts = getZonedDateParts(browserTimezone, baseDate);
    const browserOffsetMinutes = getTimeZoneOffsetMinutes(browserTimezone, selectedDate);

    return localizedCities.map((city) => getCityView(
      city,
      selectedDate,
      baseBrowserDateParts,
      browserOffsetMinutes,
      timeFormat,
      t('cities.sameOffset'),
    ));
  }, [baseDate, localizedCities, selectedDate, timeFormat, t]);
  const renamingCity = useMemo(
    () => cityViews.find((city) => city.id === renamingCityId) ?? null,
    [cityViews, renamingCityId],
  );

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
          <Link
            to={getCanonicalLanguagePath(language, '/')}
            className="citiesHeaderButton citiesHeaderButton_home"
          >
            <i className="citiesHeaderButton-icon citiesHeaderButton-icon_home" />
          </Link>
        )}

        <button
          className={`citiesHeaderButton citiesHeaderButton_edit ${isEditMode ? 'isActive' : ''}`}
          type="button"
          aria-label={t('common.edit')}
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

        {showStandaloneButton && (
          <Link
            to={getCanonicalLanguagePath(language, '/cities')}
            className="citiesHeaderButton citiesHeaderButton_cities"
          >
            <i className="citiesHeaderButton-icon citiesHeaderButton-icon_open" />
          </Link>
        )}

        {hasStandaloneMenu && (
          <button
            className="citiesHeaderButton citiesHeaderButton_menu"
            type="button"
            aria-label={t('common.menu')}
            onClick={() => setIsMenuModalOpen(true)}
          >
            <i className="citiesHeaderButton-icon citiesHeaderButton-icon_menu" />
          </button>
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
                  clearNameLabel={t('cities.clearCustomName', { city: getCityDisplayName(favoriteCity) })}
                  customNamePlaceholder={t('cities.customNamePlaceholder')}
                  deleteLabel={t('cities.deleteCity', { city: getCityDisplayName(favoriteCity) })}
                  favoriteCity={favoriteCity}
                  isMobileRenameMode={isMobileRenameMode}
                  key={favoriteCity.id}
                  moveLabel={t('cities.moveCity', { city: getCityDisplayName(favoriteCity) })}
                  onDelete={handleDeleteCity}
                  onRename={handleRenameCity}
                  onRequestRename={(city) => setRenamingCityId(city.id)}
                  renameLabel={t('cities.renameCity', { city: getCityDisplayName(favoriteCity) })}
                  saveNameLabel={t('cities.saveCustomName', { city: getCityDisplayName(favoriteCity) })}
                  tomorrowLabel={t('cities.tomorrow')}
                  yesterdayLabel={t('cities.yesterday')}
                />
              ))}
            </SortableContext>
            <button
              className="citiesList-addButton"
              type="button"
              onClick={() => setIsAddCityModalOpen(true)}
            >
              <i className="citiesList-addButtonIcon" />
              <span className="citiesList-addButtonText">{t('common.addCity')}</span>
            </button>
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
        onClose={() => setIsAddCityModalOpen(false)}
        onSave={handleAddCity}
      />
      <RenameCityModal
        key={renamingCity?.id ?? 'rename-city-modal'}
        isOpen={isMobileRenameMode && !!renamingCity}
        cityName={renamingCity ? getCityBaseName(renamingCity) : ''}
        customName={renamingCity?.customName ?? ''}
        title={renamingCity ? t('cities.renameCity', { city: getCityDisplayName(renamingCity) }) : ''}
        placeholder={t('cities.customNamePlaceholder')}
        clearLabel={renamingCity ? t('cities.clearCustomName', { city: getCityDisplayName(renamingCity) }) : ''}
        closeLabel={t('common.close')}
        saveLabel={renamingCity ? t('cities.saveCustomName', { city: getCityDisplayName(renamingCity) }) : ''}
        onClose={() => setRenamingCityId(null)}
        onSave={handleRenameCityFromModal}
      />
      {hasStandaloneMenu && (
        <StandaloneMenuModal
          colorMode={colorMode}
          isOpen={isMenuModalOpen}
          timeFormat={timeFormat}
          onClose={() => setIsMenuModalOpen(false)}
          onColorModeButtonClick={onColorModeButtonClick!}
          onTimeFormatButtonClick={onTimeFormatButtonClick!}
        />
      )}
    </div>
  )
}
