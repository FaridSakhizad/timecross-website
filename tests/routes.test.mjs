import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { getCanonicalLanguagePath, isLocalizedPagePath } from '../src/i18n/languageRouting.ts';
import {
  PAGES,
  PAGE_IDS,
  getCanonicalPagePath,
  getMovedPagePath,
  getPageIdByPath,
  getPagePaths,
} from '../src/routes.ts';
import { APP_LANGUAGES } from '../src/settings.ts';

import { registerSourceLoader } from './support/sourceLoader.mjs';

const hooks = registerSourceLoader();

after(() => hooks.deregister());

// The Worker's modules import without extensions, like the rest of the Vite build.
const { getSitemapUrls } = await import('../server/sitemap.ts');

const SITE_URL = 'https://timecross.app';

test('the sitemap lists every indexed page in every language, a page per city pair, and nothing else', () => {
  const expected = APP_LANGUAGES
    .flatMap((language) => PAGE_IDS
      .filter((pageId) => PAGES[pageId].isIndexed)
      .flatMap((pageId) => getPagePaths(pageId))
      .map((pagePath) => `${SITE_URL}${getCanonicalLanguagePath(language, pagePath)}`))
    .sort();

  assert.deepEqual([...getSitemapUrls()].sort(), expected);
  assert.ok(getSitemapUrls().includes(`${SITE_URL}/es/time-difference/madrid-mexico-city`));
  assert.ok(!getSitemapUrls().some((url) => url.includes(':pair') || url.endsWith('/convert')));
});

test('every page path is found again, with and without a language', () => {
  for (const pageId of PAGE_IDS) {
    for (const path of getPagePaths(pageId)) {
      assert.equal(getPageIdByPath(path), pageId);
      assert.ok(isLocalizedPagePath(path), path);
      assert.ok(isLocalizedPagePath(getCanonicalLanguagePath('de', path)), path);
    }
  }

  assert.equal(getPageIdByPath('/unknown'), null);
  assert.equal(getPageIdByPath('/time-difference/:pair'), null);
  assert.equal(getPageIdByPath('/time-difference/madrid-mars'), null);
  assert.ok(!isLocalizedPagePath('/de/unknown'));
});

test('a page that names another canonical page points to an indexed one', () => {
  for (const pageId of PAGE_IDS.filter((id) => 'canonicalPage' in PAGES[id])) {
    const canonicalPageId = getPageIdByPath(getCanonicalPagePath(PAGES[pageId].path));

    assert.notEqual(canonicalPageId, pageId);
    assert.ok(canonicalPageId && PAGES[canonicalPageId].isIndexed, pageId);
  }
});

test('a reversed city pair moved to the pair\'s own path', () => {
  assert.equal(getMovedPagePath('/time-difference/mexico-city-madrid'), '/time-difference/madrid-mexico-city');
  assert.equal(getMovedPagePath('/time-difference/madrid-mexico-city'), null);
  assert.equal(getMovedPagePath('/world-clock'), null);
});
