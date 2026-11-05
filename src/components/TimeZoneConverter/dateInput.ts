/**
 * Values of the converter's date and time controls: "2026-11-05" and "14:30" in the source city's
 * time zone, as in <input type="date|time">.
 */
import { getIntlLocale } from '../../i18n/intlLocale';
import type { AppLanguage } from '../../settings';
import { getZonedDateParts } from '../../utils/time';

type DateInputParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export function getDateInputValue(timezone: string, date: Date) {
  const dateParts = getZonedDateParts(timezone, date);

  return [
    dateParts.year,
    String(dateParts.month).padStart(2, '0'),
    String(dateParts.day).padStart(2, '0'),
  ].join('-');
}

export function getTimeInputValue(timezone: string, date: Date) {
  const dateParts = getZonedDateParts(timezone, date);

  return `${String(dateParts.hour).padStart(2, '0')}:${String(dateParts.minute).padStart(2, '0')}`;
}

export function parseDateInput(dateValue: string, timeValue: string): DateInputParts | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue);

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const parts = {
    year: Number(dateMatch[1]),
    month: Number(dateMatch[2]),
    day: Number(dateMatch[3]),
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
  };

  // Round-trip through Date.UTC rejects impossible dates such as 2026-02-31.
  const calendarDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));

  if (
    calendarDate.getUTCFullYear() !== parts.year
    || calendarDate.getUTCMonth() !== parts.month - 1
    || calendarDate.getUTCDate() !== parts.day
    || parts.hour < 0
    || parts.hour > 23
    || parts.minute < 0
    || parts.minute > 59
  ) {
    return null;
  }

  return parts;
}

function capitalizeMonthPart(part: Intl.DateTimeFormatPart, locale: string) {
  if (part.type !== 'month' || !part.value) {
    return part.value;
  }

  const month = part.value.replace(/\.$/, '');

  return `${month.charAt(0).toLocaleUpperCase(locale)}${month.slice(1)}`;
}

export function formatDateButtonLabel(dateValue: string, language: AppLanguage) {
  const dateParts = parseDateInput(dateValue, '00:00');

  if (!dateParts) {
    return dateValue;
  }

  const locale = getIntlLocale(language);
  const formatter = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const parts = formatter.formatToParts(new Date(dateParts.year, dateParts.month - 1, dateParts.day, 12));
  const datePartIndexes = parts
    .map((part, index) => (
      part.type === 'day' || part.type === 'month' || part.type === 'year' ? index : -1
    ))
    .filter((index) => index >= 0);
  const firstDatePartIndex = datePartIndexes[0] ?? 0;
  const lastDatePartIndex = datePartIndexes.at(-1) ?? parts.length - 1;

  return parts
    .slice(firstDatePartIndex, lastDatePartIndex + 1)
    .map((part) => capitalizeMonthPart(part, locale))
    .join('')
    .trim();
}
