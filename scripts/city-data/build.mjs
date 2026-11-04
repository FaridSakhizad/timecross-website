/**
 * Builds the city data the website loads, from the mobile app's SQLite database.
 *
 *   npm run data:cities                     # reads data-source/cities.db
 *   npm run data:cities -- path/to/cities.db
 *
 * Writes:
 *   public/data/cities-search.json      full list for the "Add city" search
 *   public/data/city-names/{lang}.json  localized display names, one small file per language
 *
 * data-source/ is git-ignored; the generated files are committed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { APP_LANGUAGES } from '../../src/settings.ts';

const root = new URL('../../', import.meta.url);
const databasePath = process.argv[2] ?? new URL('data-source/cities.db', root).pathname;
const db = new DatabaseSync(databasePath, { readOnly: true });

// [id, name, country, admin1, tz, population]. The normalized name is computed in the browser,
// coordinates are not used by the website.
const cities = db.prepare('SELECT id, name, country, admin1, tz, pop FROM cities ORDER BY id').all()
  .map((row) => [row.id, row.name, row.country, row.admin1, row.tz, row.pop]);

// [cityId, locale, name, isPreferred], sorted so that the first alias of a city in a language is
// its display name: preferred names first, then alphabetical. The browser relies on this order.
const aliases = db.prepare('SELECT city_id, locale, name, is_preferred FROM city_aliases').all()
  .map((row) => [row.city_id, row.locale, row.name, row.is_preferred])
  .sort((left, right) => (
    left[0] - right[0]
    || left[1].localeCompare(right[1])
    || right[3] - left[3]
    || left[2].localeCompare(right[2])
  ));

const toJson = (value) => `${JSON.stringify(value)}\n`;
const dataDirectory = new URL('public/data/', root);

writeFileSync(new URL('cities-search.json', dataDirectory), toJson({ cities, aliases }));

// Display names that differ from the base name, per language: { "2867714": "Мюнхен" }.
const baseNames = new Map(cities.map(([id, name]) => [id, name]));
const namesByLanguage = new Map(APP_LANGUAGES.map((language) => [language, {}]));

const seenDisplayNames = new Set();

for (const [cityId, locale, name] of aliases) {
  const key = `${cityId}:${locale}`;

  if (seenDisplayNames.has(key)) {
    continue;
  }

  seenDisplayNames.add(key);

  if (namesByLanguage.has(locale) && name !== baseNames.get(cityId)) {
    namesByLanguage.get(locale)[cityId] = name;
  }
}

mkdirSync(new URL('city-names/', dataDirectory), { recursive: true });

for (const [language, names] of namesByLanguage) {
  writeFileSync(new URL(`city-names/${language}.json`, dataDirectory), toJson(names));
}

console.log(`${cities.length} cities, ${aliases.length} aliases.`);
console.log([...namesByLanguage].map(([language, names]) => `${language}: ${Object.keys(names).length} names`).join(', '));
