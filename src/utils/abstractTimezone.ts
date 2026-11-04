const ABSTRACT_TIMEZONE_CITY_ID_BASE = -100000;
const ABSTRACT_TIMEZONE_PREFIX = 'GMT_OFFSET:';

export function getAbstractTimezoneId(offsetMinutes: number) {
  return ABSTRACT_TIMEZONE_CITY_ID_BASE - offsetMinutes;
}

export function getAbstractTimezoneOffsetMinutes(timezone: string) {
  if (!timezone.startsWith(ABSTRACT_TIMEZONE_PREFIX)) {
    return null;
  }

  const rawValue = Number(timezone.slice(ABSTRACT_TIMEZONE_PREFIX.length));

  return Number.isFinite(rawValue) ? rawValue : null;
}

export function getFixedOffsetTimezoneForOffsetMinutes(offsetMinutes: number) {
  return `${ABSTRACT_TIMEZONE_PREFIX}${offsetMinutes}`;
}

export function isAbstractTimezoneValue(timezone: string) {
  return getAbstractTimezoneOffsetMinutes(timezone) !== null;
}

function getShiftedUtcDate(date: Date, offsetMinutes: number) {
  return new Date(date.getTime() + offsetMinutes * 60000);
}

const dateTimeFormatCache = new Map<string, Intl.DateTimeFormat>();

/**
 * Creating Intl.DateTimeFormat is expensive and timelines call it hundreds of times per render,
 * so formatters are cached by locale, timezone and options.
 */
function getDateTimeFormat(locale: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  const cacheKey = `${locale}|${timeZone}|${JSON.stringify(options)}`;
  let formatter = dateTimeFormatCache.get(cacheKey);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone });
    dateTimeFormatCache.set(cacheKey, formatter);
  }

  return formatter;
}

export function formatPartsInTimezone(
  date: Date,
  timezone: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
) {
  const abstractOffsetMinutes = getAbstractTimezoneOffsetMinutes(timezone);

  return getDateTimeFormat(locale, abstractOffsetMinutes === null ? timezone : 'UTC', options).formatToParts(
    abstractOffsetMinutes === null ? date : getShiftedUtcDate(date, abstractOffsetMinutes),
  );
}

export function formatInTimezone(
  date: Date,
  timezone: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
) {
  const abstractOffsetMinutes = getAbstractTimezoneOffsetMinutes(timezone);

  return getDateTimeFormat(locale, abstractOffsetMinutes === null ? timezone : 'UTC', options).format(abstractOffsetMinutes === null ? date : getShiftedUtcDate(date, abstractOffsetMinutes));
}
