import type { StoredCity } from '../../settings';

/** The conversion in a shared link; null for what the link leaves out or gets wrong. */
export type ConverterUrlState = {
  sourceCity: StoredCity | null;
  date: string | null;
  time: string | null;
};

export function readConverterUrlState(search: string): ConverterUrlState {
  const params = new URLSearchParams(search);
  const city = params.get('city');
  const timezone = params.get('tz');
  let sourceCity: StoredCity | null = null;

  if (city && city.length <= 200 && timezone && timezone.length <= 100) {
    try {
      new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
      sourceCity = {
        id: 'converter-url-source',
        cityId: params.get('cityId')?.slice(0, 100) || undefined,
        city,
        timezone,
        customName: '',
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
  const validDate = parsedDate
    && Number.isFinite(parsedDate.getTime())
    && parsedDate.toISOString().slice(0, 10) === date;

  return {
    sourceCity,
    date: validDate ? date : null,
    time: /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null,
  };
}

/** Sets the conversion's parameters in `params`, keeping the others. */
export function writeConverterUrlState(
  params: URLSearchParams,
  sourceCity: StoredCity,
  date: string,
  time: string,
) {
  params.set('city', sourceCity.city);
  params.set('tz', sourceCity.timezone);

  if (sourceCity.cityId) {
    params.set('cityId', sourceCity.cityId);
  } else {
    params.delete('cityId');
  }

  params.set('date', date);
  params.set('time', time);
  return params;
}
