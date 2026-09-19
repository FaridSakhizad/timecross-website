import { useEffect } from 'react';
import { useLocation } from 'react-router';

import { useI18n } from '../../i18n';
import {
  getAlternateLinks,
  getSeoJsonLd,
  getSeoMetadata,
} from '../../seoMetadata';

type SeoPage = 'home' | 'cities' | 'grid' | 'privacy' | 'terms';

type SeoProps = {
  page: SeoPage;
};

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

export default function Seo({ page }: SeoProps) {
  const location = useLocation();
  const { language } = useI18n();

  useEffect(() => {
    const metadata = getSeoMetadata(language, location.pathname);

    document.documentElement.lang = language;
    document.title = metadata.title;

    upsertMetaByName('description', metadata.description);
    upsertMetaByName('robots', 'index, follow');
    upsertMetaByName('twitter:card', 'summary_large_image');
    upsertMetaByName('twitter:title', metadata.ogTitle);
    upsertMetaByName('twitter:description', metadata.ogDescription);
    upsertMetaByName('twitter:image', metadata.imageUrl);

    upsertMetaByProperty('og:site_name', metadata.siteName);
    upsertMetaByProperty('og:type', 'website');
    upsertMetaByProperty('og:url', metadata.canonicalUrl);
    upsertMetaByProperty('og:title', metadata.ogTitle);
    upsertMetaByProperty('og:description', metadata.ogDescription);
    upsertMetaByProperty('og:image', metadata.imageUrl);
    upsertMetaByProperty('og:image:width', '1200');
    upsertMetaByProperty('og:image:height', '630');

    upsertLink('canonical', metadata.canonicalUrl);

    getAlternateLinks(location.pathname).forEach((link) => {
      upsertLink('alternate', link.href, { hreflang: link.hreflang });
    });

    getSeoJsonLd(language, location.pathname).forEach((schema) => {
      upsertJsonLd(schema.id, schema.value);
    });
    if (metadata.page !== 'home') {
      removeJsonLd('faq');
    }
  }, [language, location.pathname, page]);

  return null;
}
