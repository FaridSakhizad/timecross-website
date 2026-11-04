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
  dateParts: { year: number; month: number; day: number; hour: number; minute?: number; second?: number },
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
