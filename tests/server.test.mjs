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

test('an unknown page redirects to the home page in the visitor\'s language', async () => {
  assert.equal(location(await request('/no-such-page', { headers: { 'accept-language': 'fr' } })), `${SITE}/fr`);
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

test('tool pages are rendered with "noindex"', async () => {
  const html = await (await request('/ru/grid')).text();

  assert.match(html, /<meta name="robots" content="noindex, follow" data-managed-seo="true" \/>/);
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
