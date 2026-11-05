import { getPageIdByPath } from '../routes.ts';
import { APP_LANGUAGES, type AppLanguage } from '../settings.ts';
import { getBrowserTimezone } from '../utils/time.ts';

import type { TranslationKey } from './dictionaries.ts';

const LANGUAGE_TO_URL_SEGMENT: Record<AppLanguage, string> = {
  en: 'en',
  fr: 'fr',
  uk: 'ua',
  ru: 'ru',
  es: 'es',
  pt: 'pt',
  'pt-BR': 'pt-br',
  de: 'de',
};

const URL_SEGMENT_TO_LANGUAGE: Record<string, AppLanguage> = {
  en: 'en',
  fr: 'fr',
  ua: 'uk',
  uk: 'uk',
  ru: 'ru',
  es: 'es',
  pt: 'pt',
  'pt-br': 'pt-BR',
  de: 'de',
};

// Time zones of Portugal, Portuguese-speaking Africa, East Timor and Macau (with old aliases):
// European Portuguese there, Brazilian everywhere else.
const EUROPEAN_PORTUGUESE_TIME_ZONES = new Set([
  'Africa/Bissau',
  'Africa/Luanda',
  'Africa/Maputo',
  'Africa/Sao_Tome',
  'Asia/Dili',
  'Asia/Macao',
  'Asia/Macau',
  'Atlantic/Azores',
  'Atlantic/Cape_Verde',
  'Atlantic/Madeira',
  'Europe/Lisbon',
  'Portugal',
]);

/** Languages offered in the language menus: Portuguese is one item, see getLanguageMenuItems. */
export const MENU_LANGUAGES = APP_LANGUAGES.filter((language) => language !== 'pt-BR');

function normalizeLanguageCode(value: string) {
  return value.toLowerCase().split('-')[0];
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, '');
}

/**
 * European or Brazilian Portuguese. The first regional Portuguese tag decides ("pt-BR" is
 * Brazilian; "pt-PT", "pt-AO" and the rest are European). Without one, the time zone of Portugal
 * or a Portuguese-speaking country outside Brazil means European; Brazilian is the default.
 */
export function getPortugueseVariant(localeTags: readonly string[], timeZone?: string | null): AppLanguage {
  for (const localeTag of localeTags) {
    const [language, region] = localeTag.trim().toLowerCase().split('-');

    if (language === 'pt' && region) {
      return region === 'br' ? 'pt-BR' : 'pt';
    }
  }

  return timeZone && EUROPEAN_PORTUGUESE_TIME_ZONES.has(timeZone) ? 'pt' : 'pt-BR';
}

function getBrowserLanguageTags(): readonly string[] {
  if (typeof navigator === 'undefined') {
    return [];
  }

  return navigator.languages.length ? navigator.languages : [navigator.language];
}

function getBrowserPortugueseVariant() {
  return getPortugueseVariant(
    getBrowserLanguageTags(),
    typeof Intl === 'undefined' ? null : getBrowserTimezone(),
  );
}

export function getBrowserLanguage(): AppLanguage {
  for (const browserLanguage of getBrowserLanguageTags()) {
    const supportedLanguage = getLanguageFromUrlSegment(normalizeLanguageCode(browserLanguage));

    if (supportedLanguage === 'pt') {
      return getBrowserPortugueseVariant();
    }

    if (supportedLanguage) {
      return supportedLanguage;
    }
  }

  return 'en';
}

/** The menu item of a language: both Portuguese variants are "pt". */
export function getMenuLanguage(language: AppLanguage): AppLanguage {
  return language === 'pt-BR' ? 'pt' : language;
}

/** Translation key of a language's own name; the Portuguese variants are named with their country. */
export function getLanguageLabelKey(language: AppLanguage): TranslationKey {
  if (language === 'pt') {
    return 'languages.ptPT';
  }

  return language === 'pt-BR' ? 'languages.ptBR' : `languages.${language}`;
}

export type LanguageMenuItem = {
  language: AppLanguage;
  /** Translation key of the item's label. */
  labelKey: TranslationKey;
};

/**
 * Items of a language menu for the current language. "Português" opens the variant that suits the
 * browser; in Portuguese, its place is taken by the other variant, named with its country.
 */
export function getLanguageMenuItems(currentLanguage: AppLanguage): LanguageMenuItem[] {
  return MENU_LANGUAGES.flatMap((language): LanguageMenuItem[] => {
    if (language === 'pt' && getMenuLanguage(currentLanguage) === 'pt') {
      return currentLanguage === 'pt'
        ? [{ language: 'pt-BR', labelKey: getLanguageLabelKey('pt-BR') }]
        : [{ language: 'pt', labelKey: getLanguageLabelKey('pt') }];
    }

    if (language === currentLanguage) {
      return [];
    }

    return [{
      language: language === 'pt' ? getBrowserPortugueseVariant() : language,
      labelKey: `languages.${language}`,
    }];
  });
}

export function getLanguageFromUrlSegment(segment: string | undefined) {
  if (!segment) {
    return null;
  }

  return URL_SEGMENT_TO_LANGUAGE[segment.toLowerCase()] ?? null;
}

export function getLanguageFromPathname(pathname: string) {
  const firstPathPart = pathname.split('/').filter(Boolean)[0];

  return getLanguageFromUrlSegment(firstPathPart);
}

export function getLanguageUrlSegment(language: AppLanguage) {
  return LANGUAGE_TO_URL_SEGMENT[language];
}

export function getCanonicalLanguagePath(language: AppLanguage, pagePath = '/') {
  const languageSegment = getLanguageUrlSegment(language);
  const normalizedPagePath = pagePath === '/' ? '' : `/${trimSlashes(pagePath)}`;

  return languageSegment
    ? `/${languageSegment}${normalizedPagePath}`
    : normalizedPagePath || '/';
}

export function stripLanguageFromPathname(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  const firstPartLanguage = getLanguageFromPathname(pathname);

  if (firstPartLanguage) {
    parts.shift();
  }

  return parts.length ? `/${parts.join('/')}` : '/';
}

export function getLocalizedPathname(pathname: string, language: AppLanguage) {
  return getCanonicalLanguagePath(language, stripLanguageFromPathname(pathname));
}

export function isLocalizedPagePath(pathname: string) {
  return getPageIdByPath(stripLanguageFromPathname(pathname)) !== null;
}

/** Picks the best supported language from an Accept-Language header; 'en' by default. */
export function getLanguageFromAcceptLanguage(acceptLanguage: string | null): AppLanguage {
  if (!acceptLanguage) {
    return 'en';
  }

  const languageCandidates = acceptLanguage
    .split(',')
    .map((entry) => {
      const [languageTag = '', ...parameters] = entry.trim().split(';');
      const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith('q='));

      return {
        language: getLanguageFromUrlSegment(normalizeLanguageCode(languageTag.trim())),
        languageTag: languageTag.trim(),
        quality: qualityParameter ? Number(qualityParameter.trim().slice(2)) : 1,
      };
    })
    // q=0 means "not acceptable", so such languages are skipped.
    .filter((entry): entry is {
      language: AppLanguage;
      languageTag: string;
      quality: number;
    } => (
      Boolean(entry.language) && Number.isFinite(entry.quality) && entry.quality > 0
    ))
    .sort((left, right) => right.quality - left.quality);
  const language = languageCandidates[0]?.language ?? 'en';

  // There is no time zone on the server, so a bare "pt" means Brazilian Portuguese.
  return language === 'pt'
    ? getPortugueseVariant(languageCandidates.map((candidate) => candidate.languageTag))
    : language;
}
