import { getSettings, updateSettings } from '../../settings';
import type { FavoriteCity } from './fixtures';

export const SELECTED_CITIES_CHANGED_EVENT = 'timecross:selected-cities-changed';

export type SelectedCityInput = {
  id: number | string;
  name: string;
  country: string;
  admin1: string | null;
  tz: string;
  lat: number;
  lon: number;
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

function normalizeSelectedCity(city: FavoriteCity, index: number): FavoriteCity {
  return {
    ...city,
    id: normalizeCityId(city.id),
    order: Number.isFinite(city.order) ? city.order : index,
    customName: city.customName || '',
    period: city.period || 'day',
  };
}

export function getSelectedCities() {
  return getSettings().selectedCities
    .filter((city) => city.visible !== false)
    .map(normalizeSelectedCity);
}

export function saveSelectedCities(cities: FavoriteCity[]) {
  const normalizedCities = cities.map(normalizeSelectedCity);

  updateSettings((settings) => ({
    ...settings,
    cityOrder: normalizedCities.map((city) => city.id),
    selectedCities: normalizedCities,
  }));

  window.dispatchEvent(new CustomEvent(SELECTED_CITIES_CHANGED_EVENT));
}

export function createFavoriteCityFromSearchResult(
  city: SelectedCityInput,
  order: number,
): FavoriteCity {
  const cityId = normalizeCityId(city.id);

  return {
    id: createSelectedCityInstanceId(cityId),
    cityId,
    order,
    customName: '',
    city: city.name,
    timezone: city.tz,
    utcOffset: '',
    timeOffset: '',
    time: '',
    period: 'day',
  };
}

export function getOrderedSelectedCities(cityOrder: string[]) {
  const selectedCities = getSelectedCities();

  if (cityOrder.length === 0) {
    return selectedCities;
  }

  const cityById = new Map(selectedCities.map((city) => [city.id, city]));
  const orderedCities = cityOrder
    .map((cityId) => cityById.get(cityId))
    .filter((city): city is FavoriteCity => Boolean(city));
  const orderedCityIds = new Set(orderedCities.map((city) => city.id));
  const newCities = selectedCities.filter((city) => !orderedCityIds.has(city.id));

  return [...orderedCities, ...newCities];
}
