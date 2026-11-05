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
 * GeoNames names are cleaned up before use, see NATIVE_COUNTRIES and name-overrides.json.
 *
 * Writes:
 *   public/data/cities-search.json      full list for the "Add city" search
 *   public/data/city-names/{lang}.json  localized display names, one small file per language
 *
 * data-source/ is git-ignored; the generated files are committed.
 */
import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

// Countries where the base names are already in the language. GeoNames names there are mostly the
// same name with a district or region added ("Berlin-Moabit", "Torre de Belém"), so such names are
// not shown. Real translations stay ("Genève" -> "Genf").
const NATIVE_COUNTRIES = {
  de: new Set(['DE', 'AT', 'CH', 'LI', 'LU']),
  pt: new Set(['BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL', 'MO']),
};

// Brazilian base names are already Portuguese; GeoNames adds neighbourhoods, abbreviations and
// typos there ("Barueri" -> "Tamboré"), so Brazilian cities always show the base name in Portuguese.
const BASE_NAME_ONLY = { pt: new Set(['BR']) };

// Display priority inside a city and language: manual overrides, then usual names, then hidden ones.
const PRIORITY_OVERRIDE = 0;
const PRIORITY_USUAL = 1;
const PRIORITY_HIDDEN = 2;

if (!existsSync(options['alternate-names'])) {
  throw new Error(`GeoNames alternate names not found at ${options['alternate-names']}. Pass --alternate-names.`);
}

const db = new DatabaseSync(options.db, { readOnly: true });

// [id, name, country, admin1, tz, population]. The normalized name is computed in the browser,
// coordinates are not used by the website.
const cities = db.prepare('SELECT id, name, country, admin1, tz, pop FROM cities ORDER BY id').all()
  .map((row) => [row.id, row.name, row.country, row.admin1, row.tz, row.pop]);
const baseNames = new Map(cities.map(([id, name]) => [id, name]));
const countries = new Map(cities.map(([id, , country]) => [id, country]));

// Aliases with sort keys: [cityId, locale, name, isPreferred, rank, priority]. Rank and priority
// are used only for sorting and are not written out. App database names keep their order.
const appAliases = db.prepare('SELECT city_id, locale, name, is_preferred FROM city_aliases').all()
  .map((row) => [row.city_id, row.locale, row.name, row.is_preferred, 0, PRIORITY_USUAL]);

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
    const baseName = baseNames.get(cityId);
    const rank = (isOutdated ? 2 : 0) + (name === baseName ? 0 : 1);
    const country = countries.get(cityId);
    const isHidden = name !== baseName && (
      BASE_NAME_ONLY[language]?.has(country)
      || (NATIVE_COUNTRIES[language].has(country) && (name.includes(baseName) || baseName.includes(name)))
    );

    // Hidden names stay searchable but are never preferred for display.
    result.push(isHidden
      ? [cityId, language, name, 0, rank, PRIORITY_HIDDEN]
      : [cityId, language, name, isPreferred === '1' ? 1 : 0, rank, PRIORITY_USUAL]);
  }

  return result;
}

const geoNamesAliases = await readGeoNamesAliases(options['alternate-names']);

// A city whose GeoNames names are all hidden gets its base name as the display name.
const visibleNameKeys = new Set(geoNamesAliases
  .filter((alias) => alias[5] !== PRIORITY_HIDDEN)
  .map(([cityId, locale]) => `${cityId}:${locale}`));
const baseNameAliases = geoNamesAliases
  .filter(([cityId, locale]) => !visibleNameKeys.has(`${cityId}:${locale}`))
  .map(([cityId, locale]) => [cityId, locale, baseNames.get(cityId), 0, 0, PRIORITY_USUAL]);

// Manual fixes: { "pt": [{ "id": 98182, "city": "Baghdad", "name": "Bagdade" }] }. `city` is the
// base name, checked so that a wrong id fails the build; `name: null` shows the base name.
const overrideFile = JSON.parse(readFileSync(new URL('name-overrides.json', import.meta.url), 'utf8'));
const overrideAliases = Object.entries(overrideFile).flatMap(([language, overrides]) => (
  overrides.map(({ id, city, name }) => {
    if (baseNames.get(id) !== city) {
      throw new Error(`name-overrides.json: city ${id} is "${baseNames.get(id)}", not "${city}".`);
    }

    return [id, language, name ?? city, 1, 0, PRIORITY_OVERRIDE];
  })
));

// [cityId, locale, name, isPreferred], sorted so that the first alias of a city in a language is
// its display name: overrides first, then preferred names, then by rank, then alphabetical. The
// browser relies on this order. A name repeated in the same city and language is kept once.
const seenAliases = new Set();
const aliases = [
  ...appAliases.filter(([, locale]) => !GEONAMES_LANGUAGES.has(locale)),
  ...geoNamesAliases,
  ...baseNameAliases,
  ...overrideAliases,
]
  .sort((left, right) => (
    left[0] - right[0]
    || left[1].localeCompare(right[1])
    || left[5] - right[5]
    || right[3] - left[3]
    || left[4] - right[4]
    || left[2].localeCompare(right[2])
  ))
  .filter(([cityId, locale, name]) => {
    const key = `${cityId}:${locale}:${name}`;

    if (seenAliases.has(key)) {
      return false;
    }

    seenAliases.add(key);

    return true;
  })
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
