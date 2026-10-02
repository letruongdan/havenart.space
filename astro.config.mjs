import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://havenart.space',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    svelte(),
    tailwind(),
    sitemap({
      filter: (page) => !page.includes('/admin') && !page.includes('/api/'),
    }),
  ],
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
