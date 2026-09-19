import {
  CONTACT_FORM_FROM_EMAIL,
  CONTACT_FORM_TO_EMAIL,
  SITE_NAME,
} from "../src/config";

import { render } from "./entry-server";

import {
  getAlternateLinks,
  getSeoJsonLd,
  getSeoMetadata,
} from "../src/seoMetadata";
import {
  getCanonicalLanguagePath,
  getLanguageFromPathname,
  getLanguageFromUrlSegment,
  isLocalizedPagePath,
  stripLanguageFromPathname,
} from "../src/i18n/languageRouting";
import type { AppLanguage } from "../src/settings";

type ContactRequest = {
  name: string;
  email: string;
  message: string;
};

type ContactEmailMessage = {
  to: string;
  from: {
    email: string;
    name: string;
  };
  replyTo: {
    email: string;
    name: string;
  };
  subject: string;
  text: string;
};

type ContactEmailBinding = {
  send: (message: ContactEmailMessage) => Promise<{
    messageId?: string;
    [key: string]: unknown;
  }>;
};

type WorkerEnv = {
  CONTACT_EMAIL: ContactEmailBinding;
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
};

type WorkerHandler = {
  fetch: (request: Request, env: WorkerEnv) => Promise<Response>;
};

const IS_DEV = import.meta.env.DEV;

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(body, { status });
}

function isContactRequest(value: unknown): value is ContactRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    typeof data.name === "string" &&
    typeof data.email === "string" &&
    typeof data.message === "string"
  );
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function serializeForLog(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

function isSpaNavigationRequest(request: Request, url: URL) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }

  if (url.pathname.includes(".")) {
    return false;
  }

  return request.headers.get("accept")?.includes("text/html") ?? false;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getPreferredLanguage(request: Request): AppLanguage {
  const acceptLanguage = request.headers.get("accept-language");

  if (!acceptLanguage) {
    return "en";
  }

  const languageCandidates = acceptLanguage
    .split(",")
    .map((entry) => {
      const [languageTag, qualityValue] = entry.trim().split(";q=");

      return {
        language: getLanguageFromUrlSegment(languageTag.split("-")[0]),
        quality: qualityValue ? Number(qualityValue) : 1,
      };
    })
    .filter((entry): entry is { language: AppLanguage; quality: number } => (
      Boolean(entry.language) && Number.isFinite(entry.quality)
    ))
    .sort((left, right) => right.quality - left.quality);

  return languageCandidates[0]?.language ?? "en";
}

function getRedirectResponse(request: Request, url: URL) {
  if (!isSpaNavigationRequest(request, url)) {
    return null;
  }

  const pathnameParts = url.pathname.split("/").filter(Boolean);
  const firstPathPart = pathnameParts[0];
  const routeLanguage = getLanguageFromPathname(url.pathname);
  const pagePath = stripLanguageFromPathname(url.pathname);

  if (!firstPathPart && isLocalizedPagePath(url.pathname)) {
    return Response.redirect(new URL(getCanonicalLanguagePath(getPreferredLanguage(request), pagePath), url), 302);
  }

  if (firstPathPart === "uk") {
    return Response.redirect(new URL(getCanonicalLanguagePath(routeLanguage ?? "en", pagePath), url), 302);
  }

  if (firstPathPart && !routeLanguage && !url.pathname.startsWith("/api/") && !url.pathname.includes(".")) {
    return Response.redirect(new URL(getCanonicalLanguagePath(getPreferredLanguage(request)), url), 302);
  }

  if (!routeLanguage && isLocalizedPagePath(url.pathname)) {
    return Response.redirect(new URL(getCanonicalLanguagePath(getPreferredLanguage(request), pagePath), url), 302);
  }

  return null;
}

