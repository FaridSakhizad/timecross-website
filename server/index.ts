import {
  CONTACT_API_PATH,
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
import { render } from './entry-server';
import { loadDictionary } from '../src/i18n/dictionaries';

import {
  getAlternateLinks,
  getSeoJsonLd,
  getSeoMetadata,
} from '../src/seoMetadata';
import {
  getCanonicalLanguagePath,
  getLanguageFromAcceptLanguage,
  getLanguageFromPathname,
  isLocalizedPagePath,
  stripLanguageFromPathname,
} from '../src/i18n/languageRouting';
import type { AppLanguage } from '../src/settings';

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

// Env (bindings and secrets) is generated from wrangler.jsonc: npm run cf-typegen.
type WorkerHandler = {
  fetch: (request: Request, env: Env) => Promise<Response>;
};

const IS_DEV = import.meta.env.DEV;
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

function isSpaNavigationRequest(request: Request, url: URL) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return false;
  }

  if (url.pathname.includes('.')) {
    return false;
  }

  return request.headers.get('accept')?.includes('text/html') ?? false;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getPreferredLanguage(request: Request): AppLanguage {
  return getLanguageFromAcceptLanguage(request.headers.get('accept-language'));
}

function getRedirectResponse(request: Request, url: URL) {
  if (!isSpaNavigationRequest(request, url)) {
    return null;
  }

  const pathnameParts = url.pathname.split('/').filter(Boolean);
  const firstPathPart = pathnameParts[0];
  const routeLanguage = getLanguageFromPathname(url.pathname);
  const pagePath = stripLanguageFromPathname(url.pathname);

  if (!firstPathPart && isLocalizedPagePath(url.pathname)) {
    return Response.redirect(new URL(getCanonicalLanguagePath(getPreferredLanguage(request), pagePath), url), 302);
  }

  if (firstPathPart === 'uk') {
    return Response.redirect(new URL(getCanonicalLanguagePath(routeLanguage ?? 'en', pagePath), url), 302);
  }

  if (!routeLanguage && isLocalizedPagePath(url.pathname)) {
    return Response.redirect(new URL(getCanonicalLanguagePath(getPreferredLanguage(request), pagePath), url), 302);
  }

  if (firstPathPart && !routeLanguage && !url.pathname.startsWith('/api/') && !url.pathname.includes('.')) {
    return Response.redirect(new URL(getCanonicalLanguagePath(getPreferredLanguage(request)), url), 302);
  }

  return null;
}

function getManagedHead(metadata: ReturnType<typeof getSeoMetadata>, pathname: string) {
  const alternateLinks = getAlternateLinks(pathname)
    .map((link) => `<link rel="alternate" hreflang="${escapeHtml(link.hreflang)}" href="${escapeHtml(link.href)}" data-managed-seo="true" />`)
    .join('\n    ');
  const jsonLd = getSeoJsonLd(metadata.language, pathname)
    .map((schema) => `<script type="application/ld+json" data-managed-seo="true" data-seo-id="${escapeHtml(schema.id)}">${JSON.stringify(schema.value).replace(/</g, '\\u003c')}</script>`)
    .join('\n    ');

  return [
    `<meta name="description" content="${escapeHtml(metadata.description)}" data-managed-seo="true" />`,
    `<meta name="robots" content="${escapeHtml(metadata.robots)}" data-managed-seo="true" />`,
    '<meta name="theme-color" content="#f2d85f" data-managed-seo="true" />',
    `<link rel="canonical" href="${escapeHtml(metadata.canonicalUrl)}" data-managed-seo="true" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" data-managed-seo="true" />`,
    '<meta property="og:type" content="website" data-managed-seo="true" />',
    `<meta property="og:url" content="${escapeHtml(metadata.canonicalUrl)}" data-managed-seo="true" />`,
    `<meta property="og:title" content="${escapeHtml(metadata.ogTitle)}" data-managed-seo="true" />`,
    `<meta property="og:description" content="${escapeHtml(metadata.ogDescription)}" data-managed-seo="true" />`,
    `<meta property="og:image" content="${escapeHtml(metadata.imageUrl)}" data-managed-seo="true" />`,
    '<meta property="og:image:width" content="1200" data-managed-seo="true" />',
    '<meta property="og:image:height" content="630" data-managed-seo="true" />',
    '<meta name="twitter:card" content="summary_large_image" data-managed-seo="true" />',
    `<meta name="twitter:title" content="${escapeHtml(metadata.ogTitle)}" data-managed-seo="true" />`,
    `<meta name="twitter:description" content="${escapeHtml(metadata.ogDescription)}" data-managed-seo="true" />`,
    `<meta name="twitter:image" content="${escapeHtml(metadata.imageUrl)}" data-managed-seo="true" />`,
    alternateLinks,
    jsonLd,
  ].filter(Boolean).join('\n    ');
}

