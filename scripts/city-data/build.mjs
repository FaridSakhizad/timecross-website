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
import { DatabaseSync } from 'node:sqlite';
import { parseArgs } from 'node:util';

import { APP_LANGUAGES } from '../../src/settings.ts';

const root = new URL('../../', import.meta.url);
const { values: options } = parseArgs({
  options: {
    db: { type: 'string', default: new URL('data-source/cities.db', root).pathname },
    'alternate-names': { type: 'string', default: new URL('data-source/alternateNamesV2.txt', root).pathname },
  },
});

// Site languages whose names come from GeoNames (the app database does not have them), and the
// GeoNames languages each one reads. 'pt' is European Portuguese, 'pt-BR' Brazilian: GeoNames
// "pt" names serve both, its few "pt-BR" names only the Brazilian one and win there.
const GEONAMES_SOURCES = {
  de: ['de'],
  pt: ['pt'],
  'pt-BR': ['pt-BR', 'pt'],
};
const GEONAMES_SITE_LANGUAGES = new Set(Object.keys(GEONAMES_SOURCES));
const geoNamesTargets = new Map();

Object.entries(GEONAMES_SOURCES).forEach(([siteLanguage, sources]) => {
  sources.forEach((source) => {
    geoNamesTargets.set(source, [...(geoNamesTargets.get(source) ?? []), siteLanguage]);
  });
});

// Countries where the base names are already in the language. GeoNames names there are mostly the
// same name with a district or region added ("Berlin-Moabit", "Torre de Belém"), so such names are
// not shown. Real translations stay ("Genève" -> "Genf").
const PORTUGUESE_SPEAKING_COUNTRIES = new Set(['BR', 'PT', 'AO', 'MZ', 'CV', 'GW', 'ST', 'TL', 'MO']);
const NATIVE_COUNTRIES = {
  de: new Set(['DE', 'AT', 'CH', 'LI', 'LU']),
  pt: PORTUGUESE_SPEAKING_COUNTRIES,
  'pt-BR': PORTUGUESE_SPEAKING_COUNTRIES,
};

// Brazilian base names are already Portuguese; GeoNames adds neighbourhoods, abbreviations and
// typos there ("Barueri" -> "Tamboré"), so Brazilian cities always show the base name in Portuguese.
const BASE_NAME_ONLY = { pt: new Set(['BR']), 'pt-BR': new Set(['BR']) };

// Manual fixes in name-overrides.json, by section. "pt" fixes wrong GeoNames data for both
// Portuguese variants; "pt-PT" and "pt-BR" hold spellings of one variant.
const OVERRIDE_SECTIONS = {
  de: ['de'],
  pt: ['pt', 'pt-PT'],
  'pt-BR': ['pt', 'pt-BR'],
};

