import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  formatOffsetLabel,
  formatRelativeOffset,
  getDayPeriod,
  getDayShift,
  getTimeZoneOffsetMinutes,
  getUtcDateForZonedTime,
  getZonedDateParts,
} from '../src/utils/time.ts';

test('offsets follow daylight saving time', () => {
  assert.equal(getTimeZoneOffsetMinutes('America/New_York', new Date('2026-01-15T12:00:00Z')), -300);
  assert.equal(getTimeZoneOffsetMinutes('America/New_York', new Date('2026-07-15T12:00:00Z')), -240);
  assert.equal(getTimeZoneOffsetMinutes('Asia/Kolkata', new Date('2026-07-15T12:00:00Z')), 330);
  assert.equal(getTimeZoneOffsetMinutes('Australia/Sydney', new Date('2026-01-15T12:00:00Z')), 660);
});

test('fixed GMT offsets are supported', () => {
  assert.equal(getTimeZoneOffsetMinutes('GMT_OFFSET:345', new Date('2026-01-15T12:00:00Z')), 345);
});

test('midnight is hour 0, never 24', () => {
  assert.equal(getZonedDateParts('UTC', new Date('2026-03-01T00:30:00Z')).hour, 0);
});

test('wall-clock time converts to UTC on both sides of a DST change', () => {
  const beforeChange = getUtcDateForZonedTime('Europe/Berlin', { year: 2026, month: 3, day: 28, hour: 12 });
  const afterChange = getUtcDateForZonedTime('Europe/Berlin', { year: 2026, month: 3, day: 30, hour: 12 });

  assert.equal(beforeChange.toISOString(), '2026-03-28T11:00:00.000Z');
  assert.equal(afterChange.toISOString(), '2026-03-30T10:00:00.000Z');
});

test('day shift compares calendar dates at the same moment', () => {
  const moment = new Date('2026-05-10T20:00:00Z');

  assert.equal(getDayShift('Asia/Tokyo', 'America/Los_Angeles', moment), 1);
  assert.equal(getDayShift('America/Los_Angeles', 'Asia/Tokyo', moment), -1);
  assert.equal(getDayShift('Europe/London', 'Europe/Paris', moment), 0);
});

test('day periods have stable boundaries', () => {
  assert.deepEqual([4, 5, 10, 11, 17, 18, 21, 22].map(getDayPeriod), ['night', 'morning', 'morning', 'day', 'day', 'evening', 'evening', 'night']);
});

test('offset labels', () => {
  assert.equal(formatRelativeOffset(0, 'same'), 'same');
  assert.equal(formatRelativeOffset(180, 'same'), '+3');
  assert.equal(formatRelativeOffset(-570, 'same'), '-9:30');
  assert.equal(formatOffsetLabel(330), 'UTC+5:30');
  assert.equal(formatOffsetLabel(-180, 'GMT'), 'GMT-3');
  assert.equal(formatOffsetLabel(0), 'UTC+0');
});

test('clock labels do not depend on a locale', async () => {
  const { formatClockTime, getClockLabel } = await import('../src/utils/time.ts');

  assert.deepEqual(getClockLabel(9, 5, '24h'), { time: '09:05', period: null });
  assert.deepEqual(getClockLabel(0, 0, '12h'), { time: '12:00', period: 'AM' });
  assert.deepEqual(getClockLabel(12, 30, '12h'), { time: '12:30', period: 'PM' });
  assert.deepEqual(getClockLabel(21, null, '24h'), { time: '21', period: null });
  assert.deepEqual(getClockLabel(21, null, '12h'), { time: '9', period: 'PM' });
  assert.equal(formatClockTime(new Date('2026-11-03T21:05:00Z'), 'Europe/Berlin', '12h'), '10:05 PM');
  assert.equal(formatClockTime(new Date('2026-11-03T21:05:00Z'), 'Asia/Tokyo', '24h'), '06:05');
});

test('date labels follow the interface language', async () => {
  const { formatShortDate, formatShortWeekday } = await import('../src/utils/time.ts');
  const moment = new Date('2026-11-03T12:00:00Z');

  assert.equal(formatShortDate(moment, 'UTC', 'en-US'), 'Nov 3');
  assert.equal(formatShortDate(moment, 'UTC', 'ru-RU'), '3 нояб');
  assert.equal(formatShortDate(moment, 'UTC', 'de-DE'), '3 Nov');
  assert.equal(formatShortDate(moment, 'UTC', 'pt-BR'), '3 nov');
  assert.equal(formatShortWeekday(moment, 'UTC', 'en-US'), 'Tue');
  assert.equal(formatShortWeekday(moment, 'UTC', 'de-DE'), 'Di');
});

test('months in the date cells are three letters in every language, and never two alike', async () => {
  const { formatThreeLetterMonth } = await import('../src/utils/time.ts');
  const { getIntlLocale } = await import('../src/i18n/intlLocale.ts');
  const { APP_LANGUAGES } = await import('../src/settings.ts');
  const months = (locale) => Array.from({ length: 12 }, (_, month) => formatThreeLetterMonth(new Date(Date.UTC(2026, month, 10)), 'UTC', locale));

  for (const language of APP_LANGUAGES) {
    const names = months(getIntlLocale(language));

    assert.ok(names.every((name) => [...name].length === 3), `${language}: ${names}`);
    assert.equal(new Set(names).size, 12, `${language}: ${names}`);
  }

  assert.equal(months('ru-RU')[10], 'ноя');
  assert.equal(months('uk-UA')[10], 'лис');
  assert.deepEqual(months('fr-FR').slice(5, 7), ['jun', 'jul']);
  // In the time zone's own date: 23:00 on October 31 in New York is still October there.
  assert.equal(formatThreeLetterMonth(new Date('2026-11-01T03:00:00Z'), 'America/New_York', 'en-US'), 'Oct');
});
