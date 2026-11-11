/**
 * The cities the site names in its own pages: the converter's examples and the time difference
 * pages. Each one is translated in `cityNames` of every language; `geonameId` is its id in the
 * city search data, so the widgets show it under its localized name too.
 */
import type { TranslationKeysUnder } from './i18n/dictionaries';

export type CityId = TranslationKeysUnder<'cityNames'>;

type City = {
  timezone: string;
  geonameId: string;
};

export const CITIES = {
  newYork: { timezone: 'America/New_York', geonameId: '5128581' },
  losAngeles: { timezone: 'America/Los_Angeles', geonameId: '5368361' },
  chicago: { timezone: 'America/Chicago', geonameId: '4887398' },
  denver: { timezone: 'America/Denver', geonameId: '5419384' },
  toronto: { timezone: 'America/Toronto', geonameId: '6167865' },
  vancouver: { timezone: 'America/Vancouver', geonameId: '6173331' },
  montreal: { timezone: 'America/Toronto', geonameId: '6077243' },
  london: { timezone: 'Europe/London', geonameId: '2643743' },
  paris: { timezone: 'Europe/Paris', geonameId: '2988507' },
  berlin: { timezone: 'Europe/Berlin', geonameId: '2950159' },
  madrid: { timezone: 'Europe/Madrid', geonameId: '3117735' },
  lisbon: { timezone: 'Europe/Lisbon', geonameId: '2267057' },
  amsterdam: { timezone: 'Europe/Amsterdam', geonameId: '2759794' },
  zurich: { timezone: 'Europe/Zurich', geonameId: '2657896' },
  moscow: { timezone: 'Europe/Moscow', geonameId: '524901' },
  tokyo: { timezone: 'Asia/Tokyo', geonameId: '1850147' },
  singapore: { timezone: 'Asia/Singapore', geonameId: '1880252' },
  hongKong: { timezone: 'Asia/Hong_Kong', geonameId: '1819729' },
  seoul: { timezone: 'Asia/Seoul', geonameId: '1835848' },
  mumbai: { timezone: 'Asia/Kolkata', geonameId: '1275339' },
  bangkok: { timezone: 'Asia/Bangkok', geonameId: '1609350' },
  dubai: { timezone: 'Asia/Dubai', geonameId: '292223' },
  istanbul: { timezone: 'Europe/Istanbul', geonameId: '745044' },
  cairo: { timezone: 'Africa/Cairo', geonameId: '360630' },
  johannesburg: { timezone: 'Africa/Johannesburg', geonameId: '993800' },
  riyadh: { timezone: 'Asia/Riyadh', geonameId: '108410' },
  doha: { timezone: 'Asia/Qatar', geonameId: '290030' },
  mexicoCity: { timezone: 'America/Mexico_City', geonameId: '3530597' },
  saoPaulo: { timezone: 'America/Sao_Paulo', geonameId: '3448439' },
  buenosAires: { timezone: 'America/Argentina/Buenos_Aires', geonameId: '3435910' },
  santiago: { timezone: 'America/Santiago', geonameId: '3871336' },
  bogota: { timezone: 'America/Bogota', geonameId: '3688689' },
  lima: { timezone: 'America/Lima', geonameId: '3936456' },
  sydney: { timezone: 'Australia/Sydney', geonameId: '2147714' },
  melbourne: { timezone: 'Australia/Melbourne', geonameId: '2158177' },
  auckland: { timezone: 'Pacific/Auckland', geonameId: '2193733' },
  honolulu: { timezone: 'Pacific/Honolulu', geonameId: '5856195' },
  suva: { timezone: 'Pacific/Fiji', geonameId: '2198148' },
  perth: { timezone: 'Australia/Perth', geonameId: '2063523' },
} as const satisfies Record<CityId, City>;

/** The city in URLs: "newYork" → "new-york". */
export function getCitySlug(id: CityId) {
  return id.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
