import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  HOURS,
  INITIAL_CLOCK_INPUT,
  format24h,
  get12hParts,
  parseClockInput,
} from '../src/pages/hourClock.ts';

const time = (hour, minute = 0) => ({ hour, minute });

test('a 24-hour time is read with or without minutes and separators', () => {
  assert.deepEqual(parseClockInput('16:00'), time(16));
  assert.deepEqual(parseClockInput(' 16 '), time(16));
  assert.deepEqual(parseClockInput('9.30'), time(9, 30));
  assert.deepEqual(parseClockInput('1630'), time(16, 30));
  assert.deepEqual(parseClockInput('930'), time(9, 30));
  assert.deepEqual(parseClockInput('16h30'), time(16, 30));
  assert.deepEqual(parseClockInput('16 h'), time(16));
  assert.deepEqual(parseClockInput('16 Uhr'), time(16));
  assert.deepEqual(parseClockInput('00:00'), time(0));
  assert.deepEqual(parseClockInput('24:00'), time(0));
});

test('a 12-hour time is read with AM/PM as our languages write it', () => {
  assert.deepEqual(parseClockInput('4 pm'), time(16));
  assert.deepEqual(parseClockInput('4PM'), time(16));
  assert.deepEqual(parseClockInput('4:30 p. m.'), time(16, 30));
  assert.deepEqual(parseClockInput('4:30 p.m.'), time(16, 30));
  assert.deepEqual(parseClockInput('9a'), time(9));
  assert.deepEqual(parseClockInput('4 пп'), time(16));
  assert.deepEqual(parseClockInput('12 am'), time(0));
  assert.deepEqual(parseClockInput('12:15 AM'), time(0, 15));
  assert.deepEqual(parseClockInput('12 pm'), time(12));
});

test('anything else is not a time', () => {
  for (const input of ['', 'abc', '25', '24:30', '16:75', '13 pm', '0 am', '4 xm', '4:3', '12345', '-4']) {
    assert.equal(parseClockInput(input), null, input);
  }
});

test('a time is shown in both formats', () => {
  assert.equal(format24h(time(9, 5)), '09:05');
  assert.deepEqual(get12hParts(time(0)), { time: '12:00', period: 'am' });
  assert.deepEqual(get12hParts(time(9, 5)), { time: '9:05', period: 'am' });
  assert.deepEqual(get12hParts(time(12)), { time: '12:00', period: 'pm' });
  assert.deepEqual(get12hParts(time(23, 59)), { time: '11:59', period: 'pm' });
  assert.deepEqual(parseClockInput(INITIAL_CLOCK_INPUT), time(16));
});

test('every language says every hour of the table', () => {
  const localesDir = new URL('../src/i18n/locales/', import.meta.url);

  for (const fileName of readdirSync(localesDir).filter((name) => name.endsWith('.json'))) {
    const { spoken } = JSON.parse(readFileSync(new URL(fileName, localesDir), 'utf8')).hourClock;

    assert.deepEqual(Object.keys(spoken).map(Number), [...HOURS], fileName);
    assert.ok(Object.values(spoken).every((text) => text.trim()), fileName);
  }
});
