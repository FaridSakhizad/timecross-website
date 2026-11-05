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
    removeItem: (key) => {
      storage.delete(key);
    },
  },
});

const settings = await import('../src/settings.ts');

beforeEach(() => {
  failWrites = false;
});

/** Simulates a page load: settings are read from storage again. */
function reloadSettings() {
  window.dispatchEvent(Object.assign(new Event('storage'), { key: null }));
}

const city = (id, extra = {}) => ({ id, city: id, timezone: 'UTC', customName: '', ...extra });
const selectedIds = () => settings.getSettings().selectedCities.map((item) => item.id);

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

test('default cities skip hidden preset cities', () => {
  storage.clear();
  reloadSettings();

  const hiddenIds = settings.MARKETING_DEFAULT_SELECTED_CITIES
    .filter((item) => item.visible === false)
    .map((item) => item.id);

  assert.ok(hiddenIds.length > 0);
  assert.ok(selectedIds().length > 0);
  assert.ok(selectedIds().every((id) => !hiddenIds.includes(id)));
});

test('old settings: the order list wins, hidden cities and computed fields are dropped', () => {
  storage.clear();
  storage.set('timecross:settings', JSON.stringify({
    version: 1,
    language: 'ru',
    cityOrder: ['b', 'missing', 'a', 'b'],
    selectedCities: [
      city('a', { order: 0, utcOffset: 'UTC+0', timeOffset: 'UTC+0', time: '', period: 'day' }),
      city('b', { cityId: '42', order: 1, displayCity: 'Бэ' }),
      city('hidden', { visible: false }),
      city('d', { customName: 'Home' }),
      city('a'),
    ],
  }));
  reloadSettings();

  const current = settings.getSettings();

  assert.deepEqual(selectedIds(), ['b', 'a', 'd']);
  assert.equal(current.language, 'ru');
  assert.deepEqual(current.selectedCities[0], { id: 'b', cityId: '42', customName: '', city: 'b', timezone: 'UTC' });
  assert.deepEqual(current.selectedCities[1], { id: 'a', customName: '', city: 'a', timezone: 'UTC' });
  assert.equal(current.selectedCities[2].customName, 'Home');
  assert.equal('cityOrder' in current, false);
});

test('the oldest order key applies once and is removed on the next save', () => {
  storage.clear();
  storage.set('timecross:settings', JSON.stringify({ selectedCities: [city('a'), city('b'), city('c')] }));
  storage.set('timecross:cities-order', JSON.stringify(['c', 'a']));
  reloadSettings();

  assert.deepEqual(selectedIds(), ['c', 'a', 'b']);

  settings.updateSettings((current) => ({
    ...current,
    selectedCities: [...current.selectedCities].reverse(),
  }));
  reloadSettings();

  assert.equal(storage.has('timecross:cities-order'), false);
  assert.equal('cityOrder' in JSON.parse(storage.get('timecross:settings')), false);
  assert.deepEqual(selectedIds(), ['b', 'a', 'c']);
});

test('settings without an order list keep the array order', () => {
  storage.clear();
  storage.set('timecross:settings', JSON.stringify({ selectedCities: [city('z'), city('y'), city('x')] }));
  reloadSettings();

  assert.deepEqual(selectedIds(), ['z', 'y', 'x']);
});
