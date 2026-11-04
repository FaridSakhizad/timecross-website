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
| `npm run check` | Type-check, lint and test — run before every commit |

Node version: see `.nvmrc`.

## Structure

- `src/pages/` — one component per route; routes are listed in `PAGE_ROUTES` in `src/App.tsx`.
- `src/components/` — widgets and page sections. The planner grid has its own README in `components/TimelineGrid/`.
- `src/settings.ts` — user settings in localStorage with a subscribable store; read them in components with `usePreferences()`.
- `src/utils/time.ts` — all timezone and date math (offsets, DST, day shifts). Do not re-implement these helpers in components.
- `src/i18n/` — translations (`locales/*.json`, English is the reference) and language routing.
- `server/` — Worker: SSR, SEO tags, language redirects and the `/api/contact` endpoint.
