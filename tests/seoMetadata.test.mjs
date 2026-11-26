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

test('a shared meeting link previews its title, date and hours in every city', async () => {
  const { buildGridEventUrl } = await import('../src/components/TimelineGrid/shared/eventUrlState.ts');
  const { slotsOf } = await import('./support/gridSlots.mjs');
  const start = Date.parse('2026-11-18T15:00:00Z');
  const cities = [
    { id: 'mad', city: 'Madrid', cityId: '3117735', timezone: 'Europe/Madrid', customName: '' },
    { id: 'ny', city: 'New York City', timezone: 'America/New_York', customName: 'Office NY' },
    { id: 'bkk', city: 'Bangkok', timezone: 'Asia/Bangkok', customName: '' },
  ];
  const hours = slotsOf(cities.flatMap((city) => [0, 1].map((index) => ({ rowId: city.id, start: start + index * 3600000 }))));
  const { search } = new URL(buildGridEventUrl('https://timecross.app/es/meeting-time-planner', cities, hours, 'Weekly sync'));
  const content = (tags, property) => tags.find((tag) => tag.attributes.property === property || tag.attributes.name === property)?.attributes.content;

  for (const pathname of ['/es/meeting-time-planner', '/es/grid']) {
    const tags = getHeadTags('es', pathname, `${search}&at=2026-11-18T15:00:00.000Z`);

    assert.equal(content(tags, 'og:title'), 'Weekly sync · mié, 18 de noviembre');
    assert.equal(content(tags, 'og:description'), 'Madrid 16:00 – 18:00 · Office NY 10:00 – 12:00 · Bangkok 22:00 – 00:00');
    assert.equal(content(tags, 'twitter:title'), content(tags, 'og:title'));
    assert.equal(content(tags, 'og:url'), `${SITE_URL}/es/meeting-time-planner${search}`);
    assert.equal(findTags(tags, 'link', 'rel', 'canonical')[0].attributes.href, `${SITE_URL}/es/meeting-time-planner`);
  }

  const untitled = new URL(buildGridEventUrl('https://timecross.app/', cities.slice(2), hours.filter((hour) => hour.rowId === 'bkk'))).search;

  assert.equal(content(getHeadTags('ru', '/ru/meeting-time-planner', untitled), 'og:title'), 'Встреча · ср, 18 ноября');
  assert.equal(content(getHeadTags('ru', '/ru/meeting-time-planner', untitled), 'og:description'), 'Bangkok 22:00 – 00:00');
  // A city we translate gets its name in the language, from its geonameId.
  assert.match(content(getHeadTags('ru', '/ru/meeting-time-planner', search), 'og:description'), /^Мадрид 16:00 – 18:00 · Office NY/);
  assert.equal(content(getHeadTags('es', '/es/world-clock', search), 'og:url'), `${SITE_URL}/es/world-clock`);

  // A meeting from half past to half past.
  const halves = hours.filter((hour) => hour.rowId === 'mad').slice(1, -1);
  const halfLink = new URL(buildGridEventUrl('https://timecross.app/', cities.slice(0, 1), halves)).search;

  assert.equal(content(getHeadTags('en', '/en/meeting-time-planner', halfLink), 'og:description'), 'Madrid 16:30 – 17:30');
});

test("a meeting link's preview speaks its author's language, the page the visitor's", async () => {
  const { buildGridEventUrl } = await import('../src/components/TimelineGrid/shared/eventUrlState.ts');
  const { slotsOf } = await import('./support/gridSlots.mjs');
  const start = Date.parse('2026-11-18T15:00:00Z');
  const cities = [{ id: 'mad', city: 'Madrid', cityId: '3117735', timezone: 'Europe/Madrid', customName: '' }];
  const hours = slotsOf([{ rowId: 'mad', start }]);
  const { search } = new URL(buildGridEventUrl('https://timecross.app/m', cities, hours, '', 'ru'));
  const content = (tags, property) => tags.find((tag) => tag.attributes.property === property || tag.attributes.name === property)?.attributes.content;
  const tags = getHeadTags('en', '/en/meeting-time-planner', search);

  assert.equal(content(tags, 'og:title'), 'Встреча · ср, 18 ноября');
  assert.equal(content(tags, 'og:description'), 'Мадрид 16:00 – 17:00');
  assert.equal(content(tags, 'description'), getSeoMetadata('en', '/meeting-time-planner').description);
  assert.equal(content(tags, 'og:url'), `${SITE_URL}/en/meeting-time-planner${search}`);

  // A language we do not have: the page's.
  const unknown = search.replace('l=ru', 'l=xx');

  assert.equal(content(getHeadTags('en', '/en/meeting-time-planner', unknown), 'og:title'), 'Meeting · Wed, November 18');
});
