/**
 * The "business hours" examples on the converter page: what 9:00, 12:00… in one city is in
 * others. Every city and hour is listed here and switched on or off with `enabled`, so the block
 * grows or shrinks by editing this config, not the page. The cities' time zones are in cities.ts.
 */
import { CITIES, type CityId } from '../cities';
import type { TranslationKeysUnder } from '../i18n/dictionaries';
import { getUtcDateForZonedTime, getZonedDateParts } from '../utils/time';

/** A region with a heading in `timeZoneConverter.exampleGroups`. */
export type ExampleRegionId = TranslationKeysUnder<'timeZoneConverter.exampleGroups'>;

type ExampleCityConfig = {
  id: CityId;
  enabled: boolean;
  /** The cities the hours are converted to, most relevant first. They may be switched off. */
  targets: readonly CityId[];
};

export type ExamplesConfig = {
  /** How many of a city's targets are shown. */
  targetsPerCity: number;
  hours: readonly { hour: number; enabled: boolean }[];
  regions: readonly { id: ExampleRegionId; cities: readonly ExampleCityConfig[] }[];
};

export const CONVERTER_EXAMPLES: ExamplesConfig = {
  targetsPerCity: 4,
  hours: [
    { hour: 9, enabled: true },
    { hour: 10, enabled: false },
    { hour: 11, enabled: false },
    { hour: 12, enabled: true },
    { hour: 13, enabled: false },
    { hour: 14, enabled: false },
    { hour: 15, enabled: true },
    { hour: 16, enabled: false },
    { hour: 17, enabled: false },
    { hour: 18, enabled: true },
  ],
  regions: [
    {
      id: 'northAmerica',
      cities: [
        { id: 'newYork', enabled: true, targets: ['losAngeles', 'london', 'paris', 'dubai', 'tokyo'] },
        { id: 'losAngeles', enabled: false, targets: ['newYork', 'chicago', 'london', 'singapore', 'sydney'] },
        { id: 'chicago', enabled: false, targets: ['newYork', 'denver', 'losAngeles', 'london', 'tokyo'] },
        { id: 'denver', enabled: false, targets: ['chicago', 'losAngeles', 'newYork', 'paris', 'dubai'] },
        { id: 'toronto', enabled: false, targets: ['vancouver', 'newYork', 'london', 'dubai', 'tokyo'] },
        { id: 'vancouver', enabled: false, targets: ['toronto', 'losAngeles', 'tokyo', 'sydney', 'london'] },
      ],
    },
    {
      id: 'europe',
      cities: [
        { id: 'london', enabled: true, targets: ['newYork', 'paris', 'dubai', 'tokyo', 'sydney'] },
        { id: 'paris', enabled: false, targets: ['london', 'newYork', 'dubai', 'singapore', 'losAngeles'] },
        { id: 'berlin', enabled: true, targets: ['london', 'paris', 'newYork', 'singapore', 'tokyo'] },
        { id: 'madrid', enabled: false, targets: ['london', 'paris', 'buenosAires', 'newYork', 'tokyo'] },
        { id: 'amsterdam', enabled: false, targets: ['london', 'newYork', 'dubai', 'sydney', 'singapore'] },
        { id: 'zurich', enabled: false, targets: ['london', 'paris', 'singapore', 'losAngeles', 'tokyo'] },
      ],
    },
    {
      id: 'asia',
      cities: [
        { id: 'tokyo', enabled: true, targets: ['singapore', 'seoul', 'london', 'losAngeles', 'newYork'] },
        { id: 'singapore', enabled: true, targets: ['tokyo', 'hongKong', 'dubai', 'london', 'newYork'] },
        { id: 'hongKong', enabled: false, targets: ['singapore', 'tokyo', 'london', 'sydney', 'vancouver'] },
        { id: 'seoul', enabled: false, targets: ['tokyo', 'singapore', 'paris', 'newYork', 'losAngeles'] },
        { id: 'mumbai', enabled: false, targets: ['dubai', 'singapore', 'london', 'berlin', 'newYork'] },
        { id: 'bangkok', enabled: false, targets: ['singapore', 'hongKong', 'dubai', 'berlin', 'sydney'] },
      ],
    },
    {
      id: 'middleEastAfrica',
      cities: [
        { id: 'dubai', enabled: true, targets: ['london', 'mumbai', 'singapore', 'losAngeles', 'sydney'] },
        { id: 'istanbul', enabled: false, targets: ['london', 'berlin', 'dubai', 'newYork', 'tokyo'] },
        { id: 'cairo', enabled: false, targets: ['paris', 'istanbul', 'riyadh', 'toronto', 'mumbai'] },
        { id: 'johannesburg', enabled: false, targets: ['london', 'dubai', 'sydney', 'singapore', 'newYork'] },
        { id: 'riyadh', enabled: false, targets: ['dubai', 'doha', 'mumbai', 'london', 'newYork'] },
        { id: 'doha', enabled: false, targets: ['dubai', 'riyadh', 'london', 'singapore', 'toronto'] },
      ],
    },
    {
      id: 'latinAmerica',
      cities: [
        { id: 'mexicoCity', enabled: false, targets: ['newYork', 'losAngeles', 'chicago', 'madrid', 'tokyo'] },
        { id: 'saoPaulo', enabled: true, targets: ['london', 'newYork', 'paris', 'mexicoCity', 'tokyo'] },
        { id: 'buenosAires', enabled: false, targets: ['madrid', 'saoPaulo', 'newYork', 'paris', 'london'] },
        { id: 'santiago', enabled: false, targets: ['newYork', 'lima', 'bogota', 'london', 'sydney'] },
        { id: 'bogota', enabled: false, targets: ['mexicoCity', 'newYork', 'lima', 'madrid', 'losAngeles'] },
        { id: 'lima', enabled: false, targets: ['bogota', 'santiago', 'mexicoCity', 'losAngeles', 'madrid'] },
      ],
    },
    {
      id: 'oceania',
      cities: [
        { id: 'sydney', enabled: true, targets: ['auckland', 'melbourne', 'singapore', 'london', 'losAngeles'] },
        { id: 'melbourne', enabled: false, targets: ['sydney', 'perth', 'tokyo', 'dubai', 'london'] },
        { id: 'auckland', enabled: false, targets: ['sydney', 'honolulu', 'tokyo', 'london', 'losAngeles'] },
        { id: 'honolulu', enabled: false, targets: ['losAngeles', 'tokyo', 'auckland', 'vancouver', 'sydney'] },
        { id: 'suva', enabled: false, targets: ['sydney', 'auckland', 'honolulu', 'losAngeles', 'singapore'] },
        { id: 'perth', enabled: false, targets: ['singapore', 'melbourne', 'sydney', 'dubai', 'london'] },
      ],
    },
  ],
};

