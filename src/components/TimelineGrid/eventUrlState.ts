import type { FavoriteCity } from '../Cities/fixtures';
import { GRID_HOUR_MS, getGridHourRanges, type SelectedGridHour } from './desktop/gridSelection.ts';
import { getAbstractTimezoneOffsetMinutes } from '../../utils/abstractTimezone.ts';
import { TIMELINE_EXTRA_DAY_HOURS, TIMELINE_RENDERED_HOURS } from '../Timelines/constants.ts';

const MAX_CITIES = 100;
const MAX_HASH_LENGTH = 100000;
const MIN_DATE = Date.UTC(1900, 0, 1);
const MAX_DATE = Date.UTC(2100, 0, 1);

export type SharedGridEvent = {
  start: number;
  end: number;
  cities: FavoriteCity[];
  hours: SelectedGridHour[];
};

function validTimezone(timezone: string) {
  if (timezone.startsWith('GMT_OFFSET:')) {
    if (!/^GMT_OFFSET:-?\d+$/.test(timezone)) return false;
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

export function readGridEventUrlState(hash: string): SharedGridEvent | null {
  if (hash.length > MAX_HASH_LENGTH) return null;
  const raw = new URLSearchParams(hash.replace(/^#/, '')).get('event');
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || data.v !== 1 || !Number.isInteger(data.s) || !Number.isInteger(data.e)) return null;
    const start = data.s * 1000;
    const end = data.e * 1000;
    if (start < MIN_DATE || end > MAX_DATE || start % GRID_HOUR_MS !== 0 || end % GRID_HOUR_MS !== 0
      || end <= start || end - start > TIMELINE_RENDERED_HOURS * GRID_HOUR_MS) return null;
    if (!Array.isArray(data.c) || !data.c.length || data.c.length > MAX_CITIES) return null;
    const cities: FavoriteCity[] = [];
    for (const [index, entry] of data.c.entries()) {
      if (!Array.isArray(entry) || entry.length < 2 || entry.length > 4) return null;
      const [city, timezone, cityId = '', customName = ''] = entry;
      if (typeof city !== 'string' || !city.trim() || city.length > 200
        || typeof timezone !== 'string' || !timezone || timezone.length > 100 || !validTimezone(timezone)
        || typeof cityId !== 'string' || cityId.length > 100
        || typeof customName !== 'string' || customName.length > 200) return null;
      cities.push({ id: `shared-${index}`, city, timezone, cityId: cityId || undefined, customName,
        order: index, utcOffset: '', timeOffset: '', time: '', period: 'day' });
    }
    const hours = cities.flatMap((city) => Array.from({ length: (end - start) / GRID_HOUR_MS }, (_, index) => (
      { rowId: city.id, start: start + index * GRID_HOUR_MS }
    )));
    return { start, end, cities, hours };
  } catch {
    return null;
  }
}

export function buildGridEventUrl(baseUrl: string, cities: FavoriteCity[], hours: SelectedGridHour[]): string | null {
  const ranges = getGridHourRanges(hours);
  const first = ranges[0];
  if (!first || ranges.some((range) => range.start !== first.start || range.end !== first.end)) return null;
  const selectedIds = new Set(ranges.map((range) => range.rowId));
  const selectedCities = cities.filter((city) => selectedIds.has(city.id));
  if (selectedCities.length !== selectedIds.size) return null;
  const data = { v: 1, s: first.start / 1000, e: first.end / 1000,
    c: selectedCities.map((city) => {
      const entry = [city.city, city.timezone];
      if (city.cityId || city.customName) entry.push(city.cityId ?? '');
      if (city.customName) entry.push(city.customName);
      return entry;
    }) };
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = new URLSearchParams({ event: JSON.stringify(data) }).toString();
  return readGridEventUrlState(url.hash) ? url.href : null;
}

export function getSharedGridTimelineDates(event: Pick<SharedGridEvent, 'start' | 'end'>): Date[] {
  const hours = (event.end - event.start) / GRID_HOUR_MS;
  const remaining = TIMELINE_RENDERED_HOURS - hours;
  const before = Math.min(TIMELINE_EXTRA_DAY_HOURS, Math.floor(remaining / 2));
  const after = Math.min(TIMELINE_EXTRA_DAY_HOURS, remaining - before);
  // Reduce context around long events instead of growing beyond the ordinary grid's capacity.
  const start = event.start - before * GRID_HOUR_MS;
  const count = hours + before + after;
  return Array.from({ length: count }, (_, index) => new Date(start + index * GRID_HOUR_MS));
}
