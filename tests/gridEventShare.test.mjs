import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TIMELINE_RENDERED_HOURS, TIMELINE_TOTAL_HOURS, TIMELINE_EDGE_FADE_HOURS } from '../src/components/TimelineGrid/shared/constants.ts';
import { buildGridEventUrl, getEventParams, readGridEventUrlState, getSharedGridTimelineDates, removeEventParams } from '../src/components/TimelineGrid/shared/eventUrlState.ts';
import { buildGridCalendarEvent, GRID_HOUR_MS } from '../src/components/TimelineGrid/shared/gridSelection.ts';
import { shareEventLink } from '../src/components/TimelineGrid/shared/shareEventLink.ts';

import { hourOf, PER_HOUR, slotsOf } from './support/gridSlots.mjs';

const start = Date.parse('2026-11-01T05:00:00Z');
const cities = [
  { id: 'ny', city: 'New York', cityId: '5128581', timezone: 'America/New_York', customName: 'Команда & друзья + #1' },
  { id: 'ldn', city: 'London', cityId: '6058560', timezone: 'America/Toronto', customName: '' },
  { id: 'ldn-uk', city: 'London', cityId: '2643743', timezone: 'Europe/London', customName: '' },
  { id: 'gmt', city: 'GMT+5:30', timezone: 'GMT_OFFSET:330', customName: '' },
];
const hours = slotsOf(cities.slice(0, 3).flatMap((city) => [0, 1, 2].map((i) => ({ rowId: city.id, start: start + i * GRID_HOUR_MS }))));
const baseUrl = 'https://timecross.app/ru/grid';
const hashFor = (data) => `#${new URLSearchParams({ event: JSON.stringify(data) })}`;
const valid = { v: 1, s: start / 1000, e: start / 1000 + 3600, c: [['New York', 'America/New_York']] };

test('shared URL restores selected rows, identity, names and UTC range without a city database', () => {
  const link = buildGridEventUrl(`${baseUrl}?tracking=1#old`, cities, hours);
  const url = new URL(link);

  assert.equal(url.pathname, '/ru/grid');
  assert.equal(url.hash, '');
  assert.deepEqual([...url.searchParams.keys()], ['e', 'c']);
  const result = readGridEventUrlState(url.search);

  assert.equal(result.start, start);
  assert.equal(result.end, start + 3 * GRID_HOUR_MS);
  assert.equal(result.cities.length, 3);
  assert.equal(result.cities[0].customName, cities[0].customName);
  assert.equal(result.cities[1].cityId, '6058560');
  assert.equal(result.cities[1].timezone, 'America/Toronto');
  assert.equal(result.cities[2].timezone, 'Europe/London');
  assert.equal(new Set(result.cities.map((city) => city.id)).size, 3);
  assert.equal(result.hours.length, 3 * 3 * PER_HOUR);
  assert.equal(buildGridEventUrl(baseUrl, result.cities, result.hours), link);
  assert.equal(result.cities.some((city) => city.id === 'gmt'), false);
});

test('recipient timezone, reloads and later dates do not change the shared event instant', () => {
  const link = buildGridEventUrl(baseUrl, cities, hours);
  const restored = readGridEventUrlState(new URL(link).search);

  for (const timezone of ['America/Edmonton', 'Asia/Kathmandu', 'Pacific/Auckland']) {
    const event = buildGridCalendarEvent(restored.hours, restored.cities.map((city) => ({
      id: city.id,
      name: city.customName || city.city,
      timezone: city.timezone,
    })), timezone, 'Meeting');

    assert.equal(event.start, start);
    assert.equal(event.end, start + 3 * GRID_HOUR_MS);
    assert.match(event.details, /UTC-04:00 -> UTC-05:00/);
    const dates = getSharedGridTimelineDates(restored).map(Number);

    assert.ok(restored.hours.every((hour) => dates.includes(hourOf(hour.start))));
    assert.equal(dates[24], start);
    assert.deepEqual(readGridEventUrlState(new URL(link).search), restored);
  }
});

