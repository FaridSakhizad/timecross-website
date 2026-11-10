/**
 * The "business hours" examples on the converter page: what 9:00, 12:00… in one city is in
 * others. Every city and hour is listed here and switched on or off with `enabled`, so the block
 * grows or shrinks by editing this config, not the page.
 */
import type { TranslationKey } from '../i18n';
import { getUtcDateForZonedTime, getZonedDateParts } from '../utils/time';

/** The ids of the translations under `Prefix`: "timeZoneConverter.exampleCityNames.berlin" → "berlin". */
type KeysUnder<Prefix extends string, Key = TranslationKey> = Key extends `${Prefix}.${infer Id}` ? Id : never;

/** A city with a name in `timeZoneConverter.exampleCityNames`. */
export type ExampleCityId = KeysUnder<'timeZoneConverter.exampleCityNames'>;

/** A region with a heading in `timeZoneConverter.exampleGroups`. */
export type ExampleRegionId = KeysUnder<'timeZoneConverter.exampleGroups'>;

type ExampleCityConfig = {
  id: ExampleCityId;
  timezone: string;
  enabled: boolean;
  /** The cities the hours are converted to, most relevant first. They may be switched off. */
  targets: readonly ExampleCityId[];
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
        { id: 'newYork', timezone: 'America/New_York', enabled: true, targets: ['losAngeles', 'london', 'paris', 'dubai', 'tokyo'] },
        { id: 'losAngeles', timezone: 'America/Los_Angeles', enabled: false, targets: ['newYork', 'chicago', 'london', 'singapore', 'sydney'] },
        { id: 'chicago', timezone: 'America/Chicago', enabled: false, targets: ['newYork', 'denver', 'losAngeles', 'london', 'tokyo'] },
        { id: 'denver', timezone: 'America/Denver', enabled: false, targets: ['chicago', 'losAngeles', 'newYork', 'paris', 'dubai'] },
        { id: 'toronto', timezone: 'America/Toronto', enabled: false, targets: ['vancouver', 'newYork', 'london', 'dubai', 'tokyo'] },
        { id: 'vancouver', timezone: 'America/Vancouver', enabled: false, targets: ['toronto', 'losAngeles', 'tokyo', 'sydney', 'london'] },
      ],
    },
    {
      id: 'europe',
      cities: [
        { id: 'london', timezone: 'Europe/London', enabled: true, targets: ['newYork', 'paris', 'dubai', 'tokyo', 'sydney'] },
        { id: 'paris', timezone: 'Europe/Paris', enabled: false, targets: ['london', 'newYork', 'dubai', 'singapore', 'losAngeles'] },
        { id: 'berlin', timezone: 'Europe/Berlin', enabled: true, targets: ['london', 'paris', 'newYork', 'singapore', 'tokyo'] },
        { id: 'madrid', timezone: 'Europe/Madrid', enabled: false, targets: ['london', 'paris', 'buenosAires', 'newYork', 'tokyo'] },
        { id: 'amsterdam', timezone: 'Europe/Amsterdam', enabled: false, targets: ['london', 'newYork', 'dubai', 'sydney', 'singapore'] },
        { id: 'zurich', timezone: 'Europe/Zurich', enabled: false, targets: ['london', 'paris', 'singapore', 'losAngeles', 'tokyo'] },
      ],
    },
    {
      id: 'asia',
      cities: [
        { id: 'tokyo', timezone: 'Asia/Tokyo', enabled: true, targets: ['singapore', 'seoul', 'london', 'losAngeles', 'newYork'] },
        { id: 'singapore', timezone: 'Asia/Singapore', enabled: true, targets: ['tokyo', 'hongKong', 'dubai', 'london', 'newYork'] },
        { id: 'hongKong', timezone: 'Asia/Hong_Kong', enabled: false, targets: ['singapore', 'tokyo', 'london', 'sydney', 'vancouver'] },
        { id: 'seoul', timezone: 'Asia/Seoul', enabled: false, targets: ['tokyo', 'singapore', 'paris', 'newYork', 'losAngeles'] },
        { id: 'mumbai', timezone: 'Asia/Kolkata', enabled: false, targets: ['dubai', 'singapore', 'london', 'berlin', 'newYork'] },
        { id: 'bangkok', timezone: 'Asia/Bangkok', enabled: false, targets: ['singapore', 'hongKong', 'dubai', 'berlin', 'sydney'] },
      ],
    },
    {
      id: 'middleEastAfrica',
      cities: [
        { id: 'dubai', timezone: 'Asia/Dubai', enabled: true, targets: ['london', 'mumbai', 'singapore', 'losAngeles', 'sydney'] },
        { id: 'istanbul', timezone: 'Europe/Istanbul', enabled: false, targets: ['london', 'berlin', 'dubai', 'newYork', 'tokyo'] },
        { id: 'cairo', timezone: 'Africa/Cairo', enabled: false, targets: ['paris', 'istanbul', 'riyadh', 'toronto', 'mumbai'] },
        { id: 'johannesburg', timezone: 'Africa/Johannesburg', enabled: false, targets: ['london', 'dubai', 'sydney', 'singapore', 'newYork'] },
        { id: 'riyadh', timezone: 'Asia/Riyadh', enabled: false, targets: ['dubai', 'doha', 'mumbai', 'london', 'newYork'] },
        { id: 'doha', timezone: 'Asia/Qatar', enabled: false, targets: ['dubai', 'riyadh', 'london', 'singapore', 'toronto'] },
      ],
    },
    {
      id: 'latinAmerica',
      cities: [
        { id: 'mexicoCity', timezone: 'America/Mexico_City', enabled: false, targets: ['newYork', 'losAngeles', 'chicago', 'madrid', 'tokyo'] },
        { id: 'saoPaulo', timezone: 'America/Sao_Paulo', enabled: true, targets: ['london', 'newYork', 'paris', 'mexicoCity', 'tokyo'] },
        { id: 'buenosAires', timezone: 'America/Argentina/Buenos_Aires', enabled: false, targets: ['madrid', 'saoPaulo', 'newYork', 'paris', 'london'] },
        { id: 'santiago', timezone: 'America/Santiago', enabled: false, targets: ['newYork', 'lima', 'bogota', 'london', 'sydney'] },
        { id: 'bogota', timezone: 'America/Bogota', enabled: false, targets: ['mexicoCity', 'newYork', 'lima', 'madrid', 'losAngeles'] },
        { id: 'lima', timezone: 'America/Lima', enabled: false, targets: ['bogota', 'santiago', 'mexicoCity', 'losAngeles', 'madrid'] },
      ],
    },
    {
      id: 'oceania',
      cities: [
        { id: 'sydney', timezone: 'Australia/Sydney', enabled: true, targets: ['auckland', 'melbourne', 'singapore', 'london', 'losAngeles'] },
        { id: 'melbourne', timezone: 'Australia/Melbourne', enabled: false, targets: ['sydney', 'perth', 'tokyo', 'dubai', 'london'] },
        { id: 'auckland', timezone: 'Pacific/Auckland', enabled: false, targets: ['sydney', 'honolulu', 'tokyo', 'london', 'losAngeles'] },
        { id: 'honolulu', timezone: 'Pacific/Honolulu', enabled: false, targets: ['losAngeles', 'tokyo', 'auckland', 'vancouver', 'sydney'] },
        { id: 'suva', timezone: 'Pacific/Fiji', enabled: false, targets: ['sydney', 'auckland', 'honolulu', 'losAngeles', 'singapore'] },
        { id: 'perth', timezone: 'Australia/Perth', enabled: false, targets: ['singapore', 'melbourne', 'sydney', 'dubai', 'london'] },
      ],
    },
  ],
};

export type ExampleCity = {
  id: ExampleCityId;
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
  const timezones = new Map(
    config.regions.flatMap((region) => region.cities).map((city) => [city.id, city.timezone]),
  );
  const regions: ExampleRegion[] = config.regions
    .map((region) => ({
      id: region.id,
      cities: region.cities
        .filter((city) => city.enabled)
        .map((city) => ({
          id: city.id,
          timezone: city.timezone,
          targets: city.targets
            .flatMap((id) => {
              const timezone = timezones.get(id);

              return timezone ? [{ id, timezone }] : [];
            })
            .slice(0, config.targetsPerCity),
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
