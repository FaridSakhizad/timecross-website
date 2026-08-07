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

const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  timeFormat: '24h',
  language: 'en',
  colorMode: 'day',
  cityOrder: [],
  selectedCities: [],
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
      : [],
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