test('fixed offsets, duplicate instances, long midnight ranges and Unicode survive roundtrip', () => {
  const rows = [cities[3], { ...cities[3], id: 'duplicate', customName: 'Вторая строка 🌍' }];
  const selection = slotsOf(rows.flatMap((city) => Array.from({ length: TIMELINE_RENDERED_HOURS }, (_, i) => ({ rowId: city.id, start: start + i * GRID_HOUR_MS }))));
  const restored = readGridEventUrlState(new URL(buildGridEventUrl(baseUrl, rows, selection)).search);

  assert.equal(restored.hours.length, TIMELINE_RENDERED_HOURS * PER_HOUR * rows.length);
  assert.equal(restored.cities[1].customName, 'Вторая строка 🌍');
  assert.equal(restored.cities[0].timezone, 'GMT_OFFSET:330');
  assert.equal(getSharedGridTimelineDates(restored).at(-1).getTime() + GRID_HOUR_MS, restored.end);
});

test('a title travels with the link as one trimmed line; links without one still open', () => {
  const link = buildGridEventUrl(baseUrl, cities, hours, '  Weekly\n sync \u200b ');
  const restored = readGridEventUrlState(new URL(link).search);

  assert.equal(restored.title, 'Weekly sync');
  assert.equal(readGridEventUrlState(new URL(buildGridEventUrl(baseUrl, cities, hours)).search).title, '');
  assert.equal(readGridEventUrlState(new URL(buildGridEventUrl(baseUrl, cities, hours, 'x'.repeat(150))).search).title.length, 100);
  assert.equal(readGridEventUrlState(hashFor({ ...valid, t: 'Sync' })).title, 'Sync');

  for (const t of [42, 'x'.repeat(101), ' padded ', 'two\nlines']) {
    assert.equal(readGridEventUrlState(hashFor({ ...valid, t })), null);
  }
});

test('older links keep the meeting in the hash; the query wins, the rest of the query is ignored', () => {
  const link = new URL(buildGridEventUrl(baseUrl, cities, hours, 'Sync'));
  const legacyHash = `#${link.search.slice(1)}`;

  assert.deepEqual(readGridEventUrlState(legacyHash), readGridEventUrlState(link.search));
  assert.equal(getEventParams('', legacyHash), legacyHash);
  assert.equal(getEventParams(`?at=2026-11-01T05:00:00.000Z&${link.search.slice(1)}`, '#other'), link.search);
  assert.equal(getEventParams('?at=2026-11-01T05:00:00.000Z', ''), '');

  // The author's language goes with the meeting and does not change it.
  const withLanguage = new URL(buildGridEventUrl(baseUrl, cities, hours, 'Sync', 'pt-BR'));

  assert.deepEqual([...withLanguage.searchParams.keys()], ['e', 't', 'l', 'c']);
  assert.equal(withLanguage.searchParams.get('l'), 'pt-BR');
  assert.equal(getEventParams(`?at=x&${withLanguage.search.slice(1)}&cities=y`, ''), withLanguage.search);
  assert.deepEqual(readGridEventUrlState(withLanguage.search), readGridEventUrlState(new URL(buildGridEventUrl(baseUrl, cities, hours, 'Sync')).search));
});

test('every supported duration fits the ordinary grid and remains shareable without truncation', () => {
  assert.equal(TIMELINE_RENDERED_HOURS, TIMELINE_TOTAL_HOURS + TIMELINE_EDGE_FADE_HOURS * 2);

  for (let count = 1; count <= TIMELINE_RENDERED_HOURS; count += 1) {
    const state = readGridEventUrlState(hashFor({ ...valid, e: valid.s + count * 3600 }));

    assert.ok(state);
    const dates = getSharedGridTimelineDates(state);

    assert.ok(dates.length <= TIMELINE_RENDERED_HOURS);
    assert.ok(dates[0].getTime() <= state.start);
    assert.ok(dates.at(-1).getTime() + GRID_HOUR_MS >= state.end);
    const values = new Set(dates.map(Number));

    assert.ok(state.hours.every((hour) => values.has(hourOf(hour.start))));
    const link = buildGridEventUrl(baseUrl, state.cities, state.hours);

    assert.ok(link);
    const restored = readGridEventUrlState(new URL(link).search);

    assert.equal(restored.start, state.start);
    assert.equal(restored.end, state.end);
  }
});

