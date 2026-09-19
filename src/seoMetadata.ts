import {
  ANDROID_APK_URL,
  APP_STORE_URL,
  SEO_IMAGE_PATH,
  SITE_NAME,
  SITE_URL,
} from './config';
import { SUPPORTED_LANGUAGES } from './i18n';
import {
  getCanonicalLanguagePath,
  stripLanguageFromPathname,
} from './i18n/languageRouting';
import type { AppLanguage } from './settings';

import de from './i18n/locales/de.json';
import en from './i18n/locales/en.json';
import es from './i18n/locales/es.json';
import fr from './i18n/locales/fr.json';
import pt from './i18n/locales/pt.json';
import ru from './i18n/locales/ru.json';
import uk from './i18n/locales/uk.json';

type SeoPage = 'home' | 'cities' | 'grid' | 'privacy' | 'terms';
type TranslationValues = Record<string, string | number>;

const DICTIONARIES = {
  en,
  fr,
  uk,
  ru,
  es,
  pt,
  de,
};

function getNestedValue(dictionary: typeof en, key: string) {
  return key.split('.').reduce<unknown>((value, part) => {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return (value as Record<string, unknown>)[part];
  }, dictionary);
}

function interpolate(value: string, values: TranslationValues = {}) {
  return value.replace(/\{(\w+)\}/g, (match, key) => (
    values[key] === undefined ? match : String(values[key])
  ));
}

function translate(language: AppLanguage, key: string, values?: TranslationValues) {
  const dictionary = DICTIONARIES[language];
  const value = getNestedValue(dictionary, key) ?? getNestedValue(DICTIONARIES.en, key);

  return typeof value === 'string' ? interpolate(value, values) : key;
}

function getAbsoluteUrl(pathname: string) {
  return new URL(pathname, SITE_URL).toString();
}

function getHreflang(language: AppLanguage) {
  return language === 'uk' ? 'uk' : language;
}

export function getSeoPageFromPathname(pathname: string): SeoPage {
  const pagePath = stripLanguageFromPathname(pathname);
  const firstPathPart = pagePath.split('/').filter(Boolean)[0];

  switch (firstPathPart) {
    case 'cities':
      return 'cities';
    case 'grid':
      return 'grid';
    case 'privacy-policy':
      return 'privacy';
    case 'terms-of-use':
      return 'terms';
    default:
      return 'home';
  }
}

export function getSeoMetadata(language: AppLanguage, pathname: string) {
  const page = getSeoPageFromPathname(pathname);
  const pagePath = stripLanguageFromPathname(pathname);
  const canonicalPath = getCanonicalLanguagePath(language, pagePath);
  const canonicalUrl = getAbsoluteUrl(canonicalPath);
  const imageUrl = getAbsoluteUrl(SEO_IMAGE_PATH);
  const title = translate(language, `seo.pages.${page}.title`);
  const description = translate(language, `seo.pages.${page}.description`);
  const ogTitle = translate(language, `seo.pages.${page}.ogTitle`);
  const ogDescription = translate(language, `seo.pages.${page}.ogDescription`);

  return {
    canonicalUrl,
    description,
    imageUrl,
    language,
    ogDescription,
    ogTitle,
    page,
    pagePath,
    siteName: SITE_NAME,
    title,
  };
}

export function getSeoJsonLd(language: AppLanguage, pathname: string) {
  const metadata = getSeoMetadata(language, pathname);
  const schemas: { id: string; value: unknown }[] = [
    {
      id: 'website',
      value: {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
        inLanguage: language,
        description: metadata.description,
      },
    },
    {
      id: 'software-application',
      value: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: SITE_NAME,
        applicationCategory: 'ProductivityApplication',
        operatingSystem: 'iOS, Android',
        url: SITE_URL,
        image: metadata.imageUrl,
        description: translate(language, 'seo.pages.home.description'),
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        downloadUrl: [
          APP_STORE_URL,
          ANDROID_APK_URL,
        ],
      },
    },
  ];

  if (metadata.page === 'home') {
    schemas.push({
      id: 'faq',
      value: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: translate(language, 'faq.free.title', { siteName: SITE_NAME }),
            acceptedAnswer: {
              '@type': 'Answer',
              text: `${translate(language, 'faq.free.paragraph1', { siteName: SITE_NAME })} ${translate(language, 'faq.free.paragraph2')}`,
            },
          },
          {
            '@type': 'Question',
            name: translate(language, 'faq.offline.title'),
            acceptedAnswer: {
              '@type': 'Answer',
              text: `${translate(language, 'faq.offline.paragraph1', { siteName: SITE_NAME })} ${translate(language, 'faq.offline.paragraph2')}`,
            },
          },
          {
            '@type': 'Question',
            name: translate(language, 'faq.account.title'),
            acceptedAnswer: {
              '@type': 'Answer',
              text: `${translate(language, 'faq.account.paragraph1', { siteName: SITE_NAME })} ${translate(language, 'faq.account.paragraph2')}`,
            },
          },
          {
            '@type': 'Question',
            name: translate(language, 'faq.platforms.title'),
            acceptedAnswer: {
              '@type': 'Answer',
              text: `${translate(language, 'faq.platforms.paragraph1', { siteName: SITE_NAME })} ${translate(language, 'faq.platforms.paragraph2')}`,
            },
          },
          {
            '@type': 'Question',
            name: translate(language, 'faq.notifications.title'),
            acceptedAnswer: {
              '@type': 'Answer',
              text: `${translate(language, 'faq.notifications.paragraph1')} ${translate(language, 'faq.notifications.paragraph2', { siteName: SITE_NAME })}`,
            },
          },
        ],
      },
    });
  }

  return schemas;
}

export function getAlternateLinks(pathname: string) {
  const pagePath = stripLanguageFromPathname(pathname);
  const links = SUPPORTED_LANGUAGES.map((supportedLanguage) => ({
    href: getAbsoluteUrl(getCanonicalLanguagePath(supportedLanguage, pagePath)),
    hreflang: getHreflang(supportedLanguage),
  }));

  links.push({
    href: getAbsoluteUrl(getCanonicalLanguagePath('en', pagePath)),
    hreflang: 'x-default',
  });

  return links;
}
