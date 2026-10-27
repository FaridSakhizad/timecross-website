import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildGridEventUrl, readGridEventUrlState, getSharedGridTimelineDates } from '../src/components/TimelineGrid/eventUrlState.ts';
import { shareEventLink } from '../src/components/TimelineGrid/shareEventLink.ts';
import { buildGridCalendarEvent, GRID_HOUR_MS } from '../src/components/TimelineGrid/desktop/gridSelection.ts';

const start = Date.parse('2026-11-01T05:00:00Z');
const cities = [
  { id: 'ny', city: 'New York', cityId: '5128581', timezone: 'America/New_York', customName: 'Команда & друзья + #1' },
  { id: 'ldn', city: 'London', cityId: '6058560', timezone: 'America/Toronto', customName: '' },
  { id: 'ldn-uk', city: 'London', cityId: '2643743', timezone: 'Europe/London', customName: '' },
  { id: 'gmt', city: 'GMT+5:30', timezone: 'GMT_OFFSET:330', customName: '' },
];
const hours = cities.slice(0, 3).flatMap((city) => [0, 1, 2].map((i) => ({ rowId: city.id, start: start + i * GRID_HOUR_MS })));
const baseUrl = 'https://timecross.app/ru/grid';
const hashFor = (data) => `#${new URLSearchParams({ event: JSON.stringify(data) })}`;
const valid = { v: 1, s: start / 1000, e: start / 1000 + 3600, c: [['New York', 'America/New_York']] };

test('shared URL restores selected rows, identity, names and UTC range without a city database', () => {
  const link = buildGridEventUrl(`${baseUrl}?tracking=1#old`, cities, hours);
  const url = new URL(link);
  assert.equal(url.pathname, '/ru/grid');
  assert.equal(url.search, '');
  const result = readGridEventUrlState(url.hash);
  assert.equal(result.start, start);
  assert.equal(result.end, start + 3 * GRID_HOUR_MS);
  assert.equal(result.cities.length, 3);
  assert.equal(result.cities[0].customName, cities[0].customName);
  assert.equal(result.cities[1].cityId, '6058560');
  assert.equal(result.cities[1].timezone, 'America/Toronto');
  assert.equal(result.cities[2].timezone, 'Europe/London');
  assert.equal(new Set(result.cities.map((city) => city.id)).size, 3);
  assert.equal(result.hours.length, 9);
  assert.equal(buildGridEventUrl(baseUrl, result.cities, result.hours), link);
  assert.equal(result.cities.some((city) => city.id === 'gmt'), false);
});

test('recipient timezone, reloads and later dates do not change the shared event instant', () => {
  const link = buildGridEventUrl(baseUrl, cities, hours);
  const restored = readGridEventUrlState(new URL(link).hash);
  for (const timezone of ['America/Edmonton', 'Asia/Kathmandu', 'Pacific/Auckland']) {
    const event = buildGridCalendarEvent(restored.hours, restored.cities.map((city) => ({
      id: city.id, name: city.customName || city.city, timezone: city.timezone,
    })), timezone, 'Meeting');
    assert.equal(event.start, start);
    assert.equal(event.end, start + 3 * GRID_HOUR_MS);
    assert.match(event.details, /UTC-04:00 -> UTC-05:00/);
    const dates = getSharedGridTimelineDates(restored).map(Number);
    assert.ok(restored.hours.every((hour) => dates.includes(hour.start)));
    assert.equal(dates[24], start);
    assert.deepEqual(readGridEventUrlState(new URL(link).hash), restored);
  }
});

test('fixed offsets, duplicate instances, long midnight ranges and Unicode survive roundtrip', () => {
  const rows = [cities[3], { ...cities[3], id: 'duplicate', customName: 'Вторая строка 🌍' }];
  const selection = rows.flatMap((city) => Array.from({ length: 92 }, (_, i) => ({ rowId: city.id, start: start + i * GRID_HOUR_MS })));
  const restored = readGridEventUrlState(new URL(buildGridEventUrl(baseUrl, rows, selection)).hash);
  assert.equal(restored.hours.length, 184);
  assert.equal(restored.cities[1].customName, 'Вторая строка 🌍');
  assert.equal(restored.cities[0].timezone, 'GMT_OFFSET:330');
  assert.ok(getSharedGridTimelineDates(restored).at(-1).getTime() >= restored.end);
});

test('invalid or excessively large payloads fail closed without partial events', () => {
  for (const hash of ['', '#event={', '#event=null', '#event=%FF', '#event=' + 'x'.repeat(100001)]) {
    assert.equal(readGridEventUrlState(hash), null);
  }
  for (const data of [
    { ...valid, v: 2 }, { ...valid, s: '123' }, { ...valid, e: valid.s },
    { ...valid, e: valid.s + 3600 * 97 }, { ...valid, s: valid.s + 1 },
    { ...valid, s: -1e15 }, { ...valid, e: 1e15 }, { ...valid, c: [] },
    { ...valid, c: Array(101).fill(['City', 'UTC']) },
    ...[['', 'UTC'], ['City', 'bad/zone'], ['City', 'GMT_OFFSET:9999'],
      ['City', 'GMT_OFFSET:3.5'], [null, 'UTC'], ['City', 'UTC', 123],
      ['City', 'UTC', '', { unsafe: true }], ['x'.repeat(201), 'UTC']].map((entry) => ({ ...valid, c: [entry] })),
  ]) assert.equal(readGridEventUrlState(hashFor(data)), null);
});

test('unknown rows and disjoint ranges cannot silently turn into a different event', () => {
  assert.equal(buildGridEventUrl(baseUrl, cities, []), null);
  assert.equal(buildGridEventUrl(baseUrl, cities, [{ rowId: 'missing', start }]), null);
  assert.equal(buildGridEventUrl(baseUrl, cities, [{ rowId: 'ny', start }, { rowId: 'ny', start: start + 2 * GRID_HOUR_MS }]), null);
});

test('native sharing receives only a URL and is invoked synchronously before any await', async () => {
  let called = false;
  const pending = shareEventLink(baseUrl, {
    canShare: (data) => { assert.deepEqual(data, { url: baseUrl }); return true; },
    share(data) { assert.deepEqual(data, { url: baseUrl }); called = true; return Promise.resolve(); },
  });
  assert.equal(called, true);
  assert.equal(await pending, 'shared');
});

test('unsupported, denied or broken sharing falls back to copying the same URL', async () => {
  for (const browser of [
    {}, { share: async () => {}, canShare: () => false },
    { share: async () => { throw new DOMException('Denied', 'NotAllowedError'); } },
    { share: async () => {}, canShare: () => { throw new Error('Unavailable'); } },
  ]) {
    let copied = null;
    assert.equal(await shareEventLink(baseUrl, { ...browser, clipboard: { writeText: async (text) => { copied = text; } } }), 'copied');
    assert.equal(copied, baseUrl);
  }
});

test('cancelling the share sheet is silent and does not modify the clipboard', async () => {
  const result = await shareEventLink(baseUrl, {
    share: async () => { throw new DOMException('Cancelled', 'AbortError'); },
    clipboard: { writeText: async () => assert.fail('Unexpected clipboard write') },
  });
  assert.equal(result, 'cancelled');
});

test('missing or denied clipboard reports failure rather than claiming success', async () => {
  await assert.rejects(shareEventLink(baseUrl, {}), /Clipboard unavailable/);
  await assert.rejects(shareEventLink(baseUrl, { clipboard: { writeText: async () => { throw new Error('Denied'); } } }), /Denied/);
});
