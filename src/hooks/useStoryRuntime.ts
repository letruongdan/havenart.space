'use client';

/**
 * HavenArt — Story Runtime React Binding Hook
 * Contract Version: havenart-contracts-1.1
 * References: docs/CAMERA_SCROLL_SPEC.md
 *
 * Local Criteria (W12):
 * - W12-AC3: Kết nối runtime với discrete experience store, tự động dọn dẹp subscription
 *            khi unmount, không tạo rò rỉ listener.
 */

import { useEffect } from 'react';
import type { StoryRuntime } from '@/types/runtime';
import { useExperienceStore } from '@/stores/experienceStore';

/**
 * Binds a StoryRuntime instance to the discrete experience store.
 * Automatically synchronizes chapter transitions and cleans up listeners upon unmount.
 */
export function useStoryRuntime(runtime: StoryRuntime | null): void {
  const setChapter = useExperienceStore((state) => state.setChapter);
  const setMode = useExperienceStore((state) => state.setMode);
  const setQualityTier = useExperienceStore((state) => state.setQualityTier);

  useEffect(() => {
    if (!runtime) return;

    // Sync initial discrete state
    const initialSnapshot = runtime.getSnapshot();
    setChapter(initialSnapshot.chapterId, initialSnapshot.localProgress);
    setMode(initialSnapshot.mode, initialSnapshot.staticReason);
    setQualityTier(initialSnapshot.qualityTier);

    // Subscribe ONLY to discrete chapter change events (W12-AC3)
    const unsubscribe = runtime.subscribeChapter((snapshot) => {
      setChapter(snapshot.chapterId, snapshot.localProgress);
    });

    return () => {
      unsubscribe();
    };
  }, [runtime, setChapter, setMode, setQualityTier]);
}

export default useStoryRuntime;