function getManagedHead(metadata: ReturnType<typeof getSeoMetadata>, pathname: string) {
  const alternateLinks = getAlternateLinks(pathname)
    .map((link) => `<link rel="alternate" hreflang="${escapeHtml(link.hreflang)}" href="${escapeHtml(link.href)}" data-managed-seo="true" />`)
    .join("\n    ");
  const jsonLd = getSeoJsonLd(metadata.language, pathname)
    .map((schema) => `<script type="application/ld+json" data-managed-seo="true" data-seo-id="${escapeHtml(schema.id)}">${JSON.stringify(schema.value).replace(/</g, "\\u003c")}</script>`)
    .join("\n    ");

  return [
    `<meta name="description" content="${escapeHtml(metadata.description)}" data-managed-seo="true" />`,
    '<meta name="robots" content="index, follow" data-managed-seo="true" />',
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
  ].filter(Boolean).join("\n    ");
}

function injectSsrHtml(template: string, appHtml: string, metadata: ReturnType<typeof getSeoMetadata>, pathname: string) {
  const managedHead = getManagedHead(metadata, pathname);

  return template
    .replace(/<html([^>]*)lang="[^"]*"([^>]*)>/, `<html$1lang="${metadata.language}"$2>`)
    .replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(metadata.title)}</title>`)
    .replace(/\n?\s*<(?:meta|link)[^>]+data-managed-seo="true"[^>]*>/g, "")
    .replace(/\n?\s*<script[^>]+data-managed-seo="true"[^>]*>.*?<\/script>/gs, "")
    .replace("</head>", `    ${managedHead}\n</head>`)
    .replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
}

async function serveSsrPage(request: Request, env: WorkerEnv, url: URL) {
  if (!env.ASSETS) {
    return new Response("Not Found", { status: 404 });
  }

  const language = getLanguageFromPathname(url.pathname) ?? getPreferredLanguage(request);
  const indexUrl = new URL("/", url);
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

  headers.set("content-type", "text/html; charset=utf-8");

  return new Response(request.method === "HEAD" ? null : html, {
    headers,
    status: templateResponse.status,
  });
}

async function serveStaticAsset(request: Request, env: WorkerEnv, url: URL) {
  if (!env.ASSETS) {
    return new Response("Not Found", { status: 404 });
  }

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

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== "/api/contact") {
      if (url.pathname.startsWith("/api/")) {
        return new Response("Not Found", { status: 404 });
      }

      return serveStaticAsset(request, env, url);
    }

    if (request.method !== "POST") {
      return jsonResponse(
        { ok: false, error: "Method not allowed" },
        405,
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { ok: false, error: "Invalid JSON" },
        400,
      );
    }

    if (!isContactRequest(body)) {
      return jsonResponse(
        { ok: false, error: "Invalid request body" },
        400,
      );
    }

    const name = body.name.trim();
    const email = body.email.trim();
    const message = body.message.trim();

    if (!name || !email || !message) {
      return jsonResponse(
        { ok: false, error: "All fields are required" },
        400,
      );
    }

    if (name.length > 100) {
      return jsonResponse(
        { ok: false, error: "Name is too long" },
        400,
      );
    }

    if (!isValidEmail(email) || email.length > 254) {
      return jsonResponse(
        { ok: false, error: "Invalid email address" },
        400,
      );
    }

    if (message.length > 5000) {
      return jsonResponse(
        { ok: false, error: "Message is too long" },
        400,
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
          "",
          `Name: ${name}`,
          `Email: ${email}`,
          "",
          "Message:",
          message,
        ].join("\n"),
      });

      const emailResult = serializeForLog(result);

      console.log("Contact email sent:", {
        to: CONTACT_FORM_TO_EMAIL,
        from: CONTACT_FORM_FROM_EMAIL,
        messageId: result.messageId,
        result: emailResult,
      });

      return jsonResponse({
        ok: true,
        messageId: result.messageId,
        emailResult,
      });
    } catch (error) {
      console.error("Contact email failed:", error);

      return jsonResponse(
        {
          ok: false,
          error: "Unable to send message",
        },
        500,
      );
    }
  },
} satisfies WorkerHandler;
