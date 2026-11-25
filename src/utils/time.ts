import type { TimeFormat } from '../settings';

import { formatPartsInTimezone, getAbstractTimezoneOffsetMinutes } from './abstractTimezone.ts';

/** Shared date/time helpers. All timezone math in the app should go through this module. */

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

export type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export type DayPeriod = 'morning' | 'day' | 'evening' | 'night';

let browserTimezoneCache: string | null = null;

/** IANA timezone of the current browser; 'UTC' when it cannot be detected. */
export function getBrowserTimezone() {
  browserTimezoneCache ??= Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  return browserTimezoneCache;
}

export function getZonedDateParts(timezone: string, date: Date): ZonedDateParts {
  // A fixed locale on purpose: the parts are parsed as numbers, so they must be Latin digits.
  const parts = formatPartsInTimezone(date, timezone, 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    // hourCycle alone: combined with hour12 it is ignored, and some engines then print "24" at midnight.
    hourCycle: 'h23',
  });

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, Number(part.value)]),
  ) as ZonedDateParts;
}

export function getTimeZoneOffsetMinutesFromParts(dateParts: ZonedDateParts, date: Date) {
  const zonedTime = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    dateParts.hour,
    dateParts.minute,
    dateParts.second,
  );

  return Math.round((zonedTime - date.getTime()) / MINUTE_MS);
}

/** Offset of the timezone from UTC at the given moment, in minutes (DST-aware). */
export function getTimeZoneOffsetMinutes(timezone: string, date: Date) {
  return getTimeZoneOffsetMinutesFromParts(getZonedDateParts(timezone, date), date);
}

/** Converts a wall-clock time in the given timezone to the matching UTC moment. */
export function getUtcDateForZonedTime(
  timezone: string,
  dateParts: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute?: number;
    second?: number;
  },
) {
  const abstractOffsetMinutes = getAbstractTimezoneOffsetMinutes(timezone);
  const utcTime = Date.UTC(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    dateParts.hour,
    dateParts.minute ?? 0,
    dateParts.second ?? 0,
  );

  if (abstractOffsetMinutes !== null) {
    return new Date(utcTime - abstractOffsetMinutes * MINUTE_MS);
  }

  // Two passes handle the case where the offset changes (DST) between the guess and the result.
  const firstPassOffset = getTimeZoneOffsetMinutes(timezone, new Date(utcTime));
  const secondPassOffset = getTimeZoneOffsetMinutes(timezone, new Date(utcTime - firstPassOffset * MINUTE_MS));

  return new Date(utcTime - secondPassOffset * MINUTE_MS);
}

/** Whole-day number for a calendar date, convenient for comparing dates across timezones. */
export function getDateSerial(dateParts: Pick<ZonedDateParts, 'year' | 'month' | 'day'>) {
  return Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day) / DAY_MS;
}

/** Calendar-day difference between two timezones at the same moment: -1, 0 or 1. */
export function getDayShift(timezone: string, baseTimezone: string, date: Date) {
  return Math.sign(
    getDateSerial(getZonedDateParts(timezone, date)) - getDateSerial(getZonedDateParts(baseTimezone, date)),
  );
}

/** "yesterday" or "tomorrow" in `timezone` relative to `baseTimezone`; null on the same day. */
export function getRelativeDayMarker(
  timezone: string,
  baseTimezone: string,
  date: Date,
) {
  const dayShift = getDayShift(timezone, baseTimezone, date);

  if (dayShift < 0) {
    return 'yesterday';
  }

  if (dayShift > 0) {
    return 'tomorrow';
  }

  return null;
}

export function getDayPeriod(hour: number): DayPeriod {
  if (hour >= 5 && hour < 11) {
    return 'morning';
  }

  if (hour >= 11 && hour < 18) {
    return 'day';
  }

  if (hour >= 18 && hour < 22) {
    return 'evening';
  }

  return 'night';
}

function formatHoursAndMinutes(absoluteMinutes: number, separator = ':') {
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  return minutes > 0 ? `${hours}${separator}${String(minutes).padStart(2, '0')}` : String(hours);
}

/** Relative offset such as "+3", "-5:30"; `sameLabel` when the offset is zero. */
export function formatRelativeOffset(offsetMinutes: number, sameLabel: string) {
  if (offsetMinutes === 0) {
    return sameLabel;
  }

  return `${offsetMinutes > 0 ? '+' : '-'}${formatHoursAndMinutes(Math.abs(offsetMinutes))}`;
}

