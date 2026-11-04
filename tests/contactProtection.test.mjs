import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  TURNSTILE_ACTION,
  getClientIp,
  isWithinRateLimit,
  verifyTurnstileToken,
} from '../server/contactProtection.ts';

const REAL_SECRET = 'real-secret';
const TEST_SECRET = '1x0000000000000000000000000000000AA';

function fakeSiteverify(...responses) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    const next = responses.shift();
    if (next instanceof Error) {
      throw next;
    }
    return Response.json(next);
  };
  return { calls, fetchImpl };
}

const verify = (overrides) => verifyTurnstileToken({
  token: 'token',
  secret: REAL_SECRET,
  remoteIp: '203.0.113.7',
  expectedHostname: 'timecross.app',
  ...overrides,
});

test('client and server use the same Turnstile action', () => {
  const config = readFileSync(new URL('../src/config.ts', import.meta.url), 'utf8');
  assert.match(config, new RegExp(`TURNSTILE_ACTION = '${TURNSTILE_ACTION}'`));
});

test('a missing secret fails closed', async () => {
  assert.deepEqual(await verify({ secret: undefined }), { ok: false, reason: 'not-configured' });
});

test('a missing or oversized token is rejected without calling Siteverify', async () => {
  const { calls, fetchImpl } = fakeSiteverify();
  assert.equal((await verify({ token: undefined, fetchImpl })).reason, 'missing-token');
  assert.equal((await verify({ token: 'x'.repeat(2049), fetchImpl })).reason, 'missing-token');
  assert.equal(calls.length, 0);
});

test('a valid token for this action and hostname passes', async () => {
  const { calls, fetchImpl } = fakeSiteverify({ success: true, action: 'contact', hostname: 'timecross.app' });
  assert.deepEqual(await verify({ fetchImpl }), { ok: true });
  assert.equal(calls[0].url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.equal(calls[0].body.secret, REAL_SECRET);
  assert.equal(calls[0].body.remoteip, '203.0.113.7');
});

test('Siteverify rejections, other actions and other hostnames fail', async () => {
  const rejected = fakeSiteverify({ success: false, 'error-codes': ['timeout-or-duplicate'] });
  assert.deepEqual(await verify({ fetchImpl: rejected.fetchImpl }),
    { ok: false, reason: 'rejected', errorCodes: ['timeout-or-duplicate'] });

  const otherAction = fakeSiteverify({ success: true, action: 'login', hostname: 'timecross.app' });
  assert.equal((await verify({ fetchImpl: otherAction.fetchImpl })).reason, 'wrong-action');

  const otherHost = fakeSiteverify({ success: true, action: 'contact', hostname: 'evil.example' });
  assert.equal((await verify({ fetchImpl: otherHost.fetchImpl })).reason, 'wrong-hostname');
});

test('Cloudflare test secrets skip the action and hostname checks', async () => {
  const { fetchImpl } = fakeSiteverify({ success: true, action: '', hostname: 'example.com' });
  assert.deepEqual(await verify({ secret: TEST_SECRET, fetchImpl }), { ok: true });
});

test('one network failure is retried with the same idempotency key', async () => {
  const { calls, fetchImpl } = fakeSiteverify(new Error('reset'), { success: true, action: 'contact', hostname: 'timecross.app' });
  assert.deepEqual(await verify({ fetchImpl }), { ok: true });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.idempotency_key, calls[1].body.idempotency_key);
});

test('two failures in a row report Siteverify as unavailable', async () => {
  const { fetchImpl } = fakeSiteverify(new Error('reset'), new Error('reset'));
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await verify({ fetchImpl }), { ok: false, reason: 'unavailable' });
  } finally {
    console.error = originalError;
  }
});

test('an unknown client IP is not sent to Siteverify', async () => {
  const { calls, fetchImpl } = fakeSiteverify({ success: true, action: 'contact', hostname: 'timecross.app' });
  await verify({ remoteIp: 'unknown', fetchImpl });
  assert.equal('remoteip' in calls[0].body, false);
});

test('rate limiter: over the limit blocks, a missing or failing binding lets requests through', async () => {
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = () => {};
  console.error = () => {};
  try {
    const keys = [];
    const limiter = {
      limit: async ({ key }) => {
        keys.push(key);
        return { success: keys.length <= 3 };
      },
    };
    const results = [];
    for (let i = 0; i < 4; i += 1) {
      results.push(await isWithinRateLimit(limiter, 'contact:1.2.3.4'));
    }
    assert.deepEqual(results, [true, true, true, false]);
    assert.equal(await isWithinRateLimit(undefined, 'k'), true);
    assert.equal(await isWithinRateLimit({
      limit: async () => {
        throw new Error('down');
      },
    }, 'k'), true);
  } finally {
    console.warn = originalWarn;
    console.error = originalError;
  }
});

test('client IP comes from CF-Connecting-IP', () => {
  assert.equal(getClientIp(new Request('https://x', { headers: { 'cf-connecting-ip': '198.51.100.1' } })), '198.51.100.1');
  assert.equal(getClientIp(new Request('https://x')), 'unknown');
});
