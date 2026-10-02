import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getPexelsApiKey,
  setPexelsApiKey,
  hasPexelsApiKey,
  searchPexelsLivePhotos,
  testPexelsApiKey,
} from '../../src/lib/visuals/pexels-api';

describe('Pexels Dynamic API & Photo Loading Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('1. API Key Management', () => {
    it('returns null when no API key is configured', () => {
      expect(getPexelsApiKey()).toBeNull();
      expect(hasPexelsApiKey()).toBe(false);
    });

    it('saves and retrieves API key correctly in localStorage', () => {
      setPexelsApiKey('test-pexels-key-12345');
      expect(getPexelsApiKey()).toBe('test-pexels-key-12345');
      expect(hasPexelsApiKey()).toBe(true);

      setPexelsApiKey(null);
      expect(getPexelsApiKey()).toBeNull();
      expect(hasPexelsApiKey()).toBe(false);
    });
  });

  describe('2. Curated Fallback when no API Key', () => {
    it('returns curated Pexels photos matching weather and mood', async () => {
      const photos = await searchPexelsLivePhotos({ weather: 'rain', mood: 'reflective' });
      expect(photos).toBeDefined();
      expect(photos.length).toBeGreaterThan(0);
      expect(photos[0].isPexels).toBe(true);
      expect(photos[0].license).toContain('Pexels');
    });
  });

  describe('3. Dynamic Live Fetch with Pexels API Key', () => {
    it('calls Pexels REST API with Authorization header and parses photos', async () => {
      setPexelsApiKey('valid-pexels-key');

      const mockApiResponse = {
        photos: [
          {
            id: 999999,
            photographer: 'Jane Doe',
            url: 'https://www.pexels.com/photo/999999/',
            alt: 'Serene mountain morning mist',
            src: {
              large2x: 'https://images.pexels.com/photos/999999/pexels-photo-999999.jpeg?w=1920',
            },
          },
        ],
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
      } as any);

      const photos = await searchPexelsLivePhotos({ query: 'serene mountain' });

      expect(fetchSpy).toHaveBeenCalled();
      const callHeaders = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
      expect(callHeaders.Authorization).toBe('valid-pexels-key');

      expect(photos.length).toBe(1);
      expect(photos[0].id).toBe('pexels-live-999999');
      expect(photos[0].artist).toBe('Pexels / Jane Doe');
      expect(photos[0].src).toContain('999999');
      expect(photos[0].title).toBe('Serene mountain morning mist');
    });

    it('falls back to curated catalog if Pexels API returns an error or rate limit', async () => {
      setPexelsApiKey('test-key');

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 429,
      } as any);

      const photos = await searchPexelsLivePhotos({ weather: 'fog' });
      expect(photos).toBeDefined();
      expect(photos.length).toBeGreaterThan(0);
    });
  });

  describe('4. testPexelsApiKey Connection Verification', () => {
    it('returns error when key is empty', async () => {
      const res = await testPexelsApiKey('');
      expect(res.success).toBe(false);
      expect(res.message).toContain('trống');
    });

    it('returns success on HTTP 200', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 200,
        json: async () => ({
          photos: [{ photographer: 'Nature Photographer' }],
        }),
      } as any);

      const res = await testPexelsApiKey('valid-key');
      expect(res.success).toBe(true);
      expect(res.photographer).toBe('Nature Photographer');
    });

    it('returns unauthorized error on HTTP 401', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        status: 401,
      } as any);

      const res = await testPexelsApiKey('invalid-key');
      expect(res.success).toBe(false);
      expect(res.message).toContain('không hợp lệ');
    });
  });
});
