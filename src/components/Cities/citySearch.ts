import type { AppLanguage } from '../../settings';
import {
  formatGmtOffsetLabel,
  getAbstractTimezoneId,
  getFixedOffsetTimezoneForOffsetMinutes,
} from '../../utils/abstractTimezone';
import { getTimeZoneOffsetMinutes } from '../Timelines/utils';

export type CitySearchRow = {
  id: number;
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

type CityTuple = [
  id: number,
  name: string,
  nameNorm: string,
  country: string,
  admin1: string | null,
  tz: string,
  lat: number,
  lon: number,
  pop: number,
];

type AliasTuple = [
  cityId: number,
  locale: string,
  name: string,
  nameNorm: string,
  isPreferred: number,
];

type CitiesSearchJson = {
  cities: CityTuple[];
  aliases: AliasTuple[];
};

type CitySearchData = CitiesSearchJson & {
  cityById: Map<number, CityTuple>;
  localizedNames: Map<string, string>;
  distinctTimezones: string[];
};

type ParsedGmtOffsetQuery =
  | {
      kind: 'exact';
      offsetMinutes: number;
    }
  | {
      kind: 'prefix';
      sign: '+' | '-';
      hours: number;
    };

const CITY_SEARCH_DATA_URL = '/data/cities-search.json';
const SEARCH_RESULTS_LIMIT = 30;
const ABSTRACT_TIMEZONE_OFFSETS_MINUTES = [
  -12 * 60,
  -11 * 60,
  -10 * 60,
  -(9 * 60 + 30),
  -9 * 60,
  -8 * 60,
  -7 * 60,
  -6 * 60,
  -5 * 60,
  -4 * 60,
  -(3 * 60 + 30),
  -3 * 60,
  -2 * 60,
  -1 * 60,
  0,
  1 * 60,
  2 * 60,
  3 * 60,
  3 * 60 + 30,
  4 * 60,
  4 * 60 + 30,
  5 * 60,
  5 * 60 + 30,
  5 * 60 + 45,
  6 * 60,
  6 * 60 + 30,
  7 * 60,
  8 * 60,
  8 * 60 + 45,
  9 * 60,
  9 * 60 + 30,
  10 * 60,
  10 * 60 + 30,
  11 * 60,
  12 * 60,
  13 * 60,
  13 * 60 + 45,
  14 * 60,
];

let citiesSearchDataPromise: Promise<CitySearchData> | null = null;

export function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

function getLocalizedNameKey(cityId: number, locale: string) {
  return `${cityId}:${locale}`;
}

function getCityTupleById(data: CitySearchData, cityId: number) {
  return data.cityById.get(cityId);
}

function getCityRow(data: CitySearchData, city: CityTuple, language: AppLanguage): CitySearchRow {
  const [id, name, , country, admin1, tz, lat, lon, pop] = city;

  return {
    id,
    name,
    country,
    admin1,
    tz,
    lat,
    lon,
    pop,
    localizedName: data.localizedNames.get(getLocalizedNameKey(id, language)) ?? null,
  };
}

function buildCitySearchData(data: CitiesSearchJson): CitySearchData {
  const localizedNames = new Map<string, string>();
  const seenLocalizedNames = new Set<string>();
  const cityById = new Map(data.cities.map((city) => [city[0], city]));
  const distinctTimezones = Array.from(new Set(data.cities.map((city) => city[5])));

  data.aliases
    .sort((aliasA, aliasB) => (
      aliasA[0] - aliasB[0]
      || aliasA[1].localeCompare(aliasB[1])
      || aliasB[4] - aliasA[4]
      || aliasA[2].localeCompare(aliasB[2])
    ))
    .forEach(([cityId, locale, name]) => {
      const key = getLocalizedNameKey(cityId, locale);

      if (!seenLocalizedNames.has(key)) {
        localizedNames.set(key, name);
        seenLocalizedNames.add(key);
      }
    });

  return {
    ...data,
    cityById,
    distinctTimezones,
    localizedNames,
  };
}

export async function loadCitySearchData() {
  if (!citiesSearchDataPromise) {
    citiesSearchDataPromise = fetch(CITY_SEARCH_DATA_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load city search data: ${response.status}`);
        }

        return response.json() as Promise<CitiesSearchJson>;
      })
      .then(buildCitySearchData);
  }

  return citiesSearchDataPromise;
}

export async function getLocalizedCityNamesByIds(cityIds: string[], language: AppLanguage) {
  const data = await loadCitySearchData();
  const localizedNames = new Map<string, string>();

  cityIds.forEach((cityId) => {
    const cityIdNumber = Number(cityId);

    if (!Number.isInteger(cityIdNumber)) {
      return;
    }

    const localizedName = data.localizedNames.get(getLocalizedNameKey(cityIdNumber, language));

    if (localizedName) {
      localizedNames.set(cityId, localizedName);
    }
  });

  return localizedNames;
}

function parseOffsetValue(value: string) {
  const normalized = value.trim().replace(/\s+/g, '');

  if (normalized === '0' || normalized === '+0' || normalized === '-0') {
    return 0;
  }

  const match = normalized.match(/^([+-]?)(\d{1,2})(?::?(\d{2}))?$/);

  if (!match) {
    return null;
  }

  const [, sign, hoursPart, minutesPart] = match;
  const hours = parseInt(hoursPart, 10);
  const minutes = minutesPart ? parseInt(minutesPart, 10) : 0;

  if (hours > 23 || minutes > 59) {
    return null;
  }

  const totalMinutes = hours * 60 + minutes;

  return sign === '-' ? -totalMinutes : totalMinutes;
}

function parseGmtOffsetQuery(query: string): ParsedGmtOffsetQuery | null {
  const normalized = query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^(utc|gtm)\b/, 'gmt');
  const match = normalized.match(/^gmt(?:\s+)?([+-]?\s*\d{1,2}(?::?\d{2})?)$/);

  if (!match) {
    return null;
  }

  const normalizedOffset = match[1].replace(/\s+/g, '');
  const parsedOffset = parseOffsetValue(normalizedOffset);

  if (parsedOffset === null) {
    return null;
  }

  if (normalizedOffset.includes(':')) {
    return {
      kind: 'exact',
      offsetMinutes: parsedOffset,
    };
  }

  const prefixMatch = normalizedOffset.match(/^([+-]?)(\d{1,2})$/);

  if (!prefixMatch) {
    return {
      kind: 'exact',
      offsetMinutes: parsedOffset,
    };
  }

  return {
    kind: 'prefix',
    sign: prefixMatch[1] === '-' ? '-' : '+',
    hours: parseInt(prefixMatch[2], 10),
  };
}

function createAbstractTimezoneRow(offsetMinutes: number): CitySearchRow {
  return {
    id: getAbstractTimezoneId(offsetMinutes),
    name: formatGmtOffsetLabel(offsetMinutes),
    country: '',
    admin1: null,
    tz: getFixedOffsetTimezoneForOffsetMinutes(offsetMinutes),
    lat: 0,
    lon: 0,
    pop: 0,
    isAbstractTimezone: true,
  };
}

export function getAbstractTimezoneRows() {
  return ABSTRACT_TIMEZONE_OFFSETS_MINUTES.map(createAbstractTimezoneRow);
}

function getMatchingAbstractTimezoneRowsForGmtQuery(parsedQuery: ParsedGmtOffsetQuery) {
  if (parsedQuery.kind === 'exact') {
    return [createAbstractTimezoneRow(parsedQuery.offsetMinutes)];
  }

  return ABSTRACT_TIMEZONE_OFFSETS_MINUTES
    .filter((offsetMinutes) => {
      if (parsedQuery.sign === '+') {
        return offsetMinutes >= 0 && Math.floor(offsetMinutes / 60) === parsedQuery.hours;
      }

      return offsetMinutes < 0 && Math.floor(Math.abs(offsetMinutes) / 60) === parsedQuery.hours;
    })
    .map(createAbstractTimezoneRow);
}

function searchCitiesByTimezones(
  data: CitySearchData,
  timezones: string[],
  language: AppLanguage,
) {
  const timezoneSet = new Set(timezones);

  return data.cities
    .filter((city) => timezoneSet.has(city[5]))
    .sort((cityA, cityB) => cityB[8] - cityA[8] || cityA[1].localeCompare(cityB[1]))
    .slice(0, SEARCH_RESULTS_LIMIT)
    .map((city) => getCityRow(data, city, language));
}

function searchCitiesByUtcOffsets(
  data: CitySearchData,
  offsetMinutesList: number[],
  language: AppLanguage,
) {
  const now = new Date();
  const matchingTimezones = data.distinctTimezones.filter((timezone) => (
    offsetMinutesList.includes(getTimeZoneOffsetMinutes(timezone, now))
  ));

  return searchCitiesByTimezones(data, matchingTimezones, language);
}

function searchCitiesByRelativeOffset(
  data: CitySearchData,
  offsetMinutes: number,
  language: AppLanguage,
) {
  const now = new Date();
  const localOffsetMinutes = -now.getTimezoneOffset();
  const matchingTimezones = data.distinctTimezones.filter((timezone) => (
    getTimeZoneOffsetMinutes(timezone, now) - localOffsetMinutes === offsetMinutes
  ));

  return searchCitiesByTimezones(data, matchingTimezones, language);
}

function searchCitiesByName(data: CitySearchData, query: string, language: AppLanguage) {
  const normalizedPrefix = normalizeSearchText(query);
  const matchedCityRanks = new Map<number, number>();

  data.cities.forEach((city) => {
    if (city[2].startsWith(normalizedPrefix)) {
      matchedCityRanks.set(city[0], 1);
    }
  });

  data.aliases.forEach((alias) => {
    if (!alias[3].startsWith(normalizedPrefix)) {
      return;
    }

    const rank = alias[1] === language ? 0 : 1;
    const currentRank = matchedCityRanks.get(alias[0]);

    if (currentRank === undefined || rank < currentRank) {
      matchedCityRanks.set(alias[0], rank);
    }
  });

  return Array.from(matchedCityRanks)
    .map(([cityId, rank]) => {
      const city = getCityTupleById(data, cityId);

      return city ? { city, rank } : null;
    })
    .filter((result): result is { city: CityTuple; rank: number } => result !== null)
    .sort((resultA, resultB) => (
      resultA.rank - resultB.rank
      || resultB.city[8] - resultA.city[8]
      || resultA.city[1].localeCompare(resultB.city[1])
    ))
    .slice(0, SEARCH_RESULTS_LIMIT)
    .map((result) => getCityRow(data, result.city, language));
}

export async function searchCities(query: string, language: AppLanguage) {
  const data = await loadCitySearchData();
  const gmtOffsetQuery = parseGmtOffsetQuery(query);
  const relativeOffsetQueryMinutes = gmtOffsetQuery === null ? parseOffsetValue(query) : null;

  if (gmtOffsetQuery !== null) {
    const abstractTimezoneResults = getMatchingAbstractTimezoneRowsForGmtQuery(gmtOffsetQuery);
    const timezoneResults = searchCitiesByUtcOffsets(
      data,
      abstractTimezoneResults.map((city) => parseOffsetValue(city.name.replace('GMT', '')) ?? 0),
      language,
    );

    return [...abstractTimezoneResults, ...timezoneResults];
  }

  if (relativeOffsetQueryMinutes !== null) {
    return searchCitiesByRelativeOffset(data, relativeOffsetQueryMinutes, language);
  }

  return searchCitiesByName(data, query, language);
}
