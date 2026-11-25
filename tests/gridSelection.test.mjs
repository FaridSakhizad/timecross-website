import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildGridCalendarEvent, buildOutlookCalendarUrl, getGridSlotRanges, getGridSelectionBounds, getHourCellSlots, getMeetingSlots, getFrameSidePadding, getMeetingSpan, getWholeHourSlots, gridSlotKey, moveSlotsByDays, intersectsSelection, isGridHourSelected, resizeGridSelection, resizeGridSelectionRect } from '../src/components/TimelineGrid/shared/gridSelection.ts';

import { slotsOf } from './support/gridSlots.mjs';

const hour = 3600000;
const start = Date.parse('2026-10-23T16:00:00Z');
// `count` whole hours of a row, as the half-hour slots a selection is made of.
const selected = (rowId, count = 3, first = start) => slotsOf(Array.from({ length: count }, (_, i) => ({ rowId, start: first + i * hour })));
const cities = [
  { id: 'ny', name: 'New York', timezone: 'America/New_York' },
  { id: 'lon', name: 'London', timezone: 'Europe/London' },
  { id: 'tok', name: 'Tokyo', timezone: 'Asia/Tokyo' },
];

test('free resize moves only the requested edges with fractional precision for all eight handles', () => {
  const initial = { left: 100, right: 300, top: 200, bottom: 500 };
  const limits = { left: 0, right: 1000, top: 0, bottom: 1000 };

  for (const direction of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']) {
    const x = direction.includes('w') ? 86.5 : 313.5;
    const y = direction.includes('n') ? 186.5 : 513.5;
    const rect = resizeGridSelectionRect(initial, limits, direction, x, y);

    assert.deepEqual(rect, {
      left: direction.includes('w') ? 86.5 : initial.left,
      right: direction.includes('e') ? 313.5 : initial.right,
      top: direction.includes('n') ? 186.5 : initial.top,
      bottom: direction.includes('s') ? 513.5 : initial.bottom,
    }, direction);
  }

  assert.deepEqual(initial, { left: 100, right: 300, top: 200, bottom: 500 });
});

test('free resize stays inside the grid and never inverts or collapses the rectangle', () => {
  const initial = { left: 100, right: 300, top: 200, bottom: 500 };
  const limits = { left: 0, right: 1000, top: 0, bottom: 1000 };

  assert.deepEqual(resizeGridSelectionRect(initial, limits, 'nw', -500, -500), { ...initial, left: 0, top: 0 });
  assert.deepEqual(resizeGridSelectionRect(initial, limits, 'se', 1500, 1500), { ...initial, right: 1000, bottom: 1000 });
  assert.deepEqual(resizeGridSelectionRect(initial, limits, 'nw', 1500, 1500), { ...initial, left: 299, top: 499 });
  assert.deepEqual(resizeGridSelectionRect(initial, limits, 'se', -500, -500), { ...initial, right: 101, bottom: 201 });
});

test('Outlook receives the same instants and unmodified multilingual event text as Google Calendar', () => {
  const event = buildGridCalendarEvent([...selected('ny'), ...selected('lon')], cities, 'America/Edmonton', 'Встреча & friends + team?');
  const url = new URL(buildOutlookCalendarUrl(event));

  assert.equal(url.origin, 'https://outlook.live.com');
  assert.equal(url.pathname, '/calendar/0/deeplink/compose');
  assert.equal(url.searchParams.get('allday'), 'false');
  assert.equal(url.searchParams.get('subject'), event.title);
  assert.equal(url.searchParams.get('body'), event.details);
  assert.equal(url.searchParams.get('startdt'), '2026-10-23T16:00:00.000Z');
  assert.equal(url.searchParams.get('enddt'), '2026-10-23T19:00:00.000Z');
  assert.equal(url.searchParams.get('path'), '/calendar/action/compose');
  assert.equal(url.searchParams.get('rru'), 'addevent');
});

