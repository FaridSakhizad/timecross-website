/**
 * POST /api/contact: checks, in this order, rate limit, spam traps, fields and Turnstile, then sends the email.
 */
import {
  CONTACT_FIELD_MAX_LENGTH,
  CONTACT_FORM_FROM_EMAIL,
  CONTACT_FORM_TO_EMAIL,
  SITE_NAME,
} from '../src/config';

import {
  CONTACT_RATE_LIMIT_PERIOD_SECONDS,
  getClientIp,
  isWithinRateLimit,
  verifyTurnstileToken,
  type TurnstileVerification,
} from './contactProtection';

type ContactRequest = {
  name: string;
  email: string;
  message: string;
  /** Honeypot: hidden from people, usually filled in by bots. */
  website?: string;
  /** When the form was rendered (ms since epoch), used to drop instant bot submissions. */
  startedAt?: number;
  /** Cloudflare Turnstile token from the widget in the form. */
  turnstileToken?: string;
};

const CONTACT_MIN_FILL_TIME_MS = 3000;

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  headers?: HeadersInit,
): Response {
  return Response.json(body, { status, headers });
}

const TURNSTILE_FAILURE_RESPONSES: Record<Exclude<TurnstileVerification, { ok: true }>['reason'], {
  status: number;
  code: string;
}> = {
  'not-configured': { status: 503, code: 'unavailable' },
  unavailable: { status: 502, code: 'unavailable' },
  'missing-token': { status: 403, code: 'verification-failed' },
  rejected: { status: 403, code: 'verification-failed' },
  'wrong-action': { status: 403, code: 'verification-failed' },
  'wrong-hostname': { status: 403, code: 'verification-failed' },
};

function isContactRequest(value: unknown): value is ContactRequest {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    typeof data.name === 'string'
    && typeof data.email === 'string'
    && typeof data.message === 'string'
    && (data.website === undefined || typeof data.website === 'string')
    && (data.startedAt === undefined || typeof data.startedAt === 'number')
    && (data.turnstileToken === undefined || typeof data.turnstileToken === 'string')
  );
}

function isLikelySpam(body: ContactRequest) {
  if (body.website) {
    return true;
  }

  return typeof body.startedAt === 'number' && Date.now() - body.startedAt < CONTACT_MIN_FILL_TIME_MS;
}

/** Removes line breaks so user input cannot add lines to email headers such as Subject. */
function toSingleLine(value: string) {
  return value.replace(/[\r\n]+/g, ' ');
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function handleContactRequest(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse(
      { ok: false, error: 'Method not allowed' },
      405,
    );
  }

  const clientIp = getClientIp(request);

  // Checked before reading the body, so floods cost as little as possible.
  if (!await isWithinRateLimit(env.CONTACT_RATE_LIMITER, `contact:${clientIp}`)) {
    console.warn('Contact form rate limit hit:', { ip: clientIp });

    return jsonResponse(
      { ok: false, error: 'Too many requests', code: 'rate-limited' },
      429,
      { 'retry-after': String(CONTACT_RATE_LIMIT_PERIOD_SECONDS) },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      { ok: false, error: 'Invalid JSON' },
      400,
    );
  }

  if (!isContactRequest(body)) {
    return jsonResponse(
      { ok: false, error: 'Invalid request body' },
      400,
    );
  }

  if (isLikelySpam(body)) {
    // Pretend success so bots get no signal to adapt.
    return jsonResponse({ ok: true });
  }

  const name = toSingleLine(body.name.trim());
  const email = body.email.trim();
  const message = body.message.trim();

  if (!name || !email || !message) {
    return jsonResponse(
      { ok: false, error: 'All fields are required' },
      400,
    );
  }

  if (name.length > CONTACT_FIELD_MAX_LENGTH.name) {
    return jsonResponse(
      { ok: false, error: 'Name is too long' },
      400,
    );
  }

  if (!isValidEmail(email) || email.length > CONTACT_FIELD_MAX_LENGTH.email) {
    return jsonResponse(
      { ok: false, error: 'Invalid email address' },
      400,
    );
  }

  if (message.length > CONTACT_FIELD_MAX_LENGTH.message) {
    return jsonResponse(
      { ok: false, error: 'Message is too long' },
      400,
    );
  }

  // Last check before sending: a Turnstile token is single-use, so it is spent only on a valid message.
  const verification = await verifyTurnstileToken({
    token: body.turnstileToken,
    secret: env.TURNSTILE_SECRET_KEY,
    remoteIp: clientIp,
    expectedHostname: new URL(request.url).hostname,
  });

  if (!verification.ok) {
    const failure = TURNSTILE_FAILURE_RESPONSES[verification.reason];

    if (verification.reason === 'not-configured') {
      console.error('TURNSTILE_SECRET_KEY is not set; the contact form rejects every message.');
    } else {
      console.warn('Contact form Turnstile check failed:', {
        reason: verification.reason,
        errorCodes: verification.errorCodes,
      });
    }

    return jsonResponse(
      { ok: false, error: 'Verification failed', code: failure.code },
      failure.status,
    );
  }

  try {
    const result = await env.CONTACT_EMAIL.send({
      to: CONTACT_FORM_TO_EMAIL,
      from: {
        email: CONTACT_FORM_FROM_EMAIL,
        name: `${SITE_NAME} Contact Form`,
      },
      replyTo: {
        email,
        name,
      },
      subject: `${SITE_NAME} contact form: ${name}`,
      text: [
        `New message from the ${SITE_NAME} website`,
        '',
        `Name: ${name}`,
        `Email: ${email}`,
        '',
        'Message:',
        message,
      ].join('\n'),
    });

    console.log('Contact email sent:', { messageId: result.messageId });

    // Only a success flag goes back to the browser; delivery details stay in the logs.
    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('Contact email failed:', error);

    return jsonResponse(
      {
        ok: false,
        error: 'Unable to send message',
      },
      500,
    );
  }
}
