import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  shouldCacheUrl,
  SHELL_CACHE_NAME,
  IMAGES_CACHE_NAME,
  CORE_SHELL_ASSETS,
} from '../../src/sw-policy';
import {
  handleInstall,
  handleActivate,
  handleFetch,
  requestPersistentStorage,
  registerServiceWorker,
  type ExtendableEventLike,
} from '../../src/sw';

describe('Task 12: Offline PWA & Service Worker Cache Policy', () => {
  describe('1. Service Worker Cache Policy (shouldCacheUrl)', () => {
    it('caches static shell and viewed images, but never pre-caches heavy audio', () => {
      // From brief specification
      expect(shouldCacheUrl('/index.html')).toBe(true);
      expect(shouldCacheUrl('/images/art1.webp')).toBe(true);
      expect(shouldCacheUrl('/audio/meditation.ogg')).toBe(false);
    });

    it('caches core application shell assets and routes', () => {
      expect(shouldCacheUrl('/')).toBe(true);
      expect(shouldCacheUrl('/index.html')).toBe(true);
      expect(shouldCacheUrl('/manifest.webmanifest')).toBe(true);
      expect(shouldCacheUrl('/favicon.svg')).toBe(true);
      expect(shouldCacheUrl('/credits.json')).toBe(true);
      expect(shouldCacheUrl('/_astro/HavenShell.12345.js')).toBe(true);
      expect(shouldCacheUrl('/_astro/tokens.abcde.css')).toBe(true);
      expect(shouldCacheUrl('/styles/tokens.css')).toBe(true);
      expect(shouldCacheUrl('https://fonts.googleapis.com/css2?family=Cinzel')).toBe(true);
      expect(shouldCacheUrl('https://fonts.gstatic.com/s/cinzel/v23/font.woff2')).toBe(true);
    });

    it('caches viewed artworks and image formats', () => {
      expect(shouldCacheUrl('/images/artworks/friedrich-morning-mist.webp')).toBe(true);
      expect(shouldCacheUrl('/images/artworks/hasui-lake-chuzenji.webp')).toBe(true);
      expect(shouldCacheUrl('/images/artworks/hokusai-red-fuji.webp')).toBe(true);
      expect(shouldCacheUrl('/images/artworks/monet-water-lilies.webp')).toBe(true);
      expect(shouldCacheUrl('/images/artworks/turner-evening-star.webp')).toBe(true);
      expect(shouldCacheUrl('/icons/icon-192.png')).toBe(true);
      expect(shouldCacheUrl('https://images.unsplash.com/photo-nature.jpg?w=800')).toBe(true);
      expect(shouldCacheUrl('/assets/hero.avif')).toBe(true);
    });

    it('strictly forbids caching heavy audio assets to conserve user mobile data', () => {
      expect(shouldCacheUrl('/audio/meditation.ogg')).toBe(false);
      expect(shouldCacheUrl('/audio/rain.mp3')).toBe(false);
      expect(shouldCacheUrl('/audio/waves.wav')).toBe(false);
      expect(shouldCacheUrl('/audio/ambient.flac')).toBe(false);
      expect(shouldCacheUrl('/audio/forest.m4a')).toBe(false);
      expect(shouldCacheUrl('/audio/stream.aac')).toBe(false);
      expect(shouldCacheUrl('/audio/deep-focus.weba')).toBe(false);
      expect(shouldCacheUrl('https://havenart.space/audio/zen-garden.mp3?bitrate=320')).toBe(false);
      expect(shouldCacheUrl('https://cdn.example.com/audio/track-12.ogg')).toBe(false);
    });

    it('rejects non-HTTP(S), extensions, and invalid URLs', () => {
      expect(shouldCacheUrl('chrome-extension://abcdefghijklm/script.js')).toBe(false);
      expect(shouldCacheUrl('moz-extension://12345/page.html')).toBe(false);
      expect(shouldCacheUrl('file:///D:/LandingPage/havenart.space/dist/index.html')).toBe(false);
      expect(shouldCacheUrl('data:image/svg+xml;utf8,<svg></svg>')).toBe(false);
      expect(shouldCacheUrl('blob:http://localhost:4321/e464c1f9-0359-4f76')).toBe(false);
      expect(shouldCacheUrl('javascript:alert(1)')).toBe(false);
      expect(shouldCacheUrl('')).toBe(false);
      expect(shouldCacheUrl(null as unknown as string)).toBe(false);
      expect(shouldCacheUrl(undefined as unknown as string)).toBe(false);
    });
  });

  describe('2. PWA Web Manifest Validity', () => {
    it('provides valid manifest in public/manifest.webmanifest with required PWA metadata', () => {
      const manifestPath = path.resolve(process.cwd(), 'public/manifest.webmanifest');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const raw = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(raw);

      expect(manifest.name).toBe('Haven Art — Không gian nghệ thuật & nhật ký tĩnh lặng');
      expect(manifest.short_name).toBe('Haven Art');
      expect(manifest.start_url).toBe('/');
      expect(manifest.display).toBe('standalone');
      expect(manifest.theme_color).toBe('#121316');
      expect(manifest.background_color).toBe('#121316');
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect(manifest.icons.length).toBeGreaterThanOrEqual(1);

      // Verify at least one 192x192 and one 512x512 icon or svg
      const hasValidIcon = manifest.icons.some(
        (icon: { sizes?: string; type?: string; src: string }) =>
          icon.src && (icon.sizes === 'any' || icon.sizes === '192x192' || icon.sizes === '512x512')
      );
      expect(hasValidIcon).toBe(true);
    });

    it('includes manifest link in src/pages/index.astro', () => {
      const indexPath = path.resolve(process.cwd(), 'src/pages/index.astro');
      const indexContent = fs.readFileSync(indexPath, 'utf-8');
      expect(indexContent).toMatch(/<link\s+rel=["']manifest["']\s+href=["']\/manifest\.webmanifest["']/i);
      const seo = fs.readFileSync(path.resolve('src/components/SEO.astro'),'utf-8');
      expect(seo).toContain("{ name: 'theme-color', content: '#121316' }");
    });
  });

  describe('3. Service Worker Lifecycle & Selective Caching', () => {
    let mockCacheStore: Map<string, Map<string, Response>>;

    beforeEach(() => {
      mockCacheStore = new Map();

      const createMockCache = (cacheName: string) => {
        if (!mockCacheStore.has(cacheName)) {
          mockCacheStore.set(cacheName, new Map());
        }
        const entries = mockCacheStore.get(cacheName)!;

        return {
          keys: vi.fn(async () => Array.from(entries.keys())),
          match: vi.fn(async (req: string | Request) => {
            const key = typeof req === 'string' ? req : req.url;
            return entries.get(key) || undefined;
          }),
          put: vi.fn(async (req: string | Request, res: Response) => {
            const key = typeof req === 'string' ? req : req.url;
            entries.set(key, res.clone());
          }),
          addAll: vi.fn(async (assets: string[]) => {
            for (const asset of assets) {
              entries.set(asset, new Response(`Mock content for ${asset}`));
            }
          }),
          delete: vi.fn(async (req: string | Request) => {
            const key = typeof req === 'string' ? req : req.url;
            return entries.delete(key);
          }),
        };
      };

      // Mock global caches API
      (globalThis as unknown as { caches: unknown }).caches = {
        open: vi.fn(async (cacheName: string) => createMockCache(cacheName)),
        match: vi.fn(async (req: string | Request) => {
          const key = typeof req === 'string' ? req : req.url;
          for (const entries of mockCacheStore.values()) {
            if (entries.has(key)) {
              return entries.get(key);
            }
          }
          return undefined;
        }),
        has: vi.fn(async (cacheName: string) => mockCacheStore.has(cacheName)),
        keys: vi.fn(async () => Array.from(mockCacheStore.keys())),
        delete: vi.fn(async (cacheName: string) => mockCacheStore.delete(cacheName)),
      };
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('pre-caches core application shell on install and excludes audio', async () => {
      expect(CORE_SHELL_ASSETS.length).toBeGreaterThan(0);
      expect(CORE_SHELL_ASSETS).toContain('/');
      expect(CORE_SHELL_ASSETS).not.toContain('/index.html');
      expect(CORE_SHELL_ASSETS).toContain('/manifest.webmanifest');
      expect(CORE_SHELL_ASSETS).toContain('/favicon.svg');
      expect(CORE_SHELL_ASSETS).toContain('/credits.json');

      // Audio must never be in precache
      for (const asset of CORE_SHELL_ASSETS) {
        expect(asset.includes('/audio/')).toBe(false);
        expect(asset.endsWith('.mp3')).toBe(false);
        expect(asset.endsWith('.ogg')).toBe(false);
      }

      let waitUntilPromise: Promise<void> | null = null;
      const mockInstallEvent = {
        waitUntil: vi.fn((promise: Promise<void>) => {
          waitUntilPromise = promise;
        }),
      };

      handleInstall(mockInstallEvent as unknown as ExtendableEventLike);
      await waitUntilPromise;

      const shellCache = mockCacheStore.get(SHELL_CACHE_NAME);
      expect(shellCache).toBeDefined();
      expect(shellCache?.has('/')).toBe(true);
      expect(shellCache?.has('/credits.json')).toBe(true);
    });

    it('cleans up stale caches on activate event', async () => {
      // Seed stale and current caches
      mockCacheStore.set('haven-shell-v0-old', new Map());
      mockCacheStore.set('haven-images-v0-old', new Map());
      mockCacheStore.set('stale-random-cache', new Map());
      mockCacheStore.set(SHELL_CACHE_NAME, new Map());
      mockCacheStore.set(IMAGES_CACHE_NAME, new Map());

      let waitUntilPromise: Promise<void> | null = null;
      const mockActivateEvent = {
        waitUntil: vi.fn((promise: Promise<void>) => {
          waitUntilPromise = promise;
        }),
      };

      handleActivate(mockActivateEvent as unknown as ExtendableEventLike);
      await waitUntilPromise;

      expect(mockCacheStore.has('haven-shell-v0-old')).toBe(false);
      expect(mockCacheStore.has('haven-images-v0-old')).toBe(false);
      expect(mockCacheStore.has('stale-random-cache')).toBe(true);
      expect(mockCacheStore.has(SHELL_CACHE_NAME)).toBe(true);
      expect(mockCacheStore.has(IMAGES_CACHE_NAME)).toBe(true);
    });

    it('serves images cache-first and caches runtime network responses', async () => {
      const imageUrl = 'https://havenart.space/images/artworks/monet-water-lilies.webp';
      const mockNetworkResponse = new Response('image-binary-data', {
        status: 200,
        headers: { 'Content-Type': 'image/webp' },
      });

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockNetworkResponse);

      const request = new Request(imageUrl, { method: 'GET' });
      const firstResponse = await handleFetch(request);
      expect(await firstResponse.text()).toBe('image-binary-data');
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Verify it was cached in IMAGES_CACHE_NAME
      const imageCache = mockCacheStore.get(IMAGES_CACHE_NAME);
      expect(imageCache).toBeDefined();
      expect(imageCache?.has(imageUrl)).toBe(true);

      // Second request: should be served directly from cache without hitting fetch
      fetchSpy.mockClear();
      const secondResponse = await handleFetch(request);
      expect(await secondResponse.text()).toBe('image-binary-data');
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('never caches audio requests during fetch handling and passes directly to network', async () => {
      const audioUrl = 'https://havenart.space/audio/zen-bell.ogg';
      const mockAudioResponse = new Response('audio-binary-data', {
        status: 200,
        headers: { 'Content-Type': 'audio/ogg' },
      });

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockAudioResponse);

      const request = new Request(audioUrl, { method: 'GET' });
      const response = await handleFetch(request);
      expect(await response.text()).toBe('audio-binary-data');
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Neither shell cache nor images cache should contain the audio
      const shellCache = mockCacheStore.get(SHELL_CACHE_NAME);
      const imagesCache = mockCacheStore.get(IMAGES_CACHE_NAME);
      expect(shellCache?.has(audioUrl) ?? false).toBe(false);
      expect(imagesCache?.has(audioUrl) ?? false).toBe(false);
    });
  });

  describe('4. Storage Persistence & PWA Registration Helper', () => {
    it('invokes navigator.storage.persist() when available', async () => {
      const mockPersist = vi.fn().mockResolvedValue(true);
      Object.defineProperty(navigator, 'storage', {
        value: { persist: mockPersist },
        configurable: true,
      });

      const result = await requestPersistentStorage();
      expect(result).toBe(true);
      expect(mockPersist).toHaveBeenCalledTimes(1);
    });

    it('returns false safely when navigator.storage is not available', async () => {
      Object.defineProperty(navigator, 'storage', {
        value: undefined,
        configurable: true,
      });

      const result = await requestPersistentStorage();
      expect(result).toBe(false);
    });

    it('registers service worker cleanly when supported', async () => {
      const mockRegister = vi.fn().mockResolvedValue({ scope: '/' });
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { register: mockRegister },
        configurable: true,
      });

      const reg = await registerServiceWorker('/sw.js');
      expect(reg).toEqual({ scope: '/' });
      expect(mockRegister).toHaveBeenCalledWith('/sw.js');
    });
  });
});
