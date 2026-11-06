import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { registerSourceLoader } from './support/sourceLoader.mjs';

const hooks = registerSourceLoader();

after(() => hooks.deregister());

const { getHeadTags, getPageTitle, getSeoMetadata } = await import('../src/seoMetadata.ts');
const { loadDictionary } = await import('../src/i18n/dictionaries.ts');
const { getCanonicalLanguagePath } = await import('../src/i18n/languageRouting.ts');
const { PAGES, PAGE_IDS } = await import('../src/routes.ts');
const { APP_LANGUAGES } = await import('../src/settings.ts');
const { SITE_URL } = await import('../src/config.ts');

await Promise.all(APP_LANGUAGES.map(loadDictionary));

const absolute = (language, path) => `${SITE_URL}${getCanonicalLanguagePath(language, path)}`;

const findTags = (tags, name, attribute, value) => tags.filter((tag) => (
  tag.name === name && tag.attributes[attribute] === value
));

for (const language of APP_LANGUAGES) {
  for (const pageId of PAGE_IDS) {
    const page = PAGES[pageId];
    const pathname = getCanonicalLanguagePath(language, page.path);

    test(`${pathname}: canonical URL, robots and translated texts`, () => {
      const metadata = getSeoMetadata(language, pageId);
      const tags = getHeadTags(language, pathname);
      const canonicalPath = page.canonicalPage ? PAGES[page.canonicalPage].path : page.path;

      assert.equal(metadata.canonicalUrl, absolute(language, canonicalPath));
      // A full-screen tool page stays indexable and points to its main page with the canonical.
      assert.equal(metadata.robots, page.isIndexed || page.canonicalPage ? 'index, follow' : 'noindex, follow');
      assert.deepEqual(findTags(tags, 'link', 'rel', 'canonical').map((tag) => tag.attributes.href), [metadata.canonicalUrl]);

      for (const text of [metadata.title, metadata.description]) {
        assert.ok(text && !text.startsWith('seo.'), `untranslated text: ${text}`);
      }
    });
  }
}

test('every page lists every language once in hreflang, plus x-default in English', () => {
  for (const pageId of PAGE_IDS) {
    const tags = getHeadTags('en', PAGES[pageId].path === '/' ? '/en' : `/en${PAGES[pageId].path}`);
    const alternates = findTags(tags, 'link', 'rel', 'alternate');
    const hreflangs = alternates.map((tag) => tag.attributes.hreflang);
    const canonicalPath = PAGES[PAGES[pageId].canonicalPage ?? pageId].path;

    assert.equal(new Set(hreflangs).size, hreflangs.length, `${pageId}: duplicate hreflang`);
    assert.equal(alternates.find((tag) => tag.attributes.hreflang === 'x-default')?.attributes.href, absolute('en', canonicalPath));

    for (const language of APP_LANGUAGES) {
      assert.ok(alternates.some((tag) => tag.attributes.href === absolute(language, canonicalPath)), `${pageId}: no link to ${language}`);
    }
  }
});

test('plain "pt" goes to Brazilian Portuguese, Portugal and Portuguese-speaking Africa to European', () => {
  const alternates = findTags(getHeadTags('en', '/en'), 'link', 'rel', 'alternate');
  const hrefOf = (hreflang) => alternates.find((tag) => tag.attributes.hreflang === hreflang)?.attributes.href;

  assert.equal(hrefOf('pt'), absolute('pt-BR', '/'));
  assert.equal(hrefOf('pt-BR'), absolute('pt-BR', '/'));
  assert.equal(hrefOf('pt-PT'), absolute('pt', '/'));
  assert.equal(hrefOf('pt-AO'), absolute('pt', '/'));
  assert.equal(hrefOf('uk'), absolute('uk', '/'));
});

test('structured data is valid JSON; the converter page also has its FAQ', () => {
  const schemaIds = (pathname) => getHeadTags('ru', pathname)
    .filter((tag) => tag.name === 'script')
    .map((tag) => {
      const value = JSON.parse(tag.content);

      assert.equal(value['@context'], 'https://schema.org');
      return tag.attributes['data-seo-id'];
    });

  assert.ok(schemaIds('/ru/time-zone-converter').includes('faq'));
  assert.ok(!schemaIds('/ru/world-clock').includes('faq'));

  const faq = getHeadTags('ru', '/ru/time-zone-converter').find((tag) => tag.attributes['data-seo-id'] === 'faq');
  const faqEn = getHeadTags('en', '/en/time-zone-converter').find((tag) => tag.attributes['data-seo-id'] === 'faq');

  assert.notEqual(faq.content, faqEn.content);
});

test('a URL that is not a page gets the 404 title, a description and "noindex" only', () => {
  for (const pathname of ['/en/no-such-page', '/no-such-page', '/en/cities/extra', '/xx/cities']) {
    assert.deepEqual(getHeadTags('en', pathname).map((tag) => tag.attributes.name), ['description', 'robots'], pathname);
    assert.equal(getPageTitle('en', pathname), 'Page not found — TimeCross');
  }

  assert.equal(getHeadTags('en', '/en/no-such-page')[1]?.attributes.content, 'noindex, follow');
  assert.equal(getPageTitle('ru', '/ru/no-such-page'), 'Страница не найдена — TimeCross');
});

test('every full-screen tool page has a canonical main page, so none of the pages is "noindex"', () => {
  for (const pageId of PAGE_IDS) {
    const page = PAGES[pageId];

    assert.ok(page.isIndexed || page.canonicalPage, pageId);
  }
});

test('the tool pages describe the web tool as a free WebApplication', () => {
  const toolPages = [
    ['/en/world-clock', 'worldClock'],
    ['/en/meeting-time-planner', 'meetingTimePlanner'],
    ['/en/time-zone-converter', 'timeZoneConverter'],
    ['/en/convert', 'timeZoneConverter'],
  ];

  for (const [pathname, pageId] of toolPages) {
    const tag = getHeadTags('en', pathname).find((headTag) => headTag.attributes['data-seo-id'] === 'web-application');
    const value = JSON.parse(tag?.content ?? '{}');

    assert.equal(value['@type'], 'WebApplication', pathname);
    assert.equal(value.isAccessibleForFree, true, pathname);
    assert.equal(value.url, getSeoMetadata('en', pageId).canonicalUrl, pathname);
  }

  assert.ok(!getHeadTags('en', '/en').some((tag) => tag.attributes['data-seo-id'] === 'web-application'));
});

test('the title of a page comes from its SEO texts', () => {
  assert.equal(getPageTitle('ru', '/ru/world-clock'), getSeoMetadata('ru', 'worldClock').title);
});
