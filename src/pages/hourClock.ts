/**
 * The 24-hour clock page: the hours of the table and the parsing of the converter input. Plain
 * functions without React, tested in tests/hourClock.test.mjs.
 */

export const HOURS = [
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
] as const;

/** An hour of the day; `hourClock.spoken.{hour}` says it in words. */
export type Hour = (typeof HOURS)[number];

export type ClockTime = {
  hour: Hour;
  minute: number;
};

/** The time the converter starts with: the most searched hour in Search Console. */
export const INITIAL_CLOCK_INPUT = '16:00';

const pad2 = (value: number) => String(value).padStart(2, '0');

function isHour(value: number): value is Hour {
  return Number.isInteger(value) && value >= 0 && value <= 23;
}

/** "16:00", "09:30". */
export function format24h({ hour, minute }: ClockTime) {
  return `${pad2(hour)}:${pad2(minute)}`;
}

/** "4:00" and whether it is AM or PM; the page adds the language's AM/PM marker. */
export function get12hParts({ hour, minute }: ClockTime) {
  return {
    time: `${hour % 12 || 12}:${pad2(minute)}`,
    period: hour < 12 ? 'am' : 'pm',
  } as const;
}

// AM/PM as written in our languages: "pm", "p. m.", "p.m.", "пп"; "a"/"p" as a shortcut.
const AM_MARKERS = new Set(['a', 'am', 'дп']);
const PM_MARKERS = new Set(['p', 'pm', 'пп']);
// Words for "hours" after a 24-hour time: "16 h", "16 Uhr", "16 ч".
const HOUR_WORDS = new Set(['h', 'uhr', 'ч', 'год']);

/**
 * A time typed in either format: "16", "16:30", "1630", "16 h", "4 pm", "4:30 p. m.", "12am".
 * Null for anything else, "13 pm" and "16:75" included.
 */
export function parseClockInput(input: string): ClockTime | null {
  const match = /^(\d{1,2})(?:[:.h]?(\d{2}))?([^\d]*)$/u.exec(input.trim().toLowerCase());

  if (!match) {
    return null;
  }

  const [, hourText = '', minuteText = '00', markerText = ''] = match;
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const marker = markerText.replace(/[\s.]/gu, '');

  if (minute > 59) {
    return null;
  }

  if (!marker || HOUR_WORDS.has(marker)) {
    // 24:00 is midnight at the end of the day, the same clock time as 00:00.
    const normalizedHour = hour === 24 && minute === 0 ? 0 : hour;

    return isHour(normalizedHour) ? { hour: normalizedHour, minute } : null;
  }

  const isAm = AM_MARKERS.has(marker);

  if ((!isAm && !PM_MARKERS.has(marker)) || hour < 1 || hour > 12) {
    return null;
  }

  const hour24 = (hour % 12) + (isAm ? 0 : 12);

  return isHour(hour24) ? { hour: hour24, minute } : null;
}
