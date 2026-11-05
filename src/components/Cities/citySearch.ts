import type { AppLanguage } from '../../settings';
import {
  getAbstractTimezoneId,
  getFixedOffsetTimezoneForOffsetMinutes,
} from '../../utils/abstractTimezone';
import { formatOffsetLabel, getTimeZoneOffsetMinutes } from '../../utils/time';

export type CitySearchRow = {
  id: number;
  name: string;
  country: string;
  admin1: string | null;
  tz: string;
  pop: number;
  isAbstractTimezone?: boolean;
  localizedName?: string | null;
  timezoneAbbreviationShortName?: string;
  timezoneAbbreviationName?: string;
};

/** As stored in cities-search.json (see scripts/city-data/build.mjs). */
type CityJsonTuple = [
  id: number,
  name: string,
  country: string,
  admin1: string | null,
  tz: string,
  pop: number,
];

/** Sorted by city, locale, preferred first, then name: the first alias per language is the display name. */
type AliasJsonTuple = [
  cityId: number,
  locale: string,
  name: string,
  isPreferred: number,
];

type CitiesSearchJson = {
  cities: CityJsonTuple[];
  aliases: AliasJsonTuple[];
};

/** In memory, with the normalized name used for prefix search. */
type CityTuple = [
  id: number,
  name: string,
  nameNorm: string,
  country: string,
  admin1: string | null,
  tz: string,
  pop: number,
];

type AliasTuple = [
  cityId: number,
  locale: string,
  name: string,
  nameNorm: string,
];

type CitySearchData = {
  cities: CityTuple[];
  aliases: AliasTuple[];
  cityById: Map<number, CityTuple>;
  localizedNames: Map<string, string>;
  distinctTimezones: string[];
};

type ParsedGmtOffsetQuery = | {
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
const NORTH_AMERICAN_TIMEZONE_ID_BASE = -200000;
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
const NORTH_AMERICAN_TIMEZONES = [
  {
    name: 'Eastern Time',
    timezone: 'America/New_York',
    city: 'New York',
    country: 'US',
    standardAbbreviation: 'EST',
    daylightAbbreviation: 'EDT',
    standardOffsetMinutes: -5 * 60,
    daylightOffsetMinutes: -4 * 60,
  },
  {
    name: 'Pacific Time',
    timezone: 'America/Los_Angeles',
    city: 'Los Angeles',
    country: 'US',
    standardAbbreviation: 'PST',
    daylightAbbreviation: 'PDT',
    standardOffsetMinutes: -8 * 60,
    daylightOffsetMinutes: -7 * 60,
  },
  {
    name: 'Central Time',
    timezone: 'America/Chicago',
    city: 'Chicago',
    country: 'US',
    standardAbbreviation: 'CST',
    daylightAbbreviation: 'CDT',
    standardOffsetMinutes: -6 * 60,
    daylightOffsetMinutes: -5 * 60,
  },
  {
    name: 'Mountain Time',
    timezone: 'America/Denver',
    city: 'Denver',
    country: 'US',
    standardAbbreviation: 'MST',
    daylightAbbreviation: 'MDT',
    standardOffsetMinutes: -7 * 60,
    daylightOffsetMinutes: -6 * 60,
  },
  {
    name: 'Mountain Time',
    timezone: 'America/Phoenix',
    city: 'Phoenix',
    country: 'US',
    note: 'no DST',
    standardAbbreviation: 'MST',
    daylightAbbreviation: null,
    standardOffsetMinutes: -7 * 60,
    daylightOffsetMinutes: null,
  },
  {
    name: 'Central Time',
    timezone: 'America/Regina',
    city: 'Regina',
    country: 'CA',
    note: 'no DST',
    standardAbbreviation: 'CST',
    daylightAbbreviation: null,
    standardOffsetMinutes: -6 * 60,
    daylightOffsetMinutes: null,
  },
  {
    name: 'Alaska Time',
    timezone: 'America/Anchorage',
    city: 'Anchorage',
    country: 'US',
    standardAbbreviation: 'AKST',
    daylightAbbreviation: 'AKDT',
    standardOffsetMinutes: -9 * 60,
    daylightOffsetMinutes: -8 * 60,
  },
  {
    name: 'Hawaii Time',
    timezone: 'Pacific/Honolulu',
    city: 'Honolulu',
    country: 'US',
    standardAbbreviation: 'HST',
    daylightAbbreviation: null,
    standardOffsetMinutes: -10 * 60,
    daylightOffsetMinutes: null,
  },
  {
    name: 'Atlantic Time',
    timezone: 'America/Halifax',
    city: 'Halifax',
    country: 'CA',
    standardAbbreviation: 'AST',
    daylightAbbreviation: 'ADT',
    standardOffsetMinutes: -4 * 60,
    daylightOffsetMinutes: -3 * 60,
  },
  {
    name: 'Newfoundland Time',
    timezone: 'America/St_Johns',
    city: 'St. John’s',
    country: 'CA',
    standardAbbreviation: 'NST',
    daylightAbbreviation: 'NDT',
    standardOffsetMinutes: -(3 * 60 + 30),
    daylightOffsetMinutes: -(2 * 60 + 30),
  },
] satisfies Array<{
  name: string;
  timezone: string;
  city: string;
  country: string;
  note?: string;
  standardAbbreviation: string;
  daylightAbbreviation: string | null;
  standardOffsetMinutes: number;
  daylightOffsetMinutes: number | null;
}>;
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

// The data for 'pt-BR' keeps only what differs from 'pt' (scripts/city-data/build.mjs).
const ALIAS_FALLBACK_LOCALES: Partial<Record<AppLanguage, string>> = { 'pt-BR': 'pt' };

function isInterfaceLocale(locale: string, language: AppLanguage) {
  return locale === language || locale === ALIAS_FALLBACK_LOCALES[language];
}

function getLocalizedName(data: CitySearchData, cityId: number, language: AppLanguage) {
  const fallbackLocale = ALIAS_FALLBACK_LOCALES[language];

  return data.localizedNames.get(getLocalizedNameKey(cityId, language))
    ?? (fallbackLocale ? data.localizedNames.get(getLocalizedNameKey(cityId, fallbackLocale)) : undefined)
    ?? null;
}

function getCityTupleById(data: CitySearchData, cityId: number) {
  return data.cityById.get(cityId);
}

function getCityRow(data: CitySearchData, city: CityTuple, language: AppLanguage): CitySearchRow {
  const [id, name, , country, admin1, tz, pop] = city;

  return {
    id,
    name,
    country,
    admin1,
    tz,
    pop,
    localizedName: getLocalizedName(data, id, language),
  };
}

function buildCitySearchData(data: CitiesSearchJson): CitySearchData {
  const cities = data.cities.map(([id, name, country, admin1, tz, pop]): CityTuple => (
    [id, name, normalizeSearchText(name), country, admin1, tz, pop]
  ));
  const aliases = data.aliases.map(([cityId, locale, name]): AliasTuple => (
    [cityId, locale, name, normalizeSearchText(name)]
  ));
  const localizedNames = new Map<string, string>();

  // Aliases come pre-sorted, so the first one per city and language is its display name.
  aliases.forEach(([cityId, locale, name]) => {
    const key = getLocalizedNameKey(cityId, locale);

    if (!localizedNames.has(key)) {
      localizedNames.set(key, name);
    }
  });

  return {
    cities,
    aliases,
    cityById: new Map(cities.map((city) => [city[0], city])),
    distinctTimezones: Array.from(new Set(cities.map((city) => city[5]))),
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

const CITY_NAMES_DATA_URL = '/data/city-names';
const cityNamesPromises = new Map<AppLanguage, Promise<Record<string, string>>>();

/** Localized display names (only those that differ from the base name), one small file per language. */
function loadCityNames(language: AppLanguage) {
  let promise = cityNamesPromises.get(language);

  if (!promise) {
    promise = fetch(`${CITY_NAMES_DATA_URL}/${language}.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load city names: ${response.status}`);
        }

        return response.json() as Promise<Record<string, string>>;
      })
      .catch((error: unknown) => {
        cityNamesPromises.delete(language);
        throw error;
      });
    cityNamesPromises.set(language, promise);
  }

  return promise;
}

