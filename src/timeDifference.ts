/**
 * The time difference pages: which city pairs have one, and the numbers they show. Plain data and
 * functions, used by the page, its SEO texts, the router and the sitemap
 * (tests/timeDifference.test.mjs).
 */
import { CITIES, getCitySlug, type CityId } from './cities.ts';
import { getTimeZoneOffsetMinutes, getUtcDateForZonedTime, getZonedDateParts } from './utils/time.ts';

/**
 * The pairs with a page, switched on and off with `enabled`. The order of the two cities is the
 * order in the URL and the texts; the reverse URL redirects to it.
 */
export const TIME_DIFFERENCE_PAIRS: readonly { cities: readonly [CityId, CityId]; enabled: boolean }[] = [
  { cities: ['madrid', 'mexicoCity'], enabled: true },
  { cities: ['madrid', 'buenosAires'], enabled: true },
  { cities: ['madrid', 'bogota'], enabled: true },
  { cities: ['lisbon', 'saoPaulo'], enabled: true },
  { cities: ['saoPaulo', 'newYork'], enabled: true },
  { cities: ['berlin', 'newYork'], enabled: true },
  { cities: ['berlin', 'bangkok'], enabled: true },
  { cities: ['paris', 'montreal'], enabled: true },
  { cities: ['moscow', 'newYork'], enabled: true },
  { cities: ['london', 'newYork'], enabled: true },
];

/** Hours of the working day, from 9:00 to 18:00 in both cities. */
export const WORKING_HOURS = { start: 9, end: 18 } as const;

export type CityPair = {
  /** "madrid-mexico-city" */
  slug: string;
  cities: readonly [CityId, CityId];
};

function getPairSlug([first, second]: readonly [CityId, CityId]) {
  return `${getCitySlug(first)}-${getCitySlug(second)}`;
}

export function getCityPairs(): CityPair[] {
  return TIME_DIFFERENCE_PAIRS
    .filter((pair) => pair.enabled)
    .map(({ cities }) => ({ slug: getPairSlug(cities), cities }));
}

/** The pair at a URL slug, or null. */
export function getCityPair(slug: string) {
  return getCityPairs().find((pair) => pair.slug === slug) ?? null;
}

/** The pair whose page is at the reverse slug ("mexico-city-madrid"), for a redirect. */
export function getReversedCityPair(slug: string) {
  return getCityPairs().find(({ cities: [first, second] }) => getPairSlug([second, first]) === slug) ?? null;
}

/** How many minutes the second city is ahead of the first one; negative when it is behind. */
export function getDifferenceMinutes([first, second]: readonly [CityId, CityId], date: Date) {
  return getTimeZoneOffsetMinutes(CITIES[second].timezone, date) - getTimeZoneOffsetMinutes(CITIES[first].timezone, date);
}

export type DifferencePeriod = {
  start: Date;
  /** The start of the next period, or the end of the year. */
  end: Date;
  minutes: number;
};

const HOUR_MS = 3_600_000;

/**
 * The moments of a year when a time zone changes its offset, to the hour: a month-by-month scan
 * (zones change at most twice a year, months apart), then a binary search inside the month.
 */
function getOffsetChanges(timezone: string, year: number) {
  const offsetAt = (time: number) => getTimeZoneOffsetMinutes(timezone, new Date(time));
  const changes: number[] = [];

  for (let month = 0; month < 12; month += 1) {
    let before = Date.UTC(year, month, 1);
    let after = Date.UTC(year, month + 1, 1);
    const offsetBefore = offsetAt(before);

    if (offsetAt(after) === offsetBefore) {
      continue;
    }

    while (after - before > HOUR_MS) {
      const middle = before + Math.floor((after - before) / 2 / HOUR_MS) * HOUR_MS;

      if (offsetAt(middle) === offsetBefore) {
        before = middle;
      } else {
        after = middle;
      }
    }

    changes.push(after);
  }

  return changes;
}

/**
 * The periods of a year with the same difference: one for a pair without daylight saving time,
 * three or more when the cities switch their clocks on different dates, or only one of them does.
 */
export function getDifferencePeriods(cities: readonly [CityId, CityId], year: number): DifferencePeriod[] {
  const yearStart = Date.UTC(year, 0, 1);
  const yearEnd = Date.UTC(year + 1, 0, 1);
  const changes = [...new Set(cities.flatMap((cityId) => getOffsetChanges(CITIES[cityId].timezone, year)))]
    .sort((left, right) => left - right);
  const starts = [yearStart, ...changes]
    .map((start) => ({ start, minutes: getDifferenceMinutes(cities, new Date(start)) }))
    // Both cities switching their clocks at the same moment changes nothing.
    .filter((period, index, all) => period.minutes !== all[index - 1]?.minutes);

  return starts.map(({ start, minutes }, index) => ({
    start: new Date(start),
    end: new Date(starts[index + 1]?.start ?? yearEnd),
    minutes,
  }));
}

/** The given hour today in the city. */
export function getHourToday(cityId: CityId, baseDate: Date, hour: number) {
  const { timezone } = CITIES[cityId];

  return getUtcDateForZonedTime(timezone, {
    ...getZonedDateParts(timezone, baseDate),
    hour,
    minute: 0,
    second: 0,
  });
}

const STEP_MINUTES = 30;

function isWorkingTime(cityId: CityId, date: Date) {
  const { hour, minute } = getZonedDateParts(CITIES[cityId].timezone, date);
  const minutes = hour * 60 + minute;

  return minutes >= WORKING_HOURS.start * 60 && minutes < WORKING_HOURS.end * 60;
}

/**
 * The time today when both cities are in their working hours, or null when the working days do
 * not meet. Found in half-hour steps through the first city's working day.
 */
export function getWorkingOverlap([first, second]: readonly [CityId, CityId], baseDate: Date) {
  const dayStart = getHourToday(first, baseDate, WORKING_HOURS.start).getTime();
  const dayEnd = getHourToday(first, baseDate, WORKING_HOURS.end).getTime();
  let start: number | null = null;
  let end: number | null = null;

  for (let time = dayStart; time < dayEnd; time += STEP_MINUTES * 60_000) {
    if (isWorkingTime(second, new Date(time))) {
      start ??= time;
      end = time + STEP_MINUTES * 60_000;
    } else if (start !== null) {
      break;
    }
  }

  return start === null || end === null
    ? null
    : { start: new Date(start), end: new Date(end), minutes: (end - start) / 60_000 };
}
