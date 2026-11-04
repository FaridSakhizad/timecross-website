/**
 * Abuse protection for the contact form: per-IP rate limiting and Cloudflare Turnstile.
 * No imports on purpose, so the logic can be unit-tested with plain Node.
 */

/** Matches the `ratelimits` binding in wrangler.jsonc. */
export type RateLimitBinding = {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
};

export const CONTACT_RATE_LIMIT_PERIOD_SECONDS = 60;

/** Must match the `action` the widget is rendered with in ContactForm. */
export const TURNSTILE_ACTION = 'contact';

const TURNSTILE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_TIMEOUT_MS = 5000;
const TURNSTILE_MAX_TOKEN_LENGTH = 2048;

/**
 * Cloudflare's dummy secrets (https://developers.cloudflare.com/turnstile/troubleshooting/testing/).
 * Their responses carry no real action or hostname, so those checks are skipped for them.
 */
const TURNSTILE_TEST_SECRETS = new Set([
  '1x0000000000000000000000000000000AA',
  '2x0000000000000000000000000000000AA',
  '3x0000000000000000000000000000000AA',
]);

export function getClientIp(request: Request) {
  return request.headers.get('cf-connecting-ip') ?? 'unknown';
}

/**
 * True when the request may go on. A missing binding lets the request through:
 * rate limiting is a safety net, Turnstile is the main gate.
 */
export async function isWithinRateLimit(limiter: RateLimitBinding | undefined, key: string) {
  if (!limiter) {
    console.warn('Contact rate limiter binding is missing; skipping the check.');
    return true;
  }

  try {
    const { success } = await limiter.limit({ key });

    return success;
  } catch (error) {
    console.error('Contact rate limiter failed; letting the request through:', error);
    return true;
  }
}

type SiteverifyResponse = {
  success?: boolean;
  action?: string;
  hostname?: string;
  'error-codes'?: string[];
};

export type TurnstileVerification = | { ok: true }
  | {
    ok: false;
    /** not-configured → 503, unavailable → 502, the rest → 403. */
    reason: 'not-configured' | 'missing-token' | 'rejected' | 'wrong-action' | 'wrong-hostname' | 'unavailable';
    errorCodes?: string[];
  };

type VerifyTurnstileOptions = {
  token: unknown;
  secret: string | undefined;
  remoteIp: string;
  /** Hostname the form was served from; Siteverify must report the same one. */
  expectedHostname: string;
  fetchImpl?: typeof fetch;
};

async function callSiteverify(body: Record<string, string>, fetchImpl: typeof fetch) {
  const response = await fetchImpl(TURNSTILE_SITEVERIFY_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Siteverify responded with HTTP ${response.status}`);
  }

  return await response.json() as SiteverifyResponse;
}

export async function verifyTurnstileToken({
  token,
  secret,
  remoteIp,
  expectedHostname,
  fetchImpl = fetch,
}: VerifyTurnstileOptions): Promise<TurnstileVerification> {
  if (!secret) {
    return { ok: false, reason: 'not-configured' };
  }

  if (typeof token !== 'string' || !token || token.length > TURNSTILE_MAX_TOKEN_LENGTH) {
    return { ok: false, reason: 'missing-token' };
  }

  const body: Record<string, string> = {
    secret,
    response: token,
    // The same key on a retry tells Siteverify it is the same check, so a token is not burned twice.
    idempotency_key: crypto.randomUUID(),
  };

  if (remoteIp !== 'unknown') {
    body.remoteip = remoteIp;
  }

  let result: SiteverifyResponse;

  try {
    result = await callSiteverify(body, fetchImpl);
  } catch (firstError) {
    try {
      result = await callSiteverify(body, fetchImpl);
    } catch (secondError) {
      console.error('Turnstile Siteverify is unavailable:', firstError, secondError);
      return { ok: false, reason: 'unavailable' };
    }
  }

  if (!result.success) {
    return { ok: false, reason: 'rejected', errorCodes: result['error-codes'] ?? [] };
  }

  if (TURNSTILE_TEST_SECRETS.has(secret)) {
    return { ok: true };
  }

  if (result.action !== TURNSTILE_ACTION) {
    return { ok: false, reason: 'wrong-action' };
  }

  if (result.hostname !== expectedHostname) {
    return { ok: false, reason: 'wrong-hostname' };
  }

  return { ok: true };
}
