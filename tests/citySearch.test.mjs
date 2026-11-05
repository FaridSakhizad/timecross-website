import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';

import { registerSourceLoader } from './support/sourceLoader.mjs';

// Relative offsets ("+5:30") are counted from the local time zone.
process.env.TZ = 'UTC';

const hooks = registerSourceLoader();
const searchData = readFileSync(new URL('../public/data/cities-search.json', import.meta.url));
const originalFetch = globalThis.fetch;

globalThis.fetch = async () => new Response(searchData);

after(() => {
  globalThis.fetch = originalFetch;
  hooks.deregister();
});

const { searchCities } = await import('../src/components/Cities/citySearch.ts');
const { getTimeZoneOffsetMinutes } = await import('../src/utils/time.ts');

// The expected cities are in zones without daylight saving time, so the tests hold all year.
const names = (rows) => rows.map((row) => row.name);
const timeZones = (rows) => rows.map((row) => row.tz);

test('"gmt+3" lists the GMT+3 and GMT+3:30 rows first, then cities at those offsets by population', async () => {
  const rows = await searchCities('gmt+3', 'en');

  assert.deepEqual(names(rows.slice(0, 2)), ['GMT+3', 'GMT+3:30']);
  assert.ok(rows.slice(0, 2).every((row) => row.isAbstractTimezone));
  assert.deepEqual(timeZones(rows.slice(2, 4)), ['Europe/Istanbul', 'Europe/Moscow']);

  const now = new Date();

  for (const row of rows.slice(2)) {
    assert.ok([180, 210].includes(getTimeZoneOffsetMinutes(row.tz, now)), row.name);
  }
});

test('an hour without minutes matches every row of that hour, with minutes only the exact one', async () => {
  assert.deepEqual(names((await searchCities('gmt+5', 'en')).filter((row) => row.isAbstractTimezone)), ['GMT+5', 'GMT+5:30', 'GMT+5:45']);
  assert.deepEqual(names((await searchCities('gmt+5:30', 'en')).filter((row) => row.isAbstractTimezone)), ['GMT+5:30']);
  assert.deepEqual(names((await searchCities('gmt-3:30', 'en')).slice(0, 2)), ['GMT-3:30', "St. John's"]);
});

test('UTC, the "gtm" typo, case and spaces are read as GMT', async () => {
  const expected = names(await searchCities('gmt+5:30', 'en'));

  for (const query of ['utc+5:30', 'UTC 5:30', 'gtm +5:30', ' GMT + 5:30 ']) {
    assert.deepEqual(names(await searchCities(query, 'en')), expected, query);
  }
});

test('a bare offset is relative to the local time zone', async () => {
  assert.equal((await searchCities('+5:45', 'en'))[0]?.tz, 'Asia/Kathmandu');
  assert.equal((await searchCities('5:30', 'en'))[0]?.tz, 'Asia/Kolkata');
  assert.ok((await searchCities('-0', 'en')).every((row) => getTimeZoneOffsetMinutes(row.tz, new Date()) === 0));
});

test('impossible offsets and a lone "gmt" find nothing', async () => {
  for (const query of ['gmt+25', 'gmt+5:75', 'gmt', '+99']) {
    assert.deepEqual(await searchCities(query, 'en'), [], query);
  }
});

test('names match by prefix, ignoring case and diacritics; bigger cities first', async () => {
  assert.equal((await searchCities('mosc', 'en'))[0]?.tz, 'Europe/Moscow');
  assert.deepEqual(await searchCities('MOSC', 'en'), await searchCities('mosc', 'en'));
  assert.equal((await searchCities('zuri', 'en'))[0]?.name, 'Zürich');
  assert.equal((await searchCities('new y', 'en'))[0]?.localizedName, 'New York');
  assert.deepEqual(await searchCities('xyzq', 'en'), []);
});

test('names in the interface language rank first and are shown localized', async () => {
  const [moscow] = await searchCities('моск', 'ru');

  assert.equal(moscow?.tz, 'Europe/Moscow');
  assert.equal(moscow.localizedName, 'Москва');
  assert.equal((await searchCities('münch', 'de'))[0]?.localizedName, 'München');
  assert.equal((await searchCities('lisb', 'pt'))[0]?.localizedName, 'Lisboa');
});

test('Brazilian Portuguese falls back to European Portuguese names', async () => {
  assert.equal((await searchCities('lisb', 'pt-BR'))[0]?.localizedName, 'Lisboa');
});

test('results are limited to 30 cities', async () => {
  assert.equal((await searchCities('san', 'en')).length, 30);
  assert.equal((await searchCities('gmt+3', 'en')).filter((row) => !row.isAbstractTimezone).length, 30);
});
