import type { FavoriteCity } from '../Cities/fixtures';

export function readPlannerUrlState(search: string) {
  const params = new URLSearchParams(search);
  const value = params.get('at');
  const date = value && /^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/.test(value)
    ? new Date(value) : null;
  const at = date && Number.isFinite(date.getTime()) && date.toISOString() === value ? date : null;
  let cities: FavoriteCity[] | null = null;
  try {
    const items: unknown = JSON.parse(params.get('cities') ?? 'null');
    if (Array.isArray(items) && items.length <= 100) {
      cities = items.map((item: unknown, order) => {
        if (!Array.isArray(item) || (item.length !== 3 && item.length !== 4)
          || !item.every((part) => typeof part === 'string' && part.length <= 200)) {
          throw new Error('Invalid city');
        }
        const [cityId, city, timezone, customName = ''] = item as string[];
        if (!city || !timezone) throw new Error('Missing city');
        new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
        return {
          id: `planner-url-${order}`, cityId, city, timezone, order,
          customName, utcOffset: '', timeOffset: '', time: '', period: 'day' as const,
        };
      });
    }
  } catch {
    // Malformed shared settings must not prevent the planner from loading.
  }
  return { at, cities };
}

export function writePlannerUrlState(params: URLSearchParams, cities: FavoriteCity[], at: Date | null) {
  params.set('cities', JSON.stringify(cities.map((city) => {
    const value = [city.cityId || city.id, city.city, city.timezone];
    if (city.customName) value.push(city.customName);
    return value;
  })));
  if (at) params.set('at', at.toISOString());
  else params.delete('at');
  return params;
}
