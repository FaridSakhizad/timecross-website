import { EVENTS_API_PATH } from '../config.ts';
import { stripLanguageFromPathname } from '../i18n/languageRouting.ts';
import { getPageIdByPath } from '../routes.ts';

import type { AnalyticsEventName, AnalyticsEvents } from './events.ts';

/**
 * The website's own analytics: named events (events.ts) sent to the Worker, which passes them on to
 * PostHog. Nothing is stored on the device: no cookies, no local storage. A visit is one page load,
 * known by an id that lives in memory; the events build no profile of a person.
 */

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
const TOUCH_QUERY = '(hover: none) and (pointer: coarse)';

type Visit = {
  id: string;
  /** Where the visit came from and with which campaign: the same for all of its events. */
  properties: Record<string, string>;
};

let visit: Visit | null = null;

// Events sent once per page (see trackEventOnce); a new page starts the list again.
const sentOnce = new Set<string>();

/** A UUID v7: PostHog groups the events of a session by an id of this kind, ordered by time. */
export function createUuidV7(now = Date.now(), random = crypto.getRandomValues(new Uint8Array(10))) {
  const time = now.toString(16).padStart(12, '0');
  const hex = [...random].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  // The variant: the bits "10", then two random ones.
  const variant = (8 + (random[9]! % 4)).toString(16);

  // 48 bits of milliseconds, the version 7, then random bits around the variant.
  return [
    time.slice(0, 8),
    time.slice(8, 12),
    `7${hex.slice(0, 3)}`,
    `${variant}${hex.slice(3, 6)}`,
    hex.slice(6, 18),
  ].join('-');
}

function getReferringDomain(referrer: string) {
  try {
    return new URL(referrer).hostname;
  } catch {
    return '$direct';
  }
}

function startVisit(location: Location, referrer: string): Visit {
  const params = new URLSearchParams(location.search);
  const properties: Record<string, string> = {
    $referrer: referrer || '$direct',
    $referring_domain: referrer ? getReferringDomain(referrer) : '$direct',
  };

  for (const name of UTM_PARAMS) {
    const value = params.get(name);

    if (value) {
      properties[name] = value;
    }
  }

  return {
    id: createUuidV7(),
    properties,
  };
}

/** The page an event happened on: its address without the query, which may hold a meeting's title. */
export function getPageProperties(location: Pick<Location, 'origin' | 'host' | 'pathname'>) {
  return {
    page: getPageIdByPath(stripLanguageFromPathname(location.pathname)) ?? 'notFound',
    $current_url: `${location.origin}${location.pathname}`,
    $host: location.host,
    $pathname: location.pathname,
  };
}

/** What the Worker gets for one event (see server/events.ts). */
export function buildEventPayload<Name extends AnalyticsEventName>(
  name: Name,
  properties: AnalyticsEvents[Name],
  current: Visit,
  page: ReturnType<typeof getPageProperties>,
  now = new Date(),
) {
  return {
    event: name,
    distinct_id: current.id,
    timestamp: now.toISOString(),
    properties: {
      ...properties,
      ...page,
      ...current.properties,
      language: document.documentElement.lang,
      device: window.matchMedia(TOUCH_QUERY).matches ? 'touch' : 'pointer',
      $screen_width: window.screen.width,
      $screen_height: window.screen.height,
      $viewport_width: window.innerWidth,
      $raw_user_agent: navigator.userAgent,
      $session_id: current.id,
      // Anonymous events: PostHog makes no person of them.
      $process_person_profile: false,
      $lib: 'timecross-web',
    },
  };
}

function send(payload: unknown) {
  const body = JSON.stringify(payload);

  // A beacon is still sent when the page is left, as after a click on a store link.
  if (navigator.sendBeacon(EVENTS_API_PATH, new Blob([body], { type: 'application/json' }))) {
    return;
  }

  fetch(EVENTS_API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics never gets in the way: a lost event is only a lost event.
  });
}

export function trackEvent<Name extends AnalyticsEventName>(name: Name, properties: AnalyticsEvents[Name]) {
  // On the server, and for browsers driven by scripts.
  if (typeof window === 'undefined' || navigator.webdriver) {
    return;
  }

  visit ??= startVisit(window.location, document.referrer);
  send(buildEventPayload(name, properties, visit, getPageProperties(window.location)));
}

/** The event only the first time on a page: "the converter was used", not every change in it. */
export function trackEventOnce<Name extends AnalyticsEventName>(name: Name, properties: AnalyticsEvents[Name]) {
  if (sentOnce.has(name)) {
    return;
  }

  sentOnce.add(name);
  trackEvent(name, properties);
}

export function trackPageview() {
  sentOnce.clear();
  trackEvent('$pageview', {});
}