test('Outlook UTC dates preserve midnight and DST crossings without shifting wall times', () => {
  for (const instant of ['2026-11-01T05:00:00Z', '2026-03-08T06:00:00Z', '2027-01-01T04:00:00Z']) {
    const event = buildGridCalendarEvent(selected('ny', 2, Date.parse(instant)), cities, 'Asia/Kathmandu', 'Meeting');
    const url = new URL(buildOutlookCalendarUrl(event));

    assert.equal(Date.parse(url.searchParams.get('startdt')), event.start);
    assert.equal(Date.parse(url.searchParams.get('enddt')), event.end);
    assert.equal(url.searchParams.get('body'), event.details);
  }
});

test('rectangle intersection includes partially covered blocks but not touching edges', () => {
  const rect = { left: 10, top: 10, right: 20, bottom: 20 };

  assert.equal(intersectsSelection(rect, { left: 19, top: 19, right: 30, bottom: 30 }), true);
  assert.equal(intersectsSelection(rect, { left: 20, top: 10, right: 30, bottom: 20 }), false);
});

test('contiguous cells merge while gaps and distinct rows remain separate', () => {
  const ranges = getGridSlotRanges([...selected('ny'), ...selected('ny'), ...selected('ny', 1, start + 5 * hour), ...selected('lon', 1)]);

  assert.deepEqual(ranges, [
    { rowId: 'ny', start, end: start + 3 * hour },
    { rowId: 'ny', start: start + 5 * hour, end: start + 6 * hour },
    { rowId: 'lon', start, end: start + hour },
  ]);
});

