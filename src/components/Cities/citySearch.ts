/** Search of the "Add city" picker: by name or alias, by GMT offset ("gmt+3") or by offset ("+5:30"). */
import type { AppLanguage } from '../../settings';
import { getTimeZoneOffsetMinutes } from '../../utils/time';
import {
  getCityRow,
  getCityTupleById,
  isInterfaceLocale,
  loadCitySearchData,
  normalizeSearchText,
  type CitySearchData,
  type CityTuple,
} from './cityData';
import { ABSTRACT_TIMEZONE_OFFSETS_MINUTES, createAbstractTimezoneRow } from './timezoneRows';

type ParsedGmtOffsetQuery = | {
  kind: 'exact';
  offsetMinutes: number;
}
| {
  kind: 'prefix';
  sign: '+' | '-';
  hours: number;
};

const SEARCH_RESULTS_LIMIT = 30;

function parseOffsetValue(value: string) {
  const normalized = value.trim().replace(/\s+/g, '');

  if (normalized === '0' || normalized === '+0' || normalized === '-0') {
    return 0;
  }

  const match = normalized.match(/^([+-]?)(\d{1,2})(?::?(\d{2}))?$/);

  if (!match) {
    return null;
  }

  const [, sign, hoursPart = '0', minutesPart] = match;
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

  const [, offset = ''] = match;
  const normalizedOffset = offset.replace(/\s+/g, '');
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

  const [, sign, hours = '0'] = prefixMatch;

  return {
    kind: 'prefix',
    sign: sign === '-' ? '-' : '+',
    hours: parseInt(hours, 10),
  };
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
    .sort((cityA, cityB) => cityB[6] - cityA[6] || cityA[1].localeCompare(cityB[1]))
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

    const rank = isInterfaceLocale(alias[1], language) ? 0 : 1;
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
      || resultB.city[6] - resultA.city[6]
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
