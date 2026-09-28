/**
 * HavenArt — Interactive Opt-in Ambient Audio Controller
 * Contract Version: havenart-contracts-1.1
 * References: docs/AUDIO_SPEC.md, docs/agents/CONTRACTS.md C08 & C10
 *
 * Local Criteria (W20):
 * - W20-AC1: No request/context/play before opt-in; rapid toggle/loading does not play late.
 * - W20-AC2: Crossfade rendered p, reverse supported; tab hidden suspends, disabled stays off.
 * - W20-AC3: Decode/resume error transitions safely to 'unavailable' (mute); clean lifecycle & disposal.
 */

import {
  AUDIO_TRACKS,
  AUDIO_SETTINGS,
  calculateAudioWeights,
  type AudioTrackId,
} from '@/config/audio';

export type AudioState = 'off' | 'loading' | 'playing' | 'suspended' | 'unavailable';

export interface AudioControllerDeps {
  readonly contextFactory?: () => AudioContext;
  readonly fetchFactory?: (url: string, init?: RequestInit) => Promise<Response>;
  readonly initialProgress?: number;
}

export interface AudioController {
  getState(): AudioState;
  enable(): Promise<void>;
  disable(): void;
  toggle(): Promise<void>;
  setProgress(progress: number): void;
  setSuspended(suspended: boolean): void;
  subscribeState(listener: (state: AudioState) => void): () => void;
  dispose(): void;
}

interface TrackNode {
  readonly gain: GainNode;
  source: AudioBufferSourceNode | null;
  buffer: AudioBuffer | null;
}

/**
 * Creates the HavenArt ambient audio controller.
 * Adheres strictly to opt-in guarantees:
 * Zero network requests or AudioContext creations occur before direct user gesture (enable).
 */
