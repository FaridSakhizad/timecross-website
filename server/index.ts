import { CONTACT_API_PATH, EVENTS_API_PATH } from '../src/config';

import { handleContactRequest } from './contact';
import { handleEventsRequest } from './events';
import { handlePageRequest } from './pages';
import { handleSitemapRequest } from './sitemap';

// Env (bindings and secrets) is generated from wrangler.jsonc: npm run cf-typegen.
type WorkerHandler = {
  fetch: (request: Request, env: Env) => Promise<Response>;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === CONTACT_API_PATH) {
      return handleContactRequest(request, env);
    }

    if (url.pathname === EVENTS_API_PATH) {
      // A local run sends nothing to PostHog.
      return handleEventsRequest(request, import.meta.env.DEV ? { projectKey: '' } : undefined);
    }

    if (url.pathname === '/sitemap.xml') {
      return handleSitemapRequest();
    }

    if (url.pathname.startsWith('/api/')) {
      return new Response('Not Found', { status: 404 });
    }

    return handlePageRequest(request, env, url);
  },
} satisfies WorkerHandler;