// Display priority inside a city and language: manual overrides, names of the exact regional
// variant, usual names, then hidden ones.
const PRIORITY_OVERRIDE = 0;
const PRIORITY_REGIONAL = 1;
const PRIORITY_USUAL = 2;
const PRIORITY_HIDDEN = 3;

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
  const lines = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity });

  for await (const line of lines) {
    const [, geonameId, sourceLanguage, name, isPreferred, , isColloquial, isHistoric] = line.split('\t');
    const cityId = Number(geonameId);
    const siteLanguages = geoNamesTargets.get(sourceLanguage);

    if (!siteLanguages || !baseNames.has(cityId) || !name) {
      continue;
    }

    const isOutdated = isHistoric === '1' || isColloquial === '1';
    const baseName = baseNames.get(cityId);
    const rank = (isOutdated ? 2 : 0) + (name === baseName ? 0 : 1);
    const country = countries.get(cityId);

    siteLanguages.forEach((language) => {
      const isHidden = name !== baseName && (
        BASE_NAME_ONLY[language]?.has(country)
        || (NATIVE_COUNTRIES[language].has(country) && (name.includes(baseName) || baseName.includes(name)))
      );
      const priority = sourceLanguage === language && GEONAMES_SOURCES[language].length > 1
        ? PRIORITY_REGIONAL
        : PRIORITY_USUAL;

      // Hidden names stay searchable but are never preferred for display.
      result.push(isHidden
        ? [cityId, language, name, 0, rank, PRIORITY_HIDDEN]
        : [cityId, language, name, isPreferred === '1' ? 1 : 0, rank, priority]);
    });
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

// Manual fixes: { "pt-PT": [{ "id": 98182, "city": "Baghdad", "name": "Bagdade" }] }. `city` is
// the base name, checked so that a wrong id fails the build; `name: null` shows the base name.
const overrideFile = JSON.parse(readFileSync(new URL('name-overrides.json', import.meta.url), 'utf8'));
const knownSections = new Set(Object.values(OVERRIDE_SECTIONS).flat());

Object.keys(overrideFile).forEach((section) => {
  if (!knownSections.has(section)) {
    throw new Error(`name-overrides.json: unknown section "${section}".`);
  }
});

const overrideAliases = Object.entries(OVERRIDE_SECTIONS).flatMap(([language, sections]) => (
  sections.flatMap((section) => overrideFile[section] ?? []).map(({ id, city, name }) => {
    if (baseNames.get(id) !== city) {
      throw new Error(`name-overrides.json: city ${id} is "${baseNames.get(id)}", not "${city}".`);
    }

    return [id, language, name ?? city, 1, 0, PRIORITY_OVERRIDE];
  })
));

// Sorted so that the first alias of a city in a language is its display name: overrides first,
// then regional names, then preferred names, then by rank, then alphabetical. A name repeated in
// the same city and language is kept once.
const seenAliases = new Set();
const sortedAliases = [
  ...appAliases.filter(([, locale]) => !GEONAMES_SITE_LANGUAGES.has(locale)),
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
  });

// Display name of every city and language: the first alias, or the base name without aliases.
const displayNames = new Map();

sortedAliases.forEach(([cityId, locale, name]) => {
  const key = `${cityId}:${locale}`;

  if (!displayNames.has(key)) {
    displayNames.set(key, name);
  }
});

const getDisplayName = (cityId, language) => (
  displayNames.get(`${cityId}:${language}`) ?? baseNames.get(cityId)
);

// The browser falls back from 'pt-BR' to 'pt' (src/components/Cities/citySearch.ts), so 'pt-BR'
// keeps only what differs from 'pt': its display name, when that differs, and names 'pt' lacks.
const portugueseNames = new Set(sortedAliases
  .filter(([, locale]) => locale === 'pt')
  .map(([cityId, , name]) => `${cityId}:${name}`));
const brazilianCityIds = new Set(sortedAliases
  .filter(([cityId, locale, name]) => (
    locale === 'pt-BR'
    && (!portugueseNames.has(`${cityId}:${name}`) || getDisplayName(cityId, 'pt-BR') !== getDisplayName(cityId, 'pt'))
  ))
  .map(([cityId]) => cityId));

// [cityId, locale, name, isPreferred]; the browser relies on the order described above.
const aliases = sortedAliases
  .filter(([cityId, locale, name]) => (
    locale !== 'pt-BR'
    || (brazilianCityIds.has(cityId) && (
      name === getDisplayName(cityId, 'pt-BR') || !portugueseNames.has(`${cityId}:${name}`)
    ))
  ))
  .map(([cityId, locale, name, isPreferred]) => [cityId, locale, name, isPreferred]);

const toJson = (value) => `${JSON.stringify(value)}\n`;
const dataDirectory = new URL('public/data/', root);

writeFileSync(new URL('cities-search.json', dataDirectory), toJson({ cities, aliases }));

// Display names that differ from the base name, per language: { "2867714": "Мюнхен" }.
const namesByLanguage = new Map(APP_LANGUAGES.map((language) => [language, {}]));

cities.forEach(([cityId, baseName]) => {
  namesByLanguage.forEach((names, language) => {
    const name = getDisplayName(cityId, language);

    if (name !== baseName) {
      names[cityId] = name;
    }
  });
});

mkdirSync(new URL('city-names/', dataDirectory), { recursive: true });

for (const [language, names] of namesByLanguage) {
  writeFileSync(new URL(`city-names/${language}.json`, dataDirectory), toJson(names));
}

console.log(`${cities.length} cities, ${aliases.length} aliases.`);
console.log([...namesByLanguage].map(([language, names]) => `${language}: ${Object.keys(names).length} names`).join(', '));
