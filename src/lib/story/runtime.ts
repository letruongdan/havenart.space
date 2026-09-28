/**
 * HavenArt — Story Progress Runtime & Coordination
 * Contract Version: havenart-contracts-1.1
 * References: docs/CAMERA_SCROLL_SPEC.md, docs/SCENE_ARCHITECTURE.md, docs/HOTSPOT_SPEC.md
 *
 * Local Criteria (W12):
 * - W12-AC1: Native raw target tách bạch với renderedStoryProgress; camera/light/hotspot
 *            dùng chung rendered frame snapshot.
 * - W12-AC2: Vận tốc thế giới và góc bị giới hạn, đảo hướng có gia tốc hữu hạn,
 *            tab ẩn không bị dt jump.
 * - W12-AC3: Modal freeze/resume/restore chuẩn xác, không re-render store mỗi frame.
 */

import type {
  StorySnapshot,
  FreezeToken,
  StoryRuntime,
  StoryRuntimeDeps,
} from '@/types/runtime';
import type { ChapterId, ExperienceMode, QualityTier } from '@/types/story';
import { sampleChapter } from './sampleChapter';
import {
  clampProgress,
  calculateMaxProgressVelocity,
  advanceProgress,
  localProgressToGlobal,
  progressToLocalProgress,
} from './progress';

export function createStoryRuntime(deps: StoryRuntimeDeps): StoryRuntime {
  let frameId = 0;
  let rawScrollProgress = clampProgress(deps.initialProgress);
  let renderedStoryProgress = clampProgress(deps.initialProgress);
  let velocity = 0;
  let direction: -1 | 0 | 1 = 0;
  let isFrozen = false;
  let nextTokenId = 1;

  let mode: ExperienceMode = 'cinematic';
  let staticReason: StorySnapshot['staticReason'] = null;
  let qualityTier: QualityTier = 'high';

  const initialChapter = sampleChapter(deps.chapters, renderedStoryProgress);
  let currentChapterId: ChapterId = initialChapter.id;
  let currentLocalProgress: number = progressToLocalProgress(
    renderedStoryProgress,
    initialChapter
  );

  const chapterListeners = new Set<(snapshot: Readonly<StorySnapshot>) => void>();

  function buildSnapshot(): Readonly<StorySnapshot> {
    return {
      frameId,
      rawScrollProgress,
      renderedStoryProgress,
      chapterId: currentChapterId,
      localProgress: currentLocalProgress,
      direction,
      mode,
      staticReason,
      qualityTier,
    };
  }

  let currentSnapshot: Readonly<StorySnapshot> = buildSnapshot();

  return {
    getSnapshot(): Readonly<StorySnapshot> {
      return currentSnapshot;
    },

    setScrollTarget(p: number): void {
      if (isFrozen) return;
      rawScrollProgress = clampProgress(p);
      currentSnapshot = buildSnapshot();
    },

    tick(dtSeconds: number): Readonly<StorySnapshot> {
      frameId++;

      // If frozen (e.g. modal open), do not advance progress and keep velocity at zero (W12-AC3)
      if (isFrozen) {
        currentSnapshot = buildSnapshot();
        return currentSnapshot;
      }

      // Sample spatial derivative at current rendered position
      const derivative = deps.sampleRailDerivative(renderedStoryProgress);
      const maxVelocity = calculateMaxProgressVelocity(
        renderedStoryProgress,
        derivative,
        deps.limits
      );

      // Convert maxAccelerationMps2 to progress units: acceleration / metersPerProgress
      const metersPerP = Math.max(derivative.metersPerProgress, 1e-4);
      const maxAccelP = Math.max(deps.limits.maxAccelerationMps2 / metersPerP, 0.5);

      // Advance progress smoothly with acceleration limits and dt clamping (W12-AC2)
      const step = advanceProgress(
        renderedStoryProgress,
        rawScrollProgress,
        velocity,
        dtSeconds,
        maxVelocity,
        maxAccelP,
        deps.limits.maxDtSeconds
      );

      renderedStoryProgress = step.nextProgress;
      velocity = step.nextVelocity;
      direction = step.direction;

      // Sample active chapter using pure chapter sampler
      const currentChapter = sampleChapter(deps.chapters, renderedStoryProgress);
      const previousChapterId = currentChapterId;
      currentChapterId = currentChapter.id;
      currentLocalProgress = progressToLocalProgress(renderedStoryProgress, currentChapter);

      currentSnapshot = buildSnapshot();

      // Only notify chapter subscribers when chapter ID actually changes (discrete state update, W12-AC3)
      if (currentChapterId !== previousChapterId) {
        for (const listener of chapterListeners) {
          listener(currentSnapshot);
        }
      }

      return currentSnapshot;
    },

    freeze(scrollY: number): FreezeToken {
      const token: FreezeToken = {
        id: nextTokenId++,
        raw: rawScrollProgress,
        rendered: renderedStoryProgress,
        scrollY,
      };
      isFrozen = true;
      velocity = 0;
      currentSnapshot = buildSnapshot();
      return token;
    },

    resume(token: FreezeToken, reason: 'close' | 'navigate'): void {
      isFrozen = false;
      velocity = 0;

      if (reason === 'close') {
        // Restore saved raw target and smoothly resume from frozen rendered position (W12-AC3)
        rawScrollProgress = token.raw;
        renderedStoryProgress = token.rendered;
      }
      // If reason is 'navigate', do not revert rawScrollProgress; user has navigated to another target.

      const currentChapter = sampleChapter(deps.chapters, renderedStoryProgress);
      currentChapterId = currentChapter.id;
      currentLocalProgress = progressToLocalProgress(renderedStoryProgress, currentChapter);
      currentSnapshot = buildSnapshot();
    },

    restore(chapterId: ChapterId, localProgress: number): void {
      const chapter = deps.chapters.find((c) => c.id === chapterId);
      if (!chapter) return;

      const globalP = localProgressToGlobal(localProgress, chapter);
      rawScrollProgress = globalP;
      renderedStoryProgress = globalP;
      velocity = 0;
      direction = 0;

      currentChapterId = chapterId;
      currentLocalProgress = clampProgress(localProgress);
      currentSnapshot = buildSnapshot();

      for (const listener of chapterListeners) {
        listener(currentSnapshot);
      }
    },

    subscribeChapter(listener: (snapshot: Readonly<StorySnapshot>) => void): () => void {
      chapterListeners.add(listener);
      return () => {
        chapterListeners.delete(listener);
      };
    },

    setMode(newMode: ExperienceMode, reason: StorySnapshot['staticReason']): void {
      mode = newMode;
      staticReason = reason;
      currentSnapshot = buildSnapshot();
    },

    setQualityTier(tier: QualityTier): void {
      qualityTier = tier;
      currentSnapshot = buildSnapshot();
    },

    dispose(): void {
      chapterListeners.clear();
      isFrozen = false;
    },
  };
}
