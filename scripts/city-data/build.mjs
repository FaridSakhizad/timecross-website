/**
 * Builds the city data the website loads, from the mobile app's SQLite database plus German and
 * Portuguese names from GeoNames (the app database has no de/pt names; it stays untouched).
 *
 *   npm run data:cities
 *   npm run data:cities -- --db path/to/cities.db --alternate-names path/to/alternateNamesV2.txt
 *
 * Defaults: data-source/cities.db and data-source/alternateNamesV2.txt
 * (https://download.geonames.org/export/dump/alternateNamesV2.zip, CC BY 4.0).
 *
 * Writes:
 *   public/data/cities-search.json      full list for the "Add city" search
 *   public/data/city-names/{lang}.json  localized display names, one small file per language
 *
 * data-source/ is git-ignored; the generated files are committed.
 */
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import { APP_LANGUAGES } from '../../src/settings.ts';

const root = new URL('../../', import.meta.url);
const { values: options } = parseArgs({
  options: {
    db: { type: 'string', default: new URL('data-source/cities.db', root).pathname },
    'alternate-names': { type: 'string', default: new URL('data-source/alternateNamesV2.txt', root).pathname },
  },
});

// Languages taken from GeoNames because the app database does not have them.
const GEONAMES_LANGUAGES = new Set(['de', 'pt']);

if (!existsSync(options['alternate-names'])) {
  throw new Error(`GeoNames alternate names not found at ${options['alternate-names']}. Pass --alternate-names.`);
}

const db = new DatabaseSync(options.db, { readOnly: true });

// [id, name, country, admin1, tz, population]. The normalized name is computed in the browser,
// coordinates are not used by the website.
const cities = db.prepare('SELECT id, name, country, admin1, tz, pop FROM cities ORDER BY id').all()
  .map((row) => [row.id, row.name, row.country, row.admin1, row.tz, row.pop]);
const baseNames = new Map(cities.map(([id, name]) => [id, name]));

// Aliases with a display rank: [cityId, locale, name, isPreferred, rank]. The rank is used only for
// sorting and is not written out. App database names keep their order (rank 0).
const appAliases = db.prepare('SELECT city_id, locale, name, is_preferred FROM city_aliases').all()
  .map((row) => [row.city_id, row.locale, row.name, row.is_preferred, 0]);

// GeoNames columns: alternateNameId, geonameid, isolanguage, name, isPreferredName, isShortName,
// isColloquial, isHistoric, from, to. All names are kept for search, like in the app database.
// For the display name, after preferred names: current names first, then the base name itself
// (so "Dhaka" beats "Dakka"), then alphabetical.
async function readGeoNamesAliases(path) {
  const result = [];
  const seen = new Set();
  const lines = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });

  for await (const line of lines) {
    const [, geonameId, language, name, isPreferred, , isColloquial, isHistoric] = line.split('\t');
    const cityId = Number(geonameId);

    if (!GEONAMES_LANGUAGES.has(language) || !baseNames.has(cityId) || !name) {
      continue;
    }

    const key = `${cityId}:${language}:${name}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    const isOutdated = isHistoric === '1' || isColloquial === '1';
    const rank = (isOutdated ? 2 : 0) + (name === baseNames.get(cityId) ? 0 : 1);

    result.push([cityId, language, name, isPreferred === '1' ? 1 : 0, rank]);
  }

  return result;
}

const geoNamesAliases = await readGeoNamesAliases(options['alternate-names']);

// [cityId, locale, name, isPreferred], sorted so that the first alias of a city in a language is
// its display name: preferred names first, then by rank, then alphabetical. The browser relies on
// this order.
const aliases = [...appAliases.filter(([, locale]) => !GEONAMES_LANGUAGES.has(locale)), ...geoNamesAliases]
  .sort((left, right) => (
    left[0] - right[0]
    || left[1].localeCompare(right[1])
    || right[3] - left[3]
    || left[4] - right[4]
    || left[2].localeCompare(right[2])
  ))
  .map(([cityId, locale, name, isPreferred]) => [cityId, locale, name, isPreferred]);

const toJson = (value) => `${JSON.stringify(value)}\n`;
const dataDirectory = new URL('public/data/', root);

writeFileSync(new URL('cities-search.json', dataDirectory), toJson({ cities, aliases }));

// Display names that differ from the base name, per language: { "2867714": "Мюнхен" }.
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
