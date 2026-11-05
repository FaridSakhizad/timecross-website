import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { getCanonicalLanguagePath, isLocalizedPagePath } from '../src/i18n/languageRouting.ts';
import {
  PAGES,
  PAGE_IDS,
  getCanonicalPagePath,
  getPageIdByPath,
} from '../src/routes.ts';
import { APP_LANGUAGES } from '../src/settings.ts';

const SITE_URL = 'https://timecross.app';

test('the sitemap lists every indexed page in every language, and nothing else', () => {
  const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
  const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url).sort();
  const expected = APP_LANGUAGES
    .flatMap((language) => PAGE_IDS
      .filter((pageId) => PAGES[pageId].isIndexed)
      .map((pageId) => `${SITE_URL}${getCanonicalLanguagePath(language, PAGES[pageId].path)}`))
    .sort();

  assert.deepEqual(listed, expected);
});

test('every page path is found again, with and without a language', () => {
  for (const pageId of PAGE_IDS) {
    const { path } = PAGES[pageId];

    assert.equal(getPageIdByPath(path), pageId);
    assert.ok(isLocalizedPagePath(path), path);
    assert.ok(isLocalizedPagePath(getCanonicalLanguagePath('de', path)), path);
  }

  assert.equal(getPageIdByPath('/unknown'), null);
  assert.ok(!isLocalizedPagePath('/de/unknown'));
});

test('a page that names another canonical page points to an indexed one', () => {
  for (const pageId of PAGE_IDS.filter((id) => 'canonicalPage' in PAGES[id])) {
    const canonicalPageId = getPageIdByPath(getCanonicalPagePath(pageId));

    assert.notEqual(canonicalPageId, pageId);
    assert.ok(canonicalPageId && PAGES[canonicalPageId].isIndexed, pageId);
  }
});
