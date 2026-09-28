/**
 * HavenArt — Discrete Experience Store
 * Contract Version: havenart-contracts-1.1
 * References: docs/CAMERA_SCROLL_SPEC.md, docs/HOTSPOT_SPEC.md
 *
 * Local Criteria (W12):
 * - W12-AC3: Store CHỈ lưu trữ trạng thái rời rạc (discrete state), KHÔNG chứa
 *            dữ liệu tần suất cao theo từng frame (renderedStoryProgress, frameId)
 *            để tránh kích hoạt re-render toàn bộ cây component mỗi frame.
 */

import { create } from 'zustand';
import type { ChapterId, HotspotId, ExperienceMode, QualityTier } from '@/types/story';
import type { StorySnapshot } from '@/types/runtime';

export interface ExperienceState {
  readonly chapterId: ChapterId;
  readonly localProgress: number;
  readonly mode: ExperienceMode;
  readonly staticReason: StorySnapshot['staticReason'];
  readonly qualityTier: QualityTier;
  readonly activeHotspotId: HotspotId | null;
  readonly isModalOpen: boolean;
  readonly isAudioEnabled: boolean;

  setChapter(chapterId: ChapterId, localProgress?: number): void;
  setMode(mode: ExperienceMode, reason?: StorySnapshot['staticReason']): void;
  setQualityTier(tier: QualityTier): void;
  openHotspot(id: HotspotId): void;
  closeHotspot(): void;
  toggleAudio(enabled?: boolean): void;
  reset(): void;
}

const initialState = {
  chapterId: 'exterior' as ChapterId,
  localProgress: 0,
  mode: 'cinematic' as ExperienceMode,
  staticReason: null as StorySnapshot['staticReason'],
  qualityTier: 'high' as QualityTier,
  activeHotspotId: null as HotspotId | null,
  isModalOpen: false,
  isAudioEnabled: false,
};

export const useExperienceStore = create<ExperienceState>((set) => ({
  ...initialState,

  setChapter: (chapterId, localProgress = 0) =>
    set({ chapterId, localProgress }),

  setMode: (mode, reason = null) =>
    set({ mode, staticReason: reason }),

  setQualityTier: (qualityTier) =>
    set({ qualityTier }),

  openHotspot: (id) =>
    set({ activeHotspotId: id, isModalOpen: true }),

  closeHotspot: () =>
    set({ activeHotspotId: null, isModalOpen: false }),

  toggleAudio: (enabled) =>
    set((state) => ({
      isAudioEnabled: typeof enabled === 'boolean' ? enabled : !state.isAudioEnabled,
    })),

  reset: () => set(initialState),
}));
