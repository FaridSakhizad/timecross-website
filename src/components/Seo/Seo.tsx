import { useEffect } from 'react';
import { useLocation } from 'react-router';

import { useI18n } from '../../i18n';
import {
  getHeadTags,
  getSeoMetadata,
  type HeadTag,
} from '../../seoMetadata';

const MANAGED_TAG_SELECTOR = '[data-managed-seo="true"]';

function createHeadElement({ name, attributes, content }: HeadTag) {
  const element = document.createElement(name);

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  element.dataset.managedSeo = 'true';

  if (content !== undefined) {
    element.textContent = content;
  }

  return element;
}

/**
 * Keeps <title>, <html lang> and the managed <head> tags in sync with the page after client-side
 * navigation. The server renders the same tags (server/index.ts), both from getHeadTags.
 */
export default function Seo() {
  const location = useLocation();
  const { language } = useI18n();

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = getSeoMetadata(language, location.pathname).title;

    document.head.querySelectorAll(MANAGED_TAG_SELECTOR).forEach((element) => element.remove());
    document.head.append(...getHeadTags(language, location.pathname).map(createHeadElement));
  }, [language, location.pathname]);

  return null;
}