test('context contracts around large events and keeps short-event padding unchanged', () => {
  for (const [hours, before, after] of [[3, 24, 24], [72, 10, 10], [91, 0, 1], [92, 0, 0]]) {
    const end = start + hours * GRID_HOUR_MS;
    const dates = getSharedGridTimelineDates({ start, end });

    assert.equal((start - dates[0].getTime()) / GRID_HOUR_MS, before);
    assert.equal((dates.at(-1).getTime() + GRID_HOUR_MS - end) / GRID_HOUR_MS, after);
    const focusIndex = dates.findIndex((date) => date.getTime() === start) + Math.floor(hours / 2);

    assert.equal(dates[focusIndex].getTime(), start + Math.floor(hours / 2) * GRID_HOUR_MS);
  }
});

test('repeated opening, selecting the entire timeline and sharing cannot grow the grid', () => {
  let state = readGridEventUrlState(hashFor({ ...valid, e: valid.s + 72 * 3600 }));

  for (let iteration = 0; iteration < 8; iteration += 1) {
    const dates = getSharedGridTimelineDates(state);

    assert.equal(dates.length, TIMELINE_RENDERED_HOURS);
    const selection = slotsOf(dates.map((date) => ({ rowId: state.cities[0].id, start: date.getTime() })));
    const link = buildGridEventUrl(baseUrl, state.cities, selection);

    assert.ok(link);
    state = readGridEventUrlState(new URL(link).search);
    assert.equal(state.end - state.start, TIMELINE_RENDERED_HOURS * GRID_HOUR_MS);
  }
});

test('one hour beyond actual grid capacity is rejected on both encoding and decoding', () => {
  assert.equal(readGridEventUrlState(hashFor({ ...valid, e: valid.s + (TIMELINE_RENDERED_HOURS + 1) * 3600 })), null);
  const oversized = slotsOf(Array.from({ length: TIMELINE_RENDERED_HOURS + 1 }, (_, i) => ({ rowId: 'ny', start: start + i * GRID_HOUR_MS })));

  assert.equal(buildGridEventUrl(baseUrl, cities, oversized), null);
});

test('invalid or excessively large payloads fail closed without partial events', () => {
  for (const hash of ['', '#event={', '#event=null', '#event=%FF', `#event=${'x'.repeat(100001)}`]) {
    assert.equal(readGridEventUrlState(hash), null);
  }

  for (const data of [
    { ...valid, v: 2 },
    { ...valid, s: '123' },
    { ...valid, e: valid.s },
    { ...valid, e: valid.s + 3600 * (TIMELINE_RENDERED_HOURS + 1) },
    { ...valid, s: valid.s + 1 },
    { ...valid, s: -1e15 },
    { ...valid, e: 1e15 },
    { ...valid, c: [] },
    { ...valid, c: Array(101).fill(['City', 'UTC']) },
    ...[['', 'UTC'], ['City', 'bad/zone'], ['City', 'GMT_OFFSET:9999'], ['City', 'GMT_OFFSET:3.5'], [null, 'UTC'], ['City', 'UTC', 123], ['City', 'UTC', '', { unsafe: true }], ['x'.repeat(201), 'UTC']].map((entry) => ({ ...valid, c: [entry] })),
  ]) {
    assert.equal(readGridEventUrlState(hashFor(data)), null);
  }
});

test('unknown rows and disjoint ranges cannot silently turn into a different event', () => {
  assert.equal(buildGridEventUrl(baseUrl, cities, []), null);
  assert.equal(buildGridEventUrl(baseUrl, cities, [{ rowId: 'missing', start }]), null);
  assert.equal(buildGridEventUrl(baseUrl, cities, [{ rowId: 'ny', start }, { rowId: 'ny', start: start + 2 * GRID_HOUR_MS }]), null);
});

