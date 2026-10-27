import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildGridCalendarEvent, buildOutlookCalendarUrl, getGridHourRanges, getGridSelectionBounds, intersectsSelection, resizeGridSelection } from '../src/components/TimelineGrid/desktop/gridSelection.ts';

const hour = 3600000;
const start = Date.parse('2026-10-23T16:00:00Z');
const selected = (rowId, count = 3, first = start) => Array.from({ length: count }, (_, i) => ({ rowId, start: first + i * hour }));
const cities = [
  { id: 'ny', name: 'New York', timezone: 'America/New_York' },
  { id: 'lon', name: 'London', timezone: 'Europe/London' },
  { id: 'tok', name: 'Tokyo', timezone: 'Asia/Tokyo' },
];

test('Outlook receives the same instants and unmodified multilingual event text as Google Calendar', () => {
  const event = buildGridCalendarEvent([...selected('ny'), ...selected('lon')], cities,
    'America/Edmonton', 'Встреча & friends + team?');
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
  const ranges = getGridHourRanges([...selected('ny'), ...selected('ny'), ...selected('ny', 1, start + 5 * hour), ...selected('lon', 1)]);
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
  hour: { rowId: String(row), start: start + col * hour },
  rect: { left: col * 74, right: col * 74 + 64, top: row * 111 + 41, bottom: row * 111 + 105 },
  rowTop: row * 111, rowBottom: (row + 1) * 111,
}))).flat();
const initial = geometry.filter((cell) => ['1', '2'].includes(cell.hour.rowId) && cell.hour.start >= start + hour && cell.hour.start <= start + 2 * hour).map((cell) => cell.hour);

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
    const result = resizeGridSelection(geometry, initial, direction, direction.includes('w') ? 9999 : -9999,
      direction.includes('n') ? 9999 : -9999);
    assert.ok(result.length >= 1);
    const bounds = getGridSelectionBounds(geometry, result);
    if (!direction.includes('w')) assert.equal(bounds.left, 74);
    if (!direction.includes('e')) assert.equal(bounds.right, 212);
    if (!direction.includes('n')) assert.equal(bounds.top, 111);
    if (!direction.includes('s')) assert.equal(bounds.bottom, 333);
  }
});

test('corner resize fills the bounding rectangle of a disjoint selection deterministically', () => {
  const disjoint = [geometry[0].hour, geometry.at(-1).hour];
  const result = resizeGridSelection(geometry, disjoint, 'se', 212, 333);
  assert.equal(result.length, 9);
  assert.equal(resizeGridSelection(geometry, [], 'e', 10, 10).length, 0);
});
