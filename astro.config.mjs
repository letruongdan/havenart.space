import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwind from '@astrojs/tailwind';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  adapter: node({ mode: 'standalone' }),
  integrations: [svelte(), tailwind()],
  vite: {
    optimizeDeps: {
      include: ['morphicons/svelte', 'lucide', 'idb'],
      exclude: ['better-sqlite3'],
    },
    ssr: {
      external: ['better-sqlite3'],
    },
    server: {
      watch: {
        ignored: ['**/data/**', '**/*.db*', '**/*.db-wal*', '**/*.db-shm*'],
      },
    },
  },
});
