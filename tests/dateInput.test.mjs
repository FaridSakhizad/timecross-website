import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { registerSourceLoader } from './support/sourceLoader.mjs';

const hooks = registerSourceLoader();

after(() => hooks.deregister());

const {
  formatDateButtonLabel,
  getDateInputValue,
  getTimeInputValue,
  parseDateInput,
} = await import('../src/components/TimeZoneConverter/dateInput.ts');

test('input values are the date and time in the given time zone', () => {
  const date = new Date('2026-11-05T23:30:00Z');

  assert.equal(getDateInputValue('Asia/Tokyo', date), '2026-11-06');
  assert.equal(getTimeInputValue('Asia/Tokyo', date), '08:30');
  assert.equal(getDateInputValue('America/Los_Angeles', date), '2026-11-05');
  assert.equal(getTimeInputValue('America/Los_Angeles', date), '15:30');
  assert.equal(getTimeInputValue('Asia/Kathmandu', new Date('2026-01-01T00:00:00Z')), '05:45');
});

test('valid input values are parsed into numbers', () => {
  assert.deepEqual(parseDateInput('2026-11-05', '09:05'), {
    year: 2026,
    month: 11,
    day: 5,
    hour: 9,
    minute: 5,
  });
  assert.deepEqual(parseDateInput('2028-02-29', '23:59'), {
    year: 2028,
    month: 2,
    day: 29,
    hour: 23,
    minute: 59,
  });
});

test('impossible dates and times and other formats are rejected', () => {
  const invalid = [
    ['2026-02-31', '12:00'],
    ['2026-02-29', '12:00'],
    ['2026-13-01', '12:00'],
    ['2026-11-05', '24:00'],
    ['2026-11-05', '12:60'],
    ['2026-11-05', '9:05'],
    ['26-11-05', '12:00'],
    ['2026-11-05T12:00', '12:00'],
    ['', ''],
  ];

  for (const [date, time] of invalid) {
    assert.equal(parseDateInput(date, time), null, `${date} ${time}`);
  }
});

test('the date button shows a short date with a capitalized month in the interface language', () => {
  assert.equal(formatDateButtonLabel('2026-11-05', 'en'), 'Nov 5, 2026');
  assert.equal(formatDateButtonLabel('2026-11-05', 'ru'), '5 Нояб 2026');
  assert.equal(formatDateButtonLabel('2026-05-01', 'de'), '1. Mai 2026');
  assert.equal(formatDateButtonLabel('2026-11-05', 'pt-BR'), '5 de Nov de 2026');
  // In Portugal a short date is written with numbers (the locale data's own format).
  assert.equal(formatDateButtonLabel('2026-11-05', 'pt'), '5/11/2026');
});

test('an invalid date is shown as it is', () => {
  assert.equal(formatDateButtonLabel('2026-02-31', 'en'), '2026-02-31');
});
