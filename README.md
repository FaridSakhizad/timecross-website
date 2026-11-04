# TimeCross Website

Marketing site and web widgets for TimeCross (world clock, time zone converter, meeting planner).
React 19 + Vite, server-side rendered by a Cloudflare Worker (`server/index.ts`).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with the Worker running locally |
| `npm run build` | Type-check and build the client and the Worker |
| `npm test` | Run all tests in `tests/` (Node test runner, no extra dependencies) |
| `npm run lint` | ESLint |
| `npm run cf-typegen` | Regenerate `worker-configuration.d.ts` (Worker `Env`) after changing `wrangler.jsonc` |
| `npm run check` | Worker types up to date, type-check, lint and test — run before every commit |

Node version: see `.nvmrc`.

## Structure

- `src/pages/` — one component per route; routes are listed in `PAGE_ROUTES` in `src/App.tsx`.
- `src/components/` — widgets and page sections. The planner grid has its own README in `components/TimelineGrid/`.
- `src/settings.ts` — user settings in localStorage with a subscribable store; read them in components with `usePreferences()`.
- `src/utils/time.ts` — all timezone and date math (offsets, DST, day shifts). Do not re-implement these helpers in components.
- `src/i18n/` — translations (`locales/*.json`, English is the reference) and language routing.
- `server/` — Worker: SSR, SEO tags, language redirects and the `/api/contact` endpoint.

## Contact form protection

`/api/contact` checks, in this order: a per-IP rate limit (`CONTACT_RATE_LIMITER` in `wrangler.jsonc`,
3 requests per 60 s), a honeypot field and a minimum fill time, field validation, then Cloudflare Turnstile
(`server/contactProtection.ts`).

- Local development: `cp .dev.vars.example .dev.vars` (Cloudflare's test secret). The client uses the test site key automatically.
- Production: put the public site key into `.env.production` as `VITE_TURNSTILE_SITE_KEY` (see `.env.example`)
  and the secret into Cloudflare: `npx wrangler secret put TURNSTILE_SECRET_KEY`. Without the secret the form rejects every message (503).

## City data

`public/data/cities-search.json` (search in "Add city") and `public/data/city-names/{lang}.json` (localized names of
selected cities) are generated from the mobile app's SQLite database by `npm run data:cities`. Put the database at
`data-source/cities.db` (git-ignored) or pass its path. Commit the generated files; `tests/cityData.test.mjs`
checks they are consistent.
