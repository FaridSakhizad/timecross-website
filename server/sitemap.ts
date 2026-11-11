/** sitemap.xml, made from the page list: every indexed page in every language. */
import { SITE_URL } from '../src/config';
import { getCanonicalLanguagePath } from '../src/i18n/languageRouting';
import { PAGES, PAGE_IDS, getPagePaths } from '../src/routes';
import { APP_LANGUAGES } from '../src/settings';

export function getSitemapUrls() {
  const pagePaths = PAGE_IDS
    .filter((pageId) => PAGES[pageId].isIndexed)
    .flatMap(getPagePaths);

  return APP_LANGUAGES.flatMap((language) => (
    pagePaths.map((pagePath) => new URL(getCanonicalLanguagePath(language, pagePath), SITE_URL).toString())
  ));
}

/** Which build made the sitemap, for people checking a deploy; search engines ignore it. */
const BUILD_ID = import.meta.env.VITE_BUILD_ID ?? 'dev';

export function handleSitemapRequest() {
  const urls = getSitemapUrls().map((url) => `  <url><loc>${url}</loc></url>`);
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<!-- TimeCross sitemap, build ${BUILD_ID} -->`,
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
}