test('native sharing receives only a URL and is invoked synchronously before any await', async () => {
  let called = false;
  const pending = shareEventLink(baseUrl, {
    canShare: (data) => {
      assert.deepEqual(data, { url: baseUrl });
      return true;
    },
    share(data) {
      assert.deepEqual(data, { url: baseUrl });
      called = true;
      return Promise.resolve();
    },
  });

  assert.equal(called, true);
  assert.equal(await pending, 'shared');
});

test('unsupported, denied or broken sharing falls back to copying the same URL', async () => {
  for (const browser of [
    {},
    { share: async () => {}, canShare: () => false },
    { share: async () => { throw new DOMException('Denied', 'NotAllowedError'); } },
    { share: async () => {}, canShare: () => { throw new Error('Unavailable'); } },
  ]) {
    let copied = null;

    assert.equal(await shareEventLink(baseUrl, {
      ...browser,
      clipboard: {
        writeText: async (text) => {
          copied = text;
        },
      },
    }), 'copied');
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
  await assert.rejects(shareEventLink(baseUrl, {
    clipboard: {
      writeText: async () => {
        throw new Error('Denied');
      },
    },
  }), /Denied/);
});

test('a meeting from half past to half past shares, and its grid has every hour it touches', () => {
  const halves = slotsOf([0, 1, 2].map((i) => ({ rowId: 'ny', start: start + i * GRID_HOUR_MS }))).slice(1, -1);
  const restored = readGridEventUrlState(new URL(buildGridEventUrl(baseUrl, cities, halves)).search);

  assert.equal(restored.start, start + 0.5 * GRID_HOUR_MS);
  assert.equal(restored.end, start + 2.5 * GRID_HOUR_MS);
  assert.deepEqual(restored.hours.map((hour) => hour.start), halves.map((hour) => hour.start));

  const dates = getSharedGridTimelineDates(restored).map(Number);

  // 05:30 – 07:30 touches the cells of 05, 06 and 07, which stay whole.
  assert.ok([0, 1, 2].every((i) => dates.includes(start + i * GRID_HOUR_MS)));
  assert.ok(dates.every((date) => date % GRID_HOUR_MS === 0));
  // Only whole halves: a quarter past is not a meeting's end.
  assert.equal(readGridEventUrlState(hashFor({ ...valid, e: valid.s + 3600 + 900 })), null);
});

test('a link names our cities by key and spells the rest out, so it stays short', () => {
  const ours = [
    { id: 'a', city: 'New York', cityId: '5128581', timezone: 'America/New_York', customName: '' },
    { id: 'b', city: 'London', cityId: '2643743', timezone: 'Europe/London', customName: 'Office' },
    { id: 'c', city: 'Tokyo', cityId: '1850147', timezone: 'Asia/Tokyo', customName: '' },
    { id: 'd', city: 'Kyiv', cityId: '703448', timezone: 'Europe/Kyiv', customName: '' },
  ];
  const slots = slotsOf(ours.map((city) => ({ rowId: city.id, start })));
  const link = buildGridEventUrl('https://timecross.app/m', ours, slots, 'Team sync (weekly).');
  const restored = readGridEventUrlState(new URL(link).search);

  assert.match(link, /^https:\/\/timecross\.app\/m\?e=[0-9a-z]+\.2&t=Team\+sync\+%28weekly%29%2E&c=newYork,london~Office,tokyo,Europe\/Kyiv~Kyiv~703448$/);
  assert.ok(link.length < 120, `${link.length}: ${link}`);
  assert.equal(restored.title, 'Team sync (weekly).');
  assert.deepEqual(restored.cities.map(({ city, timezone, cityId, customName }) => [city, timezone, cityId, customName]), [
    ['New York', 'America/New_York', '5128581', ''],
    ['London', 'Europe/London', '2643743', 'Office'],
    ['Tokyo', 'Asia/Tokyo', '1850147', ''],
    ['Kyiv', 'Europe/Kyiv', '703448', ''],
  ]);
  assert.equal(buildGridEventUrl('https://timecross.app/m', restored.cities, restored.hours, restored.title), link);
});

test('separators and other awkward characters in names survive the compact form', () => {
  const odd = [
    { id: 'x', city: 'A, B ~ C: D/E + F', timezone: 'GMT_OFFSET:330', customName: '100% & more #1 ~' },
    { id: 'y', city: 'Paris', cityId: '4717560', timezone: 'America/Chicago', customName: '' },
  ];
  const link = buildGridEventUrl('https://timecross.app/m', odd, slotsOf(odd.map((city) => ({ rowId: city.id, start }))), 'a&b=c,d~e');
  const restored = readGridEventUrlState(getEventParams(`${new URL(link).search}&cities=x&at=y`, ''));

  assert.equal(restored.title, 'a&b=c,d~e');
  assert.deepEqual(restored.cities.map(({ city, timezone, cityId, customName }) => [city, timezone, cityId, customName]), [
    ['A, B ~ C: D/E + F', 'GMT_OFFSET:330', undefined, '100% & more #1 ~'],
    ['Paris', 'America/Chicago', '4717560', ''],
  ]);
});

test('fixed offsets and timezone rows, whose ids are negative, make links too', () => {
  const rows = [
    { id: 'gmt3', city: 'GMT+3', cityId: '-100180', timezone: 'GMT_OFFSET:180', customName: '' },
    { id: 'gmt-3', city: 'GMT-3', cityId: '-99820', timezone: 'GMT_OFFSET:-180', customName: '' },
    { id: 'mt', city: 'Mountain Time', cityId: '-200007', timezone: 'America/Denver', customName: '' },
  ];
  const link = buildGridEventUrl('https://timecross.app/m', rows, slotsOf(rows.map((city) => ({ rowId: city.id, start }))));
  const restored = readGridEventUrlState(new URL(link).search);

  assert.match(link, /&c=GMT_OFFSET:180~GMT%2B3~-100180,GMT_OFFSET:-180~GMT-3~-99820,America\/Denver~Mountain\+Time~-200007$/);
  assert.deepEqual(restored.cities.map(({ city, timezone, cityId }) => [city, timezone, cityId]), rows.map(({ city, timezone, cityId }) => [city, timezone, cityId]));
});

test('links in the JSON form still open, from the query and from the hash', () => {
  const query = `?${new URLSearchParams({ event: JSON.stringify({ ...valid, t: 'Sync' }) })}`;

  assert.equal(readGridEventUrlState(getEventParams(query, '')).title, 'Sync');
  assert.equal(readGridEventUrlState(hashFor(valid)).cities[0].city, 'New York');
});

test('a broken compact link opens no meeting', () => {
  const when = `${(start / (GRID_HOUR_MS / 2)).toString(36)}.2`;

  for (const search of [
    `?e=${when}`,
    `?e=${when}&c=`,
    `?e=${when}&c=atlantis`,
    `?e=${when}&c=Not/AZone~X`,
    `?e=${when}&c=london~a~b`,
    `?e=${when}&c=Europe/Kyiv~Kyiv~12ab`,
    `?e=${when}&c=Europe/Kyiv~Kyiv~--1`,
    `?e=${when}&c=Europe/Kyiv~`,
    `?e=${when}&c=Europe/Kyiv~%E0%A4%A`,
    `?e=${when}&t=+padded+&c=london`,
    `?e=${when.replace('.2', '.0')}&c=london`,
    `?e=${when.replace('.2', '.zz')}&c=london`,
    '?e=-1.2&c=london',
    `?e=${when}&c=${Array(101).fill('london').join(',')}`,
  ]) {
    assert.equal(readGridEventUrlState(search), null, search);
  }

  assert.notEqual(readGridEventUrlState(`?e=${when}&c=london`), null);
});

test('editing a meeting from a link takes its parameters, of either form, out of the query', () => {
  const link = new URL(buildGridEventUrl(baseUrl, cities, hours, 'Sync', 'ru'));

  assert.equal(removeEventParams(link.search), '');
  assert.equal(removeEventParams(`?at=2026-11-01T05:00:00.000Z&${link.search.slice(1)}&utm_source=x`), '?at=2026-11-01T05:00:00.000Z&utm_source=x');
  assert.equal(removeEventParams(`?${new URLSearchParams({ event: JSON.stringify(valid) })}`), '');
  assert.equal(removeEventParams(''), '');
});
