import { CITIES, getCityIdByGeonameId, type CityId } from '../../../cities.ts';
import type { AppLanguage, StoredCity } from '../../../settings';
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
 * A meeting in a URL comes in two forms.
 *
 * The compact one, which links are made with: "/m?e=<start>.<length>&t=<title>&l=<language>&c=<cities>".
 * Start and length count half-hour slots (start from the Unix epoch), in base 36. Cities are
 * separated by "," and their fields by "~": one of our cities is its key, with an optional custom
 * name ("london~Office"); any other is "<timezone>~<name>~<cityId>~<custom name>", with the
 * empty fields at the end left out. A key is never a timezone, so the first field tells them apart.
 * The language is the author's: the link's preview speaks it, while the page that opens is in the
 * visitor's own language.
 *
 * The older "event" parameter: JSON with version, start and end in Unix seconds, cities and an
 * optional title. Earlier links have it in the query, the earliest ones in the hash.
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

type SharedCityEntry = {
  city: string;
  timezone: string;
  cityId: string;
  customName: string;
};

/** The meeting the URL describes, after the checks both forms share; null when one fails. */
function toSharedEvent(start: number, end: number, title: string, entries: SharedCityEntry[]): SharedGridEvent | null {
  if (
    !Number.isInteger(start)
    || !Number.isInteger(end)
    || start < MIN_DATE
    || end > MAX_DATE
    || start % GRID_SLOT_MS !== 0
    || end % GRID_SLOT_MS !== 0
    || end <= start
    || getCoveredHours({ start, end }).count > TIMELINE_RENDERED_HOURS
  ) {
    return null;
  }

  if (!entries.length || entries.length > MAX_CITIES || title !== normalizeEventTitle(title)) {
    return null;
  }

  const isValidEntry = ({ city, timezone, cityId, customName }: SharedCityEntry) => (
    city.trim() !== ''
    && city.length <= 200
    && timezone !== ''
    && timezone.length <= 100
    && validTimezone(timezone)
    && cityId.length <= 100
    && customName.length <= 200
  );

  if (!entries.every(isValidEntry)) {
    return null;
  }

  const cities: StoredCity[] = entries.map((entry, index) => ({
    id: `shared-${index}`,
    city: entry.city,
    timezone: entry.timezone,
    cityId: entry.cityId || undefined,
    customName: entry.customName,
  }));
  const slotCount = (end - start) / GRID_SLOT_MS;
  const hours = cities.flatMap((city) => Array.from({ length: slotCount }, (_, index) => (
    { rowId: city.id, start: start + index * GRID_SLOT_MS }
  )));

  return { start, end, cities, hours, title };
}

