/**
 * Minimal Workers runtime types for the bindings in worker-configuration.d.ts.
 *
 * That file is generated with `wrangler types --include-runtime=false` (npm run cf-typegen):
 * the full runtime types redeclare DOM globals such as Element and Response, and the Worker
 * also compiles the React app for SSR, which needs the real DOM types. Only what the Worker
 * calls is declared here; add members when you start using more of a binding.
 */

/** `send_email` binding. https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/ */
interface SendEmail {
  send(message: {
    to: string;
    from: { email: string; name: string };
    replyTo?: { email: string; name: string };
    subject: string;
    text: string;
  }): Promise<{ messageId?: string }>;
}

/** `ratelimits` binding. https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/ */
interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** `assets` binding. */
interface Fetcher {
  fetch(request: Request): Promise<Response>;
}
