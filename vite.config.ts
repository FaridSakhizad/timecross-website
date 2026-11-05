import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  build: {
    // One stylesheet for the whole site, loaded up front. Widget chunks are lazy, but their CSS is
    // not: some widgets style themselves with classes from other widgets' files (the planner uses
    // the header buttons from Cities), and split CSS would change the cascade order.
    cssCodeSplit: false,
  },
  server: {
    watch: {
      usePolling: true,
    },
  },
});
