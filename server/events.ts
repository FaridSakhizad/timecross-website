/**
 * POST /api/e: the website's analytics events (src/analytics), passed on to PostHog. They go through
 * the Worker as the website's own requests. The visitor's IP stays here: PostHog gets the country,
 * as Cloudflare tells it, and is asked not to look up an IP of its own.
 */
import { POSTHOG_PROJECT_KEY } from '../src/config';

const POSTHOG_CAPTURE_URL = 'https://eu.i.posthog.com/i/v0/e/';
const MAX_BODY_LENGTH = 8192;
const EVENT_NAME = /^\$?[a-z][a-z_]{0,63}$/;
const MAX_ID_LENGTH = 64;

type AnalyticsEvent = {
  event: string;
  distinct_id: string;
  timestamp?: string;
  properties: Record<string, unknown>;
};

type EventsOptions = {
  /** The PostHog project's key; empty: the event is accepted and dropped. */
  projectKey?: string;
  fetchImpl?: typeof fetch;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseEvent(body: string): AnalyticsEvent | null {
  let data: unknown;

  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }

  if (
    !isRecord(data)
    || typeof data.event !== 'string'
    || !EVENT_NAME.test(data.event)
    || typeof data.distinct_id !== 'string'
    || !data.distinct_id
    || data.distinct_id.length > MAX_ID_LENGTH
    || (data.timestamp !== undefined && typeof data.timestamp !== 'string')
    || !isRecord(data.properties)
  ) {
    return null;
  }

  return {
    event: data.event,
    distinct_id: data.distinct_id,
    timestamp: data.timestamp,
    properties: data.properties,
  };
}

export async function handleEventsRequest(
  request: Request,
  { projectKey = POSTHOG_PROJECT_KEY, fetchImpl = fetch }: EventsOptions = {},
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  }

  const body = await request.text();

  if (body.length > MAX_BODY_LENGTH) {
    return new Response(null, { status: 413 });
  }

  const event = parseEvent(body);

  if (!event) {
    return new Response(null, { status: 400 });
  }

  if (!projectKey) {
    return new Response(null, { status: 204 });
  }

  try {
    await fetchImpl(POSTHOG_CAPTURE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: projectKey,
        ...event,
        properties: {
          ...event.properties,
          // Whatever the client claims is dropped (undefined is left out of the JSON).
          $ip: undefined,
          $geoip_disable: true,
          $geoip_country_code: request.cf?.country,
        },
      }),
    });
  } catch {
    // PostHog unreachable: the event is lost, the page does not care.
  }

  return new Response(null, { status: 204 });
}