test('Google Calendar receives absolute UTC dates and the browser timezone, not source wall time', () => {
  const event = buildGridCalendarEvent([...selected('ny'), ...selected('lon'), ...selected('tok')], cities, 'America/Edmonton', 'Meeting & <friends>');
  const url = new URL(event.url);

  assert.equal(url.origin, 'https://calendar.google.com');
  assert.equal(url.searchParams.get('dates'), '20261023T160000Z/20261023T190000Z');
  assert.equal(url.searchParams.get('stz'), 'America/Edmonton');
  assert.equal(url.searchParams.get('etz'), 'America/Edmonton');
  assert.equal(url.searchParams.get('text'), 'Meeting & <friends>');
  assert.match(event.details, /New York 12:00 -> 15:00/);
  assert.match(event.details, /London 17:00 -> 20:00/);
  assert.match(event.details, /Tokyo 01:00 -> 04:00 \(2026-10-24/);
});

test('single hour duration, month/year crossings and separate ranges are explicit', () => {
  const event = buildGridCalendarEvent([
    ...selected('ny', 1, Date.parse('2027-01-01T04:00:00Z')),
    ...selected('ny', 1, Date.parse('2027-01-01T07:00:00Z')),
  ], cities, 'Asia/Kathmandu', 'Meeting');

  assert.equal(event.end - event.start, 4 * hour);
  assert.match(event.details, /23:00 -> 00:00 \(2026-12-31 -> 2027-01-01/);
  assert.equal(event.details.split('\n').length, 2);
});

test('DST spring gap and fall repeated hour are calculated from instants without ambiguity', () => {
  const fall = buildGridCalendarEvent(selected('ny', 1, Date.parse('2026-11-01T05:00:00Z')), cities, 'America/Edmonton', 'Meeting');

  assert.equal(fall.end - fall.start, hour);
  assert.match(fall.details, /01:00 -> 01:00/);
  assert.match(fall.details, /UTC-04:00 -> UTC-05:00/);
  const spring = buildGridCalendarEvent(selected('ny', 1, Date.parse('2026-03-08T06:00:00Z')), cities, 'America/Edmonton', 'Meeting');

  assert.equal(spring.end - spring.start, hour);
  assert.match(spring.details, /01:00 -> 03:00/);
});

test('fractional and abstract timezone offsets are supported in descriptions', () => {
  const event = buildGridCalendarEvent([...selected('np', 1), ...selected('fixed', 1)], [
    { id: 'np', name: 'Kathmandu', timezone: 'Asia/Kathmandu' },
    { id: 'fixed', name: 'GMT+5:30', timezone: 'GMT_OFFSET:330' },
  ], 'UTC', 'Meeting');

  assert.match(event.details, /Kathmandu 21:45 -> 22:45/);
  assert.match(event.details, /GMT\+5:30 21:30 -> 22:30/);
});

test('empty, invalid or removed rows cannot produce a calendar event', () => {
  assert.equal(buildGridCalendarEvent([], cities, 'UTC', ''), null);
  assert.equal(buildGridCalendarEvent(selected('removed'), cities, 'UTC', ''), null);
  assert.equal(buildGridCalendarEvent([{ rowId: 'ny', start: NaN }], cities, 'UTC', ''), null);
});

const geometry = Array.from({ length: 4 }, (_, row) => Array.from({ length: 5 }, (_, col) => ({
  slot: { rowId: String(row), start: start + col * hour },
  rect: { left: col * 74, right: col * 74 + 64, top: row * 111 + 41, bottom: row * 111 + 105 },
  rowTop: row * 111,
  rowBottom: (row + 1) * 111,
}))).flat();
const initial = geometry.filter((cell) => ['1', '2'].includes(cell.slot.rowId) && cell.slot.start >= start + hour && cell.slot.start <= start + 2 * hour).map((cell) => cell.slot);

test('persistent frame includes the entire city header and complete hour cells', () => {
  assert.deepEqual(getGridSelectionBounds(geometry, initial), { left: 74, right: 212, top: 111, bottom: 333 });
  assert.equal(getGridSelectionBounds(geometry, []), null);
});

test('side handles expand and shrink by whole hours or whole cities', () => {
  assert.equal(resizeGridSelection(geometry, initial, 'e', 360, 0).length, 8);
  assert.equal(resizeGridSelection(geometry, initial, 'w', 148, 0).length, 2);
  assert.equal(resizeGridSelection(geometry, initial, 'n', 0, 0).length, 6);
  assert.equal(resizeGridSelection(geometry, initial, 's', 0, 444).length, 6);
});

test('all eight handles keep their opposite edges fixed and never cross to zero cells', () => {
  for (const direction of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']) {
    const result = resizeGridSelection(geometry, initial, direction, direction.includes('w') ? 9999 : -9999, direction.includes('n') ? 9999 : -9999);

    assert.ok(result.length >= 1);
    const bounds = getGridSelectionBounds(geometry, result);

    if (!direction.includes('w')) {
      assert.equal(bounds.left, 74);
    }

    if (!direction.includes('e')) {
      assert.equal(bounds.right, 212);
    }

    if (!direction.includes('n')) {
      assert.equal(bounds.top, 111);
    }

    if (!direction.includes('s')) {
      assert.equal(bounds.bottom, 333);
    }
  }
});

test('corner resize fills the bounding rectangle of a disjoint selection deterministically', () => {
  const disjoint = [geometry[0].slot, geometry.at(-1).slot];
  const result = resizeGridSelection(geometry, disjoint, 'se', 212, 333);

  assert.equal(result.length, 9);
  assert.equal(resizeGridSelection(geometry, [], 'e', 10, 10).length, 0);
});

test('the meeting takes the selection\'s hours in every participant\'s row, covered or not', () => {
  // The frame covers New York and London; London is unchecked, Tokyo checked.
  const hours = [...selected('ny'), ...selected('lon')];

  assert.deepEqual(getMeetingSpan(hours), { start, end: start + 3 * hour });
  assert.deepEqual(getMeetingSlots(hours, new Set(['ny', 'tok'])), [...selected('ny'), ...selected('tok')]);

  const event = buildGridCalendarEvent(getMeetingSlots(hours, new Set(['ny', 'tok'])), cities.filter((city) => city.id !== 'lon'), 'UTC', 'Sync');

  assert.ok(event.details.includes('New York') && event.details.includes('Tokyo'));
  assert.ok(!event.details.includes('London'));
});

test('a meeting for no one has its span but no hours and no calendar event', () => {
  const hours = selected('ny');

  assert.deepEqual(getMeetingSpan(hours), { start, end: start + 3 * hour });
  assert.deepEqual(getMeetingSlots(hours, new Set()), []);
  assert.equal(buildGridCalendarEvent([], [], 'UTC', 'Sync'), null);
  assert.equal(getMeetingSpan([]), null);
});

test('an hour\'s cell is two halves of its width, which keep the cell\'s other fields', () => {
  const cell = { element: 'td', slot: { rowId: 'ny', start }, rect: { left: 100, right: 164, top: 0, bottom: 64 }, rowTop: 0, rowBottom: 70 };
  const halves = getHourCellSlots(cell);

  assert.deepEqual(halves.map((half) => half.slot.start), [start, start + hour / 2]);
  assert.deepEqual(halves.map((half) => [half.rect.left, half.rect.right]), [[100, 132], [132, 164]]);
  assert.ok(halves.every((half) => half.element === 'td' && half.rowBottom === 70));
});

test('an hour\'s cell shows as selected when either of its halves is', () => {
  const keys = new Set([gridSlotKey({ rowId: 'ny', start: start + hour / 2 })]);

  assert.equal(isGridHourSelected(keys, 'ny', start), true);
  assert.equal(isGridHourSelected(keys, 'ny', start + hour), false);
  assert.equal(isGridHourSelected(keys, 'lon', start), false);
});

test('a meeting can start and end at half past: 16:30 – 17:30', () => {
  const halves = selected('ny', 2).slice(1, -1);

  assert.deepEqual(getGridSlotRanges(halves), [{ rowId: 'ny', start: start + hour / 2, end: start + 1.5 * hour }]);

  const event = buildGridCalendarEvent(halves, cities, 'UTC', 'Sync');

  assert.equal(new URL(event.url).searchParams.get('dates'), '20261023T163000Z/20261023T173000Z');
  assert.match(event.details, /^New York 12:30 -> 13:30/);
});

test('a drawn frame takes every half of each hour it touches, in the cells\' order', () => {
  const cells = ['ny', 'lon'].flatMap((rowId, row) => [0, 1, 2].flatMap((col) => getHourCellSlots({
    slot: { rowId, start: start + col * hour },
    rect: { left: col * 74, right: col * 74 + 64, top: row * 100, bottom: row * 100 + 64 },
    rowTop: row * 100,
    rowBottom: row * 100 + 100,
  })));
  // The second half of New York's first hour and the first half of its second.
  const touched = [{ rowId: 'ny', start: start + hour / 2 }, { rowId: 'ny', start: start + hour }];

  assert.deepEqual(getWholeHourSlots(cells, touched), selected('ny', 2));
  assert.deepEqual(getWholeHourSlots(cells, []), []);
});

test('a frame stands out into the gaps at whole hours and sits on the middle of a cell at half past', () => {
  assert.deepEqual(getFrameSidePadding(selected('ny', 2), 6), { left: 6, right: 6 });
  assert.deepEqual(getFrameSidePadding(selected('ny', 2).slice(1), 6), { left: 0, right: 6 });
  assert.deepEqual(getFrameSidePadding(selected('ny', 2).slice(0, -1), 6), { left: 6, right: 0 });
  // A dragged side follows the pointer.
  assert.deepEqual(getFrameSidePadding(selected('ny', 2), 6, 'e'), { left: 6, right: 0 });
  assert.deepEqual(getFrameSidePadding([], 6), { left: 6, right: 6 });
});

test('a selection moved to another day keeps its hours on the clock, also across daylight saving time', () => {
  // 13:00 and 13:30 in New York on Sunday, November 1 2026, the first day of standard time.
  const sunday = [Date.parse('2026-11-01T18:00:00Z'), Date.parse('2026-11-01T18:30:00Z')];
  const slots = sunday.map((time) => ({ rowId: 'ny', start: time }));

  // The day before is still daylight saving time: 13:00 there is an hour earlier in UTC.
  assert.deepEqual(moveSlotsByDays(slots, -1, 'America/New_York').map((slot) => new Date(slot.start).toISOString()), [
    '2026-10-31T17:00:00.000Z',
    '2026-10-31T17:30:00.000Z',
  ]);
  assert.deepEqual(moveSlotsByDays(slots, 2, 'America/New_York').map((slot) => new Date(slot.start).toISOString()), [
    '2026-11-03T18:00:00.000Z',
    '2026-11-03T18:30:00.000Z',
  ]);
  assert.deepEqual(moveSlotsByDays(slots, 0, 'America/New_York'), slots);
});
