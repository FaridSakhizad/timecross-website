import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCalendarEventFile, downloadCalendarFile } from '../src/components/TimelineGrid/shared/calendarEventFile.ts';
import { buildGridCalendarEvent } from '../src/components/TimelineGrid/shared/gridSelection.ts';

const start = Date.parse('2026-11-01T05:00:00Z');
const event = buildGridCalendarEvent([
  { rowId: 'ny', start }, { rowId: 'lon', start },
], [
  { id: 'ny', name: 'New York', timezone: 'America/New_York' },
  { id: 'lon', name: 'London', timezone: 'Europe/London' },
], 'America/Edmonton', 'Meeting, friends; Привет\\Hello\nNext line');

test('ICS exports the same UTC interval and description as Google Calendar, including DST', async () => {
  const file = createCalendarEventFile(event);
  const text = (await file.text()).replace(/\r\n[ \t]/g, '');
  assert.equal(file.name, 'timecross-20261101T050000Z.ics');
  assert.equal(file.type, 'text/calendar');
  assert.match(text, /BEGIN:VCALENDAR\r\n/);
  assert.equal(text.match(/BEGIN:VEVENT/g).length, 1);
  assert.match(text, /DTSTART:20261101T050000Z\r\n/);
  assert.match(text, /DTEND:20261101T060000Z\r\n/);
  assert.match(text, /UID:.+\r\n/);
  assert.match(text, /DTSTAMP:\d{8}T\d{6}Z\r\n/);
  const unescape = (value) => value.replace(/\\([nN,;\\])/g, (_, char) => /n/i.test(char) ? '\n' : char);
  assert.equal(unescape(text.match(/^DESCRIPTION:(.*)$/m)[1]), event.details);
  assert.equal(unescape(text.match(/^SUMMARY:(.*)$/m)[1]), event.title);
  assert.match(event.details, /UTC-04:00 -> UTC-05:00/);
  assert.equal(new URL(event.url).searchParams.get('dates'), '20261101T050000Z/20261101T060000Z');
});

test('download uses a temporary anchor and releases its object URL after browser consumption', (t) => {
  const file = createCalendarEventFile(event);
  const calls = [];
  const link = { click() { calls.push('click'); }, remove() { calls.push('remove'); } };
  t.mock.method(URL, 'createObjectURL', (value) => { assert.equal(value, file); return 'blob:event'; });
  t.mock.method(URL, 'revokeObjectURL', (url) => calls.push(url));
  t.mock.method(globalThis, 'setTimeout', (callback, delay) => { assert.equal(delay, 30000); calls.push(callback); });
  const previous = globalThis.document;
  globalThis.document = { createElement: () => link, body: { append: () => calls.push('append') } };
  try {
    downloadCalendarFile(file);
    assert.equal(link.download, file.name);
    assert.equal(link.href, 'blob:event');
    assert.deepEqual(calls.slice(0, 3), ['append', 'click', 'remove']);
    calls[3]();
    assert.equal(calls[4], 'blob:event');
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
});

