import { DEFAULT_TRACKS, type AudioTrack } from './tracks';

export const HAVEN_VOLUME_KEY = 'haven_volume';
export const DEFAULT_VOLUME = 0.4;

export interface AudioEngineOptions {
  tracks?: AudioTrack[];
  initialVolume?: number;
  defaultCrossfadeDurationSec?: number;
  audioContext?: AudioContext;
}

interface TrackNode {
  audio: HTMLAudioElement;
  gainNode: GainNode;
  sourceNode?: AudioNode;
}

interface ActiveCrossfade {
  outgoingNode: TrackNode;
  incomingNode: TrackNode;
  targetTrack: AudioTrack;
  resolve: () => void;
  timer: ReturnType<typeof setTimeout>;
}

class StubGainNode {
  gain = {
    value: 1,
    setValueAtTime(val: number): void {
      this.value = val;
    },
    linearRampToValueAtTime(val: number): void {
      this.value = val;
    },
    exponentialRampToValueAtTime(val: number): void {
      this.value = val;
    },
  };
  connect(): void {}
  disconnect(): void {}
}

class StubAudioContext {
  state: AudioContextState = 'suspended';
  currentTime = 0;
  destination = {};

  createGain(): any {
    return new StubGainNode();
  }

  createMediaElementSource(): any {
    return {
      connect(): void {},
      disconnect(): void {},
    };
  }

  async resume(): Promise<void> {
    this.state = 'running';
  }

  async suspend(): Promise<void> {
    this.state = 'suspended';
  }

  async close(): Promise<void> {
    this.state = 'closed';
  }
}

class StubAudio {
  src: string;
  loop = true;
  crossOrigin = 'anonymous';
  currentTime = 0;
  paused = true;

  constructor(src = '') {
    this.src = src;
  }

  play(): Promise<void> {
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }

  addEventListener(): void {}
  removeEventListener(): void {}
}

function createDefaultAudioContext(): AudioContext {
  if (typeof window !== 'undefined') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      return new AudioCtx();
    }
  }
  return new StubAudioContext() as unknown as AudioContext;
}

export class AudioEngine {
  private tracks: AudioTrack[];
  private currentTrack: AudioTrack | null = null;
  private volume: number;
  private defaultCrossfadeDurationSec: number;
  private unlocked = false;
  private isPlayingState = false;
  private audioContext: AudioContext | null = null;
  private masterGainNode: GainNode | null = null;
  private trackNodes = new Map<string, TrackNode>();
  private activeCrossfade: ActiveCrossfade | null = null;

  constructor(options?: AudioEngineOptions) {
    this.tracks = options?.tracks && options.tracks.length > 0 ? [...options.tracks] : [...DEFAULT_TRACKS];
    this.defaultCrossfadeDurationSec = options?.defaultCrossfadeDurationSec ?? 1.5;

    // Determine initial volume
    let initialVol = DEFAULT_VOLUME;
    if (typeof options?.initialVolume === 'number') {
      initialVol = Math.max(0.0, Math.min(1.0, options.initialVolume));
    } else {
      try {
        if (typeof localStorage !== 'undefined') {
          const stored = localStorage.getItem(HAVEN_VOLUME_KEY);
          if (stored !== null) {
            const parsed = parseFloat(stored);
            if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
              initialVol = Math.max(0.0, Math.min(1.0, parsed));
            }
          }
        }
      } catch {
        // Ignore localStorage access failures
      }
    }
    this.volume = initialVol;

    if (options?.audioContext) {
      this.audioContext = options.audioContext;
      this.initAudioGraph();
    }

