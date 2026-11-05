import '../widgetHeaderButtons.css';
import '../Cities/cities.css';
import './style.css';

import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router';

import { usePreferences } from '../../hooks/usePreferences';
import { useI18n } from '../../i18n';
import type { StoredCity } from '../../settings';
import { cx } from '../../utils/classNames';
import { preload } from '../../utils/preload';
import {
  formatClockTime,
  formatRelativeOffset,
  getDayPeriod,
  getDayShift,
  getTimeZoneOffsetMinutes,
  getZonedDateParts,
} from '../../utils/time';
import AddCityModal from '../Cities/AddCityModal';
import type { CitySearchRow } from '../Cities/cityData';
import {
  createFavoriteCityFromSearchResult,
  saveSelectedCities,
  getSelectedCities,
  subscribeSelectedCities,
} from '../Cities/selectedCities';
import { getCityDisplayName, useLocalizedCities } from '../Cities/useLocalizedCities';
import StandaloneMenuModal from '../StandaloneMenuModal';

import ConversionResults from './ConversionResults';
import ConverterHeader from './ConverterHeader';
import {
  converterReducer,
  createConverterState,
  getConvertedDate,
  isStateInUrl,
} from './converterState';
import { formatDateButtonLabel } from './dateInput';
import { getDefaultSourceCity } from './defaultSourceCity';
import { readConverterUrlState, writeConverterUrlState } from './urlState';

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
  const search = syncUrl || hasStandaloneControls ? searchParams.toString() : '';
  const [cities, setCities] = useState(() => getSelectedCities());
  const [state, dispatch] = useReducer(converterReducer, null, () => (
    createConverterState(readConverterUrlState(search), getDefaultSourceCity(cities), new Date())
  ));
  const { sourceCity, date, time, hasCustomDate } = state;
  const localizedCities = useLocalizedCities(cities);
  const localizedSourceCities = useLocalizedCities(sourceCity ? [sourceCity] : []);
  const localizedSourceCity = localizedSourceCities[0] ?? sourceCity;
  const convertedDate = useMemo(() => getConvertedDate(state), [state]);
  const [cityModalMode, setCityModalMode] = useState<CityModalMode | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isStatementSticky, setIsStatementSticky] = useState(false);
  const timeInputRef = useRef<HTMLInputElement>(null);
  const statementStickySentinelRef = useRef<HTMLDivElement>(null);

  // The conversion's URL parameters, once something is chosen and the values are valid.
  const stateSearch = syncUrl && state.hasSelection && sourceCity && convertedDate
    ? writeConverterUrlState(new URLSearchParams(), sourceCity, date, time).toString()
    : null;

  // Effect events (useEffectEvent) read the current URL and state; only the effect dependencies
  // decide when they run. So a URL change alone never writes the previous state back.
  const replaceUrl = useEffectEvent(() => {
    if (!sourceCity) {
      return;
    }

    const nextSearchParams = writeConverterUrlState(new URLSearchParams(searchParams), sourceCity, date, time);

    // Replace rather than adding a history entry for every time adjustment.
    if (nextSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(nextSearchParams, { replace: true, preventScrollReset: true });
    }
  });

  const restoreFromUrl = useEffectEvent((urlSearch: string) => {
    const urlState = readConverterUrlState(urlSearch);

    if (!isStateInUrl(state, urlState)) {
      dispatch({
        type: 'urlRestored',
        urlState,
        defaultSourceCity: getDefaultSourceCity(cities),
        now: new Date(),
      });
    }
  });

  useEffect(() => {
    if (stateSearch !== null) {
      replaceUrl();
    }
  }, [stateSearch]);

  // A URL the converter did not write (back and forward buttons) is read into the state.
  useEffect(() => {
    if (syncUrl) {
      restoreFromUrl(search);
    }
  }, [search, syncUrl]);

  const applyCities = useCallback((nextCities: StoredCity[]) => {
    setCities(nextCities);
    dispatch({
      type: 'citiesChanged',
      defaultSourceCity: getDefaultSourceCity(nextCities),
      now: new Date(),
    });
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
        timeLabel: formatClockTime(convertedDate, city.timezone, timeFormat),
      };
    });
  }, [convertedDate, localizedCities, localizedSourceCity, t, timeFormat]);

  const handleSourceCitySelect = (city: CitySearchRow) => {
    dispatch({
      type: 'sourceCitySelected',
      city: createFavoriteCityFromSearchResult(city),
      now: new Date(),
    });
    setCityModalMode(null);
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
    ? formatDateButtonLabel(date, language)
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
    <div className={cx('timeZoneConverter', isEditMode && 'isEditing')}>
      {header}

      <div
        className="timeZoneConverter-statementStickySentinel"
        ref={statementStickySentinelRef}
        aria-hidden="true"
      />

      <div
        className={cx('timeZoneConverter-statement', isStatementSticky && 'isSticky')}
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
            {time}
            <i className="timeZoneConverter-controlIcon" />
          </button>
          <input
            className="timeZoneConverter-timeNativeInput"
            type="time"
            value={time}
            aria-label={t('timeZoneConverter.timeLabel')}
            ref={timeInputRef}
            onChange={(event) => {
              dispatch({
                type: 'timeChanged',
                time: event.target.value,
                now: new Date(),
              });
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
            value={date}
            onClose={() => setIsDatePickerOpen(false)}
            onSelectDate={(nextDate) => {
              dispatch({
                type: 'dateSelected',
                date: nextDate,
              });
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
