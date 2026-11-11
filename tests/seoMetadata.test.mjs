import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { registerSourceLoader } from './support/sourceLoader.mjs';

const hooks = registerSourceLoader();

after(() => hooks.deregister());

const { getHeadTags, getPageTitle, getSeoMetadata } = await import('../src/seoMetadata.ts');
const { loadDictionary } = await import('../src/i18n/dictionaries.ts');
const { getCanonicalLanguagePath } = await import('../src/i18n/languageRouting.ts');
const { PAGES, PAGE_IDS, getPagePaths } = await import('../src/routes.ts');
const { APP_LANGUAGES } = await import('../src/settings.ts');
const { SITE_URL } = await import('../src/config.ts');

await Promise.all(APP_LANGUAGES.map(loadDictionary));

const absolute = (language, path) => `${SITE_URL}${getCanonicalLanguagePath(language, path)}`;

const findTags = (tags, name, attribute, value) => tags.filter((tag) => (
  tag.name === name && tag.attributes[attribute] === value
));

const PAGE_PATHS = PAGE_IDS.flatMap((pageId) => getPagePaths(pageId).map((pagePath) => ({ pageId, pagePath })));

for (const language of APP_LANGUAGES) {
  for (const { pageId, pagePath } of PAGE_PATHS) {
    const page = PAGES[pageId];
    const pathname = getCanonicalLanguagePath(language, pagePath);

    test(`${pathname}: canonical URL, robots and translated texts`, () => {
      const metadata = getSeoMetadata(language, pagePath);
      const tags = getHeadTags(language, pathname);
      const canonicalPath = page.canonicalPage ? PAGES[page.canonicalPage].path : pagePath;

      assert.equal(metadata.canonicalUrl, absolute(language, canonicalPath));
      // A full-screen tool page stays indexable and points to its main page with the canonical.
      assert.equal(metadata.robots, page.isIndexed || page.canonicalPage ? 'index, follow' : 'noindex, follow');
      assert.deepEqual(findTags(tags, 'link', 'rel', 'canonical').map((tag) => tag.attributes.href), [metadata.canonicalUrl]);

      for (const text of [metadata.title, metadata.description, metadata.ogTitle, metadata.ogDescription]) {
        assert.ok(text && !text.startsWith('seo.') && !text.includes('{'), `untranslated text: ${text}`);
      }
    });
  }
}

test('every page lists every language once in hreflang, plus x-default in English', () => {
  for (const { pageId, pagePath } of PAGE_PATHS) {
    const tags = getHeadTags('en', getCanonicalLanguagePath('en', pagePath));
    const alternates = findTags(tags, 'link', 'rel', 'alternate');
    const hreflangs = alternates.map((tag) => tag.attributes.hreflang);
    const { canonicalPage } = PAGES[pageId];
    const canonicalPath = canonicalPage ? PAGES[canonicalPage].path : pagePath;

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
  assert.ok(schemaIds('/es/24-hour-clock').includes('faq'));
  assert.ok(schemaIds('/es/24-hour-clock').includes('web-application'));
  assert.ok(!schemaIds('/ru/world-clock').includes('faq'));
  assert.ok(schemaIds('/de/time-difference/berlin-bangkok').includes('faq'));

  const pairFaq = JSON.parse(getHeadTags('de', '/de/time-difference/berlin-bangkok').find((tag) => tag.attributes['data-seo-id'] === 'faq').content);

  assert.match(pairFaq.mainEntity[0].acceptedAnswer.text, /^Bangkok ist Berlin (5|6) Stunden voraus\. Im Lauf des Jahres beträgt die Zeitverschiebung zwischen 5 Stunden und 6 Stunden\.$/);

  const faq = getHeadTags('ru', '/ru/time-zone-converter').find((tag) => tag.attributes['data-seo-id'] === 'faq');
  const faqEn = getHeadTags('en', '/en/time-zone-converter').find((tag) => tag.attributes['data-seo-id'] === 'faq');

  assert.notEqual(faq.content, faqEn.content);
});

test('a URL that is not a page gets the 404 title, a description and "noindex" only', () => {
  for (const pathname of ['/en/no-such-page', '/no-such-page', '/en/cities/extra', '/xx/cities', '/en/time-difference/madrid-mars', '/en/time-difference']) {
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
    ['/en/world-clock', '/world-clock'],
    ['/en/meeting-time-planner', '/meeting-time-planner'],
    ['/en/time-zone-converter', '/time-zone-converter'],
    ['/en/convert', '/convert'],
  ];

  for (const [pathname, pagePath] of toolPages) {
    const tag = getHeadTags('en', pathname).find((headTag) => headTag.attributes['data-seo-id'] === 'web-application');
    const value = JSON.parse(tag?.content ?? '{}');

    assert.equal(value['@type'], 'WebApplication', pathname);
    assert.equal(value.isAccessibleForFree, true, pathname);
    assert.equal(value.url, getSeoMetadata('en', pagePath).canonicalUrl, pathname);
  }

  assert.ok(!getHeadTags('en', '/en').some((tag) => tag.attributes['data-seo-id'] === 'web-application'));
});

test('the title of a page comes from its SEO texts', () => {
  assert.equal(getPageTitle('ru', '/ru/world-clock'), getSeoMetadata('ru', '/world-clock').title);
  assert.equal(getPageTitle('es', '/es/time-difference/madrid-mexico-city'), 'Diferencia horaria entre Madrid y Ciudad de México — TimeCross');
});
