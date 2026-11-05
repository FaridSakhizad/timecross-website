import { MARKETING_DEFAULT_SELECTED_CITIES, type StoredCity } from '../../settings';
import { getBrowserTimezone, getTimeZoneOffsetMinutes } from '../../utils/time';

import { getBrowserTimezoneCity } from './browserTimezoneCities';
import { catalogCities } from './cityCatalog';

function hasSameTimezoneProfile(leftTimezone: string, rightTimezone: string) {
  const year = new Date().getUTCFullYear();
  const winterDate = new Date(Date.UTC(year, 0, 15, 12));
  const summerDate = new Date(Date.UTC(year, 6, 15, 12));

  return (
    getTimeZoneOffsetMinutes(leftTimezone, winterDate) === getTimeZoneOffsetMinutes(rightTimezone, winterDate)
    && getTimeZoneOffsetMinutes(leftTimezone, summerDate) === getTimeZoneOffsetMinutes(rightTimezone, summerDate)
  );
}

/**
 * The city to convert from when none is chosen: one in the browser's time zone, from the user's
 * list, the built-in lists or the catalog, else one with the same offsets, else the first city.
 */
export function getDefaultSourceCity(cities: StoredCity[]) {
  const browserTimezone = typeof window === 'undefined' ? null : getBrowserTimezone();

  if (!browserTimezone) {
    return cities[0] ?? null;
  }

  const marketingCities = MARKETING_DEFAULT_SELECTED_CITIES;
  const sourcePools = [cities, marketingCities, catalogCities];

  const selectedBrowserCity = cities.find((city) => city.timezone === browserTimezone);

  if (selectedBrowserCity) {
    return selectedBrowserCity;
  }

  const browserTimezoneCity = getBrowserTimezoneCity(browserTimezone);

  if (browserTimezoneCity) {
    return browserTimezoneCity;
  }

  for (const sourcePool of [marketingCities, catalogCities]) {
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