export async function getLocalizedCityNamesByIds(cityIds: string[], language: AppLanguage) {
  const names = await loadCityNames(language);
  const localizedNames = new Map<string, string>();

  cityIds.forEach((cityId) => {
    const localizedName = names[cityId];

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
    name: formatOffsetLabel(offsetMinutes, 'GMT'),
    country: '',
    admin1: null,
    tz: getFixedOffsetTimezoneForOffsetMinutes(offsetMinutes),
    pop: 0,
    isAbstractTimezone: true,
  };
}

export function getAbstractTimezoneRows() {
  return ABSTRACT_TIMEZONE_OFFSETS_MINUTES.map(createAbstractTimezoneRow);
}

/** English abbreviation ("EST", "GMT+5") used to match search queries, never shown as UI text. */
function getShortTimezoneName(timezone: string, date: Date) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value ?? null;
  } catch {
    return null;
  }
}

function getNorthAmericanTimezoneFallbackAbbreviation(
  timezone: (typeof NORTH_AMERICAN_TIMEZONES)[number],
  date: Date,
) {
  const offsetMinutes = getTimeZoneOffsetMinutes(timezone.timezone, date);

  if (
    timezone.daylightAbbreviation
    && timezone.daylightOffsetMinutes !== null
    && offsetMinutes === timezone.daylightOffsetMinutes
  ) {
    return timezone.daylightAbbreviation;
  }

  return timezone.standardAbbreviation;
}

function getNorthAmericanTimezoneAbbreviation(timezone: (typeof NORTH_AMERICAN_TIMEZONES)[number], date: Date) {
  const shortName = getShortTimezoneName(timezone.timezone, date);

  if (shortName && !/^GMT|^UTC/.test(shortName)) {
    return shortName;
  }

  return getNorthAmericanTimezoneFallbackAbbreviation(timezone, date);
}

export function getNorthAmericanTimezoneRows(date = new Date()) {
  return NORTH_AMERICAN_TIMEZONES.map((timezone, index) => ({
    id: NORTH_AMERICAN_TIMEZONE_ID_BASE - index,
    name: timezone.name,
    country: timezone.country,
    admin1: null,
    tz: timezone.timezone,
    pop: 0,
    timezoneAbbreviationShortName: getNorthAmericanTimezoneAbbreviation(timezone, date),
    timezoneAbbreviationName: [
      `${timezone.city}, ${timezone.country}`,
      timezone.note,
    ].filter(Boolean).join(' · '),
  }));
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