    this.setupMediaSession();
  }

  private initAudioGraph(): void {
    if (!this.audioContext) {
      this.audioContext = createDefaultAudioContext();
    }
    if (!this.masterGainNode && this.audioContext) {
      this.masterGainNode = this.audioContext.createGain();
      this.masterGainNode.gain.value = this.volume;
      try {
        this.masterGainNode.connect(this.audioContext.destination);
      } catch {
        // Ignore connection issues in mock environments
      }
    }
  }

  private getOrCreateTrackNode(track: AudioTrack): TrackNode {
    let node = this.trackNodes.get(track.id);
    if (node) return node;

    let audio: HTMLAudioElement;
    if (typeof Audio !== 'undefined') {
      audio = new Audio(track.src);
    } else {
      audio = new StubAudio(track.src) as unknown as HTMLAudioElement;
    }
    audio.loop = true;
    audio.crossOrigin = 'anonymous';

    this.initAudioGraph();

    let gainNode: GainNode;
    let sourceNode: AudioNode | undefined;

    if (this.audioContext) {
      gainNode = this.audioContext.createGain();
      gainNode.gain.value = 1.0;
      if (this.masterGainNode) {
        try {
          gainNode.connect(this.masterGainNode);
        } catch {}
      }
      if (typeof this.audioContext.createMediaElementSource === 'function') {
        try {
          sourceNode = this.audioContext.createMediaElementSource(audio);
          sourceNode.connect(gainNode);
        } catch {
          // Some mock or restricted environments don't support createMediaElementSource
        }
      }
    } else {
      gainNode = new StubGainNode() as unknown as GainNode;
    }

    node = { audio, gainNode, sourceNode };
    this.trackNodes.set(track.id, node);
    return node;
  }

  public async unlockAudio(): Promise<void> {
    this.initAudioGraph();

    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch {
        // Resume may fail without valid gesture in real browser
      }
    }

    this.unlocked = true;
  }

  public isUnlocked(): boolean {
    return this.unlocked;
  }

  public isPlaying(): boolean {
    return this.isPlayingState;
  }

  public getCurrentTrack(): AudioTrack | null {
    return this.currentTrack;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(volume: number): void {
    const clamped = Math.max(0.0, Math.min(1.0, Number.isFinite(volume) ? volume : DEFAULT_VOLUME));
    this.volume = clamped;

    if (this.masterGainNode && this.audioContext) {
      try {
        this.masterGainNode.gain.setValueAtTime(clamped, this.audioContext.currentTime);
      } catch {
        this.masterGainNode.gain.value = clamped;
      }
    }

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(HAVEN_VOLUME_KEY, String(clamped));
      }
    } catch {
      // Ignore storage errors
    }
  }

  private finishActiveCrossfade(): void {
    if (!this.activeCrossfade) return;

    const { outgoingNode, incomingNode, targetTrack, timer, resolve } = this.activeCrossfade;
    clearTimeout(timer);
    this.activeCrossfade = null;

    try {
      outgoingNode.audio.pause?.();
      outgoingNode.audio.currentTime = 0;
      if (this.audioContext) {
        outgoingNode.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      } else {
        outgoingNode.gainNode.gain.value = 0;
      }
    } catch {}

    try {
      if (this.audioContext) {
        incomingNode.gainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);
      } else {
        incomingNode.gainNode.gain.value = 1.0;
      }
    } catch {}

    this.currentTrack = targetTrack;
    resolve();
  }

  public async play(trackId?: string): Promise<void> {
    if (!this.unlocked) {
      throw new Error('User gesture required to unlock audio');
    }

    if (this.activeCrossfade) {
      this.finishActiveCrossfade();
    }

    let targetTrack: AudioTrack | undefined;
    if (trackId) {
      targetTrack = this.tracks.find((t) => t.id === trackId);
      if (!targetTrack) {
        throw new Error(`Track with id "${trackId}" not found`);
      }
    } else {
      targetTrack = this.currentTrack || this.tracks[0];
    }

    if (!targetTrack) {
      throw new Error('No audio tracks available in registry');
    }

    // Single source guarantee: if a different track is currently playing, stop it
    if (this.currentTrack && this.currentTrack.id !== targetTrack.id) {
      this.stopTrack(this.currentTrack.id);
    }

    const node = this.getOrCreateTrackNode(targetTrack);
    try {
      if (this.audioContext) {
        node.gainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);
      } else {
        node.gainNode.gain.value = 1.0;
      }
    } catch {}

    try {
      const playPromise = node.audio.play?.();
      if (playPromise && typeof playPromise.then === 'function') {
        await playPromise.catch(() => {});
      }
    } catch {
      // Ignore audio element playback errors in test/headless environments
    }

    this.currentTrack = targetTrack;
    this.isPlayingState = true;
    this.updateMediaSession();
  }

  public async playTrack(trackId: string): Promise<void> {
    return this.play(trackId);
  }

  public pause(): void {
    if (this.activeCrossfade) {
      this.finishActiveCrossfade();
    }

    for (const node of this.trackNodes.values()) {
      try {
        node.audio.pause?.();
      } catch {}
    }

    this.isPlayingState = false;
    this.updateMediaSession();
  }

  public async togglePlay(): Promise<void> {
    if (this.isPlayingState) {
      this.pause();
    } else {
      await this.play();
    }
  }

  public async crossfade(toTrackId: string, durationSec?: number): Promise<void> {
    if (!this.unlocked) {
      throw new Error('User gesture required to unlock audio');
    }

    const targetTrack = this.tracks.find((t) => t.id === toTrackId);
    if (!targetTrack) {
      throw new Error(`Track with id "${toTrackId}" not found`);
    }

    if (this.currentTrack?.id === targetTrack.id && this.isPlayingState && !this.activeCrossfade) {
      return;
    }

    if (!this.isPlayingState || !this.currentTrack) {
      await this.play(toTrackId);
      return;
    }

    // Cancel and immediately finish prior active crossfade
    if (this.activeCrossfade) {
      this.finishActiveCrossfade();
    }

    const oldTrack = this.currentTrack;
    const oldNode = this.getOrCreateTrackNode(oldTrack);
    const newNode = this.getOrCreateTrackNode(targetTrack);

    const dur = Math.max(0.01, durationSec ?? this.defaultCrossfadeDurationSec);
    const now = this.audioContext?.currentTime ?? 0;

    try {
      // Fade in new track
      newNode.gainNode.gain.setValueAtTime(0.0001, now);
      const playPromise = newNode.audio.play?.();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.catch(() => {});
      }
      newNode.gainNode.gain.linearRampToValueAtTime(1.0, now + dur);

      // Fade out old track
      oldNode.gainNode.gain.setValueAtTime(oldNode.gainNode.gain.value || 1.0, now);
      oldNode.gainNode.gain.linearRampToValueAtTime(0.0001, now + dur);
    } catch {
      // Fallback direct switch for simple mock contexts
      oldNode.gainNode.gain.value = 0;
      newNode.gainNode.gain.value = 1;
    }

    this.currentTrack = targetTrack;
    this.isPlayingState = true;
    this.updateMediaSession();

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        try {
          oldNode.audio.pause?.();
          oldNode.audio.currentTime = 0;
          if (this.audioContext) {
            oldNode.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
          } else {
            oldNode.gainNode.gain.value = 0;
          }
        } catch {}
        this.activeCrossfade = null;
        resolve();
      }, dur * 1000);

      this.activeCrossfade = {
        outgoingNode: oldNode,
        incomingNode: newNode,
        targetTrack,
        resolve,
        timer,
      };
    });
  }

  public async nextTrack(durationSec?: number): Promise<void> {
    const currentIndex = this.tracks.findIndex((t) => t.id === this.currentTrack?.id);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % this.tracks.length;
    const next = this.tracks[nextIndex];
    if (this.isPlayingState) {
      await this.crossfade(next.id, durationSec ?? this.defaultCrossfadeDurationSec);
    } else {
      this.currentTrack = next;
      this.updateMediaSession();
    }
  }

  public async previousTrack(durationSec?: number): Promise<void> {
    const currentIndex = this.tracks.findIndex((t) => t.id === this.currentTrack?.id);
    const prevIndex = currentIndex <= 0 ? this.tracks.length - 1 : currentIndex - 1;
    const prev = this.tracks[prevIndex];
    if (this.isPlayingState) {
      await this.crossfade(prev.id, durationSec ?? this.defaultCrossfadeDurationSec);
    } else {
      this.currentTrack = prev;
      this.updateMediaSession();
    }
  }

  private stopTrack(trackId: string): void {
    const node = this.trackNodes.get(trackId);
    if (node) {
      try {
        node.audio.pause?.();
        node.audio.currentTime = 0;
        if (this.audioContext) {
          node.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        } else {
          node.gainNode.gain.value = 0;
        }
      } catch {}
    }
  }

  private setupMediaSession(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }
    try {
      navigator.mediaSession.setActionHandler('play', () => {
        this.play().catch(() => {});
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.nextTrack().catch(() => {});
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.previousTrack().catch(() => {});
      });
    } catch {}
  }

  private updateMediaSession(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }
    try {
      navigator.mediaSession.playbackState = this.isPlayingState ? 'playing' : 'paused';
      if (this.currentTrack) {
        if (typeof MediaMetadata !== 'undefined') {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: this.currentTrack.title,
            artist: this.currentTrack.artist,
            album: 'Haven Art Sanctuary',
          });
        } else {
          navigator.mediaSession.metadata = {
            title: this.currentTrack.title,
            artist: this.currentTrack.artist,
            album: 'Haven Art Sanctuary',
          } as unknown as MediaMetadata;
        }
      }
    } catch {}
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  public destroy(): void {
    if (this.activeCrossfade) {
      this.finishActiveCrossfade();
    }

    this.pause();

    for (const node of this.trackNodes.values()) {
      try {
        node.audio.pause?.();
        node.audio.src = '';
        node.sourceNode?.disconnect();
        node.gainNode?.disconnect();
      } catch {}
    }
    this.trackNodes.clear();

    if (this.masterGainNode) {
      try {
        this.masterGainNode.disconnect();
      } catch {}
      this.masterGainNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = 'none';
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.setActionHandler('play', null as any);
        navigator.mediaSession.setActionHandler('pause', null as any);
        navigator.mediaSession.setActionHandler('nexttrack', null as any);
        navigator.mediaSession.setActionHandler('previoustrack', null as any);
      } catch {}
    }

    this.isPlayingState = false;
    this.unlocked = false;
    this.currentTrack = null;
  }
}
