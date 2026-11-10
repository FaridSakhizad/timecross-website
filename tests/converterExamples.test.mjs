import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { registerSourceLoader } from './support/sourceLoader.mjs';

const hooks = registerSourceLoader();

after(() => hooks.deregister());

const { CONVERTER_EXAMPLES, getEnabledExamples, getExampleDate } = await import('../src/pages/converterExamples.ts');

const allCities = CONVERTER_EXAMPLES.regions.flatMap((region) => region.cities);

test('the page shows 8 cities at 4 hours, each converted to 4 cities', () => {
  const { hours, regions } = getEnabledExamples();
  const cities = regions.flatMap((region) => region.cities);

  assert.deepEqual(hours, [9, 12, 15, 18]);
  assert.deepEqual(cities.map((city) => city.id), [
    'newYork',
    'london',
    'berlin',
    'tokyo',
    'singapore',
    'dubai',
    'saoPaulo',
    'sydney',
  ]);
  assert.ok(cities.every((city) => city.targets.length === 4));
});

test('every city is listed once, and every target is a listed city', () => {
  const ids = allCities.map((city) => city.id);

  assert.equal(new Set(ids).size, ids.length);
  assert.ok(allCities.every((city) => city.targets.every((target) => ids.includes(target) && target !== city.id)));
});

test('a region without an enabled city is left out; switched-off cities are still targets', () => {
  const config = {
    targetsPerCity: 2,
    hours: [{ hour: 9, enabled: true }],
    regions: [
      { id: 'europe', cities: [{ id: 'paris', timezone: 'Europe/Paris', enabled: true, targets: ['tokyo', 'lima', 'london'] }] },
      { id: 'asia', cities: [{ id: 'tokyo', timezone: 'Asia/Tokyo', enabled: false, targets: [] }] },
    ],
  };

  assert.deepEqual(getEnabledExamples(config), {
    hours: [9],
    regions: [{
      id: 'europe',
      cities: [{ id: 'paris', timezone: 'Europe/Paris', targets: [{ id: 'tokyo', timezone: 'Asia/Tokyo' }] }],
    }],
  });
  assert.deepEqual(getEnabledExamples({ ...config, hours: [{ hour: 9, enabled: false }] }).regions, []);
});

// 11:00 on the 5th in Berlin, 23:00 on the 5th in Auckland.
test('an example is the hour today in the city', () => {
  const now = new Date('2026-11-05T10:00:00Z');

  assert.equal(getExampleDate('Europe/Berlin', now, 9).toISOString(), '2026-11-05T08:00:00.000Z');
  assert.equal(getExampleDate('Pacific/Auckland', now, 9).toISOString(), '2026-11-04T20:00:00.000Z');
});
