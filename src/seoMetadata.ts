import {
  APP_STORE_URL,
  GOOGLE_PLAY_URL,
  SEO_IMAGE_PATH,
  SITE_NAME,
  SITE_URL,
} from './config';
import { SUPPORTED_LANGUAGES } from './i18n';
import { translate } from './i18n/dictionaries';
import {
  getCanonicalLanguagePath,
  stripLanguageFromPathname,
} from './i18n/languageRouting';
import {
  PAGES,
  getCanonicalPagePath,
  getPageIdByPath,
  type PageId,
} from './routes';
import type { AppLanguage } from './settings';

type SeoJsonLdSchema = { id: string; value: unknown };

/** A tag managed in <head>: the server renders it, the client replaces it on navigation. */
export type HeadTag = {
  name: 'meta' | 'link' | 'script';
  attributes: Record<string, string>;
  /** Text content (JSON-LD scripts). */
  content?: string;
};

function getAbsoluteUrl(pathname: string) {
  return new URL(pathname, SITE_URL).toString();
}

// Brazilian Portuguese is the default one ("pt"); the European version serves Portugal and the
// Portuguese-speaking countries outside Brazil (as getPortugueseVariant in languageRouting does).
const HREFLANGS: Partial<Record<AppLanguage, string[]>> = {
  pt: ['pt-PT', 'pt-AO', 'pt-MZ', 'pt-CV', 'pt-GW', 'pt-ST', 'pt-TL', 'pt-MO'],
  'pt-BR': ['pt-BR', 'pt'],
};

const WEB_TOOL_SEO_KEYS = new Set<string>(['worldClock', 'meetingTimePlanner', 'timeZoneConverter']);

function getHreflangs(language: AppLanguage): string[] {
  return HREFLANGS[language] ?? [language];
}

/** The page at a URL, or null for a page that does not exist (the 404 page). */
function getPageId(pathname: string): PageId | null {
  return getPageIdByPath(stripLanguageFromPathname(pathname));
}

/** <title> of any URL, the 404 page included. */
export function getPageTitle(language: AppLanguage, pathname: string) {
  const pageId = getPageId(pathname);

  return translate(language, pageId ? `seo.pages.${PAGES[pageId].seoKey}.title` : 'seo.notFound.title');
}

export function getSeoMetadata(language: AppLanguage, pageId: PageId) {
  const page = PAGES[pageId];
  const { seoKey, isIndexed } = page;
  const hasCanonicalElsewhere = 'canonicalPage' in page;
  const canonicalUrl = getAbsoluteUrl(getCanonicalLanguagePath(language, getCanonicalPagePath(pageId)));

  return {
    canonicalUrl,
    description: translate(language, `seo.pages.${seoKey}.description`),
    imageUrl: getAbsoluteUrl(SEO_IMAGE_PATH),
    language,
    ogDescription: translate(language, `seo.pages.${seoKey}.ogDescription`),
    ogTitle: translate(language, `seo.pages.${seoKey}.ogTitle`),
    pageId,
    // A page with a canonical elsewhere stays indexable, so search engines follow the canonical.
    robots: isIndexed || hasCanonicalElsewhere ? 'index, follow' : 'noindex, follow',
    seoKey,
    siteName: SITE_NAME,
    title: translate(language, `seo.pages.${seoKey}.title`),
  };
}

export function getSeoJsonLd(language: AppLanguage, pageId: PageId) {
  const metadata = getSeoMetadata(language, pageId);
  const schemas: SeoJsonLdSchema[] = [
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
          GOOGLE_PLAY_URL,
        ],
      },
    },
  ];

  if (metadata.seoKey === 'home') {
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

  // The free web tools themselves, apart from the mobile app described above.
  if (WEB_TOOL_SEO_KEYS.has(metadata.seoKey)) {
    schemas.push({
      id: 'web-application',
      value: {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: metadata.ogTitle,
        url: metadata.canonicalUrl,
        description: metadata.description,
        inLanguage: language,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        isAccessibleForFree: true,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    });
  }

  if (metadata.seoKey === 'timeZoneConverter') {
    const faqIds = ['what', 'dst', 'cities', 'offsets'] as const;

    schemas.push({
      id: 'faq',
      value: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqIds.map((faqId) => ({
          '@type': 'Question',
          name: translate(language, `timeZoneConverter.faq.${faqId}.title`),
          acceptedAnswer: {
            '@type': 'Answer',
            text: translate(language, `timeZoneConverter.faq.${faqId}.text`),
          },
        })),
      },
    });
  }

  return schemas;
}

export function getAlternateLinks(pageId: PageId) {
  const canonicalPagePath = getCanonicalPagePath(pageId);
  const links = SUPPORTED_LANGUAGES.flatMap((supportedLanguage) => (
    getHreflangs(supportedLanguage).map((hreflang) => ({
      href: getAbsoluteUrl(getCanonicalLanguagePath(supportedLanguage, canonicalPagePath)),
      hreflang,
    }))
  ));

  links.push({
    href: getAbsoluteUrl(getCanonicalLanguagePath('en', canonicalPagePath)),
    hreflang: 'x-default',
  });

  return links;
}

function meta(key: 'name' | 'property', value: string, content: string): HeadTag {
  return {
    name: 'meta',
    attributes: {
      [key]: value,
      content,
    },
  };
}

/**
 * Everything in <head> that depends on the page and the language, except <title> and <html lang>.
 * The 404 page gets only a description and "noindex": it has no canonical URL or translations.
 */
export function getHeadTags(language: AppLanguage, pathname: string): HeadTag[] {
  const pageId = getPageId(pathname);

  if (!pageId) {
    return [
      meta('name', 'description', translate(language, 'seo.notFound.description')),
      meta('name', 'robots', 'noindex, follow'),
    ];
  }

  const metadata = getSeoMetadata(language, pageId);

  return [
    meta('name', 'description', metadata.description),
    meta('name', 'robots', metadata.robots),
    {
      name: 'link',
      attributes: {
        rel: 'canonical',
        href: metadata.canonicalUrl,
      },
    },
    meta('property', 'og:site_name', metadata.siteName),
    meta('property', 'og:type', 'website'),
    meta('property', 'og:url', metadata.canonicalUrl),
    meta('property', 'og:title', metadata.ogTitle),
    meta('property', 'og:description', metadata.ogDescription),
    meta('property', 'og:image', metadata.imageUrl),
    meta('property', 'og:image:width', '1200'),
    meta('property', 'og:image:height', '630'),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', metadata.ogTitle),
    meta('name', 'twitter:description', metadata.ogDescription),
    meta('name', 'twitter:image', metadata.imageUrl),
    ...getAlternateLinks(pageId).map((link): HeadTag => ({
      name: 'link',
      attributes: {
        rel: 'alternate',
        hreflang: link.hreflang,
        href: link.href,
      },
    })),
    ...getSeoJsonLd(language, pageId).map((schema): HeadTag => ({
      name: 'script',
      attributes: {
        type: 'application/ld+json',
        'data-seo-id': schema.id,
      },
      content: JSON.stringify(schema.value),
    })),
  ];
}
