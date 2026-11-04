import '../Cities/cities.css';
import './style.css';

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { MARKETING_DEFAULT_SELECTED_CITIES, type AppLanguage, type ColorMode, type TimeFormat } from '../../settings';
import { useI18n } from '../../i18n';
import { getIntlLocale } from '../../i18n/intlLocale';
import { getCanonicalLanguagePath } from '../../i18n/languageRouting';
import {
  createFavoriteCityFromSearchResult,
  saveSelectedCities,
  getStoredOrderedSelectedCities,
  subscribeSelectedCities,
} from '../Cities/selectedCities';
import { getCityDisplayName, useLocalizedCities } from '../Cities/useLocalizedCities';
import AddCityModal from '../Cities/AddCityModal';
import { favoriteCities, type FavoriteCity } from '../Cities/fixtures';
import type { CitySearchRow } from '../Cities/citySearch';
import StandaloneMenuModal from '../StandaloneMenuModal';
import { getBrowserTimezoneCity } from './browserTimezoneCities';
// The date picker (react-day-picker + date-fns locales) is loaded only when it is first needed.
const loadDatePickerModal = () => import('./DatePickerModal');
const DatePickerModal = lazy(loadDatePickerModal);
import { readConverterUrlState, writeConverterUrlState } from './urlState';
import { formatTime } from '../Timelines/utils';
import {
  formatOffsetLabel,
  formatRelativeOffset,
  getBrowserTimezone,
  getDayPeriod,
  getDayShift,
  getTimeZoneOffsetMinutes,
  getUtcDateForZonedTime,
  getZonedDateParts,
} from '../../utils/time';

type TimeZoneConverterProps = {
  colorMode?: ColorMode;
  hasStandaloneControls?: boolean;
  onColorModeButtonClick?: () => void;
  onTimeFormatButtonClick?: () => void;
  timeFormat: TimeFormat;
  syncUrl?: boolean;
};

type CityModalMode = 'source' | 'add';

type DateInputParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function getDateInputValue(timezone: string, date: Date) {
  const dateParts = getZonedDateParts(timezone, date);

  return [
    dateParts.year,
    String(dateParts.month).padStart(2, '0'),
    String(dateParts.day).padStart(2, '0'),
  ].join('-');
}

function getTimeInputValue(timezone: string, date: Date) {
  const dateParts = getZonedDateParts(timezone, date);

  return `${String(dateParts.hour).padStart(2, '0')}:${String(dateParts.minute).padStart(2, '0')}`;
}

function parseDateInput(dateValue: string, timeValue: string): DateInputParts | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue);

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const parts = {
    year: Number(dateMatch[1]),
    month: Number(dateMatch[2]),
    day: Number(dateMatch[3]),
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
  };

  // Round-trip through Date.UTC rejects impossible dates such as 2026-02-31.
  const calendarDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));

  if (
    calendarDate.getUTCFullYear() !== parts.year
    || calendarDate.getUTCMonth() !== parts.month - 1
    || calendarDate.getUTCDate() !== parts.day
    || parts.hour < 0
    || parts.hour > 23
    || parts.minute < 0
    || parts.minute > 59
  ) {
    return null;
  }

  return parts;
}

function capitalizeMonthPart(part: Intl.DateTimeFormatPart, locale: string) {
  if (part.type !== 'month' || !part.value) {
    return part.value;
  }

  const month = part.value.replace(/\.$/, '');

  return `${month[0].toLocaleUpperCase(locale)}${month.slice(1)}`;
}

function formatDateButtonLabel(dateValue: string, language: AppLanguage) {
  const dateParts = parseDateInput(dateValue, '00:00');

  if (!dateParts) {
    return dateValue;
  }

  const locale = getIntlLocale(language);
  const formatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const parts = formatter.formatToParts(new Date(dateParts.year, dateParts.month - 1, dateParts.day, 12));
  const datePartIndexes = parts
    .map((part, index) => (
      part.type === 'day' || part.type === 'month' || part.type === 'year' ? index : -1
    ))
    .filter((index) => index >= 0);
  const firstDatePartIndex = datePartIndexes[0] ?? 0;
  const lastDatePartIndex = datePartIndexes.at(-1) ?? parts.length - 1;

  return parts
    .slice(firstDatePartIndex, lastDatePartIndex + 1)
    .map((part) => capitalizeMonthPart(part, locale))
    .join('')
    .trim();
}

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

