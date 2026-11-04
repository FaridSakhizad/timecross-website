import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

const storage = new Map();
let failWrites = false;

globalThis.window = Object.assign(new EventTarget(), {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => {
      if (failWrites) {
        throw new Error('QuotaExceededError');
      }
      storage.set(key, value);
    },
  },
});

const settings = await import('../src/settings.ts');

beforeEach(() => {
  failWrites = false;
});

test('snapshot keeps its identity until settings change', () => {
  const first = settings.getSettings();

  assert.equal(settings.getSettings(), first);
  settings.updateSettings((current) => ({ ...current, timeFormat: '12h' }));
  assert.notEqual(settings.getSettings(), first);
  assert.equal(settings.getSettings().timeFormat, '12h');
});

test('subscribers are notified about local and cross-tab changes', () => {
  let calls = 0;
  const unsubscribe = settings.subscribeSettings(() => {
    calls += 1;
  });

  settings.updateSettings((current) => ({ ...current, colorMode: 'night' }));
  storage.set('timecross:settings', JSON.stringify({ ...settings.getSettings(), colorMode: 'day' }));
  window.dispatchEvent(Object.assign(new Event('storage'), { key: 'timecross:settings' }));
  unsubscribe();
  settings.updateSettings((current) => ({ ...current, colorMode: 'night' }));

  assert.equal(calls, 2);
});

test('a failing storage write keeps the new value in memory', () => {
  failWrites = true;
  assert.doesNotThrow(() => settings.updateSettings((current) => ({ ...current, language: 'de' })));
  assert.equal(settings.getSettings().language, 'de');
});

test('only known language codes are accepted', () => {
  assert.equal(settings.isSupportedLanguage('ua'), false);
  assert.equal(settings.isSupportedLanguage('uk'), true);
});
