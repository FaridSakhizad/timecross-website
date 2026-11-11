import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

/** The commit being built: Cloudflare's build variable, or git locally. */
function getCommit() {
  if (process.env.WORKERS_CI_COMMIT_SHA) {
    return process.env.WORKERS_CI_COMMIT_SHA.slice(0, 7);
  }

  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  define: {
    // "2026-11-11 7067dbe": which build is deployed, for people (the sitemap shows it).
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(`${new Date().toISOString().slice(0, 10)} ${getCommit()}`),
  },
  build: {
    // One stylesheet for the whole site, loaded up front. Widget chunks are lazy, but their CSS is
    // not: some widgets style themselves with classes from other widgets' files (the planner uses
    // the header buttons from Cities), and split CSS would change the cascade order.
    cssCodeSplit: false,
  },
});
