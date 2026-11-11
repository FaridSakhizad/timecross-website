import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { registerSourceLoader } from './support/sourceLoader.mjs';

const hooks = registerSourceLoader();

after(() => hooks.deregister());

const {
  TIME_DIFFERENCE_PAIRS,
  getCityPair,
  getCityPairs,
  getDifferenceMinutes,
  getDifferencePeriods,
  getReversedCityPair,
  getWorkingOverlap,
} = await import('../src/timeDifference.ts');

const hours = (periods) => periods.map(({ start, minutes }) => [start.toISOString().slice(0, 13), minutes / 60]);

test('every enabled pair has a page at its slug, and the reverse slug finds it for a redirect', () => {
  const pairs = getCityPairs();

  assert.equal(pairs.length, TIME_DIFFERENCE_PAIRS.filter((pair) => pair.enabled).length);
  assert.equal(new Set(pairs.map((pair) => pair.slug)).size, pairs.length);
  assert.deepEqual(getCityPair('madrid-mexico-city')?.cities, ['madrid', 'mexicoCity']);
  assert.equal(getCityPair('mexico-city-madrid'), null);
  assert.equal(getReversedCityPair('mexico-city-madrid')?.slug, 'madrid-mexico-city');
  assert.equal(getReversedCityPair('madrid-mars'), null);
  assert.ok(pairs.every(({ cities: [first, second] }) => first !== second));
});

test('the difference is how far the second city is ahead of the first one', () => {
  const winter = new Date('2026-01-15T12:00:00Z');
  const summer = new Date('2026-07-15T12:00:00Z');

  assert.equal(getDifferenceMinutes(['berlin', 'bangkok'], winter), 6 * 60);
  assert.equal(getDifferenceMinutes(['berlin', 'bangkok'], summer), 5 * 60);
  assert.equal(getDifferenceMinutes(['london', 'newYork'], winter), -5 * 60);
});

test('the year is split where the difference changes: Europe and the US switch on different Sundays', () => {
  assert.deepEqual(hours(getDifferencePeriods(['london', 'newYork'], 2026)), [
    ['2026-01-01T00', -5],
    ['2026-03-08T07', -4],
    ['2026-03-29T01', -5],
    ['2026-10-25T01', -4],
    ['2026-11-01T06', -5],
  ]);

  const periods = getDifferencePeriods(['london', 'newYork'], 2026);

  assert.ok(periods.every((period, index) => period.end.getTime() === (periods[index + 1]?.start ?? new Date('2027-01-01T00:00:00Z')).getTime()));
});

test('a pair where only one city switches has three periods, one without switching has one', () => {
  assert.deepEqual(hours(getDifferencePeriods(['madrid', 'mexicoCity'], 2026)), [
    ['2026-01-01T00', -7],
    ['2026-03-29T01', -8],
    ['2026-10-25T01', -7],
  ]);
  assert.deepEqual(hours(getDifferencePeriods(['tokyo', 'singapore'], 2026)), [['2026-01-01T00', -1]]);
});

test('the working hours overlap is found in the first city\'s working day', () => {
  const day = new Date('2026-11-10T12:00:00Z');
  const overlap = getWorkingOverlap(['moscow', 'newYork'], day);

  // 9:00 in New York is 17:00 in Moscow: one hour together.
  assert.equal(overlap?.start.toISOString(), '2026-11-10T14:00:00.000Z');
  assert.equal(overlap?.minutes, 60);
  assert.equal(getWorkingOverlap(['london', 'newYork'], day)?.minutes, 4 * 60);
  assert.equal(getWorkingOverlap(['madrid', 'sydney'], day), null);
});