export function createAudioController(deps: AudioControllerDeps = {}): AudioController {
  let state: AudioState = 'off';
  let isDesiredPlaying = false;
  let currentRequestToken = 0;
  let currentProgress = deps.initialProgress ?? 0;

  let audioContext: AudioContext | null = null;
  let masterGain: GainNode | null = null;

  const trackNodes: Partial<Record<AudioTrackId, TrackNode>> = {};
  const listeners = new Set<(s: AudioState) => void>();

  function notify(newState: AudioState) {
    if (state !== newState) {
      state = newState;
      listeners.forEach((l) => l(state));
    }
  }

  function getOrCreateContext(): AudioContext {
    if (!audioContext) {
      if (deps.contextFactory) {
        audioContext = deps.contextFactory();
      } else {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioContext = new AudioContextClass();
      }

      masterGain = audioContext.createGain();
      masterGain.gain.setValueAtTime(0, audioContext.currentTime);
      masterGain.connect(audioContext.destination);
    }
    return audioContext;
  }

  async function loadAndDecodeSample(
    ctx: AudioContext,
    uri: string,
    signal?: AbortSignal
  ): Promise<AudioBuffer> {
    const fetchFn = deps.fetchFactory ?? (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetchFn) {
      throw new Error('No fetch implementation available in environment');
    }

    const response = await fetchFn(uri, { signal });
    if (!response.ok) {
      throw new Error(`Failed to load audio asset from ${uri}: HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  }

  function applyTrackWeights(p: number) {
    if (!audioContext || !masterGain || state === 'off' || state === 'unavailable') {
      return;
    }

    const weights = calculateAudioWeights(p);
    const now = audioContext.currentTime;
    const ramp = AUDIO_SETTINGS.gainRampDurationSeconds;

    (['outdoor', 'interior', 'garden'] as const).forEach((trackId) => {
      const node = trackNodes[trackId];
      if (node && node.gain) {
        const targetVol = weights[trackId] * AUDIO_TRACKS[trackId].defaultVolume;
        node.gain.gain.setTargetAtTime(targetVol, now, ramp);
      }
    });
  }

  async function enable(): Promise<void> {
    isDesiredPlaying = true;
    const requestToken = ++currentRequestToken;

    if (state === 'playing') return;

    try {
      notify('loading');

      const ctx = getOrCreateContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Check for cancellation after resume
      if (requestToken !== currentRequestToken || !isDesiredPlaying) {
        notify('off');
        return;
      }

      // Load all 3 ambient tracks concurrently
      const trackIds: AudioTrackId[] = ['outdoor', 'interior', 'garden'];
      await Promise.all(
        trackIds.map(async (trackId) => {
          if (!trackNodes[trackId]) {
            const trackGain = ctx.createGain();
            trackGain.gain.setValueAtTime(0, ctx.currentTime);
            trackGain.connect(masterGain!);

            trackNodes[trackId] = {
              gain: trackGain,
              source: null,
              buffer: null,
            };
          }

          const node = trackNodes[trackId]!;
          if (!node.buffer) {
            node.buffer = await loadAndDecodeSample(ctx, AUDIO_TRACKS[trackId].uri);
          }
        })
      );

      // Verify cancellation after loading/decoding (W20-AC1: rapid toggle does not play late)
      if (requestToken !== currentRequestToken || !isDesiredPlaying) {
        notify('off');
        return;
      }

      // Start looping sources for all tracks if not already started
      const now = ctx.currentTime;
      trackIds.forEach((trackId) => {
        const node = trackNodes[trackId]!;
        if (!node.source && node.buffer) {
          const src = ctx.createBufferSource();
          src.buffer = node.buffer;
          src.loop = true;
          src.connect(node.gain);
          src.start(0);
          node.source = src;
        }
      });

      // Apply initial weights based on current progress
      applyTrackWeights(currentProgress);

      // Smoothly ramp master gain up to target master volume (50ms click-free ramp)
      masterGain!.gain.setTargetAtTime(
        AUDIO_SETTINGS.masterGain,
        now,
        AUDIO_SETTINGS.gainRampDurationSeconds
      );

      notify('playing');
    } catch (err) {
      console.warn('[HavenArt Audio] Error enabling ambient sound:', err);
      // On failure: transition to unavailable without throwing (W20-AC3)
      notify('unavailable');
    }
  }

  function disable(): void {
    isDesiredPlaying = false;
    currentRequestToken++; // Invalidate pending loads

    if (state === 'off') return;

    if (audioContext && masterGain) {
      const now = audioContext.currentTime;
      // Softly ramp down master gain over 50ms before muting
      masterGain.gain.setTargetAtTime(0, now, AUDIO_SETTINGS.gainRampDurationSeconds);
    }

    notify('off');
  }

  async function toggle(): Promise<void> {
    if (state === 'playing') {
      disable();
    } else {
      await enable();
    }
  }

  function setProgress(progress: number): void {
    currentProgress = progress;
    if (state === 'playing') {
      applyTrackWeights(currentProgress);
    }
  }

  function setSuspended(suspended: boolean): void {
    if (!audioContext || state === 'off' || state === 'unavailable') return;

    if (suspended) {
      if (state === 'playing') {
        audioContext.suspend().catch(() => {});
        notify('suspended');
      }
    } else {
      if (state === 'suspended' && isDesiredPlaying) {
        audioContext.resume().then(() => notify('playing')).catch(() => notify('unavailable'));
      }
    }
  }

  function subscribeState(listener: (s: AudioState) => void): () => void {
    listeners.add(listener);
    listener(state);
    return () => {
      listeners.delete(listener);
    };
  }

  function dispose(): void {
    disable();
    listeners.clear();

    // Stop and disconnect sources
    Object.values(trackNodes).forEach((node) => {
      if (node?.source) {
        try {
          node.source.stop();
          node.source.disconnect();
        } catch {
          // Ignore if already stopped
        }
        node.source = null;
      }
    });

    if (audioContext) {
      try {
        audioContext.close().catch(() => {});
      } catch {
        // Ignore errors on close
      }
      audioContext = null;
    }
  }

  return {
    getState: () => state,
    enable,
    disable,
    toggle,
    setProgress,
    setSuspended,
    subscribeState,
    dispose,
  };
}
