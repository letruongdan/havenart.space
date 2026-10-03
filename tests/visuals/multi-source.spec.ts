import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPixabayApiKey,
  setPixabayApiKey,
  hasPixabayApiKey,
  testPixabayApiKey,
  searchPixabayLivePhotos,
} from '../../src/lib/visuals/pixabay-api';
import {
  getUnsplashApiKey,
  setUnsplashApiKey,
  hasUnsplashApiKey,
  testUnsplashApiKey,
  searchUnsplashLivePhotos,
} from '../../src/lib/visuals/unsplash-api';
import {
  searchWikimediaArtworks,
} from '../../src/lib/visuals/wikimedia-api';
import {
  searchAnyLivePhotos,
  getProviderStatuses,
} from '../../src/lib/visuals/multi-source';
import { ALL_HAVEN_ARTWORKS } from '../../src/lib/visuals/pexels';

describe('Multi-Source Photo Providers & Live Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('1. Curated Photo Pool', () => {
    it('ships only locally verified artworks; live providers are loaded through the server', () => {
      expect(ALL_HAVEN_ARTWORKS.length).toBe(4);
      expect(ALL_HAVEN_ARTWORKS.every(art => art.src.startsWith('/images/'))).toBe(true);
    });
  });

  describe('2. Pixabay API Service', () => {
    it('manages api key in localStorage', () => {
      expect(hasPixabayApiKey()).toBe(false);
      setPixabayApiKey('pixabay-key-123');
      expect(hasPixabayApiKey()).toBe(true);
      expect(getPixabayApiKey()).toBe('pixabay-key-123');
      setPixabayApiKey('');
      expect(hasPixabayApiKey()).toBe(false);
    });

    it('tests pixabay api key successfully against mock response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          totalHits: 450,
          hits: [{ user: 'NaturePhotographer', id: 999 }],
        }),
      } as any);

      const result = await testPixabayApiKey('valid-key');
      expect(result.valid).toBe(true);
      expect(result.totalResults).toBe(450);
      expect(result.samplePhotographer).toBe('NaturePhotographer');
    });

    it('handles invalid pixabay key error response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => '[ERROR 400] "key" is invalid.',
      } as any);

      const result = await testPixabayApiKey('invalid-key');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('không hợp lệ');
    });

    it('searches and transforms Pixabay live photos into HavenArtworks', async () => {
      setPixabayApiKey('mock-pixabay-key');
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          hits: [
            {
              id: 101,
              tags: 'nature, forest, mist',
              user: 'ForestWalker',
              largeImageURL: 'https://pixabay.com/photo-101.jpg',
              pageURL: 'https://pixabay.com/photos/101',
            },
          ],
        }),
      } as any);

      const photos = await searchPixabayLivePhotos({ perPage: 1 });
      expect(photos.length).toBe(1);
      expect(photos[0].id).toBe('pixabay-101');
      expect(photos[0].provider).toBe('pixabay');
      expect(photos[0].artist).toContain('ForestWalker');
      expect(photos[0].src).toBe('https://pixabay.com/photo-101.jpg');
    });
  });

  describe('3. Unsplash API Service', () => {
    it('manages unsplash access key in localStorage', () => {
      expect(hasUnsplashApiKey()).toBe(false);
      setUnsplashApiKey('unsplash-access-key-xyz');
      expect(hasUnsplashApiKey()).toBe(true);
      expect(getUnsplashApiKey()).toBe('unsplash-access-key-xyz');
      setUnsplashApiKey('');
      expect(hasUnsplashApiKey()).toBe(false);
    });

    it('tests unsplash api key successfully', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          total: 1200,
          results: [{ user: { name: 'Elena Mountain' }, id: 'mountain-01' }],
        }),
      } as any);

      const result = await testUnsplashApiKey('valid-key');
      expect(result.valid).toBe(true);
      expect(result.totalResults).toBe(1200);
      expect(result.samplePhotographer).toBe('Elena Mountain');
    });

    it('searches and transforms Unsplash photos into HavenArtworks', async () => {
      setUnsplashApiKey('mock-unsplash-key');
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 'abc-123',
              description: 'Calm morning mist over pine valley',
              alt_description: 'pine valley morning',
              user: { name: 'Liam Lake' },
              urls: {
                raw: 'https://images.unsplash.com/lake',
                regular: 'https://images.unsplash.com/lake?w=1080',
              },
              links: { html: 'https://unsplash.com/photos/abc-123' },
            },
          ],
        }),
      } as any);

      const photos = await searchUnsplashLivePhotos({ perPage: 1 });
      expect(photos.length).toBe(1);
      expect(photos[0].id).toBe('unsplash-abc-123');
      expect(photos[0].provider).toBe('unsplash');
      expect(photos[0].artist).toContain('Liam Lake');
      expect(photos[0].src).toContain('w=1920');
    });
  });

  describe('4. Wikimedia Commons Open API (Zero-Key)', () => {
    it('searches classical artworks and nature without any API key', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          query: {
            pages: {
              '5555': {
                pageid: 5555,
                title: 'File:Claude Monet - Water Lilies.jpg',
                imageinfo: [
                  {
                    url: 'https://upload.wikimedia.org/wikipedia/commons/water-lilies.jpg',
                    descriptionurl: 'https://commons.wikimedia.org/wiki/File:Water-Lilies.jpg',
                    width: 1920,
                    height: 1080,
                    extmetadata: {
                      Artist: { value: 'Claude Monet' },
                      LicenseShortName: { value: 'Public Domain' },
                    },
                  },
                ],
              },
            },
          },
        }),
      } as any);

      const photos = await searchWikimediaArtworks({ query: 'Claude Monet', limit: 1 });
      expect(photos.length).toBe(1);
      expect(photos[0].id).toBe('wikimedia-5555');
      expect(photos[0].provider).toBe('wikimedia');
      expect(photos[0].artist).toBe('Claude Monet');
      expect(photos[0].license).toBe('Public Domain');
    });
  });

  describe('5. Multi-Source Orchestrator', () => {
    it('reports accurate provider statuses', () => {
      setPixabayApiKey('test-key');
      const statuses = getProviderStatuses();
      const pixabay = statuses.find((s) => s.id === 'pixabay');
      const unsplash = statuses.find((s) => s.id === 'unsplash');
      const wikimedia = statuses.find((s) => s.id === 'wikimedia');

      expect(pixabay?.hasKey).toBe(true);
      expect(unsplash?.hasKey).toBe(false);
      expect(wikimedia?.hasKey).toBe(true); // zero-key always true
    });

    it('falls back to Wikimedia open API when no keys configured', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          query: {
            pages: {
              '777': {
                pageid: 777,
                title: 'File:Sunrise Over Calm Sea.jpg',
                imageinfo: [
                  {
                    url: 'https://upload.wikimedia.org/sea.jpg',
                    descriptionurl: 'https://commons.wikimedia.org/sea',
                    width: 1920,
                    height: 1080,
                    extmetadata: {
                      Artist: { value: 'Maritime Open' },
                      LicenseShortName: { value: 'CC-BY-4.0' },
                    },
                  },
                ],
              },
            },
          },
        }),
      } as any);

      const photos = await searchAnyLivePhotos({ perPage: 2 });
      expect(photos.length).toBeGreaterThan(0);
      expect(photos[0].provider).toBe('wikimedia');
    });
  });
});