export type ExampleCity = {
  id: CityId;
  timezone: string;
};

export type ExampleRegion = {
  id: ExampleRegionId;
  cities: (ExampleCity & { targets: ExampleCity[] })[];
};

/**
 * What the page shows: the enabled hours, and the regions with their enabled cities. A region
 * without one is left out, and so is everything when no hour is enabled.
 */
export function getEnabledExamples(config: ExamplesConfig = CONVERTER_EXAMPLES) {
  const hours = config.hours.filter((hour) => hour.enabled).map(({ hour }) => hour);
  const toExampleCity = (id: CityId): ExampleCity => ({ id, timezone: CITIES[id].timezone });
  const regions: ExampleRegion[] = config.regions
    .map((region) => ({
      id: region.id,
      cities: region.cities
        .filter((city) => city.enabled)
        .map((city) => ({
          ...toExampleCity(city.id),
          targets: city.targets.slice(0, config.targetsPerCity).map(toExampleCity),
        })),
    }))
    .filter((region) => region.cities.length > 0);

  return { hours, regions: hours.length > 0 ? regions : [] };
}

/** The given hour today in the city. */
export function getExampleDate(timezone: string, baseDate: Date, hour: number) {
  return getUtcDateForZonedTime(timezone, {
    ...getZonedDateParts(timezone, baseDate),
    hour,
    minute: 0,
    second: 0,
  });
}