/** A parameter as it is written in the URL, still percent-encoded; null when it is missing. */
function getRawParam(params: string, name: string) {
  const prefix = `${name}=`;
  const pair = params.replace(/^[?#]/, '').split('&').find((part) => part.startsWith(prefix));

  return pair === undefined ? null : pair.slice(prefix.length);
}

/**
 * A value as the compact form writes it: percent-encoded, spaces as "+", with "/" and ":" kept
 * (timezones read as they are). The separators "," and "~" are always encoded, and so are the
 * characters that apps cut off the end of a link they find in a message.
 */
function encodeCompactValue(value: string) {
  return encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/%2F/g, '/')
    .replace(/%3A/g, ':')
    .replace(/[!'()*.~]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function decodeCompactValue(value: string) {
  return decodeURIComponent(value.replace(/\+/g, ' '));
}

function isOurCityId(value: string): value is CityId {
  return Object.hasOwn(CITIES, value);
}

/** "london" → "London": the name a city of ours has until its translated name is loaded. */
function getCityFallbackName(id: CityId) {
  return id
    .replace(/[A-Z]/g, (letter) => ` ${letter}`)
    .replace(/^./, (letter) => letter.toUpperCase());
}

function readCompactCity(value: string): SharedCityEntry | null {
  const fields = value.split('~').map(decodeCompactValue);
  const [first = '', ...rest] = fields;

  if (isOurCityId(first)) {
    const [customName = '', ...extra] = rest;
    const { timezone, geonameId } = CITIES[first];

    return extra.length ? null : { city: getCityFallbackName(first), timezone, cityId: geonameId, customName };
  }

  const [city = '', cityId = '', customName = '', ...extra] = rest;

  // Ids are numbers: positive in the city data, negative for fixed offsets and timezone rows.
  if (extra.length || (cityId && !/^-?\d+$/.test(cityId))) {
    return null;
  }

  return { city, timezone: first, cityId, customName };
}

function writeCompactCity(city: StoredCity) {
  const ourCityId = getCityIdByGeonameId(city.cityId);
  const fields = ourCityId && CITIES[ourCityId].timezone === city.timezone
    ? [ourCityId, city.customName]
    : [city.timezone, city.city, city.cityId ?? '', city.customName];

  while (fields.length > 1 && !fields[fields.length - 1]) {
    fields.pop();
  }

  return fields.map(encodeCompactValue).join('~');
}

function readCompactEvent(params: string): SharedGridEvent | null {
  const when = getRawParam(params, 'e');
  const cities = getRawParam(params, 'c');
  const [, startSlot, slotCount] = when?.match(/^([0-9a-z]{1,8})\.([0-9a-z]{1,4})$/) ?? [];

  if (!startSlot || !slotCount || !cities) {
    return null;
  }

  const start = parseInt(startSlot, 36) * GRID_SLOT_MS;
  const end = start + parseInt(slotCount, 36) * GRID_SLOT_MS;
  const title = decodeCompactValue(getRawParam(params, 't') ?? '');
  const entries = cities.split(',').slice(0, MAX_CITIES + 1).map(readCompactCity);

  return entries.every((entry) => entry !== null) ? toSharedEvent(start, end, title, entries) : null;
}

function readJsonEvent(params: string): SharedGridEvent | null {
  const raw = new URLSearchParams(params.replace(/^[?#]/, '')).get('event');

  if (!raw) {
    return null;
  }

  const data: unknown = JSON.parse(raw);

  if (!isEventUrlData(data) || (data.t !== undefined && typeof data.t !== 'string')) {
    return null;
  }

  const entries: SharedCityEntry[] = [];

  for (const entry of data.c) {
    if (!isUnknownArray(entry) || entry.length < 2 || entry.length > 4) {
      return null;
    }

    const [city, timezone, cityId = '', customName = ''] = entry;

    if (typeof city !== 'string' || typeof timezone !== 'string' || typeof cityId !== 'string' || typeof customName !== 'string') {
      return null;
    }

    entries.push({ city, timezone, cityId, customName });
  }

  return toSharedEvent(data.s * 1000, data.e * 1000, data.t ?? '', entries);
}

/** The event in a URL's query ("?e=…" or "?event=…") or hash ("#event=…"), or null. */
export function readGridEventUrlState(params: string): SharedGridEvent | null {
  if (params.length > MAX_PARAMS_LENGTH) {
    return null;
  }

  try {
    return getRawParam(params, 'e') === null ? readJsonEvent(params) : readCompactEvent(params);
  } catch {
    // A broken percent-encoding or JSON.
    return null;
  }
}

/**
 * Where a page's event is: its parameters from the query, or the hash of older links. Only these,
 * as the planner rewrites the rest of the query while it is used.
 */
export function getEventParams(search: string, hash: string) {
  const when = getRawParam(search, 'e');

  if (when !== null) {
    return `?${(['e', 't', 'l', 'c'] as const)
      .map((name) => [name, getRawParam(search, name)])
      .filter(([, value]) => value !== null)
      .map(([name, value]) => `${name}=${value}`)
      .join('&')}`;
  }

  const event = new URLSearchParams(search).get('event');

  return event === null ? hash : `?${new URLSearchParams({ event }).toString()}`;
}

/** The language of the link's author ("?l=…"), as written: the caller checks that it is one of ours. */
export function getEventLinkLanguage(params: string) {
  return getRawParam(params, 'l');
}

/** A link to the selected meeting, or null when the selection is not one range in every row. */
export function buildGridEventUrl(
  baseUrl: string,
  cities: StoredCity[],
  hours: SelectedGridSlot[],
  title = '',
  language?: AppLanguage,
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
  const when = `${(first.start / GRID_SLOT_MS).toString(36)}.${((first.end - first.start) / GRID_SLOT_MS).toString(36)}`;
  const params = [
    `e=${when}`,
    ...(normalizedTitle ? [`t=${encodeCompactValue(normalizedTitle)}`] : []),
    ...(language ? [`l=${language}`] : []),
    `c=${selectedCities.map(writeCompactCity).join(',')}`,
  ].join('&');
  const url = new URL(baseUrl);

  url.search = `?${params}`;
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
