import {
  getSettings,
  subscribeSettings,
  toStoredCity,
  updateSettings,
  type StoredCity,
} from '../../settings';

import type { CitySearchRow } from './cityData';

/** A unique id of one entry in the list: the same city may be added more than once. */
function createSelectedCityInstanceId(cityId: string) {
  return `${cityId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

export function createFavoriteCityFromSearchResult(city: Pick<CitySearchRow, 'id' | 'name' | 'tz'>): StoredCity {
  const cityId = String(city.id);

  return {
    id: createSelectedCityInstanceId(cityId),
    cityId,
    customName: '',
    city: city.name,
    timezone: city.tz,
  };
}
