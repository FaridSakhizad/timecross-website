import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';

import { registerSourceLoader } from './support/sourceLoader.mjs';

const hooks = registerSourceLoader();

after(() => hooks.deregister());

const { default: worker } = await import('../server/index.ts');

const template = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const SITE = 'https://timecross.app';

/** The ASSETS binding: index.html for "/", a stub for everything else. Records the requests. */
function createEnv({ templateStatus = 200 } = {}) {
  const requests = [];

  return {
    requests,
    ASSETS: {
      async fetch(request) {
        requests.push(request);

        if (new URL(request.url).pathname === '/') {
          return new Response(template, {
            status: templateStatus,
            headers: {
              'content-type': 'text/html',
              etag: '"template"',
              'last-modified': 'Mon, 02 Nov 2026 10:00:00 GMT',
            },
          });
        }

        return new Response('asset');
      },
    },
  };
}

function request(path, { headers = {}, method = 'GET' } = {}) {
  return worker.fetch(new Request(`${SITE}${path}`, {
    method,
    headers: { accept: 'text/html', ...headers },
  }), createEnv());
}

const location = (response) => response.headers.get('location');

test('a page without a language redirects to the visitor\'s language', async () => {
  assert.equal(location(await request('/', { headers: { 'accept-language': 'ru-RU,ru;q=0.9,en;q=0.8' } })), `${SITE}/ru`);
  assert.equal(location(await request('/world-clock', { headers: { 'accept-language': 'de' } })), `${SITE}/de/world-clock`);
  assert.equal(location(await request('/')), `${SITE}/en`);
  assert.equal((await request('/')).status, 302);
});

test('Portuguese redirects follow the region: Brazilian by default, European for Portugal', async () => {
  assert.equal(location(await request('/', { headers: { 'accept-language': 'pt' } })), `${SITE}/pt-br`);
  assert.equal(location(await request('/', { headers: { 'accept-language': 'pt-PT,pt;q=0.9' } })), `${SITE}/pt`);
});

test('the old /uk/ prefix redirects to /ua/', async () => {
  assert.equal(location(await request('/uk/grid')), `${SITE}/ua/grid`);
});

test('a redirect to the same page keeps the query, so shared links survive', async () => {
  const query = '?cities=%5B%5B%22Tokyo%22%2C%22Asia%2FTokyo%22%5D%5D&at=1793898000';

  assert.equal(location(await request(`/meeting-time-planner${query}`)), `${SITE}/en/meeting-time-planner${query}`);
  assert.equal(location(await request(`/uk/convert${query}`)), `${SITE}/ua/convert${query}`);
});

test('a URL that is not a page gets the 404 page with status 404, without a redirect', async () => {
  const cases = [
    ['/en/no-such-page', {}, 'en', 'Page not found'],
    ['/de/cities/extra', {}, 'de', 'Seite nicht gefunden'],
    ['/xx/cities', {}, 'en', 'Page not found'],
    ['/no-such-page', { 'accept-language': 'fr' }, 'fr', 'Page introuvable'],
  ];

  for (const [path, headers, language, heading] of cases) {
    const response = await request(path, { headers });
    const html = await response.text();

    assert.equal(response.status, 404, path);
    assert.equal(location(response), null, path);
    assert.match(html, new RegExp(`<html[^>]*lang="${language}"`), path);
    assert.match(html, /<meta name="robots" content="noindex, follow" data-managed-seo="true" \/>/, path);
    assert.doesNotMatch(html, /rel="canonical"/, path);
    assert.match(html, new RegExp(`<h1 class="notFoundPage-title">${heading}</h1>`), path);
  }
});

test('the 404 page links to the home page and the tools in its language', async () => {
  const html = await (await request('/ru/no-such-page')).text();

  for (const href of ['/ru', '/ru/world-clock', '/ru/meeting-time-planner', '/ru/time-zone-converter']) {
    assert.match(html, new RegExp(`class="button notFoundPage-link" href="${href}"`), href);
  }
});

test('files that do not exist are left to the static assets (a plain 404 there)', async () => {
  for (const path of ['/.env', '/wp-login.php', '/assets/missing.js']) {
    const response = await request(path);

    assert.equal(await response.text(), 'asset', path);
  }
});

test('a localized page is rendered on the server with its language and head tags', async () => {
  const response = await request('/ru/world-clock');
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /<html[^>]*lang="ru"/);
  assert.match(html, /<title>Мировые часы — TimeCross<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/timecross\.app\/ru\/world-clock" data-managed-seo="true" \/>/);
  assert.match(html, /<meta name="robots" content="index, follow" data-managed-seo="true" \/>/);
  assert.match(html, /<div id="root">\s*<[^/]/);
});

test('a full-screen tool page points to its main page with the canonical', async () => {
  const html = await (await request('/ru/grid')).text();

  assert.match(html, /<meta name="robots" content="index, follow" data-managed-seo="true" \/>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/timecross\.app\/ru\/meeting-time-planner" data-managed-seo="true" \/>/);
});

test('rendered pages do not reuse the validators of index.html', async () => {
  const response = await request('/en/world-clock');

  assert.equal(response.headers.get('etag'), null);
  assert.equal(response.headers.get('last-modified'), null);
  assert.equal(response.headers.get('cache-control'), 'no-cache');
  assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
});

test('the template is fetched without the visitor\'s conditional headers', async () => {
  const env = createEnv();

  await worker.fetch(new Request(`${SITE}/en`, { headers: { accept: 'text/html', 'if-none-match': '"template"' } }), env);

  const [templateRequest] = env.requests;

  assert.equal(new URL(templateRequest.url).pathname, '/');
  assert.equal(templateRequest.headers.get('if-none-match'), null);
});

test('HEAD returns the headers of the page without a body', async () => {
  const response = await request('/en', { method: 'HEAD' });

  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
});

test('JSON-LD cannot close its script tag early', async () => {
  const html = await (await request('/en/time-zone-converter')).text();
  const scripts = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];

  assert.ok(scripts.length > 0);

  for (const [, json] of scripts) {
    assert.ok(!json.includes('<'));
    JSON.parse(json);
  }
});

test('assets and other non-page requests go to the static assets as they are', async () => {
  const env = createEnv();
  const response = await worker.fetch(new Request(`${SITE}/assets/index.js`), env);

  assert.equal(await response.text(), 'asset');
  assert.equal(env.requests[0]?.url, `${SITE}/assets/index.js`);
});

test('unknown API paths are 404, not pages', async () => {
  assert.equal((await request('/api/unknown')).status, 404);
});

test('a failed template fetch is passed through', async () => {
  const response = await worker.fetch(new Request(`${SITE}/en`, { headers: { accept: 'text/html' } }), createEnv({ templateStatus: 500 }));

  assert.equal(response.status, 500);
});
