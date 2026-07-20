import type { AppLanguage } from '../settings';

const LANGUAGE_TO_URL_SEGMENT: Record<AppLanguage, string> = {
  en: 'en',
  fr: 'fr',
  uk: 'ua',
  ru: 'ru',
};

const URL_SEGMENT_TO_LANGUAGE: Record<string, AppLanguage> = {
  en: 'en',
  fr: 'fr',
  ua: 'uk',
  uk: 'uk',
  ru: 'ru',
};

const LOCALIZED_PAGE_PATHS = [
  '/privacy-policy',
  '/terms-of-use',
];

function normalizeLanguageCode(value: string) {
  return value.toLowerCase().split('-')[0];
}

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, '');
}

export function getBrowserLanguage(): AppLanguage {
  const browserLanguages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const browserLanguage of browserLanguages) {
    const normalizedLanguage = normalizeLanguageCode(browserLanguage);
    const supportedLanguage = getLanguageFromUrlSegment(normalizedLanguage);

    if (supportedLanguage) {
      return supportedLanguage;
    }
  }

  return 'en';
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
  const pagePath = stripLanguageFromPathname(pathname);

  return pagePath === '/' || LOCALIZED_PAGE_PATHS.includes(pagePath);
}
