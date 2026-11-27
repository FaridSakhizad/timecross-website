import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { registerSourceLoader } from './support/sourceLoader.mjs';

const hooks = registerSourceLoader();

after(() => hooks.deregister());

const { createUuidV7, getPageProperties } = await import('../src/analytics/analytics.ts');
const { getAppStoreUrl } = await import('../src/analytics/appStoreLinks.ts');
const { handleEventsRequest } = await import('../server/events.ts');
const { APP_STORE_URL, GOOGLE_PLAY_URL } = await import('../src/config.ts');

test('a visit id is a UUID v7 that starts with the time', () => {
  const id = createUuidV7(Date.UTC(2026, 10, 26), new Uint8Array(10).fill(255));

  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(parseInt(id.replace(/-/g, '').slice(0, 12), 16), Date.UTC(2026, 10, 26));
  assert.notEqual(createUuidV7(), createUuidV7());
});

test('an event names its page and leaves the query out of the address', () => {
  const location = { origin: 'https://timecross.app', host: 'timecross.app', pathname: '/ru/meeting-time-planner' };

  assert.deepEqual(getPageProperties(location), {
    page: 'meetingTimePlanner',
    $current_url: 'https://timecross.app/ru/meeting-time-planner',
    $host: 'timecross.app',
    $pathname: '/ru/meeting-time-planner',
  });
  assert.equal(getPageProperties({ ...location, pathname: '/en/no-such-page' }).page, 'notFound');
});

test('a Google Play link tells the store which button it was; App Store without a provider token stays plain', () => {
  const url = new URL(getAppStoreUrl('googlePlay', 'hero'));
  const referrer = new URLSearchParams(url.searchParams.get('referrer'));

  assert.ok(url.href.startsWith(GOOGLE_PLAY_URL));
  assert.deepEqual(Object.fromEntries(referrer), { utm_source: 'timecross.app', utm_medium: 'website', utm_campaign: 'hero' });
  assert.equal(getAppStoreUrl('appStore', 'hero'), APP_STORE_URL);
});

const event = {
  event: 'meeting_saved',
  distinct_id: createUuidV7(),
  timestamp: '2026-11-26T20:00:00.000Z',
  properties: { method: 'ics', $ip: '6.6.6.6' },
};

function post(body, headers = {}, method = 'POST') {
  return new Request('https://timecross.app/api/e', {
    method,
    headers,
    body: method === 'POST' ? body : undefined,
  });
}

test('an event goes on to PostHog with the project key and the visitor\'s IP, not the one it claims', async () => {
  const sent = [];

  const fetchImpl = async (url, init) => {
    sent.push({ url, body: JSON.parse(init.body) });
    return new Response('{}');
  };

  const response = await handleEventsRequest(post(JSON.stringify(event), { 'cf-connecting-ip': '1.2.3.4' }), { projectKey: 'phc_test', fetchImpl });

  assert.equal(response.status, 204);
  assert.equal(sent[0].url, 'https://eu.i.posthog.com/i/v0/e/');
  assert.deepEqual(sent[0].body, { ...event, api_key: 'phc_test', properties: { method: 'ics', $ip: '1.2.3.4' } });

  // Without Cloudflare's header (tests, local runs), no IP at all.
  await handleEventsRequest(post(JSON.stringify(event)), { projectKey: 'phc_test', fetchImpl });
  assert.equal('$ip' in sent[1].body.properties, false);
});

test('without a project key, a broken or a too long event, nothing goes on', async () => {
  let calls = 0;

  const fetchImpl = async () => {
    calls += 1;
    return new Response('{}');
  };

  const options = { projectKey: 'phc_test', fetchImpl };

  assert.equal((await handleEventsRequest(post(JSON.stringify(event)), { fetchImpl, projectKey: '' })).status, 204);
  assert.equal((await handleEventsRequest(post('{'), options)).status, 400);
  assert.equal((await handleEventsRequest(post(JSON.stringify({ ...event, event: 'Bad Name' })), options)).status, 400);
  assert.equal((await handleEventsRequest(post(JSON.stringify({ ...event, properties: [] })), options)).status, 400);
  assert.equal((await handleEventsRequest(post(JSON.stringify({ ...event, distinct_id: 'x'.repeat(65) })), options)).status, 400);
  assert.equal((await handleEventsRequest(post('x'.repeat(9000)), options)).status, 413);
  assert.equal((await handleEventsRequest(post('', {}, 'GET'), options)).status, 405);
  assert.equal(calls, 0);
});

test('PostHog out of reach does not fail the request', async () => {
  const fetchImpl = async () => {
    throw new Error('offline');
  };

  assert.equal((await handleEventsRequest(post(JSON.stringify(event)), { projectKey: 'phc_test', fetchImpl })).status, 204);
});
