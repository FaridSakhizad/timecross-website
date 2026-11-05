/** 'pt' is European Portuguese, 'pt-BR' Brazilian; menus show them as one language (see languageRouting). */
export const APP_LANGUAGES = ['en', 'fr', 'uk', 'ru', 'es', 'pt', 'pt-BR', 'de'] as const;

export type TimeFormat = '24h' | '12h';
export type AppLanguage = (typeof APP_LANGUAGES)[number];
export type ColorMode = 'day' | 'night';

/**
 * A city in the user's list. Only source data is stored: the time, the offset and the localized
 * name are computed from `timezone` and `cityId` when rendered. The list order is the array order.
 */
export type StoredCity = {
  id: string;
  cityId?: string;
  customName: string;
  city: string;
  timezone: string;
};

/** A city of a built-in list. `visible: false` keeps it in the list without showing it. */
export type PresetCity = StoredCity & {
  visible?: boolean;
};

export type AppSettings = {
  version: 1;
  timeFormat: TimeFormat;
  language: AppLanguage;
  colorMode: ColorMode;
  /** Dragging the planner grid with the mouse scrolls it (desktop). */
  isPlannerPanEnabled: boolean;
  selectedCities: StoredCity[];
};

const SETTINGS_STORAGE_KEY = 'timecross:settings';
const LEGACY_CITIES_ORDER_STORAGE_KEY = 'timecross:cities-order';
const LEGACY_DESKTOP_PAN_STORAGE_KEY = 'timecross:pan:desktop';
const LEGACY_PLANNER_PAN_STORAGE_KEYS = [LEGACY_DESKTOP_PAN_STORAGE_KEY, 'timecross:pan:mobile'];

export const MARKETING_DEFAULT_SELECTED_CITIES: PresetCity[] = [
  {
    id: 'new-york',
    cityId: '5128581',
    customName: '',
    city: 'New York',
    timezone: 'America/New_York',
  },
  {
    id: 'london',
    cityId: '2643743',
    customName: '',
    city: 'London',
    timezone: 'Europe/London',
  },
  {
    id: 'paris',
    cityId: '2988507',
    customName: '',
    city: 'Paris',
    timezone: 'Europe/Paris',
  },
  {
    id: 'dubai',
    cityId: '292223',
    customName: '',
    city: 'Dubai',
    timezone: 'Asia/Dubai',
  },
  {
    id: 'singapore',
    cityId: '1880252',
    customName: '',
    city: 'Singapore',
    timezone: 'Asia/Singapore',
  },
  {
    id: 'tokyo',
    cityId: '1850147',
    customName: '',
    city: 'Tokyo',
    timezone: 'Asia/Tokyo',
  },
  {
    id: 'sydney',
    cityId: '2147714',
    customName: '',
    city: 'Sydney',
    timezone: 'Australia/Sydney',
    visible: false,
  },
  {
    id: 'los-angeles',
    cityId: '5368361',
    customName: '',
    city: 'Los Angeles',
    timezone: 'America/Los_Angeles',
  },
  {
    id: 'honolulu',
    cityId: '5856195',
    customName: '',
    city: 'Honolulu',
    timezone: 'Pacific/Honolulu',
    visible: false,
  },
  {
    id: 'rio-de-janeiro',
    cityId: '3451190',
    customName: '',
    city: 'Rio de Janeiro',
    timezone: 'America/Sao_Paulo',
    visible: false,
  },
  {
    id: 'cape-town',
    cityId: '3369157',
    customName: '',
    city: 'Cape Town',
    timezone: 'Africa/Johannesburg',
    visible: false,
  },
  {
    id: 'auckland',
    cityId: '2193733',
    customName: '',
    city: 'Auckland',
    timezone: 'Pacific/Auckland',
    visible: false,
  },
];

/** Drops everything but the stored fields (older versions also stored computed values). */
export function toStoredCity(city: StoredCity): StoredCity {
  return {
    id: city.id,
    ...(typeof city.cityId === 'string' && city.cityId ? { cityId: city.cityId } : {}),
    customName: typeof city.customName === 'string' ? city.customName : '',
    city: city.city,
    timezone: city.timezone,
  };
}

const DEFAULT_SELECTED_CITIES: StoredCity[] = MARKETING_DEFAULT_SELECTED_CITIES
  .filter((city) => city.visible !== false)
  .map(toStoredCity);

const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  timeFormat: '24h',
  language: 'en',
  colorMode: 'day',
  isPlannerPanEnabled: true,
  selectedCities: DEFAULT_SELECTED_CITIES,
};

const SERVER_SETTINGS: AppSettings = getDefaultSettings();

export function getDefaultSettings(): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
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
    typeof city.id === 'string'
    && typeof city.city === 'string'
    && typeof city.timezone === 'string'
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

    const parsedOrder: unknown = JSON.parse(storedOrder);

    return isStringArray(parsedOrder) ? parsedOrder : [];
  } catch {
    return [];
  }
}

/** The planner pan setting from before it moved into the settings ("false" switched it off). */
function getLegacyPlannerPanSetting() {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    return window.localStorage.getItem(LEGACY_DESKTOP_PAN_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function isSupportedLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && (APP_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Settings as read from storage, where any field may be missing or malformed. Older versions also
 * stored a separate order list and hidden preset cities.
 */
type StoredSettingsData = Partial<Record<keyof AppSettings | 'cityOrder', unknown>>;

function parseStoredSettings(value: string): StoredSettingsData | null {
  const data: unknown = JSON.parse(value);

  return data && typeof data === 'object' ? data : null;
}

function orderCities(cities: StoredCity[], cityOrder: string[]) {
  const cityById = new Map<string, StoredCity>();

  cities.forEach((city) => {
    if (!cityById.has(city.id)) {
      cityById.set(city.id, city);
    }
  });

  const orderedCities = cityOrder
    .filter((cityId, index) => cityOrder.indexOf(cityId) === index)
    .map((cityId) => cityById.get(cityId))
    .filter((city): city is StoredCity => Boolean(city));
  const orderedCityIds = new Set(orderedCities.map((city) => city.id));
  const restCities = Array.from(cityById.values()).filter((city) => !orderedCityIds.has(city.id));

  return [...orderedCities, ...restCities];
}

function normalizeSelectedCities(settings: StoredSettingsData | null): StoredCity[] {
  const cities: PresetCity[] = isStoredCityArray(settings?.selectedCities)
    ? settings.selectedCities
    : DEFAULT_SELECTED_CITIES;
  const cityOrder = isStringArray(settings?.cityOrder)
    ? settings.cityOrder
    : getLegacyCityOrder();

  return orderCities(
    cities
      .filter((city) => city.visible !== false)
      .map(toStoredCity),
    cityOrder,
  );
}

function normalizeSettings(settings: StoredSettingsData | null): AppSettings {
  return {
    version: 1,
    timeFormat: settings?.timeFormat === '12h' ? '12h' : '24h',
    language: isSupportedLanguage(settings?.language) ? settings.language : 'en',
    colorMode: settings?.colorMode === 'night' ? 'night' : 'day',
    isPlannerPanEnabled: typeof settings?.isPlannerPanEnabled === 'boolean'
      ? settings.isPlannerPanEnabled
      : getLegacyPlannerPanSetting(),
    selectedCities: normalizeSelectedCities(settings),
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

    return normalizeSettings(storedSettings ? parseStoredSettings(storedSettings) : null);
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
    // Older separate keys are already merged into the settings (see normalizeSettings).
    window.localStorage.removeItem(LEGACY_CITIES_ORDER_STORAGE_KEY);
    LEGACY_PLANNER_PAN_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
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
