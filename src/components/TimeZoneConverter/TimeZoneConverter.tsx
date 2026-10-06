import '../Cities/cities.css';
import './style.css';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getSettings, MARKETING_DEFAULT_SELECTED_CITIES, type TimeFormat } from '../../settings';
import { useI18n } from '../../i18n';
import {
  createFavoriteCityFromSearchResult,
  getOrderedSelectedCities,
  saveSelectedCities,
  SELECTED_CITIES_CHANGED_EVENT,
} from '../Cities/selectedCities';
import { getCityDisplayName, useLocalizedCities } from '../Cities/useLocalizedCities';
import AddCityModal from '../Cities/AddCityModal';
import { favoriteCities, type FavoriteCity } from '../Cities/fixtures';
import type { CitySearchRow } from '../Cities/citySearch';
import { getBrowserTimezoneCity } from './browserTimezoneCities';
import {
  formatOffset,
  formatTime,
  getTimeZoneOffsetMinutes,
  getZonedDateParts,
} from '../Timelines/utils';

type TimeZoneConverterProps = {
  timeFormat: TimeFormat;
};

type CityModalMode = 'source' | 'add';

type DateInputParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function getDateSerial(dateParts: Pick<DateInputParts, 'year' | 'month' | 'day'>) {
  return Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day) / 86400000;
}

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

  if (
    parts.month < 1
    || parts.month > 12
    || parts.day < 1
    || parts.day > 31
    || parts.hour < 0
    || parts.hour > 23
    || parts.minute < 0
    || parts.minute > 59
  ) {
    return null;
  }

  return parts;
}

function getUtcDateForZonedInput(timezone: string, dateParts: DateInputParts) {
  const utcTime = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    dateParts.hour,
    dateParts.minute,
    0,
  );
  const firstPassDate = new Date(utcTime);
  const firstPassOffset = getTimeZoneOffsetMinutes(timezone, firstPassDate);
  const secondPassDate = new Date(utcTime - firstPassOffset * 60000);
  const secondPassOffset = getTimeZoneOffsetMinutes(timezone, secondPassDate);

  return new Date(utcTime - secondPassOffset * 60000);
}

function getRelativeDayLabel(
  targetTimezone: string,
  sourceTimezone: string,
  date: Date,
  yesterdayLabel: string,
  tomorrowLabel: string,
) {
  const targetSerial = getDateSerial(getZonedDateParts(targetTimezone, date));
  const sourceSerial = getDateSerial(getZonedDateParts(sourceTimezone, date));
  const diff = targetSerial - sourceSerial;

  if (diff > 0) {
    return tomorrowLabel;
  }

  if (diff < 0) {
    return yesterdayLabel;
  }

  return null;
}

