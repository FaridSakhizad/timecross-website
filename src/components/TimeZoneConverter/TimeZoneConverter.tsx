import '../widgetHeaderButtons.css';
import '../Cities/cities.css';
import './style.css';

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

import type { StoredCity } from '../../settings';
import { useI18n } from '../../i18n';
import {
  createFavoriteCityFromSearchResult,
  saveSelectedCities,
  getSelectedCities,
  subscribeSelectedCities,
} from '../Cities/selectedCities';
import { getCityDisplayName, useLocalizedCities } from '../Cities/useLocalizedCities';
import AddCityModal from '../Cities/AddCityModal';
import type { CitySearchRow } from '../Cities/cityData';
import StandaloneMenuModal from '../StandaloneMenuModal';
import {
  formatDateButtonLabel,
  getDateInputValue,
  getTimeInputValue,
  parseDateInput,
} from './dateInput';
import ConversionResults from './ConversionResults';
import ConverterHeader from './ConverterHeader';
import { getDefaultSourceCity } from './defaultSourceCity';

import { readConverterUrlState, writeConverterUrlState } from './urlState';
import { formatTime } from '../Timelines/utils';
import {
  formatRelativeOffset,
  getDayPeriod,
  getDayShift,
  getTimeZoneOffsetMinutes,
  getUtcDateForZonedTime,
  getZonedDateParts,
} from '../../utils/time';
import { cx } from '../../utils/classNames';
import { preload } from '../../utils/preload';
import { usePreferences } from '../../usePreferences';

// The date picker (react-day-picker + date-fns locales) is loaded only when it is first needed.
const loadDatePickerModal = () => import('./DatePickerModal');
const DatePickerModal = lazy(loadDatePickerModal);

type TimeZoneConverterProps = {
  hasStandaloneControls?: boolean;
  syncUrl?: boolean;
};

type CityModalMode = 'source' | 'add';

function getRelativeDayLabel(
  targetTimezone: string,
  sourceTimezone: string,
  date: Date,
  yesterdayLabel: string,
  tomorrowLabel: string,
) {
  const diff = getDayShift(targetTimezone, sourceTimezone, date);

  if (diff > 0) {
    return tomorrowLabel;
  }

  if (diff < 0) {
    return yesterdayLabel;
  }

  return null;
}

