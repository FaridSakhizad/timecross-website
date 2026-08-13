import { useEffect, useMemo, useState } from 'react';

import { useI18n } from '../../i18n';
import type { FavoriteCity } from './fixtures';
import { getLocalizedCityNamesByIds } from './citySearch';

const MARKETING_CITY_ID_BY_SLUG: Record<string, string> = {
  'new-york': '5128581',
  london: '2643743',
  paris: '2988507',
  dubai: '292223',
  singapore: '1880252',
  tokyo: '1850147',
  sydney: '2147714',
  'los-angeles': '5368361',
  honolulu: '5856195',
  'rio-de-janeiro': '3451190',
  'cape-town': '3369157',
  auckland: '2193733',
};

function areLocalizedNameMapsEqual(left: Map<string, string>, right: Map<string, string>) {
  if (left.size !== right.size) {
    return false;
  }

  return Array.from(left).every(([cityId, cityName]) => right.get(cityId) === cityName);
}

export function getCityBaseName(city: FavoriteCity) {
  return city.displayCity || city.city;
}

export function getCityDisplayName(city: FavoriteCity) {
  return city.customName || getCityBaseName(city);
}

function getCityLookupId(city: FavoriteCity) {
  return city.cityId || MARKETING_CITY_ID_BY_SLUG[city.id] || city.id;
}

export function useLocalizedCities(cities: FavoriteCity[]) {
  const { language } = useI18n();
  const cityIdsKey = useMemo(
    () => Array.from(new Set(cities.map(getCityLookupId))).sort().join(','),
    [cities],
  );
  const [localizedNames, setLocalizedNames] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    const cityIds = cityIdsKey ? cityIdsKey.split(',') : [];

    if (cityIds.length === 0) {
      setLocalizedNames((currentNames) => (
        currentNames.size === 0 ? currentNames : new Map()
      ));
      return undefined;
    }

    let isCancelled = false;

    getLocalizedCityNamesByIds(cityIds, language)
      .then((nextNames) => {
        if (isCancelled) {
          return;
        }

        setLocalizedNames((currentNames) => (
          areLocalizedNameMapsEqual(currentNames, nextNames) ? currentNames : nextNames
        ));
      })
      .catch((error) => {
        console.error('Failed to load localized city names:', error);
      });

    return () => {
      isCancelled = true;
    };
  }, [cityIdsKey, language]);

  return useMemo(
    () => cities.map((city) => ({
      ...city,
      displayCity: localizedNames.get(getCityLookupId(city)) || city.city,
    })),
    [cities, localizedNames],
  );
}