/** Absolute offset label such as "UTC+5:30" or "GMT-3". */
export function formatOffsetLabel(offsetMinutes: number, prefix: 'UTC' | 'GMT' = 'UTC') {
  return `${prefix}${offsetMinutes < 0 ? '-' : '+'}${formatHoursAndMinutes(Math.abs(offsetMinutes))}`;
}

export type ClockLabel = {
  /** "21", "21:05", "9", "9:05" */
  time: string;
  /** Shown only in 12-hour format. Latin AM/PM in every language, like the format switch in the header. */
  period: 'AM' | 'PM' | null;
};

const pad2 = (value: number) => String(value).padStart(2, '0');

/**
 * Clock label built from numbers, not from a locale: 24-hour times are zero-padded ("09:05"),
 * 12-hour times are not ("9:05" + "AM"). Without `minute` only the hour is returned ("9" or "21").
 */
export function getClockLabel(hour: number, minute: number | null, timeFormat: TimeFormat): ClockLabel {
  if (timeFormat === '24h') {
    return { time: minute === null ? String(hour) : `${pad2(hour)}:${pad2(minute)}`, period: null };
  }

  const hour12 = hour % 12 || 12;

  return {
    time: minute === null ? String(hour12) : `${hour12}:${pad2(minute)}`,
    period: hour < 12 ? 'AM' : 'PM',
  };
}

/** "09:05" or "9:05 AM" for a moment in the given timezone. */
export function formatClockTime(date: Date, timezone: string, timeFormat: TimeFormat) {
  const { hour, minute } = getZonedDateParts(timezone, date);
  const { time, period } = getClockLabel(hour, minute, timeFormat);

  return period ? `${time} ${period}` : time;
}

function getLocalizedPart(date: Date, timezone: string, locale: string, options: Intl.DateTimeFormatOptions, type: Intl.DateTimeFormatPartTypes) {
  // Trailing dots of abbreviations ("нояб.", "Di.") are dropped to keep timeline labels compact.
  return (formatPartsInTimezone(date, timezone, locale, options).find((part) => part.type === type)?.value ?? '')
    .replace(/\.$/, '');
}

/** Day and short month in the locale's order: "Nov 3", "3 нояб", "3 Nov". */
export function formatShortDate(date: Date, timezone: string, locale: string) {
  return formatPartsInTimezone(date, timezone, locale, { month: 'short', day: 'numeric' })
    .filter((part) => part.type === 'day' || part.type === 'month')
    .map((part) => part.value.replace(/\.$/, ''))
    .join(' ');
}

const threeLetterMonths = new Map<string, string[]>();

/**
 * The twelve months of a language in three letters: the first three of each name ("Jan", "ноя",
 * "лис", "Mär"). Where two names start alike, the third letter is the first that tells them apart:
 * French "juin" and "juillet" become "jun" and "jul".
 */
function getThreeLetterMonths(locale: string) {
  const cached = threeLetterMonths.get(locale);

  if (cached) {
    return cached;
  }

  // The name on its own, in the nominative ("ноябрь", not "ноября"); mid-month, away from any time zone's date line.
  const format = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' });
  const names = Array.from({ length: 12 }, (_, month) => format.format(new Date(Date.UTC(2026, month, 15))).replace(/\./g, ''));
  const months = names.map((name) => {
    const alike = names.filter((other) => other !== name && other.slice(0, 3) === name.slice(0, 3));

    if (!alike.length) {
      return name.slice(0, 3);
    }

    const index = [...name].findIndex((letter, position) => position >= 2 && alike.every((other) => other[position] !== letter));

    return name.slice(0, 2) + (name[index] ?? name[2] ?? '');
  });

  threeLetterMonths.set(locale, months);

  return months;
}

/** The month of `date` in `timezone`, in three letters (see getThreeLetterMonths). */
export function formatThreeLetterMonth(date: Date, timezone: string, locale: string) {
  return getThreeLetterMonths(locale)[getZonedDateParts(timezone, date).month - 1] ?? '';
}

export function formatShortWeekday(date: Date, timezone: string, locale: string) {
  return getLocalizedPart(date, timezone, locale, { weekday: 'short' }, 'weekday');
}

/** A duration in hours in the language's own words and plural forms: "2 hours", "5,5 часа", "1 Stunde". */
export function formatHourDuration(minutes: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'hour',
    unitDisplay: 'long',
    maximumFractionDigits: 2,
  }).format(Math.abs(minutes) / 60);
}
