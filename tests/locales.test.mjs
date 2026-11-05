import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

const localesDir = new URL('../src/i18n/locales/', import.meta.url);
const readLocale = (name) => JSON.parse(readFileSync(new URL(name, localesDir), 'utf8'));

const flattenKeys = (value, prefix = '') => Object.entries(value).flatMap(([key, child]) => (
  child && typeof child === 'object' ? flattenKeys(child, `${prefix}${key}.`) : [`${prefix}${key}`]
));

const englishKeys = flattenKeys(readLocale('en.json')).sort();

for (const fileName of readdirSync(localesDir).filter((name) => name.endsWith('.json') && name !== 'en.json')) {
  test(`${fileName} has exactly the same keys as en.json`, () => {
    const keys = flattenKeys(readLocale(fileName)).sort();

    assert.deepEqual(englishKeys.filter((key) => !keys.includes(key)), [], 'missing keys');
    assert.deepEqual(keys.filter((key) => !englishKeys.includes(key)), [], 'unknown keys');
  });
}
