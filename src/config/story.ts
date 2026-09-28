/**
 * HavenArt — Story Chapters & Resource Configuration
 * Contract Version: havenart-contracts-1.1
 */

import type { ChapterId, StoryChapter } from '@/types/story';

export const CHAPTER_IDS: readonly ChapterId[] = [
  'exterior',
  'approach',
  'entrance',
  'living',
  'garden',
  'finale',
] as const;

export const CHAPTERS: readonly StoryChapter[] = [
  {
    id: 'exterior',
    slug: 'exterior',
    progressStart: 0.0,
    progressEnd: 0.15,
    cameraRange: [0.0, 0.15],
    copyKey: 'chapters.exterior',
    lightingPreset: 'golden',
    audioPreset: 'outdoor',
    hotspotIds: [],
    qualityHints: { preferredTier: 'high' },
  },
  {
    id: 'approach',
    slug: 'approach',
    progressStart: 0.15,
    progressEnd: 0.27,
    cameraRange: [0.15, 0.27],
    copyKey: 'chapters.approach',
    lightingPreset: 'golden',
    audioPreset: 'outdoor',
    hotspotIds: [],
    qualityHints: { preferredTier: 'high' },
  },
  {
    id: 'entrance',
    slug: 'entrance',
    progressStart: 0.27,
    progressEnd: 0.39,
    cameraRange: [0.27, 0.39],
    copyKey: 'chapters.entrance',
    lightingPreset: 'golden',
    audioPreset: 'threshold',
    hotspotIds: [],
    qualityHints: { preferredTier: 'high' },
  },
  {
    id: 'living',
    slug: 'living',
    progressStart: 0.39,
    progressEnd: 0.68,
    cameraRange: [0.39, 0.68],
    copyKey: 'chapters.living',
    lightingPreset: 'sunset',
    audioPreset: 'indoor',
    hotspotIds: ['travertine-wall', 'sliding-glass'],
    qualityHints: { preferredTier: 'high' },
  },
  {
    id: 'garden',
    slug: 'garden',
    progressStart: 0.68,
    progressEnd: 0.87,
    cameraRange: [0.68, 0.87],
    copyKey: 'chapters.garden',
    lightingPreset: 'dusk',
    audioPreset: 'garden',
    hotspotIds: ['garden-tree'],
    qualityHints: { preferredTier: 'high' },
  },
  {
    id: 'finale',
    slug: 'finale',
    progressStart: 0.87,
    progressEnd: 1.0,
    cameraRange: [0.87, 1.0],
    copyKey: 'chapters.finale',
    lightingPreset: 'dusk',
    audioPreset: 'garden',
    hotspotIds: [],
    qualityHints: { preferredTier: 'high' },
  },
] as const;

export const STORY_RESOURCES: Record<ChapterId, { readonly zoneId: string; readonly posterKey: string }> = {
  exterior: { zoneId: 'exterior', posterKey: 'exterior' },
  approach: { zoneId: 'exterior', posterKey: 'approach' },
  entrance: { zoneId: 'entrance', posterKey: 'entrance' },
  living: { zoneId: 'living', posterKey: 'living' },
  garden: { zoneId: 'garden', posterKey: 'garden' },
  finale: { zoneId: 'garden', posterKey: 'finale' },
} as const;

export const PRESET_REGISTRIES = {
  lighting: ['golden', 'sunset', 'dusk'] as const,
  audio: ['outdoor', 'threshold', 'indoor', 'garden'] as const,
  zones: ['exterior', 'entrance', 'living', 'garden'] as const,
  posters: ['exterior', 'approach', 'entrance', 'living', 'garden', 'finale'] as const,
} as const;
