import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  selectArtworkForSession,
  selectNextArtwork,
  recordViewedArtwork,
  getRecentArtworkIds,
  clearRecentArtworks,
  recordFailedArtwork,
  clearFailedArtworks,
  isArtworkFailed,
  getAllAvailableArtworks,
  LOCAL_GUARANTEED_ARTWORKS,
  type SelectionContext,
} from '../../src/lib/visuals/artwork-selector';
import { ALL_HAVEN_ARTWORKS } from '../../src/lib/visuals/pexels';

describe('Smart Artwork Selector (Pexels, Weather, Mood, Freshness)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearRecentArtworks();
    clearFailedArtworks();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  afterEach(() => {
    clearRecentArtworks();
    clearFailedArtworks();
  });

  describe('1. Freshness Invariant: Different Image on Each Access ("Mỗi lượt truy cập là một ảnh khác nhau")', () => {
    it('returns a different artwork on consecutive selections', () => {
      const first = selectArtworkForSession();
      expect(first.artwork).toBeDefined();
      expect(first.artwork.src).toBeDefined();

      const second = selectArtworkForSession();
      expect(second.artwork).toBeDefined();
      expect(second.artwork.id).not.toBe(first.artwork.id);

      const third = selectArtworkForSession();
      expect(third.artwork).toBeDefined();
      expect(third.artwork.id).not.toBe(second.artwork.id);
      expect(third.artwork.id).not.toBe(first.artwork.id);
    });

    it('cycles gracefully without deadlock even when all artworks have been seen', () => {
      // Simulate seeing all artworks
      const allIds = ALL_HAVEN_ARTWORKS.map((a) => a.id);
      allIds.forEach((id) => recordViewedArtwork(id));

      const lastId = allIds[allIds.length - 1];
      const next = selectArtworkForSession();

      expect(next.artwork).toBeDefined();
      // Must not be the immediately previous image
      expect(next.artwork.id).not.toBe(lastId);
    });
  });

  describe('2. Weather-Condition Adaptation', () => {
    it('prioritizes rain artworks when current weather is rain', () => {
      const result = selectArtworkForSession({ weather: 'rain' });
      expect(result.artwork).toBeDefined();
      const art = getAllAvailableArtworks().find((a) => a.id === result.artwork.id);
      expect(art?.weather).toContain('rain');
    });

    it('prioritizes fog/mist artworks when current weather is fog', () => {
      const result = selectArtworkForSession({ weather: 'fog' });
      expect(result.artwork).toBeDefined();
      const art = getAllAvailableArtworks().find((a) => a.id === result.artwork.id);
      expect(art?.weather).toContain('fog');
    });

    it('prioritizes night sky artworks when current weather is night', () => {
      const result = selectArtworkForSession({ weather: 'night', timeOfDay: 'night' });
      expect(result.artwork).toBeDefined();
      const art = getAllAvailableArtworks().find((a) => a.id === result.artwork.id);
      expect(art?.weather).toContain('night');
    });

    it('prioritizes dusk artworks during sunset', () => {
      const result = selectArtworkForSession({ weather: 'dusk', timeOfDay: 'dusk' });
      expect(result.artwork).toBeDefined();
      const art = getAllAvailableArtworks().find((a) => a.id === result.artwork.id);
      expect(art?.weather).toContain('dusk');
    });
  });

  describe('3. Mood-Based Adaptation from Journal Entries', () => {
    it('selects artwork tailored to grateful mood', () => {
      const result = selectArtworkForSession({ mood: 'grateful' });
      expect(result.artwork).toBeDefined();
      const art = getAllAvailableArtworks().find((a) => a.id === result.artwork.id);
      expect(art?.moods).toContain('grateful');
    });

    it('selects artwork tailored to hopeful mood', () => {
      const result = selectArtworkForSession({ mood: 'hopeful' });
      expect(result.artwork).toBeDefined();
      const art = getAllAvailableArtworks().find((a) => a.id === result.artwork.id);
      expect(art?.moods).toContain('hopeful');
    });

    it('selects artwork tailored to reflective mood', () => {
      const result = selectArtworkForSession({ mood: 'reflective' });
      expect(result.artwork).toBeDefined();
      const art = getAllAvailableArtworks().find((a) => a.id === result.artwork.id);
      expect(art?.moods).toContain('reflective');
    });
  });

  describe('4. Manual Next Artwork Navigation (selectNextArtwork)', () => {
    it('always selects an artwork different from current artwork ID', () => {
      const current = ALL_HAVEN_ARTWORKS[0];
      const next = selectNextArtwork({ currentId: current.id });
      expect(next.artwork.id).not.toBe(current.id);
    });

    it('preserves mood or weather preferences when cycling manually', () => {
      const current = ALL_HAVEN_ARTWORKS.find((a) => a.moods.includes('grateful'))!;
      const next = selectNextArtwork({ currentId: current.id, mood: 'grateful' });

      expect(next.artwork.id).not.toBe(current.id);
      const art = getAllAvailableArtworks().find((a) => a.id === next.artwork.id);
      expect(art?.moods).toContain('grateful');
    });
  });

  describe('5. Error Resilience & Offline Guaranteed Fallbacks', () => {
    it('contains 4 offline guaranteed masterpieces with local bundle paths', () => {
      expect(LOCAL_GUARANTEED_ARTWORKS.length).toBe(4);
      for (const art of LOCAL_GUARANTEED_ARTWORKS) {
        expect(art.src).toMatch(/^\/images\/artworks\/.+\.webp$/);
        expect(art.license).toBe('Public Domain');
        expect(art.title).toBeDefined();
        expect(art.artist).toBeDefined();
      }
    });

    it('excludes failed artworks from available pool when recorded', () => {
      const targetId = ALL_HAVEN_ARTWORKS[0].id;
      expect(isArtworkFailed(targetId)).toBe(false);

      recordFailedArtwork(targetId);
      expect(isArtworkFailed(targetId)).toBe(true);

      const available = getAllAvailableArtworks();
      expect(available.some((a) => a.id === targetId)).toBe(false);
    });

    it('falls back to LOCAL_GUARANTEED_ARTWORKS if all remote artworks fail', () => {
      // Simulate all remote artworks failing
      for (const art of ALL_HAVEN_ARTWORKS) {
        recordFailedArtwork(art.id);
      }

      const available = getAllAvailableArtworks();
      expect(available.length).toBeGreaterThan(0);
      expect(available.every((a) => a.id.startsWith('haven-local-'))).toBe(true);

      const sessionChoice = selectArtworkForSession();
      expect(sessionChoice.artwork.src).toMatch(/^\/images\/artworks\/.+\.webp$/);
    });

    it('resets failed artworks status on clearFailedArtworks', () => {
      const targetId = ALL_HAVEN_ARTWORKS[0].id;
      recordFailedArtwork(targetId);
      expect(isArtworkFailed(targetId)).toBe(true);

      clearFailedArtworks();
      expect(isArtworkFailed(targetId)).toBe(false);
    });
  });
});
