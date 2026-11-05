/**
 * Starts loading a lazy chunk ahead of time. A failure is ignored here: the same import runs again
 * where the module is actually used, and that is where the error is handled.
 */
export function preload(load: () => Promise<unknown>) {
  load().catch(() => undefined);
}
