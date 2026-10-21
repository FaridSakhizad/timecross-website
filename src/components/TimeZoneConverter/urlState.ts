import type { FavoriteCity } from '../Cities/fixtures';

export function readConverterUrlState(search: string) {
  const params = new URLSearchParams(search);
  const city = params.get('city');
  const timezone = params.get('tz');
  let sourceCity: FavoriteCity | null = null;

  if (city && city.length <= 200 && timezone && timezone.length <= 100) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
      sourceCity = {
        id: 'converter-url-source',
        cityId: params.get('cityId')?.slice(0, 100) || undefined,
        city,
        timezone,
        order: 0,
        customName: '',
        utcOffset: '',
        timeOffset: '',
        time: '',
        period: 'day',
      };
    } catch {
      // Invalid shared links fall back to the usual local city.
    }
  }

  const date = params.get('date') ?? '';
  const time = params.get('time') ?? '';
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T12:00:00Z`)
    : null;
  const validDate = parsedDate && Number.isFinite(parsedDate.getTime())
    && parsedDate.toISOString().slice(0, 10) === date;

  return {
    sourceCity,
    date: validDate ? date : null,
    time: /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null,
  };
}

export function writeConverterUrlState(
  url: URL,
  sourceCity: FavoriteCity,
  date: string,
  time: string,
) {
  url.searchParams.set('city', sourceCity.city);
  url.searchParams.set('tz', sourceCity.timezone);
  if (sourceCity.cityId) {
    url.searchParams.set('cityId', sourceCity.cityId);
  } else {
    url.searchParams.delete('cityId');
  }
  url.searchParams.set('date', date);
  url.searchParams.set('time', time);
  return url;
}
