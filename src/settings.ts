import { allFavoriteCities } from './components/Cities/fixtures';

export type TimeFormat = '24h' | '12h';
export type AppLanguage = 'en' | 'fr' | 'uk' | 'ru' | 'es' | 'pt' | 'de';
export type ColorMode = 'day' | 'night';

export type StoredCity = {
  id: string;
  order: number;
  customName: string;
  city: string;
  timezone: string;
  utcOffset: string;
  timeOffset: string;
  time: string;
  period: 'morning' | 'day' | 'evening' | 'night';
  visible?: boolean;
  isTomorrow?: boolean;
};

export type AppSettings = {
  version: 1;
  timeFormat: TimeFormat;
  language: AppLanguage;
  colorMode: ColorMode;
  cityOrder: string[];
  selectedCities: StoredCity[];
};

const SETTINGS_STORAGE_KEY = 'timecross:settings';
const LEGACY_CITIES_ORDER_STORAGE_KEY = 'timecross:cities-order';

export const MARKETING_DEFAULT_SELECTED_CITIES: StoredCity[] = [
  {
    id: 'new-york',
    order: 0,
    customName: '',
    city: 'New York',
    timezone: 'America/New_York',
    utcOffset: 'UTC-05:00',
    timeOffset: 'UTC-5',
    time: '',
    period: 'day',
  },
  {
    id: 'london',
    order: 1,
    customName: '',
    city: 'London',
    timezone: 'Europe/London',
    utcOffset: 'UTC+00:00',
    timeOffset: 'UTC+0',
    time: '',
    period: 'day',
  },
  {
    id: 'paris',
    order: 2,
    customName: '',
    city: 'Paris',
    timezone: 'Europe/Paris',
    utcOffset: 'UTC+01:00',
    timeOffset: 'UTC+1',
    time: '',
    period: 'day',
  },
  {
    id: 'dubai',
    order: 3,
    customName: '',
    city: 'Dubai',
    timezone: 'Asia/Dubai',
    utcOffset: 'UTC+04:00',
    timeOffset: 'UTC+4',
    time: '',
    period: 'day',
  },
  {
    id: 'singapore',
    order: 4,
    customName: '',
    city: 'Singapore',
    timezone: 'Asia/Singapore',
    utcOffset: 'UTC+08:00',
    timeOffset: 'UTC+8',
    time: '',
    period: 'day',
  },
  {
    id: 'tokyo',
    order: 5,
    customName: '',
    city: 'Tokyo',
    timezone: 'Asia/Tokyo',
    utcOffset: 'UTC+09:00',
    timeOffset: 'UTC+9',
    time: '',
    period: 'day',
  },
  {
    id: 'sydney',
    order: 6,
    customName: '',
    city: 'Sydney',
    timezone: 'Australia/Sydney',
    utcOffset: 'UTC+10:00',
    timeOffset: 'UTC+10',
    time: '',
    period: 'day',
    visible: false,
  },
  {
    id: 'los-angeles',
    order: 7,
    customName: '',
    city: 'Los Angeles',
    timezone: 'America/Los_Angeles',
    utcOffset: 'UTC-08:00',
    timeOffset: 'UTC-8',
    time: '',
    period: 'day',
  },
  {
    id: 'honolulu',
    order: 8,
    customName: '',
    city: 'Honolulu',
    timezone: 'Pacific/Honolulu',
    utcOffset: 'UTC-10:00',
    timeOffset: 'UTC-10',
    time: '',
    period: 'day',
    visible: false,
  },
  {
    id: 'rio-de-janeiro',
    order: 9,
    customName: '',
    city: 'Rio de Janeiro',
    timezone: 'America/Sao_Paulo',
    utcOffset: 'UTC-03:00',
    timeOffset: 'UTC-3',
    time: '',
    period: 'day',
    visible: false,
  },
  {
    id: 'cape-town',
    order: 10,
    customName: '',
    city: 'Cape Town',
    timezone: 'Africa/Johannesburg',
    utcOffset: 'UTC+02:00',
    timeOffset: 'UTC+2',
    time: '',
    period: 'day',
    visible: false,
  },
  {
    id: 'auckland',
    order: 11,
    customName: '',
    city: 'Auckland',
    timezone: 'Pacific/Auckland',
    utcOffset: 'UTC+12:00',
    timeOffset: 'UTC+12',
    time: '',
    period: 'day',
    visible: false,
  },
];

const DEFAULT_SELECTED_CITIES: StoredCity[] = allFavoriteCities;

const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  timeFormat: '24h',
  language: 'en',
  colorMode: 'day',
  cityOrder: [],
  selectedCities: DEFAULT_SELECTED_CITIES,
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isStoredCity(value: unknown): value is StoredCity {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const city = value as Partial<StoredCity>;

  return (
    typeof city.id === 'string' &&
    typeof city.city === 'string' &&
    typeof city.timezone === 'string'
  );
}

function isStoredCityArray(value: unknown): value is StoredCity[] {
  return Array.isArray(value) && value.every(isStoredCity);
}

function getLegacyCityOrder() {
  try {
    const storedOrder = window.localStorage.getItem(LEGACY_CITIES_ORDER_STORAGE_KEY);

    if (!storedOrder) {
      return [];
    }

    const parsedOrder = JSON.parse(storedOrder);

    return isStringArray(parsedOrder) ? parsedOrder : [];
  } catch {
    return [];
  }
}

function normalizeSettings(settings: Partial<AppSettings> | null): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    timeFormat: settings?.timeFormat === '12h' ? '12h' : '24h',
    language: isSupportedLanguage(settings?.language) ? settings.language : 'en',
    colorMode: settings?.colorMode === 'night' ? 'night' : 'day',
    cityOrder: isStringArray(settings?.cityOrder)
      ? settings.cityOrder
      : getLegacyCityOrder(),
    selectedCities: isStoredCityArray(settings?.selectedCities)
      ? settings.selectedCities
      : DEFAULT_SELECTED_CITIES,
  };
}

function isSupportedLanguage(value: unknown): value is AppLanguage {
  return (
    value === 'en' ||
    value === 'fr' ||
    value === 'uk' ||
    value === 'ru' ||
    value === 'es' ||
    value === 'pt' ||
    value === 'de'
  );
}

export function getSettings(): AppSettings {
  try {
    const storedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!storedSettings) {
      return normalizeSettings(null);
    }

    return normalizeSettings(JSON.parse(storedSettings));
  } catch {
    return normalizeSettings(null);
  }
}

export function saveSettings(settings: AppSettings) {
  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function updateSettings(updater: (settings: AppSettings) => AppSettings) {
  const nextSettings = updater(getSettings());

  saveSettings(nextSettings);

  return nextSettings;
}
