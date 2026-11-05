import '../widgetHeaderButtons.css';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router';

import { useCurrentMinuteDate } from '../../hooks/useCurrentMinuteDate';
import { useMobileWidgetLayout } from '../../hooks/useMobileWidgetLayout';
import { usePreferences } from '../../hooks/usePreferences';
import { useI18n } from '../../i18n';
import { getCanonicalLanguagePath } from '../../i18n/languageRouting';
import { PAGES } from '../../routes';
import type { TimeFormat } from '../../settings';
import { cx } from '../../utils/classNames';
import { clamp } from '../../utils/number';
import {
  formatClockTime,
  formatRelativeOffset,
  getBrowserTimezone,
  getTimeZoneOffsetMinutes,
  getZonedDateParts,
} from '../../utils/time';
import StandaloneMenuModal from '../StandaloneMenuModal';

import AddCityModal from './AddCityModal';
import type { CitySearchRow } from './cityData';
import { getCityView } from './cityView';
import RenameCityModal from './RenameCityModal';
import {
  createFavoriteCityFromSearchResult,
  getSelectedCities,
  saveSelectedCities,
  subscribeSelectedCities,
} from './selectedCities';
import SortableCityItem from './SortableCityItem';
import {
  getCityBaseName,
  getCityDisplayName,
  useLocalizedCities,
} from './useLocalizedCities';
import { useTimeRulerScroll } from './useTimeRulerScroll';

const PIXELS_IN_MINUTE = 1;
const TIME_RULER_RANGE_MINUTES = 24 * 60;
const TIME_RULER_TICK_STEP_MINUTES = 15;
const TIME_RULER_HOUR_STEP_MINUTES = 60;

type CitiesProps = {
  customClassNames?: string;
  showHomeButton?: boolean;
  showStandaloneButton?: boolean;
};

function formatTimeRulerOffset(offsetMinutes: number) {
  return offsetMinutes === 0 ? '+0' : formatRelativeOffset(offsetMinutes, 'same');
}

function formatRulerTime(date: Date, timeFormat: TimeFormat) {
  return formatClockTime(date, getBrowserTimezone(), timeFormat);
}

function getDateWithTimeOffset(baseDate: Date, offsetMinutes: number) {
  return new Date(baseDate.getTime() + offsetMinutes * 60000);
}

export default function Cities({
  customClassNames = '',
  showHomeButton = true,
  showStandaloneButton = true,
}: CitiesProps) {
  const { timeFormat } = usePreferences();
  const { language, t } = useI18n();
  const customClassNameList = customClassNames.split(/\s+/).filter(Boolean);

  const [cities, setCities] = useState(getSelectedCities);
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
    setCities(getSelectedCities());
  }), []);

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

  const handleAddCity = (city: CitySearchRow) => {
    const nextCities = [
      ...cities,
      createFavoriteCityFromSearchResult(city),
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
    <div className={cx('cities', isEditMode && 'isEditing', ...customClassNameList)}>
      <div className="citiesHeader">
        {showHomeButton && (
          <Link
            to={getCanonicalLanguagePath(language)}
            className="citiesHeaderButton citiesHeaderButton_home"
            aria-label={t('common.home')}
          >
            <i className="citiesHeaderButton-icon citiesHeaderButton-icon_home" />
          </Link>
        )}

        <button
          className={cx('citiesHeaderButton citiesHeaderButton_edit', isEditMode && 'isActive')}
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
            to={getCanonicalLanguagePath(language, PAGES.cities.path)}
            className="citiesHeaderButton citiesHeaderButton_cities"
            aria-label={t('common.openCities')}
          >
            <i className="citiesHeaderButton-icon citiesHeaderButton-icon_open" />
          </Link>
        )}

        {showHomeButton && (
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
            <SortableContext
              items={cityIds}
              strategy={verticalListSortingStrategy}
            >
              {cityViews.map((favoriteCity) => (
                <SortableCityItem
                  favoriteCity={favoriteCity}
                  isMobileRenameMode={isMobileRenameMode}
                  key={favoriteCity.id}
                  onDelete={handleDeleteCity}
                  onRename={handleRenameCity}
                  onRequestRename={(city) => setRenamingCityId(city.id)}
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
          className={cx('timeRuler-scale', isTimeRulerDragging && 'isDragging')}
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
                className={cx(
                  'timeRuler-tick',
                  minute % TIME_RULER_HOUR_STEP_MINUTES === 0 && 'timeRuler-tick_hour',
                  minute === 0 && 'timeRuler-tick_current',
                )}
                key={minute}
                style={{ left: `${(minute + TIME_RULER_RANGE_MINUTES) * PIXELS_IN_MINUTE}px` }}
              />
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
        saveLabel={renamingCity ? t('cities.saveCustomName', { city: getCityDisplayName(renamingCity) }) : ''}
        onClose={() => setRenamingCityId(null)}
        onSave={handleRenameCityFromModal}
      />
      {showHomeButton && (
        <StandaloneMenuModal
          isOpen={isMenuModalOpen}
          onClose={() => setIsMenuModalOpen(false)}
        />
      )}
    </div>
  );
}
