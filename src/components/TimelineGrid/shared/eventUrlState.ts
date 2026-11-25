import type { StoredCity } from '../../../settings';
import { getAbstractTimezoneOffsetMinutes } from '../../../utils/abstractTimezone.ts';

import { TIMELINE_EXTRA_DAY_HOURS, TIMELINE_RENDERED_HOURS } from './constants.ts';
import { GRID_HOUR_MS, GRID_SLOT_MS, getGridSlotRanges, type SelectedGridSlot } from './gridSelection.ts';

const MAX_CITIES = 100;
const MAX_PARAMS_LENGTH = 100000;

/** Longest meeting title a link can carry. */
export const MAX_EVENT_TITLE_LENGTH = 100;
const MIN_DATE = Date.UTC(1900, 0, 1);
const MAX_DATE = Date.UTC(2100, 0, 1);

export type SharedGridEvent = {
  start: number;
  end: number;
  cities: StoredCity[];
  hours: SelectedGridSlot[];
  /** The meeting's name from the link; empty when it has none. */
  title: string;
};

/**
 * The "event" URL parameter: version, start and end in Unix seconds, cities and an optional title.
 * Links put it in the query, so the server can describe the meeting in link previews; older links
 * have it in the hash.
 */
type EventUrlData = {
  v: 1;
  s: number;
  e: number;
  c: unknown[];
  t?: unknown;
};

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isEventUrlData(value: unknown): value is EventUrlData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const data = value as Partial<Record<keyof EventUrlData, unknown>>;

  return (
    data.v === 1
    && Number.isInteger(data.s)
    && Number.isInteger(data.e)
    && isUnknownArray(data.c)
  );
}

function validTimezone(timezone: string) {
  if (timezone.startsWith('GMT_OFFSET:')) {
    if (!/^GMT_OFFSET:-?\d+$/.test(timezone)) {
      return false;
    }

    const minutes = getAbstractTimezoneOffsetMinutes(timezone);

    return minutes !== null && Number.isInteger(minutes) && Math.abs(minutes) <= 14 * 60;
  }

  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

/** A title as a link carries it: one line, without control characters, at most 100 characters. */
export function normalizeEventTitle(title: string) {
  return title.replace(/[\p{Cc}\p{Cf}\s]+/gu, ' ').trim().slice(0, MAX_EVENT_TITLE_LENGTH).trim();
}

/** The event in a URL's query ("?event=…") or hash ("#event=…"), or null. */
export function readGridEventUrlState(params: string): SharedGridEvent | null {
  if (params.length > MAX_PARAMS_LENGTH) {
    return null;
  }

  const raw = new URLSearchParams(params.replace(/^[?#]/, '')).get('event');

  if (!raw) {
    return null;
  }

  try {
    const data: unknown = JSON.parse(raw);

    if (!isEventUrlData(data)) {
      return null;
    }

    const start = data.s * 1000;
    const end = data.e * 1000;

    if (
      start < MIN_DATE
      || end > MAX_DATE
      || start % GRID_SLOT_MS !== 0
      || end % GRID_SLOT_MS !== 0
      || end <= start
      || getCoveredHours({ start, end }).count > TIMELINE_RENDERED_HOURS
    ) {
      return null;
    }

    if (!data.c.length || data.c.length > MAX_CITIES) {
      return null;
    }

    if (data.t !== undefined && (typeof data.t !== 'string' || data.t !== normalizeEventTitle(data.t))) {
      return null;
    }

    const cities: StoredCity[] = [];

    for (const [index, entry] of data.c.entries()) {
      if (!isUnknownArray(entry) || entry.length < 2 || entry.length > 4) {
        return null;
      }

      const [city, timezone, cityId = '', customName = ''] = entry;

      if (
        typeof city !== 'string'
        || !city.trim()
        || city.length > 200
        || typeof timezone !== 'string'
        || !timezone
        || timezone.length > 100
        || !validTimezone(timezone)
        || typeof cityId !== 'string'
        || cityId.length > 100
        || typeof customName !== 'string'
        || customName.length > 200
      ) {
        return null;
      }

      cities.push({
        id: `shared-${index}`,
        city,
        timezone,
        cityId: cityId || undefined,
        customName,
      });
    }

    const hours = cities.flatMap((city) => Array.from({ length: (end - start) / GRID_SLOT_MS }, (_, index) => (
      { rowId: city.id, start: start + index * GRID_SLOT_MS }
    )));

    return { start, end, cities, hours, title: data.t ?? '' };
  } catch {
    return null;
  }
}

/**
 * Where a page's event is: "?event=…" from the query, or the hash of older links. Only this
 * parameter, as the planner rewrites the rest of the query while it is used.
 */
export function getEventParams(search: string, hash: string) {
  const event = new URLSearchParams(search).get('event');

  return event === null ? hash : `?${new URLSearchParams({ event }).toString()}`;
}

/** A link to the selected meeting, or null when the selection is not one range in every row. */
export function buildGridEventUrl(
  baseUrl: string,
  cities: StoredCity[],
  hours: SelectedGridSlot[],
  title = '',
): string | null {
  const ranges = getGridSlotRanges(hours);
  const first = ranges[0];

  if (!first || ranges.some((range) => range.start !== first.start || range.end !== first.end)) {
    return null;
  }

  const selectedIds = new Set(ranges.map((range) => range.rowId));
  const selectedCities = cities.filter((city) => selectedIds.has(city.id));

  if (selectedCities.length !== selectedIds.size) {
    return null;
  }

  const normalizedTitle = normalizeEventTitle(title);
  const data = {
    v: 1,
    s: first.start / 1000,
    e: first.end / 1000,
    ...(normalizedTitle ? { t: normalizedTitle } : {}),
    c: selectedCities.map((city) => {
      const entry = [city.city, city.timezone];

      if (city.cityId || city.customName) {
        entry.push(city.cityId ?? '');
      }

      if (city.customName) {
        entry.push(city.customName);
      }

      return entry;
    }),
  };
  const url = new URL(baseUrl);

  url.search = new URLSearchParams({ event: JSON.stringify(data) }).toString();
  url.hash = '';
  return readGridEventUrlState(url.search) ? url.href : null;
}

/** The whole hours a meeting touches: 13:30–15:30 touches the cells of 13, 14 and 15. */
function getCoveredHours({ start, end }: Pick<SharedGridEvent, 'start' | 'end'>) {
  const first = Math.floor(start / GRID_HOUR_MS) * GRID_HOUR_MS;

  return { first, count: (Math.ceil(end / GRID_HOUR_MS) * GRID_HOUR_MS - first) / GRID_HOUR_MS };
}

export function getSharedGridTimelineDates(event: Pick<SharedGridEvent, 'start' | 'end'>): Date[] {
  const { first, count: hours } = getCoveredHours(event);
  const remaining = TIMELINE_RENDERED_HOURS - hours;
  const before = Math.min(TIMELINE_EXTRA_DAY_HOURS, Math.floor(remaining / 2));
  const after = Math.min(TIMELINE_EXTRA_DAY_HOURS, remaining - before);
  // Reduce context around long events instead of growing beyond the ordinary grid's capacity.
  const start = first - before * GRID_HOUR_MS;
  const count = hours + before + after;

  return Array.from({ length: count }, (_, index) => new Date(start + index * GRID_HOUR_MS));
}
