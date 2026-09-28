/**
 * HavenArt — Audio System Configuration & Mixing Curves
 * Contract Version: havenart-contracts-1.1
 * References: docs/AUDIO_SPEC.md, docs/SCENE_ARCHITECTURE.md
 */

import type { ChapterId } from '@/types/story';

export type AudioTrackId = 'outdoor' | 'interior' | 'garden';

export interface AudioTrackConfig {
  readonly id: AudioTrackId;
  readonly uri: string;
  readonly label: string;
  readonly defaultVolume: number;
}

export const AUDIO_TRACKS: Record<AudioTrackId, AudioTrackConfig> = {
  outdoor: {
    id: 'outdoor',
    uri: '/audio/outdoor.ogg',
    label: 'Outdoor Nature Ambience',
    defaultVolume: 0.65,
  },
  interior: {
    id: 'interior',
    uri: '/audio/interior.ogg',
    label: 'Interior Serene Room Tone',
    defaultVolume: 0.45,
  },
  garden: {
    id: 'garden',
    uri: '/audio/garden.ogg',
    label: 'Garden Landscape Ambience',
    defaultVolume: 0.60,
  },
} as const;

export const AUDIO_SETTINGS = {
  masterGain: 0.80,
  gainRampDurationSeconds: 0.05, // 50 ms click-free ramp (AUDIO_SPEC §3)
  maxActiveLayers: 2,
} as const;

export interface AudioLayerWeights {
  readonly outdoor: number;
  readonly interior: number;
  readonly garden: number;
}

/**
 * Pure function to calculate crossfade layer weights at any progress p in [0, 1].
 * Implements equal-power crossfading according to docs/AUDIO_SPEC.md §3:
 * - p in [0.00, 0.27]: 100% Outdoor (exterior & approach)
 * - p in [0.27, 0.39]: Threshold crossfade (outdoor -> interior) via cos/sin equal power
 * - p in [0.39, 0.68]: 100% Interior room tone (living)
 * - p in [0.68, 0.76]: Terrace crossfade (interior -> garden) via cos/sin equal power
 * - p in [0.76, 1.00]: 100% Garden (garden & finale)
 *
 * Deterministic forward and reverse: weightsAt(progress) produces identical values.
 */
export function calculateAudioWeights(progress: number): AudioLayerWeights {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));

  // 1. Exterior & Approach
  if (p <= 0.27) {
    return { outdoor: 1.0, interior: 0.0, garden: 0.0 };
  }

  // 2. Entrance Threshold crossfade: [0.27, 0.39]
  if (p < 0.39) {
    const t = (p - 0.27) / (0.39 - 0.27);
    const outdoor = Math.cos((t * Math.PI) / 2);
    const interior = Math.sin((t * Math.PI) / 2);
    return { outdoor, interior, garden: 0.0 };
  }

  // 3. Living Room
  if (p <= 0.68) {
    return { outdoor: 0.0, interior: 1.0, garden: 0.0 };
  }

  // 4. Rear Terrace Threshold crossfade: [0.68, 0.76]
  if (p < 0.76) {
    const t = (p - 0.68) / (0.76 - 0.68);
    const interior = Math.cos((t * Math.PI) / 2);
    const garden = Math.sin((t * Math.PI) / 2);
    return { outdoor: 0.0, interior, garden };
  }

  // 5. Garden & Finale
  return { outdoor: 0.0, interior: 0.0, garden: 1.0 };
}

/**
 * Mapping from ChapterId to dominant ambient track
 */
export const CHAPTER_AUDIO_MAP: Record<ChapterId, AudioTrackId> = {
  exterior: 'outdoor',
  approach: 'outdoor',
  entrance: 'outdoor', // blends into interior
  living: 'interior',
  garden: 'garden',
  finale: 'garden',
} as const;