function injectSsrHtml(template: string, appHtml: string, metadata: ReturnType<typeof getSeoMetadata>, pathname: string) {
  const managedHead = getManagedHead(metadata, pathname);

  // Replacements are passed as functions: in a replacement string "$&", "$'" and similar
  // sequences are special, and the rendered HTML may contain them.
  return template
    .replace(/<html([^>]*)lang="[^"]*"([^>]*)>/, (_match, before: string, after: string) => (
      `<html${before}lang="${metadata.language}"${after}>`
    ))
    .replace(/<title>.*?<\/title>/s, () => `<title>${escapeHtml(metadata.title)}</title>`)
    .replace(/\n?\s*<(?:meta|link)[^>]+data-managed-seo="true"[^>]*>/g, '')
    .replace(/\n?\s*<script[^>]+data-managed-seo="true"[^>]*>.*?<\/script>/gs, '')
    .replace('</head>', () => `    ${managedHead}\n</head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${appHtml}</div>`);
}

async function serveSsrPage(request: Request, env: Env, url: URL) {
  const language = getLanguageFromPathname(url.pathname) ?? getPreferredLanguage(request);

  // Translations other than English are separate chunks; SSR renders synchronously, so load first.
  await loadDictionary(language);
  const indexUrl = new URL('/', url);
  const indexRequest = new Request(indexUrl, request);
  const templateResponse = await env.ASSETS.fetch(indexRequest);

  if (!templateResponse.ok) {
    return templateResponse;
  }

  const template = await templateResponse.text();
  const metadata = getSeoMetadata(language, url.pathname);
  const appHtml = render(`${url.pathname}${url.search}`, language);
  const html = injectSsrHtml(template, appHtml, metadata, url.pathname);
  const headers = new Headers(templateResponse.headers);

  headers.set('content-type', 'text/html; charset=utf-8');

  return new Response(request.method === 'HEAD' ? null : html, {
    headers,
    status: templateResponse.status,
  });
}

async function serveStaticAsset(request: Request, env: Env, url: URL) {
  const redirectResponse = getRedirectResponse(request, url);

  if (redirectResponse) {
    return redirectResponse;
  }

  if (IS_DEV && isSpaNavigationRequest(request, url)) {
    return env.ASSETS.fetch(request);
  }

  if (isSpaNavigationRequest(request, url)) {
    return serveSsrPage(request, env, url);
  }

  return env.ASSETS.fetch(request);
}

async function handleContactRequest(request: Request, env: Env): Promise<Response> {
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

  if (name.length > 100) {
    return jsonResponse(
      { ok: false, error: 'Name is too long' },
      400,
    );
  }

  if (!isValidEmail(email) || email.length > 254) {
    return jsonResponse(
      { ok: false, error: 'Invalid email address' },
      400,
    );
  }

  if (message.length > 5000) {
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === CONTACT_API_PATH) {
      return handleContactRequest(request, env);
    }

    if (url.pathname.startsWith('/api/')) {
      return new Response('Not Found', { status: 404 });
    }

    return serveStaticAsset(request, env, url);
  },
} satisfies WorkerHandler;
