import { CONTACT_API_PATH } from '../src/config';

import { handleContactRequest } from './contact';
import { handlePageRequest } from './pages';

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

    if (url.pathname.startsWith('/api/')) {
      return new Response('Not Found', { status: 404 });
    }

    return handlePageRequest(request, env, url);
  },
} satisfies WorkerHandler;
