import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioEngine, DEFAULT_VOLUME, HAVEN_VOLUME_KEY } from '../../src/lib/audio/engine';
import { DEFAULT_TRACKS, getAllTracks, getDefaultTrack, getTrackById } from '../../src/lib/audio/tracks';

describe('AudioEngine', () => {
  let engine: AudioEngine;
  let originalMediaSession: any;

  beforeEach(() => {
    localStorage.clear();
    originalMediaSession = (navigator as any).mediaSession;
    engine = new AudioEngine({ defaultCrossfadeDurationSec: 0.05 });
  });

  afterEach(() => {
    engine.destroy();
    if (originalMediaSession !== undefined) {
      (navigator as any).mediaSession = originalMediaSession;
    } else {
      delete (navigator as any).mediaSession;
    }
  });

  describe('1. No-Autoplay and Gesture Gating', () => {
    it('must not play audio before explicit user gesture unlock', async () => {
      expect(engine.isUnlocked()).toBe(false);
      await expect(engine.play()).rejects.toThrow('User gesture required to unlock audio');
    });

    it('must reject crossfade attempts before unlock', async () => {
      expect(engine.isUnlocked()).toBe(false);
      await expect(engine.crossfade('haven-ambient-morning')).rejects.toThrow(
        'User gesture required to unlock audio'
      );
    });

    it('unlocks audio on unlockAudio() and updates isUnlocked state', async () => {
      expect(engine.isUnlocked()).toBe(false);
      await engine.unlockAudio();
      expect(engine.isUnlocked()).toBe(true);
    });
  });

  describe('2. Volume Management and Clamping', () => {
    it('defaults volume to 40% and clamps strictly within [0.0, 1.0]', () => {
      expect(engine.getVolume()).toBe(0.4);

      engine.setVolume(1.8);
      expect(engine.getVolume()).toBe(1.0);

      engine.setVolume(-0.5);
      expect(engine.getVolume()).toBe(0.0);

      engine.setVolume(0.72);
      expect(engine.getVolume()).toBe(0.72);
    });

    it('falls back safely to default volume when given NaN or non-finite values', () => {
      engine.setVolume(Number.NaN);
      expect(engine.getVolume()).toBe(DEFAULT_VOLUME);

      engine.setVolume(Number.POSITIVE_INFINITY);
      expect(engine.getVolume()).toBe(DEFAULT_VOLUME);
    });

    it('persists volume changes to localStorage key haven_volume', () => {
      engine.setVolume(0.65);
      expect(localStorage.getItem(HAVEN_VOLUME_KEY)).toBe('0.65');

      // A fresh instance should restore the saved volume
      const restoredEngine = new AudioEngine();
      expect(restoredEngine.getVolume()).toBe(0.65);
      restoredEngine.destroy();
    });

    it('handles corrupted localStorage values gracefully by using default volume', () => {
      localStorage.setItem(HAVEN_VOLUME_KEY, 'corrupted_not_a_number');
      const fallbackEngine = new AudioEngine();
      expect(fallbackEngine.getVolume()).toBe(DEFAULT_VOLUME);
      fallbackEngine.destroy();
    });
  });

  describe('3. Playback Controls & Single Source Guarantee', () => {
    it('supports play, pause, togglePlay and playTrack alias', async () => {
      await engine.unlockAudio();
      expect(engine.isPlaying()).toBe(false);

      await engine.play('haven-ambient-morning');
      expect(engine.isPlaying()).toBe(true);
      expect(engine.getCurrentTrack()?.id).toBe('haven-ambient-morning');

      engine.pause();
      expect(engine.isPlaying()).toBe(false);

      await engine.togglePlay();
      expect(engine.isPlaying()).toBe(true);

      await engine.togglePlay();
      expect(engine.isPlaying()).toBe(false);

      await engine.playTrack('haven-ambient-solitude');
      expect(engine.getCurrentTrack()?.id).toBe('haven-ambient-solitude');
      expect(engine.isPlaying()).toBe(true);
    });

    it('ensures playing a different track stops the previous track (single source guarantee)', async () => {
      await engine.unlockAudio();
      await engine.play('haven-ambient-morning');
      expect(engine.getCurrentTrack()?.id).toBe('haven-ambient-morning');

      await engine.play('haven-ambient-nightfall');
      expect(engine.getCurrentTrack()?.id).toBe('haven-ambient-nightfall');
      expect(engine.isPlaying()).toBe(true);
    });

    it('throws error when attempting to play a non-existent track id', async () => {
      await engine.unlockAudio();
      await expect(engine.play('non-existent-track')).rejects.toThrow(
        'Track with id "non-existent-track" not found'
      );
    });
  });

  describe('4. Crossfade & Track Navigation', () => {
    it('switches tracks smoothly with crossfade', async () => {
      await engine.unlockAudio();
      await engine.play('haven-ambient-morning');

      await engine.crossfade('haven-ambient-solitude', 0.05);
      expect(engine.getCurrentTrack()?.id).toBe('haven-ambient-solitude');
      expect(engine.isPlaying()).toBe(true);
    });

    it('crossfade is a no-op if target track is already playing', async () => {
      await engine.unlockAudio();
      await engine.play('haven-ambient-morning');

      await engine.crossfade('haven-ambient-morning', 0.05);
      expect(engine.getCurrentTrack()?.id).toBe('haven-ambient-morning');
      expect(engine.isPlaying()).toBe(true);
    });

    it('crossfade rejects if target track id does not exist', async () => {
      await engine.unlockAudio();
      await engine.play('haven-ambient-morning');

      await expect(engine.crossfade('invalid-id', 0.05)).rejects.toThrow(
        'Track with id "invalid-id" not found'
      );
    });

    it('crossfade starts playing target track if audio was paused', async () => {
      await engine.unlockAudio();
      expect(engine.isPlaying()).toBe(false);

      await engine.crossfade('haven-ambient-nightfall', 0.05);
      expect(engine.getCurrentTrack()?.id).toBe('haven-ambient-nightfall');
      expect(engine.isPlaying()).toBe(true);
    });

    it('cycles sequentially with nextTrack and previousTrack with wraparound', async () => {
      await engine.unlockAudio();
      await engine.play(DEFAULT_TRACKS[0].id);

      await engine.nextTrack(0.05);
      expect(engine.getCurrentTrack()?.id).toBe(DEFAULT_TRACKS[1].id);

      await engine.nextTrack(0.05);
      expect(engine.getCurrentTrack()?.id).toBe(DEFAULT_TRACKS[2].id);

      // Wrap around to first track
      await engine.nextTrack(0.05);
      expect(engine.getCurrentTrack()?.id).toBe(DEFAULT_TRACKS[0].id);

      // Previous wraps to last track
      await engine.previousTrack(0.05);
      expect(engine.getCurrentTrack()?.id).toBe(DEFAULT_TRACKS[2].id);
    });

    it('handles rapid concurrent crossfade calls resolving all pending promises and stopping outgoing tracks', async () => {
      await engine.unlockAudio();
      await engine.play(DEFAULT_TRACKS[0].id);

      // Trigger two crossfades in rapid succession
      const p1 = engine.crossfade(DEFAULT_TRACKS[1].id, 0.5);
      const p2 = engine.crossfade(DEFAULT_TRACKS[2].id, 0.05);

      // Both promises must resolve cleanly without hanging
      await expect(Promise.all([p1, p2])).resolves.toBeDefined();

      // Only the final track must be active
      expect(engine.getCurrentTrack()?.id).toBe(DEFAULT_TRACKS[2].id);
      expect(engine.isPlaying()).toBe(true);
    });

    it('pausing during an active crossfade immediately resolves in-flight crossfade and pauses all tracks', async () => {
      await engine.unlockAudio();
      await engine.play(DEFAULT_TRACKS[0].id);

      // Start a longer crossfade
      const p = engine.crossfade(DEFAULT_TRACKS[1].id, 0.5);

      // Pause mid-crossfade
      engine.pause();

      // In-flight crossfade promise must resolve cleanly without hanging
      await expect(p).resolves.toBeUndefined();

      // All audio must be paused
      expect(engine.isPlaying()).toBe(false);
      expect(engine.getCurrentTrack()?.id).toBe(DEFAULT_TRACKS[1].id);
    });
  });

  describe('5. Track Registry Contracts', () => {
    it('provides valid default ambient tracks with metadata and license info', () => {
      const tracks = getAllTracks();
      expect(tracks.length).toBeGreaterThanOrEqual(3);

      for (const track of tracks) {
        expect(track.id).toBeDefined();
        expect(track.title).toBeDefined();
        expect(track.artist).toBeDefined();
        expect(track.license).toBeDefined();
        expect(track.src).toMatch(/\.(mp3|ogg|wav)$/);
        expect(track.durationSeconds).toBeGreaterThan(0);
      }
    });

    it('supports lookup via getTrackById and getDefaultTrack', () => {
      const defaultTrack = getDefaultTrack();
      expect(defaultTrack).toBeDefined();
      expect(defaultTrack.id).toBe(DEFAULT_TRACKS[0].id);

      const found = getTrackById('haven-ambient-morning');
      expect(found?.title).toBe('Morning Mist');

      const notFound = getTrackById('non-existent');
      expect(notFound).toBeUndefined();
    });
  });

  describe('6. Web Audio Graph & Custom Context Simulation', () => {
    it('initializes Web Audio Graph with GainNode and master volume control', async () => {
      const mockGainNode = {
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };

      const mockAudioContext = {
        state: 'suspended' as AudioContextState,
        currentTime: 10,
        destination: {},
        createGain: vi.fn().mockReturnValue(mockGainNode),
        createMediaElementSource: vi.fn().mockReturnValue({
          connect: vi.fn(),
          disconnect: vi.fn(),
        }),
        resume: vi.fn().mockResolvedValue(undefined),
        suspend: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      } as unknown as AudioContext;

      const customEngine = new AudioEngine({
        audioContext: mockAudioContext,
        initialVolume: 0.5,
        defaultCrossfadeDurationSec: 0.05,
      });

      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);

      await customEngine.unlockAudio();
      expect(mockAudioContext.resume).toHaveBeenCalled();

      customEngine.setVolume(0.8);
      expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0.8, 10);

      customEngine.destroy();
      expect(mockAudioContext.close).toHaveBeenCalled();
    });
  });

  describe('7. Media Session Integration', () => {
    it('sets playbackState, metadata, and registers action handlers', async () => {
      const setActionHandlerMock = vi.fn();
      const mockMediaSession = {
        playbackState: 'none',
        metadata: null as any,
        setActionHandler: setActionHandlerMock,
      };
      (navigator as any).mediaSession = mockMediaSession;

      const sessionEngine = new AudioEngine({ defaultCrossfadeDurationSec: 0.05 });
      await sessionEngine.unlockAudio();
      await sessionEngine.play('haven-ambient-morning');

      expect(mockMediaSession.playbackState).toBe('playing');
      expect(mockMediaSession.metadata.title).toBe('Morning Mist');
      expect(mockMediaSession.metadata.artist).toBe('Haven Soundscapes');

      expect(setActionHandlerMock).toHaveBeenCalledWith('play', expect.any(Function));
      expect(setActionHandlerMock).toHaveBeenCalledWith('pause', expect.any(Function));
      expect(setActionHandlerMock).toHaveBeenCalledWith('nexttrack', expect.any(Function));
      expect(setActionHandlerMock).toHaveBeenCalledWith('previoustrack', expect.any(Function));

      sessionEngine.pause();
      expect(mockMediaSession.playbackState).toBe('paused');

      sessionEngine.destroy();
      expect(mockMediaSession.playbackState).toBe('none');
      expect(mockMediaSession.metadata).toBeNull();
    });
  });

  describe('8. Lifecycle and Destruction', () => {
    it('cleans up resources and resets playback state on destroy', async () => {
      await engine.unlockAudio();
      await engine.play();
      expect(engine.isPlaying()).toBe(true);

      engine.destroy();
      expect(engine.isPlaying()).toBe(false);
      expect(engine.isUnlocked()).toBe(false);
      expect(engine.getCurrentTrack()).toBeNull();
    });
  });
});
