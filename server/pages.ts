/**
 * Page requests: language redirects, then the server-rendered page (or the static asset).
 */
import { loadDictionary } from '../src/i18n/dictionaries';
import {
  getCanonicalLanguagePath,
  getLanguageFromAcceptLanguage,
  getLanguageFromPathname,
  isLocalizedPagePath,
  stripLanguageFromPathname,
} from '../src/i18n/languageRouting';
import {
  getHeadTags,
  getSeoMetadata,
  type HeadTag,
} from '../src/seoMetadata';
import type { AppLanguage } from '../src/settings';

import { render } from './entry-server';

const IS_DEV = import.meta.env.DEV;

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

function renderHeadTag({ name, attributes, content }: HeadTag) {
  const renderedAttributes = Object.entries({ ...attributes, 'data-managed-seo': 'true' })
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
    .join(' ');

  if (name === 'script') {
    // "</script>" inside JSON would end the script early.
    return `<script ${renderedAttributes}>${(content ?? '').replace(/</g, '\\u003c')}</script>`;
  }

  return `<${name} ${renderedAttributes} />`;
}

function injectSsrHtml(template: string, appHtml: string, language: AppLanguage, pathname: string) {
  const { title } = getSeoMetadata(language, pathname);
  const managedHead = getHeadTags(language, pathname)
    .map(renderHeadTag)
    .join('\n    ');

  // Replacements are passed as functions: in a replacement string "$&", "$'" and similar
  // sequences are special, and the rendered HTML may contain them.
  return template
    .replace(/<html([^>]*)lang="[^"]*"([^>]*)>/, (_match, before: string, after: string) => (
      `<html${before}lang="${language}"${after}>`
    ))
    .replace(/<title>.*?<\/title>/s, () => `<title>${escapeHtml(title)}</title>`)
    .replace('</head>', () => `    ${managedHead}\n</head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${appHtml}</div>`);
}

async function serveSsrPage(request: Request, env: Env, url: URL) {
  const language = getLanguageFromPathname(url.pathname) ?? getPreferredLanguage(request);

  // Translations other than English are separate chunks; SSR renders synchronously, so load first.
  await loadDictionary(language);

  // A plain GET: the browser's conditional headers (If-None-Match) describe this page, not
  // index.html, and must not turn into a 304 for the template.
  const templateResponse = await env.ASSETS.fetch(new Request(new URL('/', url)));

  if (!templateResponse.ok) {
    return templateResponse;
  }

  const template = await templateResponse.text();
  const appHtml = render(`${url.pathname}${url.search}`, language);
  const html = injectSsrHtml(template, appHtml, language, url.pathname);
  const headers = new Headers(templateResponse.headers);

  // The validators of index.html do not describe this page: the same ETag on every page would let
  // browsers keep stale HTML after a deploy that changes only the Worker or the translations.
  headers.delete('etag');
  headers.delete('last-modified');
  headers.delete('content-length');
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'no-cache');

  return new Response(request.method === 'HEAD' ? null : html, {
    headers,
    status: templateResponse.status,
  });
}

export async function handlePageRequest(request: Request, env: Env, url: URL) {
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
