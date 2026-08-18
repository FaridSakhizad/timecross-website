import { useEffect } from 'react';
import { useLocation } from 'react-router';

import {
  ANDROID_APK_URL,
  APP_STORE_URL,
  SEO_IMAGE_PATH,
  SITE_NAME,
  SITE_URL,
} from '../../config';
import { SUPPORTED_LANGUAGES, useI18n } from '../../i18n';
import {
  getCanonicalLanguagePath,
  stripLanguageFromPathname,
} from '../../i18n/languageRouting';
import type { AppLanguage } from '../../settings';

type SeoPage = 'home' | 'cities' | 'grid' | 'privacy' | 'terms';

type SeoProps = {
  page: SeoPage;
};

function getAbsoluteUrl(pathname: string) {
  return new URL(pathname, SITE_URL).toString();
}

function upsertMetaByName(name: string, content: string) {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);

  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    document.head.append(meta);
  }

  meta.content = content;
}

function upsertMetaByProperty(property: string, content: string) {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);

  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', property);
    document.head.append(meta);
  }

  meta.content = content;
}

function upsertLink(rel: string, href: string, attributes: Record<string, string> = {}) {
  const selectorAttributes = Object.entries(attributes)
    .map(([key, value]) => `[${key}="${value}"]`)
    .join('');
  let link = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]${selectorAttributes}`);

  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    Object.entries(attributes).forEach(([key, value]) => link?.setAttribute(key, value));
    document.head.append(link);
  }

  link.href = href;
}

function upsertJsonLd(id: string, value: unknown) {
  let script = document.head.querySelector<HTMLScriptElement>(`script[type="application/ld+json"][data-seo-id="${id}"]`);

  if (!script) {
    script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.seoId = id;
    document.head.append(script);
  }

  script.text = JSON.stringify(value);
}

function removeJsonLd(id: string) {
  document.head.querySelector<HTMLScriptElement>(`script[type="application/ld+json"][data-seo-id="${id}"]`)?.remove();
}

function getHreflang(language: AppLanguage) {
  return language === 'uk' ? 'uk' : language;
}

export default function Seo({ page }: SeoProps) {
  const location = useLocation();
  const { language, t } = useI18n();

  useEffect(() => {
    const pagePath = stripLanguageFromPathname(location.pathname);
    const canonicalPath = getCanonicalLanguagePath(language, pagePath);
    const canonicalUrl = getAbsoluteUrl(canonicalPath);
    const imageUrl = getAbsoluteUrl(SEO_IMAGE_PATH);
    const title = t(`seo.pages.${page}.title`);
    const description = t(`seo.pages.${page}.description`);
    const ogTitle = t(`seo.pages.${page}.ogTitle`);
    const ogDescription = t(`seo.pages.${page}.ogDescription`);
    const websiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: language,
      description,
    };
    const appSchema = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      applicationCategory: 'ProductivityApplication',
      operatingSystem: 'iOS, Android',
      url: SITE_URL,
      image: imageUrl,
      description: t('seo.pages.home.description'),
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      downloadUrl: [
        APP_STORE_URL,
        ANDROID_APK_URL,
      ],
    };
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: t('faq.free.title', { siteName: SITE_NAME }),
          acceptedAnswer: {
            '@type': 'Answer',
            text: `${t('faq.free.paragraph1', { siteName: SITE_NAME })} ${t('faq.free.paragraph2')}`,
          },
        },
        {
          '@type': 'Question',
          name: t('faq.offline.title'),
          acceptedAnswer: {
            '@type': 'Answer',
            text: `${t('faq.offline.paragraph1', { siteName: SITE_NAME })} ${t('faq.offline.paragraph2')}`,
          },
        },
        {
          '@type': 'Question',
          name: t('faq.account.title'),
          acceptedAnswer: {
            '@type': 'Answer',
            text: `${t('faq.account.paragraph1', { siteName: SITE_NAME })} ${t('faq.account.paragraph2')}`,
          },
        },
        {
          '@type': 'Question',
          name: t('faq.platforms.title'),
          acceptedAnswer: {
            '@type': 'Answer',
            text: `${t('faq.platforms.paragraph1', { siteName: SITE_NAME })} ${t('faq.platforms.paragraph2')}`,
          },
        },
        {
          '@type': 'Question',
          name: t('faq.notifications.title'),
          acceptedAnswer: {
            '@type': 'Answer',
            text: `${t('faq.notifications.paragraph1')} ${t('faq.notifications.paragraph2', { siteName: SITE_NAME })}`,
          },
        },
      ],
    };

    document.documentElement.lang = language;
    document.title = title;

    upsertMetaByName('description', description);
    upsertMetaByName('robots', 'index, follow');
    upsertMetaByName('twitter:card', 'summary_large_image');
    upsertMetaByName('twitter:title', ogTitle);
    upsertMetaByName('twitter:description', ogDescription);
    upsertMetaByName('twitter:image', imageUrl);

    upsertMetaByProperty('og:site_name', SITE_NAME);
    upsertMetaByProperty('og:type', 'website');
    upsertMetaByProperty('og:url', canonicalUrl);
    upsertMetaByProperty('og:title', ogTitle);
    upsertMetaByProperty('og:description', ogDescription);
    upsertMetaByProperty('og:image', imageUrl);
    upsertMetaByProperty('og:image:width', '1200');
    upsertMetaByProperty('og:image:height', '630');

    upsertLink('canonical', canonicalUrl);

    SUPPORTED_LANGUAGES.forEach((supportedLanguage) => {
      upsertLink(
        'alternate',
        getAbsoluteUrl(getCanonicalLanguagePath(supportedLanguage, pagePath)),
        { hreflang: getHreflang(supportedLanguage) },
      );
    });
    upsertLink(
      'alternate',
      getAbsoluteUrl(getCanonicalLanguagePath('en', pagePath)),
      { hreflang: 'x-default' },
    );

    upsertJsonLd('website', websiteSchema);
    upsertJsonLd('software-application', appSchema);

    if (page === 'home') {
      upsertJsonLd('faq', faqSchema);
    } else {
      removeJsonLd('faq');
    }
  }, [language, location.pathname, page, t]);

  return null;
}
