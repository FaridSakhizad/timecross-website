export type TimeFormat = '24h' | '12h';
export type AppLanguage = 'en' | 'fr' | 'uk' | 'ru';

export type AppSettings = {
  version: 1;
  timeFormat: TimeFormat;
  language: AppLanguage;
  cityOrder: string[];
};

const SETTINGS_STORAGE_KEY = 'timecross:settings';
const LEGACY_CITIES_ORDER_STORAGE_KEY = 'timecross:cities-order';

const DEFAULT_SETTINGS: AppSettings = {
  version: 1,
  timeFormat: '24h',
  language: 'en',
  cityOrder: [],
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
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
    cityOrder: isStringArray(settings?.cityOrder)
      ? settings.cityOrder
      : getLegacyCityOrder(),
  };
}

function isSupportedLanguage(value: unknown): value is AppLanguage {
  return value === 'en' || value === 'fr' || value === 'uk' || value === 'ru';
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
