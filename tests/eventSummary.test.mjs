import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { formatEventDuration } from '../src/components/TimelineGrid/shared/eventSummary.ts';

/** `t` of a language, straight from its translations. */
function translatorOf(language) {
  const dictionary = JSON.parse(readFileSync(new URL(`../src/i18n/locales/${language}.json`, import.meta.url), 'utf8'));

  return (key, values = {}) => key
    .split('.')
    .reduce((node, part) => node[part], dictionary)
    .replace(/\{(\w+)\}/g, (_, name) => String(values[name]));
}

test('a meeting\'s length is short, in each language\'s own abbreviations', () => {
  const en = translatorOf('en');
  const ru = translatorOf('ru');

  assert.equal(formatEventDuration(450, en), '7h 30m');
  assert.equal(formatEventDuration(120, en), '2h');
  assert.equal(formatEventDuration(30, en), '30m');
  assert.equal(formatEventDuration(450, ru), '7 ч 30 мин');
  assert.equal(formatEventDuration(90, translatorOf('de')), '1 Std. 30 Min.');
});

test('a meeting as text for the clipboard: title, date line, every city, and the link when there is one', async () => {
  const { formatEventText } = await import('../src/components/TimelineGrid/shared/eventSummary.ts');
  const start = Date.parse('2026-11-23T03:00:00Z');
  const end = start + 7.5 * 3600000;
  const options = { locale: 'en', timeFormat: '24h', referenceTimezone: 'UTC' };
  const cities = [
    { name: 'New York', timezone: 'America/New_York' },
    { name: 'Tokyo', timezone: 'Asia/Tokyo' },
  ];

  assert.equal(formatEventText({ start, end }, 'Weekly sync', cities, options, translatorOf('en')), [
    'Weekly sync',
    '',
    'Mon, Nov 23 · 03:00 – 10:30 · 7h 30m',
    '',
    'New York 22:00 – 05:30 (Sun)',
    'Tokyo 12:00 – 19:30',
  ].join('\n'));
  assert.match(formatEventText({ start, end }, 'Sync', cities, options, translatorOf('en'), 'https://timecross.app/x'), /\n\nhttps:\/\/timecross\.app\/x$/);
});
