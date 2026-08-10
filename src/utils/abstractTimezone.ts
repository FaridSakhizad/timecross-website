const ABSTRACT_TIMEZONE_CITY_ID_BASE = -100000;
const ABSTRACT_TIMEZONE_PREFIX = 'GMT_OFFSET:';

export function formatGmtOffsetLabel(offsetMinutes: number) {
  const prefix = offsetMinutes < 0 ? '-' : '+';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60);
  const minutes = absoluteMinutes % 60;

  if (minutes === 0) {
    return `GMT${prefix}${hours}`;
  }

  return `GMT${prefix}${hours}:${minutes.toString().padStart(2, '0')}`;
}

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

export function formatPartsInTimezone(
  date: Date,
  timezone: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
) {
  const abstractOffsetMinutes = getAbstractTimezoneOffsetMinutes(timezone);

  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: abstractOffsetMinutes === null ? timezone : 'UTC',
  }).formatToParts(
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

  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: abstractOffsetMinutes === null ? timezone : 'UTC',
  }).format(abstractOffsetMinutes === null ? date : getShiftedUtcDate(date, abstractOffsetMinutes));
}