export default function TimeZoneConverter({
  hasStandaloneControls = false,
  syncUrl = false,
}: TimeZoneConverterProps) {
  const { timeFormat } = usePreferences();
  const { language, t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cities, setCities] = useState(() => getSelectedCities());
  const [initialUrlState] = useState(() => readConverterUrlState(
    (syncUrl || hasStandaloneControls) && typeof window !== 'undefined' ? window.location.search : '',
  ));
  const [initialSourceCity] = useState(() => initialUrlState.sourceCity ?? getDefaultSourceCity(cities));
  const localizedCities = useLocalizedCities(cities);
  const [sourceCity, setSourceCity] = useState<StoredCity | null>(initialSourceCity);
  const localizedSourceCities = useLocalizedCities(sourceCity ? [sourceCity] : []);
  const localizedSourceCity = localizedSourceCities[0] ?? sourceCity;
  const [cityModalMode, setCityModalMode] = useState<CityModalMode | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isStatementSticky, setIsStatementSticky] = useState(false);
  const [dateValue, setDateValue] = useState(() => (
    initialUrlState.date ?? (initialSourceCity ? getDateInputValue(initialSourceCity.timezone, new Date()) : '')
  ));
  const [timeValue, setTimeValue] = useState(() => (
    initialUrlState.time ?? (initialSourceCity ? getTimeInputValue(initialSourceCity.timezone, new Date()) : '')
  ));
  const [hasCustomDate, setHasCustomDate] = useState(Boolean(initialUrlState.date));
  const [hasConversionSelection, setHasConversionSelection] = useState(Boolean(
    initialUrlState.sourceCity || initialUrlState.date || initialUrlState.time,
  ));
  const timeInputRef = useRef<HTMLInputElement>(null);
  const statementStickySentinelRef = useRef<HTMLDivElement>(null);
  const hasInitializedDefaultSourceCityRef = useRef(Boolean(initialSourceCity));
  const hasUserSelectedSourceCityRef = useRef(false);

  useEffect(() => {
    if (!syncUrl || !hasConversionSelection || !sourceCity || !parseDateInput(dateValue, timeValue)) {
      return;
    }

    const url = writeConverterUrlState(new URL(window.location.href), sourceCity, dateValue, timeValue);

    // Replace rather than adding a history entry for every time adjustment.
    if (url.href !== window.location.href) {
      setSearchParams(url.searchParams, { replace: true, preventScrollReset: true });
    }
  }, [dateValue, hasConversionSelection, setSearchParams, sourceCity, syncUrl, timeValue]);

  useEffect(() => {
    if (!syncUrl) {
      return;
    }

    const restoreUrlState = () => {
      const state = readConverterUrlState(window.location.search);

      setHasConversionSelection(Boolean(state.sourceCity || state.date || state.time));
      const city = state.sourceCity ?? getDefaultSourceCity(cities);

      setSourceCity(city);
      setDateValue(state.date ?? (city ? getDateInputValue(city.timezone, new Date()) : ''));
      setTimeValue(state.time ?? (city ? getTimeInputValue(city.timezone, new Date()) : ''));
      setHasCustomDate(Boolean(state.date));
    };

    window.addEventListener('popstate', restoreUrlState);
    return () => window.removeEventListener('popstate', restoreUrlState);
  }, [cities, syncUrl]);

  /**
   * Updates the city list. If no source city could be chosen yet (for example, the list
   * was empty), picks the default one from the new list and fills in an empty date and time.
   */
  const applyCities = useCallback((nextCities: StoredCity[]) => {
    setCities(nextCities);

    if (hasInitializedDefaultSourceCityRef.current || hasUserSelectedSourceCityRef.current) {
      return;
    }

    const nextSourceCity = getDefaultSourceCity(nextCities);

    if (!nextSourceCity) {
      return;
    }

    const now = new Date();

    hasInitializedDefaultSourceCityRef.current = true;
    setSourceCity(nextSourceCity);
    setDateValue((currentValue) => currentValue || getDateInputValue(nextSourceCity.timezone, now));
    setTimeValue((currentValue) => currentValue || getTimeInputValue(nextSourceCity.timezone, now));
  }, []);

  useEffect(() => subscribeSelectedCities(() => {
    applyCities(getSelectedCities());
  }), [applyCities]);

  useEffect(() => {
    const sentinel = statementStickySentinelRef.current;

    if (!sentinel || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setIsStatementSticky(!entry.isIntersecting);
        }
      },
      {
        rootMargin: '-1px 0px 0px 0px',
        threshold: 0,
      },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, []);

  const convertedDate = useMemo(() => {
    if (!localizedSourceCity) {
      return null;
    }

    const dateParts = parseDateInput(dateValue, timeValue);

    if (!dateParts) {
      return null;
    }

    return getUtcDateForZonedTime(localizedSourceCity.timezone, dateParts);
  }, [dateValue, localizedSourceCity, timeValue]);

  const results = useMemo(() => {
    if (!convertedDate || !localizedSourceCity) {
      return [];
    }

    const sourceOffsetMinutes = getTimeZoneOffsetMinutes(localizedSourceCity.timezone, convertedDate);

    return localizedCities.map((city) => {
      const cityDateParts = getZonedDateParts(city.timezone, convertedDate);
      const cityOffsetMinutes = getTimeZoneOffsetMinutes(city.timezone, convertedDate);
      const offsetMinutes = cityOffsetMinutes - sourceOffsetMinutes;

      return {
        city,
        dayLabel: getRelativeDayLabel(
          city.timezone,
          localizedSourceCity.timezone,
          convertedDate,
          t('cities.yesterday'),
          t('cities.tomorrow'),
        ),
        offsetLabel: formatRelativeOffset(offsetMinutes, t('cities.sameOffset')),
        period: getDayPeriod(cityDateParts.hour),
        timeLabel: formatTime(convertedDate, city.timezone, timeFormat),
      };
    });
  }, [convertedDate, localizedCities, localizedSourceCity, t, timeFormat]);

  const handleSourceCitySelect = (city: CitySearchRow) => {
    const nextSourceCity = createFavoriteCityFromSearchResult(city);

    hasUserSelectedSourceCityRef.current = true;
    setHasConversionSelection(true);
    setSourceCity(nextSourceCity);
    setCityModalMode(null);

    if (!hasCustomDate) {
      setDateValue(getDateInputValue(nextSourceCity.timezone, new Date()));

      return;
    }

    if (convertedDate) {
      setDateValue(getDateInputValue(nextSourceCity.timezone, convertedDate));
      setTimeValue(getTimeInputValue(nextSourceCity.timezone, convertedDate));
    }
  };

  const handleAddCity = (city: CitySearchRow) => {
    const nextCities = [
      ...cities,
      createFavoriteCityFromSearchResult(city),
    ];

    setCityModalMode(null);
    applyCities(nextCities);
    saveSelectedCities(nextCities);
  };

  const handleDeleteCity = (cityId: string) => {
    const nextCities = cities.filter((city) => city.id !== cityId);

    applyCities(nextCities);
    saveSelectedCities(nextCities);
  };

  const handleCityModalSave = (city: CitySearchRow) => {
    if (cityModalMode === 'source') {
      handleSourceCitySelect(city);
      return;
    }

    handleAddCity(city);
  };

  const handleTimeButtonClick = () => {
    const timeInput = timeInputRef.current;

    if (!timeInput) {
      return;
    }

    timeInput.focus();

    if (typeof timeInput.showPicker === 'function') {
      timeInput.showPicker();

      return;
    }

    timeInput.click();
  };

  const header = (
    <ConverterHeader
      hasStandaloneControls={hasStandaloneControls}
      isEditMode={isEditMode}
      search={searchParams.toString()}
      syncUrl={syncUrl}
      onAddCity={() => setCityModalMode('add')}
      onEditModeToggle={() => setIsEditMode((currentMode) => !currentMode)}
      onMenuOpen={() => setIsMenuModalOpen(true)}
    />
  );

  const whenItsLabel = t('timeZoneConverter.whenItsLabel');
  const dateButtonLabel = hasCustomDate
    ? formatDateButtonLabel(dateValue, language)
    : t('timeZoneConverter.todayLabel');

  if (localizedCities.length === 0) {
    return (
      <div className="timeZoneConverter">
        {header}
        <p className="timeZoneConverter-empty">{t('timeZoneConverter.emptyText')}</p>
        <AddCityModal
          isOpen={cityModalMode !== null}
          onClose={() => setCityModalMode(null)}
          onSave={handleCityModalSave}
        />
        {hasStandaloneControls && (
          <StandaloneMenuModal
            isOpen={isMenuModalOpen}
            onClose={() => setIsMenuModalOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className={cx('timeZoneConverter', isEditMode && 'timeZoneConverter_editMode')}>
      {header}

      <div
        className="timeZoneConverter-statementStickySentinel"
        ref={statementStickySentinelRef}
        aria-hidden="true"
      />

      <div
        className={cx('timeZoneConverter-statement', isStatementSticky && 'timeZoneConverter-statement_sticky')}
        aria-label={t('timeZoneConverter.toolTitle')}
      >
        {whenItsLabel && (
          <span className="timeZoneConverter-statementText">{whenItsLabel}</span>
        )}

        <div className="timeZoneConverter-timeControl">
          <button
            className="timeZoneConverter-control timeZoneConverter-control_time"
            type="button"
            onClick={handleTimeButtonClick}
          >
            {timeValue}
            <i className="timeZoneConverter-controlIcon" />
          </button>
          <input
            className="timeZoneConverter-timeNativeInput"
            type="time"
            value={timeValue}
            aria-label={t('timeZoneConverter.timeLabel')}
            ref={timeInputRef}
            onChange={(event) => {
              setHasConversionSelection(true);
              // A cleared time input falls back to the current time in the source city.
              setTimeValue(event.target.value || (
                localizedSourceCity ? getTimeInputValue(localizedSourceCity.timezone, new Date()) : ''
              ));
            }}
          />
        </div>

        <span className="timeZoneConverter-statementText">{t('timeZoneConverter.inLabel')}</span>

        <button
          className="timeZoneConverter-control timeZoneConverter-control_location"
          type="button"
          aria-label={t('timeZoneConverter.fromLabel')}
          onClick={() => setCityModalMode('source')}
        >
          <span className="timeZoneConverter-controlText">
            {localizedSourceCity ? getCityDisplayName(localizedSourceCity) : t('timeZoneConverter.fromLabel')}
          </span>
          <i className="timeZoneConverter-controlIcon" />
        </button>

        {hasCustomDate && (
          <span className="timeZoneConverter-statementText">{t('timeZoneConverter.onLabel')}</span>
        )}

        <div className="timeZoneConverter-dateControl">
          <button
            className="timeZoneConverter-control timeZoneConverter-control_date"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isDatePickerOpen}
            onPointerEnter={() => preload(loadDatePickerModal)}
            onFocus={() => preload(loadDatePickerModal)}
            onClick={() => setIsDatePickerOpen(true)}
          >
            {dateButtonLabel}
            <i className="timeZoneConverter-controlIcon" />
          </button>
        </div>
      </div>

      <span className="timeZoneConverter-resultsLead">{t('timeZoneConverter.itsLabel')}</span>

      <ConversionResults
        results={results}
        onAddCity={() => setCityModalMode('add')}
        onDeleteCity={handleDeleteCity}
      />

      <AddCityModal
        isOpen={cityModalMode !== null}
        onClose={() => setCityModalMode(null)}
        onSave={handleCityModalSave}
      />
      {isDatePickerOpen && (
        <Suspense fallback={null}>
          <DatePickerModal
            dateLabel={t('timeZoneConverter.dateLabel')}
            isOpen
            language={language}
            value={dateValue}
            onClose={() => setIsDatePickerOpen(false)}
            onSelectDate={(nextDateValue) => {
              setHasConversionSelection(true);
              setHasCustomDate(true);
              setDateValue(nextDateValue);
            }}
          />
        </Suspense>
      )}
      {hasStandaloneControls && (
        <StandaloneMenuModal
          isOpen={isMenuModalOpen}
          onClose={() => setIsMenuModalOpen(false)}
        />
      )}
    </div>
  );
}
