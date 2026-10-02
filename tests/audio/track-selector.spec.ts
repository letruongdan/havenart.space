import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  selectTrackForSession,
  selectNextTrack,
  recordPlayedTrack,
  getRecentTrackIds,
  clearRecentTracks,
  type AudioSelectionContext,
} from '../../src/lib/audio/track-selector';
import { ALL_HAVEN_AUDIO_TRACKS } from '../../src/lib/audio/ambient-catalog';

describe('Smart Audio Track Selector (Weather, Mood, Freshness)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearRecentTracks();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  afterEach(() => {
    clearRecentTracks();
  });

  describe('1. Freshness Invariant: Different Music on Each Access ("Mỗi lượt truy cập là một bản nhạc khác nhau")', () => {
    it('returns a different audio track on consecutive session selections', () => {
      const first = selectTrackForSession();
      expect(first.track).toBeDefined();
      expect(first.track.src).toBeDefined();

      const second = selectTrackForSession();
      expect(second.track).toBeDefined();
      expect(second.track.id).not.toBe(first.track.id);

      const third = selectTrackForSession();
      expect(third.track).toBeDefined();
      expect(third.track.id).not.toBe(second.track.id);
      expect(third.track.id).not.toBe(first.track.id);
    });

    it('cycles gracefully without deadlock even when all audio tracks have been played', () => {
      const allIds = ALL_HAVEN_AUDIO_TRACKS.map((t) => t.id);
      allIds.forEach((id) => recordPlayedTrack(id));

      const lastId = allIds[allIds.length - 1];
      const next = selectTrackForSession();

      expect(next.track).toBeDefined();
      expect(next.track.id).not.toBe(lastId);
    });
  });

  describe('2. Weather-Condition Audio Adaptation', () => {
    it('prioritizes rain soundscapes when weather is rainy', () => {
      const result = selectTrackForSession({ weather: 'rain' });
      expect(result.track).toBeDefined();
      const track = ALL_HAVEN_AUDIO_TRACKS.find((t) => t.id === result.track.id);
      expect(track?.weather).toContain('rain');
    });

    it('prioritizes night ambient when weather is night', () => {
      const result = selectTrackForSession({ weather: 'night', timeOfDay: 'night' });
      expect(result.track).toBeDefined();
      const track = ALL_HAVEN_AUDIO_TRACKS.find((t) => t.id === result.track.id);
      expect(track?.weather).toContain('night');
    });

    it('prioritizes dusk acoustic warm resonance during sunset', () => {
      const result = selectTrackForSession({ weather: 'dusk', timeOfDay: 'dusk' });
      expect(result.track).toBeDefined();
      const track = ALL_HAVEN_AUDIO_TRACKS.find((t) => t.id === result.track.id);
      expect(track?.weather).toContain('dusk');
    });
  });

  describe('3. Journal Mood Audio Adaptation', () => {
    it('selects uplifting hopeful music when journal mood is hopeful', () => {
      const result = selectTrackForSession({ mood: 'hopeful' });
      expect(result.track).toBeDefined();
      const track = ALL_HAVEN_AUDIO_TRACKS.find((t) => t.id === result.track.id);
      expect(track?.moods).toContain('hopeful');
    });

    it('selects reflective deep soundscape when journal mood is reflective', () => {
      const result = selectTrackForSession({ mood: 'reflective' });
      expect(result.track).toBeDefined();
      const track = ALL_HAVEN_AUDIO_TRACKS.find((t) => t.id === result.track.id);
      expect(track?.moods).toContain('reflective');
    });

    it('selects serene peace/gratitude music when journal mood is grateful', () => {
      const result = selectTrackForSession({ mood: 'grateful' });
      expect(result.track).toBeDefined();
      const track = ALL_HAVEN_AUDIO_TRACKS.find((t) => t.id === result.track.id);
      expect(track?.moods).toContain('grateful');
    });
  });

  describe('4. Manual Next Track Navigation (selectNextTrack)', () => {
    it('always selects a track different from the currently playing track ID', () => {
      const current = ALL_HAVEN_AUDIO_TRACKS[0];
      const next = selectNextTrack({ currentId: current.id });
      expect(next.track.id).not.toBe(current.id);
    });

    it('preserves mood context when user changes tracks manually', () => {
      const current = ALL_HAVEN_AUDIO_TRACKS.find((t) => t.moods.includes('hopeful'))!;
      const next = selectNextTrack({ currentId: current.id, mood: 'hopeful' });

      expect(next.track.id).not.toBe(current.id);
      const track = ALL_HAVEN_AUDIO_TRACKS.find((t) => t.id === next.track.id);
      expect(track?.moods).toContain('hopeful');
    });
  });
});
