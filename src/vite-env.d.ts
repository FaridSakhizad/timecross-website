/** Build-time variables of the app, see .env.production. */
interface ImportMetaEnv {
  /** Public Turnstile site key of the contact form. */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
}
