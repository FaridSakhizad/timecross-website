import type { AppLanguage } from '../settings';

import en from './locales/en.json';

export type Dictionary = Record<string, unknown>;

/** "a.b.c" paths to the strings of a nested object. */
type LeafPaths<T> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : `${K}.${LeafPaths<T[K]>}`;
}[keyof T & string];

/**
 * Every translation key, taken from en.json: t('cities.renmeCity') does not compile.
 * The other languages have exactly the same keys (tests/locales.test.mjs).
 */
export type TranslationKey = LeafPaths<typeof en>;
export type TranslationValues = Record<string, string | number>;

/**
 * English ships in the main bundle: it is the fallback for missing keys. Every other language
 * is a separate chunk, loaded once when it is first needed (before hydration for the page's language).
 */
const DICTIONARY_LOADERS: Record<Exclude<AppLanguage, 'en'>, () => Promise<{ default: Dictionary }>> = {
  fr: () => import('./locales/fr.json'),
  uk: () => import('./locales/uk.json'),
  ru: () => import('./locales/ru.json'),
  es: () => import('./locales/es.json'),
  pt: () => import('./locales/pt.json'),
  'pt-BR': () => import('./locales/pt-BR.json'),
  de: () => import('./locales/de.json'),
};

const loadedDictionaries = new Map<AppLanguage, Dictionary>([['en', en]]);
const pendingDictionaries = new Map<AppLanguage, Promise<Dictionary>>();

export function isDictionaryLoaded(language: AppLanguage) {
  return loadedDictionaries.has(language);
}

export function loadDictionary(language: AppLanguage): Promise<Dictionary> {
  const loadedDictionary = loadedDictionaries.get(language);

  if (loadedDictionary) {
    return Promise.resolve(loadedDictionary);
  }

  let pendingDictionary = pendingDictionaries.get(language);

  if (!pendingDictionary) {
    pendingDictionary = DICTIONARY_LOADERS[language as Exclude<AppLanguage, 'en'>]()
      .then(({ default: dictionary }) => {
        loadedDictionaries.set(language, dictionary);
        return dictionary;
      })
      .finally(() => {
        pendingDictionaries.delete(language);
      });
    pendingDictionaries.set(language, pendingDictionary);
  }

  return pendingDictionary;
}

function getNestedValue(dictionary: Dictionary, key: string) {
  return key.split('.').reduce<unknown>((value, part) => {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return (value as Record<string, unknown>)[part];
  }, dictionary);
}

function interpolate(value: string, values: TranslationValues = {}) {
  return value.replace(/\{(\w+)\}/g, (match: string, key: string) => (
    values[key] === undefined ? match : String(values[key])
  ));
}

/**
 * Translation in a loaded language; falls back to English when the key or the whole
 * dictionary is missing, and to the key itself when English has no such key either.
 */
export function translate(language: AppLanguage, key: TranslationKey, values?: TranslationValues) {
  const dictionary = loadedDictionaries.get(language);
  const value = (dictionary && getNestedValue(dictionary, key)) ?? getNestedValue(en, key);

  return typeof value === 'string' ? interpolate(value, values) : key;
}
