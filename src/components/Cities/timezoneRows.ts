/**
 * Rows of the "Add city" picker that are not cities: fixed GMT/UTC offsets and the North
 * American time zones by abbreviation (EST, PDT...).
 */
import {
  getAbstractTimezoneId,
  getFixedOffsetTimezoneForOffsetMinutes,
} from '../../utils/abstractTimezone';
import { formatOffsetLabel, getTimeZoneOffsetMinutes } from '../../utils/time';

import type { CitySearchRow } from './cityData';

const NORTH_AMERICAN_TIMEZONE_ID_BASE = -200000;

export const ABSTRACT_TIMEZONE_OFFSETS_MINUTES = [
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

export function createAbstractTimezoneRow(offsetMinutes: number): CitySearchRow {
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

  if (timezone.daylightAbbreviation && offsetMinutes === timezone.daylightOffsetMinutes) {
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
