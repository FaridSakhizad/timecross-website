import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { registerSourceLoader } from './support/sourceLoader.mjs';

const hooks = registerSourceLoader();

after(() => hooks.deregister());

const {
  converterReducer,
  createConverterState,
  getConvertedDate,
  isStateInUrl,
} = await import('../src/components/TimeZoneConverter/converterState.ts');

const city = (name, timezone) => ({
  id: name.toLowerCase(),
  customName: '',
  city: name,
  timezone,
});

const berlin = city('Berlin', 'Europe/Berlin');
const tokyo = city('Tokyo', 'Asia/Tokyo');
const newYork = city('New York', 'America/New_York');
const auckland = city('Auckland', 'Pacific/Auckland');

// 11:00 in Berlin, 19:00 in Tokyo, 05:00 in New York, 23:00 in Auckland.
const NOW = new Date('2026-11-05T10:00:00Z');
const NO_LINK = { sourceCity: null, date: null, time: null };
const link = (sourceCity, date, time) => ({ sourceCity, date, time });

const start = (urlState = NO_LINK, defaultSourceCity = berlin) => createConverterState(urlState, defaultSourceCity, NOW);
const reduce = (state, ...actions) => actions.reduce(converterReducer, state);

test('without a link: the default city, today and the current time there, nothing chosen', () => {
  assert.deepEqual(start(), {
    sourceCity: berlin,
    date: '2026-11-05',
    time: '11:00',
    hasCustomDate: false,
    hasSelection: false,
  });
});

test('a link sets the city, date and time; what it leaves out is filled in', () => {
  assert.deepEqual(start(link(tokyo, '2026-12-31', '23:15')), {
    sourceCity: tokyo,
    date: '2026-12-31',
    time: '23:15',
    hasCustomDate: true,
    hasSelection: true,
  });
  assert.deepEqual(start(link(tokyo, null, '07:00')), {
    sourceCity: tokyo,
    date: '2026-11-05',
    time: '07:00',
    hasCustomDate: false,
    hasSelection: true,
  });
  assert.equal(start(link(null, '2027-01-01', null)).sourceCity, berlin);
});

test('without any city everything stays empty', () => {
  assert.deepEqual(start(NO_LINK, null), {
    sourceCity: null,
    date: '',
    time: '',
    hasCustomDate: false,
    hasSelection: false,
  });
});

test('a changed time is a selection; a cleared one is the current time in the source city', () => {
  const changed = reduce(start(), { type: 'timeChanged', time: '14:30', now: NOW });

  assert.equal(changed.time, '14:30');
  assert.equal(changed.hasSelection, true);
  assert.equal(reduce(changed, { type: 'timeChanged', time: '', now: NOW }).time, '11:00');
  assert.equal(reduce(start(NO_LINK, null), { type: 'timeChanged', time: '', now: NOW }).time, '');
});

test('a picked date replaces "today"', () => {
  const state = reduce(start(), { type: 'dateSelected', date: '2026-11-15' });

  assert.equal(state.date, '2026-11-15');
  assert.equal(state.hasCustomDate, true);
  assert.equal(state.hasSelection, true);
});

test('a new source city with a picked date keeps the moment: 14:30 in Berlin is 22:30 in Tokyo', () => {
  const state = reduce(
    start(),
    { type: 'timeChanged', time: '14:30', now: NOW },
    { type: 'dateSelected', date: '2026-11-15' },
    { type: 'sourceCitySelected', city: tokyo, now: NOW },
  );

  assert.equal(state.sourceCity, tokyo);
  assert.equal(state.date, '2026-11-15');
  assert.equal(state.time, '22:30');
  assert.equal(getConvertedDate(state)?.toISOString(), '2026-11-15T13:30:00.000Z');
});

test('a new source city on "today" keeps the clock time and takes today in the new city', () => {
  const nineInNewYork = reduce(
    start(),
    { type: 'timeChanged', time: '09:00', now: NOW },
    { type: 'sourceCitySelected', city: newYork, now: NOW },
  );

  assert.equal(nineInNewYork.time, '09:00');
  assert.equal(nineInNewYork.date, '2026-11-05');
  assert.equal(nineInNewYork.hasCustomDate, false);
  assert.equal(nineInNewYork.hasSelection, true);

  // Already the 6th in Auckland at 23:30 UTC.
  const lateNow = new Date('2026-11-05T23:30:00Z');
  const inAuckland = reduce(nineInNewYork, { type: 'sourceCitySelected', city: auckland, now: lateNow });

  assert.equal(inAuckland.date, '2026-11-06');
  assert.equal(inAuckland.time, '09:00');
});

test('a source city without a moment to keep only changes the city', () => {
  const invalid = { ...start(), date: '2026-02-31', hasCustomDate: true };
  const state = reduce(invalid, { type: 'sourceCitySelected', city: tokyo, now: NOW });

  assert.equal(state.sourceCity, tokyo);
  assert.equal(state.date, '2026-02-31');
  assert.equal(state.time, '11:00');
});

test('a city list change gives a converter without a source city the default one', () => {
  const empty = start(NO_LINK, null);
  const filled = reduce(empty, { type: 'citiesChanged', defaultSourceCity: tokyo, now: NOW });

  assert.deepEqual(filled, {
    ...empty,
    sourceCity: tokyo,
    date: '2026-11-05',
    time: '19:00',
  });

  const withTime = reduce(empty, { type: 'timeChanged', time: '08:00', now: NOW }, { type: 'citiesChanged', defaultSourceCity: tokyo, now: NOW });

  assert.equal(withTime.time, '08:00');
});

test('a city list change keeps a source city that is already there', () => {
  const state = start();

  assert.equal(reduce(state, { type: 'citiesChanged', defaultSourceCity: tokyo, now: NOW }), state);
  assert.equal(reduce(start(NO_LINK, null), { type: 'citiesChanged', defaultSourceCity: null, now: NOW }).sourceCity, null);
});

test('back and forward restore the state of the URL, including a URL without a link', () => {
  const lima = city('Lima', 'America/Lima');
  const fromTokyo = start(link(tokyo, '2026-12-31', '23:15'));
  const toLima = reduce(fromTokyo, {
    type: 'urlRestored',
    urlState: link(lima, '2027-01-10', '06:45'),
    defaultSourceCity: berlin,
    now: NOW,
  });

  assert.deepEqual(toLima, start(link(lima, '2027-01-10', '06:45')));
  assert.deepEqual(reduce(toLima, { type: 'urlRestored', urlState: NO_LINK, defaultSourceCity: berlin, now: NOW }), start());
});

test('a URL is read into the state only when it describes something else', () => {
  const linked = start(link(tokyo, '2026-12-31', '23:15'));

  assert.equal(isStateInUrl(linked, link(tokyo, '2026-12-31', '23:15')), true);
  assert.equal(isStateInUrl(linked, link(tokyo, '2026-12-31', '23:16')), false);
  assert.equal(isStateInUrl(linked, NO_LINK), false);
  assert.equal(isStateInUrl(start(), NO_LINK), true);
  assert.equal(isStateInUrl(start(), link(tokyo, null, null)), false);
  // The link's missing date is written back, after which the state and the URL agree.
  assert.equal(isStateInUrl(start(link(tokyo, null, '07:00')), link(tokyo, null, '07:00')), false);
});

test('the converted moment needs a source city and a valid date and time', () => {
  assert.equal(getConvertedDate(start())?.toISOString(), '2026-11-05T10:00:00.000Z');
  assert.equal(getConvertedDate({ ...start(), time: '25:00' }), null);
  assert.equal(getConvertedDate(start(NO_LINK, null)), null);
});
