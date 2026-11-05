import {
  getSettings,
  subscribeSettings,
  toStoredCity,
  updateSettings,
  type StoredCity,
} from '../../settings';

export type SelectedCityInput = {
  id: number | string;
  name: string;
  country: string;
  admin1: string | null;
  tz: string;
  pop: number;
  isAbstractTimezone?: boolean;
  localizedName?: string | null;
};

function normalizeCityId(cityId: number | string) {
  return String(cityId);
}

function createSelectedCityInstanceId(cityId: number | string) {
  return `${normalizeCityId(cityId)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** The user's cities in display order. */
export function getSelectedCities() {
  return getSettings().selectedCities;
}

export function saveSelectedCities(cities: StoredCity[]) {
  updateSettings((settings) => ({
    ...settings,
    selectedCities: cities.map(toStoredCity),
  }));
}

/**
 * Calls the listener only when the list of selected cities changes
 * (in this tab or in another open tab), not on every settings change.
 */
export function subscribeSelectedCities(listener: () => void) {
  let previousCities = getSettings().selectedCities;

  return subscribeSettings(() => {
    const nextCities = getSettings().selectedCities;

    if (nextCities === previousCities) {
      return;
    }

    previousCities = nextCities;
    listener();
  });
}

export function createFavoriteCityFromSearchResult(city: SelectedCityInput): StoredCity {
  const cityId = normalizeCityId(city.id);

  return {
    id: createSelectedCityInstanceId(cityId),
    cityId,
    customName: '',
    city: city.name,
    timezone: city.tz,
  };
}