function hasSameTimezoneProfile(leftTimezone: string, rightTimezone: string) {
  const year = new Date().getUTCFullYear();
  const winterDate = new Date(Date.UTC(year, 0, 15, 12));
  const summerDate = new Date(Date.UTC(year, 6, 15, 12));

  return (
    getTimeZoneOffsetMinutes(leftTimezone, winterDate) === getTimeZoneOffsetMinutes(rightTimezone, winterDate)
    && getTimeZoneOffsetMinutes(leftTimezone, summerDate) === getTimeZoneOffsetMinutes(rightTimezone, summerDate)
  );
}

function getDefaultSourceCity(cities: FavoriteCity[]) {
  const browserTimezone = typeof window === 'undefined' ? null : getBrowserTimezone();

  if (!browserTimezone) {
    return cities[0] ?? null;
  }

  const marketingCities = MARKETING_DEFAULT_SELECTED_CITIES as FavoriteCity[];
  const sourcePools = [cities, marketingCities, favoriteCities];

  const selectedBrowserCity = cities.find((city) => city.timezone === browserTimezone);

  if (selectedBrowserCity) {
    return selectedBrowserCity;
  }

  const browserTimezoneCity = getBrowserTimezoneCity(browserTimezone);

  if (browserTimezoneCity) {
    return browserTimezoneCity;
  }

  for (const sourcePool of [marketingCities, favoriteCities]) {
    const city = sourcePool.find((sourceCity) => sourceCity.timezone === browserTimezone);

    if (city) {
      return city;
    }
  }

  for (const sourcePool of sourcePools) {
    const city = sourcePool.find((sourceCity) => (
      hasSameTimezoneProfile(sourceCity.timezone, browserTimezone)
    ));

    if (city) {
      return city;
    }
  }

  return cities[0] ?? null;
}

