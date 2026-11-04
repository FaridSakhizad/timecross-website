export const APP_LANGUAGES = ['en', 'fr', 'uk', 'ru', 'es', 'pt', 'de'] as const;

export type TimeFormat = '24h' | '12h';
export type AppLanguage = (typeof APP_LANGUAGES)[number];
export type ColorMode = 'day' | 'night';

export type StoredCity = {
  id: string;
  cityId?: string;
  order: number;
  customName: string;
  city: string;
  displayCity?: string;
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
    cityId: '5128581',
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
    cityId: '2643743',
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
    cityId: '2988507',
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
    cityId: '292223',
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
    cityId: '1880252',
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
    cityId: '1850147',
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
    cityId: '2147714',
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
    cityId: '5368361',
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
    cityId: '5856195',
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
    cityId: '3451190',
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
    cityId: '3369157',
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
    cityId: '2193733',
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

const DEFAULT_SELECTED_CITIES: StoredCity[] = MARKETING_DEFAULT_SELECTED_CITIES;

const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  timeFormat: '24h',
  language: 'en',
  colorMode: 'day',
  cityOrder: [],
  selectedCities: DEFAULT_SELECTED_CITIES,
};

const SERVER_SETTINGS: AppSettings = getDefaultSettings();

export function getDefaultSettings(): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    cityOrder: [...DEFAULT_SETTINGS.cityOrder],
    selectedCities: DEFAULT_SETTINGS.selectedCities.map((city) => ({ ...city })),
  };
}

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
  if (typeof window === 'undefined') {
    return [];
  }

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

export function isSupportedLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && (APP_LANGUAGES as readonly string[]).includes(value);
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

type SettingsListener = () => void;

const settingsListeners = new Set<SettingsListener>();
let cachedSettings: AppSettings | null = null;
let isStorageListenerAttached = false;

function readStoredSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return normalizeSettings(null);
  }

  try {
    const storedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

    return normalizeSettings(storedSettings ? JSON.parse(storedSettings) : null);
  } catch {
    return normalizeSettings(null);
  }
}

function notifySettingsListeners() {
  settingsListeners.forEach((listener) => listener());
}

function handleStorageEvent(event: StorageEvent) {
  if (event.key !== null && event.key !== SETTINGS_STORAGE_KEY) {
    return;
  }

  cachedSettings = null;
  notifySettingsListeners();
}

/**
 * Returns the current settings snapshot. The same object is returned until the
 * settings change, so it is safe to use with useSyncExternalStore. Treat it as read-only.
 */
export function getSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return SERVER_SETTINGS;
  }

  cachedSettings ??= readStoredSettings();

  return cachedSettings;
}

/** Snapshot used for SSR and during hydration, so server and client markup match. */
export function getServerSettings(): AppSettings {
  return SERVER_SETTINGS;
}

export function subscribeSettings(listener: SettingsListener) {
  settingsListeners.add(listener);

  if (typeof window !== 'undefined' && !isStorageListenerAttached) {
    // Keeps several open tabs in sync.
    window.addEventListener('storage', handleStorageEvent);
    isStorageListenerAttached = true;
  }

  return () => {
    settingsListeners.delete(listener);
  };
}

export function getStoredLanguageSetting(): AppLanguage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!storedSettings) {
      return null;
    }

    const language = (JSON.parse(storedSettings) as Partial<AppSettings>).language;

    return isSupportedLanguage(language) ? language : null;
  } catch {
    return null;
  }
}

export function saveSettings(settings: AppSettings) {
  if (typeof window === 'undefined') {
    return;
  }

  cachedSettings = settings;

  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable (private mode, quota). Keep the in-memory value.
  }

  notifySettingsListeners();
}

export function updateSettings(updater: (settings: AppSettings) => AppSettings) {
  const nextSettings = updater(getSettings());

  saveSettings(nextSettings);

  return nextSettings;
}
