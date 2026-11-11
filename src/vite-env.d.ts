/** Build-time variables of the app, see .env.production. */
interface ImportMetaEnv {
  /** Public Turnstile site key of the contact form. */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  /** Build date and commit, "2026-11-11 7067dbe"; set in vite.config.ts. */
  readonly VITE_BUILD_ID?: string;
}