export default function TimeZoneConverter({
  colorMode = 'day',
  hasStandaloneControls = false,
  onColorModeButtonClick,
  onTimeFormatButtonClick,
  timeFormat,
  syncUrl = false,
}: TimeZoneConverterProps) {
  const { language, t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cities, setCities] = useState(() => getStoredOrderedSelectedCities());
  const [initialUrlState] = useState(() => readConverterUrlState(
    (syncUrl || hasStandaloneControls) && typeof window !== 'undefined' ? window.location.search : '',
  ));
  const [initialSourceCity] = useState(() => initialUrlState.sourceCity ?? getDefaultSourceCity(cities));
  const localizedCities = useLocalizedCities(cities);
  const [sourceCity, setSourceCity] = useState<FavoriteCity | null>(initialSourceCity);
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
  const hasStandaloneMenu = Boolean(
    hasStandaloneControls
    && onColorModeButtonClick
    && onTimeFormatButtonClick,
  );

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
  const applyCities = useCallback((nextCities: FavoriteCity[]) => {
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
    applyCities(getStoredOrderedSelectedCities());
  }), [applyCities]);

  useEffect(() => {
    const sentinel = statementStickySentinelRef.current;

    if (!sentinel || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStatementSticky(!entry.isIntersecting);
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
        timezoneLabel: formatOffsetLabel(cityOffsetMinutes),
      };
    });
  }, [convertedDate, localizedCities, localizedSourceCity, t, timeFormat]);

  const handleSourceCitySelect = (city: CitySearchRow) => {
    const nextSourceCity = createFavoriteCityFromSearchResult(city, 0);

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
      createFavoriteCityFromSearchResult(city, cities.length),
    ];

    setCityModalMode(null);
    applyCities(nextCities);
    saveSelectedCities(nextCities);
  };

  const handleDeleteCity = (cityId: string) => {
    const nextCities = cities
      .filter((city) => city.id !== cityId)
      .map((city, index) => ({
        ...city,
        order: index,
      }));

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
    <div className="citiesHeader timeZoneConverter-header">
      {(hasStandaloneControls || syncUrl) && (
        <Link
          to={getCanonicalLanguagePath(language, '/')}
          className="citiesHeaderButton citiesHeaderButton_home"
          aria-label={t('common.home')}
          title={t('common.home')}
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
        onClick={() => setCityModalMode('add')}
      >
        <i className="citiesHeaderButton-icon citiesHeaderButton-icon_add" />
      </button>

      {syncUrl && !hasStandaloneControls && (
        <Link
          to={{
            pathname: getCanonicalLanguagePath(language, '/convert'),
            search: searchParams.toString(),
          }}
          className="citiesHeaderButton citiesHeaderButton_converter"
          aria-label="Fullscreen"
          title="Fullscreen"
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
        {hasStandaloneMenu && onColorModeButtonClick && onTimeFormatButtonClick && (
          <StandaloneMenuModal
            colorMode={colorMode}
            isOpen={isMenuModalOpen}
            timeFormat={timeFormat}
            onClose={() => setIsMenuModalOpen(false)}
            onColorModeButtonClick={onColorModeButtonClick}
            onTimeFormatButtonClick={onTimeFormatButtonClick}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`timeZoneConverter ${isEditMode ? 'timeZoneConverter_editMode' : ''}`}>
      {header}

      <div
        className="timeZoneConverter-statementStickySentinel"
        ref={statementStickySentinelRef}
        aria-hidden="true"
      />

      <div
        className={`timeZoneConverter-statement ${isStatementSticky ? 'timeZoneConverter-statement_sticky' : ''}`}
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
            onPointerEnter={loadDatePickerModal}
            onFocus={loadDatePickerModal}
            onClick={() => setIsDatePickerOpen(true)}
          >
            {dateButtonLabel}
            <i className="timeZoneConverter-controlIcon" />
          </button>
        </div>
      </div>

      <span className="timeZoneConverter-resultsLead">{t('timeZoneConverter.itsLabel')}</span>

      <div className="citiesListBox scrollControl timeZoneConverter-listBox">
        <div className="citiesList timeZoneConverter-list">
          {results.map(({ city, dayLabel, offsetLabel, period, timeLabel }) => (
            <article
              className="citiesList-item timeZoneConverter-listItem"
              key={city.id}
            >
              <i className={`citiesList-periodIcon citiesList-periodIcon_${period} timeZoneConverter-resultIcon`} />
              <span className="timeZoneConverter-resultText timeZoneConverter-resultTime">{timeLabel}</span>
              <span className="timeZoneConverter-resultText timeZoneConverter-resultIn">{t('timeZoneConverter.inLabel')}</span>
              <span className="timeZoneConverter-resultText timeZoneConverter-resultCity">{getCityDisplayName(city)}</span>
              {dayLabel && (
                <span className="citiesList-dayBadge">{dayLabel}</span>
              )}

              <span className="timeZoneConverter-resultMeta">
                <span className="timeZoneConverter-offsetLabel">
                  {offsetLabel}
                </span>
              </span>

              <button
                className="citiesList-deleteButton"
                type="button"
                aria-label={t('cities.deleteCity', { city: getCityDisplayName(city) })}
                onClick={() => handleDeleteCity(city.id)}
              />
            </article>
          ))}

          <button
            className="citiesList-addButton"
            type="button"
            onClick={() => setCityModalMode('add')}
          >
            <i className="citiesList-addButtonIcon" />
            <span className="citiesList-addButtonText">{t('common.addCity')}</span>
          </button>
        </div>
      </div>

      <AddCityModal
        isOpen={cityModalMode !== null}
        onClose={() => setCityModalMode(null)}
        onSave={handleCityModalSave}
      />
      {isDatePickerOpen && (
        <Suspense fallback={null}>
          <DatePickerModal
            closeLabel={t('common.close')}
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
      {hasStandaloneMenu && onColorModeButtonClick && onTimeFormatButtonClick && (
        <StandaloneMenuModal
          colorMode={colorMode}
          isOpen={isMenuModalOpen}
          timeFormat={timeFormat}
          onClose={() => setIsMenuModalOpen(false)}
          onColorModeButtonClick={onColorModeButtonClick}
          onTimeFormatButtonClick={onTimeFormatButtonClick}
        />
      )}
    </div>
  );
}
