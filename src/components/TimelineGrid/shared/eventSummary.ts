/**
 * A shared meeting in words: its date and, for each city, its start and end there. Used by the
 * card above the planner and by the link preview the server renders, so both say the same.
 */
import type { TranslationKey, TranslationValues } from '../../../i18n/dictionaries.ts';
import type { TimeFormat } from '../../../settings';
import { formatInTimezone } from '../../../utils/abstractTimezone.ts';
import { formatClockTime, getZonedDateParts } from '../../../utils/time.ts';

import type { SharedGridEvent } from './eventUrlState.ts';

export type EventSummaryRow = {
  name: string;
  timezone: string;
  /** "16:00 – 18:00" */
  time: string;
  /** "Thu" when the meeting is on another day there than in the reference time zone. */
  otherDay: string | null;
};

type SummaryOptions = {
  locale: string;
  timeFormat: TimeFormat;
  /** Whose date the summary is in: the visitor's time zone, or the first city's. */
  referenceTimezone: string;
};

/**
 * How long a meeting is, short, in the language's own words: "7h 30m", "7 ч 30 мин", "2 Std.".
 * The words come from the translations, so each language picks its own abbreviations.
 */
export function formatEventDuration(minutes: number, t: (key: TranslationKey, values?: TranslationValues) => string) {
  const total = Math.round(Math.abs(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;

  if (!rest) {
    return t('common.durationHours', { hours });
  }

  return hours
    ? t('common.durationHoursMinutes', { hours, minutes: rest })
    : t('common.durationMinutes', { minutes: rest });
}

function getDayKey(time: number, timezone: string) {
  const { year, month, day } = getZonedDateParts(timezone, new Date(time));

  return `${year}-${month}-${day}`;
}

/**
 * The meeting's date in the language, on its day in the reference time zone: "Wed, Nov 18" in the
 * planner, where room is short; "Wed, November 18" (`month: 'long'`) in a link preview.
 */
export function formatEventDate(
  { start }: Pick<SharedGridEvent, 'start'>,
  { locale, referenceTimezone }: SummaryOptions,
  month: 'short' | 'long' = 'short',
) {
  return formatInTimezone(new Date(start), referenceTimezone, locale, { weekday: 'short', day: 'numeric', month });
}

/**
 * A meeting as plain text, for the clipboard: its title, the line with its date, hours and length
 * in the reference time zone, then its hours in every city, and its link when there is one.
 *
 *   Weekly sync
 *
 *   Sun, Nov 22 · 20:00 – 03:30 · 7h 30m
 *
 *   New York 22:00 – 05:30 (Sun)
 */
export function formatEventText(
  event: Pick<SharedGridEvent, 'start' | 'end'>,
  title: string,
  cities: { name: string; timezone: string }[],
  options: SummaryOptions,
  t: (key: TranslationKey, values?: TranslationValues) => string,
  url?: string | null,
) {
  const rows = cities.map((city) => getEventSummaryRow(event, city.name, city.timezone, options));

  return [
    title,
    '',
    [
      formatEventDate(event, options),
      getEventSummaryRow(event, '', options.referenceTimezone, options).time,
      formatEventDuration((event.end - event.start) / 60_000, t),
    ].join(' · '),
    '',
    ...rows.map((row) => `${row.name} ${row.time}${row.otherDay ? ` (${row.otherDay})` : ''}`),
    ...(url ? ['', url] : []),
  ].join('\n');
}

/** Start and end of the meeting in a time zone: "16:00 – 18:00", and the weekday when it is another day. */
export function getEventSummaryRow(
  event: Pick<SharedGridEvent, 'start' | 'end'>,
  name: string,
  timezone: string,
  { locale, timeFormat, referenceTimezone }: SummaryOptions,
): EventSummaryRow {
  const isOtherDay = getDayKey(event.start, timezone) !== getDayKey(event.start, referenceTimezone);

  return {
    name,
    timezone,
    time: `${formatClockTime(new Date(event.start), timezone, timeFormat)} – ${formatClockTime(new Date(event.end), timezone, timeFormat)}`,
    otherDay: isOtherDay ? formatInTimezone(new Date(event.start), timezone, locale, { weekday: 'short' }) : null,
  };
}
