/**
 * Page requests: language redirects, then the server-rendered page (status 404 for a URL that is
 * not a page) or the static asset.
 */
import { loadDictionary } from '../src/i18n/dictionaries';
import {
  getCanonicalLanguagePath,
  getLanguageFromAcceptLanguage,
  getLanguageFromPathname,
  isLocalizedPagePath,
  stripLanguageFromPathname,
} from '../src/i18n/languageRouting';
import { getMovedPagePath } from '../src/routes';
import {
  getHeadTags,
  getPageTitle,
  type HeadTag,
} from '../src/seoMetadata';
import type { AppLanguage } from '../src/settings';

import { render } from './entry-server';

const IS_DEV = import.meta.env.DEV;

/**
 * A request for a page: GET or HEAD of a path without a file extension, whatever the Accept
 * header says (link previews and some crawlers ask for any type). Files have an extension.
 * In development only browser navigations: Vite serves its own modules at paths like /@vite/client.
 */
function isPageRequest(request: Request, url: URL) {
  if ((request.method !== 'GET' && request.method !== 'HEAD') || url.pathname.includes('.')) {
    return false;
  }

  return !IS_DEV || (request.headers.get('accept')?.includes('text/html') ?? false);
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

/**
 * A redirect to the same page at `pathname`; the query is kept (shared planner and converter links).
 * Temporary by default: most redirects depend on the visitor's language.
 */
function redirectTo(url: URL, pathname: string, status: 301 | 302 = 302) {
  const location = new URL(pathname, url);

  location.search = url.search;

  return Response.redirect(location, status);
}

function getRedirectResponse(request: Request, url: URL) {
  if (!isPageRequest(request, url)) {
    return null;
  }

  const [firstPathPart] = url.pathname.split('/').filter(Boolean);
  const routeLanguage = getLanguageFromPathname(url.pathname);
  const pagePath = stripLanguageFromPathname(url.pathname);

  // The old prefix of Ukrainian.
  if (firstPathPart === 'uk') {
    return redirectTo(url, getCanonicalLanguagePath(routeLanguage ?? 'en', pagePath));
  }

  // A page that moved for good: a reversed city pair.
  const movedPagePath = getMovedPagePath(pagePath);

  if (movedPagePath) {
    return routeLanguage
      ? redirectTo(url, getCanonicalLanguagePath(routeLanguage, movedPagePath), 301)
      : redirectTo(url, getCanonicalLanguagePath(getPreferredLanguage(request), movedPagePath));
  }

  // A page without a language: the same page in the visitor's language.
  if (!routeLanguage && isLocalizedPagePath(url.pathname)) {
    return redirectTo(url, getCanonicalLanguagePath(getPreferredLanguage(request), pagePath));
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
  const title = getPageTitle(language, pathname);
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
    // A URL that is not a page renders the 404 page (see App.tsx) with a real 404 status.
    status: isLocalizedPagePath(url.pathname) ? 200 : 404,
  });
}

export async function handlePageRequest(request: Request, env: Env, url: URL) {
  const redirectResponse = getRedirectResponse(request, url);

  if (redirectResponse) {
    return redirectResponse;
  }

  // In development Vite serves index.html and renders the app in the browser.
  if (IS_DEV && isPageRequest(request, url)) {
    return env.ASSETS.fetch(new Request(new URL('/', url)));
  }

  if (isPageRequest(request, url)) {
    return serveSsrPage(request, env, url);
  }

  return env.ASSETS.fetch(request);
}
