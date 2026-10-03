import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://havenart.space',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    svelte(),
    sitemap({
      customPages: ['https://havenart.space/', 'https://havenart.space/?lang=en'],
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