function getPeriodFromHour(hour: number) {
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

function formatUtcOffsetLabel(offsetMinutes: number) {
  const prefix = offsetMinutes < 0 ? '-' : '+';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  if (minutes === 0) {
    return `UTC${prefix}${hours}`;
  }

  return `UTC${prefix}${hours}:${String(minutes).padStart(2, '0')}`;
}

function getBrowserTimezone() {
  if (typeof window === 'undefined') {
    return null;
  }

  return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
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
  const browserTimezone = getBrowserTimezone();

  if (!browserTimezone) {
    return cities[0] ?? null;
  }

  const marketingCities = MARKETING_DEFAULT_SELECTED_CITIES as FavoriteCity[];
  const sourcePools = [cities, marketingCities, favoriteCities];

  for (const sourcePool of [cities]) {
    const city = sourcePool.find((sourceCity) => sourceCity.timezone === browserTimezone);

    if (city) {
      return city;
    }
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

export default function TimeZoneConverter({ timeFormat }: TimeZoneConverterProps) {
  const { t } = useI18n();
  const [cities, setCities] = useState(() => getOrderedSelectedCities(getSettings().cityOrder));
  const localizedCities = useLocalizedCities(cities);
  const [sourceCity, setSourceCity] = useState<FavoriteCity | null>(() => cities[0] ?? null);
  const localizedSourceCities = useLocalizedCities(sourceCity ? [sourceCity] : []);
  const localizedSourceCity = localizedSourceCities[0] ?? sourceCity;
  const [cityModalMode, setCityModalMode] = useState<CityModalMode | null>(null);
  const [dateValue, setDateValue] = useState(() => (
    cities[0] ? getDateInputValue(cities[0].timezone, new Date()) : ''
  ));
  const [timeValue, setTimeValue] = useState(() => (
    cities[0] ? getTimeInputValue(cities[0].timezone, new Date()) : ''
  ));
  const [hasCustomDate, setHasCustomDate] = useState(false);
  const timeInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const hasInitializedDefaultSourceCityRef = useRef(false);
  const hasUserSelectedSourceCityRef = useRef(false);

  useEffect(() => {
    const handleSelectedCitiesChange = () => {
      setCities(getOrderedSelectedCities(getSettings().cityOrder));
    };

    window.addEventListener(SELECTED_CITIES_CHANGED_EVENT, handleSelectedCitiesChange);

    return () => {
      window.removeEventListener(SELECTED_CITIES_CHANGED_EVENT, handleSelectedCitiesChange);
    };
  }, []);

  useEffect(() => {
    if (hasInitializedDefaultSourceCityRef.current || hasUserSelectedSourceCityRef.current) {
      return;
    }

    const nextSourceCity = getDefaultSourceCity(cities);

    if (!nextSourceCity) {
      return;
    }

    hasInitializedDefaultSourceCityRef.current = true;
    setSourceCity(nextSourceCity);

    if (!hasCustomDate) {
      const now = new Date();

      setDateValue(getDateInputValue(nextSourceCity.timezone, now));
      setTimeValue(getTimeInputValue(nextSourceCity.timezone, now));
    }
  }, [cities, hasCustomDate]);

  useEffect(() => {
    if (!dateValue && localizedSourceCity) {
      setDateValue(getDateInputValue(localizedSourceCity.timezone, new Date()));
    }

    if (!timeValue && localizedSourceCity) {
      setTimeValue(getTimeInputValue(localizedSourceCity.timezone, new Date()));
    }
  }, [dateValue, localizedSourceCity, timeValue]);

  const convertedDate = useMemo(() => {
    if (!localizedSourceCity) {
      return null;
    }

    const dateParts = parseDateInput(dateValue, timeValue);

    if (!dateParts) {
      return null;
    }

    return getUtcDateForZonedInput(localizedSourceCity.timezone, dateParts);
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
        offsetLabel: formatOffset(offsetMinutes, t('cities.sameOffset')),
        period: getPeriodFromHour(cityDateParts.hour),
        timeLabel: formatTime(convertedDate, city.timezone, timeFormat),
        timezoneLabel: formatUtcOffsetLabel(cityOffsetMinutes),
      };
    });
  }, [convertedDate, localizedCities, localizedSourceCity, t, timeFormat]);

  const handleSourceCitySelect = (city: CitySearchRow) => {
    const nextSourceCity = createFavoriteCityFromSearchResult(city, 0);

    hasUserSelectedSourceCityRef.current = true;
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
    setCities(nextCities);
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

  const handleDateButtonClick = () => {
    const dateInput = dateInputRef.current;

    if (!dateInput) {
      return;
    }

    dateInput.focus();

    if (typeof dateInput.showPicker === 'function') {
      dateInput.showPicker();

      return;
    }

    dateInput.click();
  };

  if (localizedCities.length === 0) {
    return (
      <div className="timeZoneConverter">
        <p className="timeZoneConverter-empty">{t('timeZoneConverter.emptyText')}</p>
      </div>
    );
  }

  return (
    <div className="timeZoneConverter">
      <div className="timeZoneConverter-statement">
        <div className="timeZoneConverter-mainLine" aria-label={t('timeZoneConverter.toolTitle')}>
          <span className="timeZoneConverter-statementText timeZoneConverter-statementLead">{t('timeZoneConverter.whenItsLabel')}</span>

          <div className="timeZoneConverter-timeControl">
            <button
              className="timeZoneConverter-timeButton"
              type="button"
              onClick={handleTimeButtonClick}
            >
              {timeValue}
            </button>
            <input
              className="timeZoneConverter-timeNativeInput"
              type="time"
              value={timeValue}
              aria-label={t('timeZoneConverter.timeLabel')}
              ref={timeInputRef}
              onChange={(event) => setTimeValue(event.target.value)}
            />
          </div>

          <span className="timeZoneConverter-statementText">{t('timeZoneConverter.inLabel')}</span>

          <button
            className="timeZoneConverter-select"
            type="button"
            aria-label={t('timeZoneConverter.fromLabel')}
            onClick={() => setCityModalMode('source')}
          >
            {localizedSourceCity ? getCityDisplayName(localizedSourceCity) : t('timeZoneConverter.fromLabel')}
          </button>

          {hasCustomDate && (
            <span className="timeZoneConverter-statementText">{t('timeZoneConverter.onLabel')}</span>
          )}

          <div className="timeZoneConverter-dateControl">
            <button
              className="timeZoneConverter-dateButton"
              type="button"
              onClick={handleDateButtonClick}
            >
              {hasCustomDate ? dateValue : t('timeZoneConverter.todayLabel')}
            </button>
            <input
              className="timeZoneConverter-dateNativeInput"
              type="date"
              value={dateValue}
              aria-label={t('timeZoneConverter.dateLabel')}
              ref={dateInputRef}
              onChange={(event) => {
                setHasCustomDate(true);
                setDateValue(event.target.value);
              }}
            />
          </div>
        </div>
      </div>

      <span className="timeZoneConverter-resultsLead">{t('timeZoneConverter.itsLabel')}</span>

      <div className="citiesListBox scrollControl timeZoneConverter-listBox">
        <div className="citiesList timeZoneConverter-list">
          {results.map(({ city, dayLabel, offsetLabel, period, timeLabel, timezoneLabel }) => (
            <article className="citiesList-item timeZoneConverter-listItem" key={city.id}>
              <span className="timeZoneConverter-resultPhrase">
                <i className={`citiesList-periodIcon citiesList-periodIcon_${period} timeZoneConverter-resultIcon`} />
                <span className="timeZoneConverter-resultTime">{timeLabel}</span>
                <span className="timeZoneConverter-resultIn">{t('timeZoneConverter.inLabel')}</span>
                <span className="timeZoneConverter-resultCity">{getCityDisplayName(city)}</span>
                {dayLabel && (
                  <span className="citiesList-dayBadge">{dayLabel}</span>
                )}
              </span>

              <span className="citiesList-timeOffset timeZoneConverter-resultMeta">
                {offsetLabel} · {timezoneLabel}
              </span>
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
    </div>
  );
}
