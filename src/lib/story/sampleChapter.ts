/**
 * HavenArt — Story Chapter Sampler
 * Contract Version: havenart-contracts-1.1
 */

import type { StoryChapter } from '@/types/story';

/**
 * Pure deterministic chapter sampling from normalized story progress.
 * Intervals are half-open [progressStart, progressEnd), with the final chapter including 1.0.
 * Finite progress outside [0, 1] is clamped; non-finite values (NaN, Infinity) throw an Error.
 */
export function sampleChapter(chapters: readonly StoryChapter[], p: number): StoryChapter {
  if (!Array.isArray(chapters) || chapters.length === 0) {
    throw new Error('sampleChapter requires a non-empty array of StoryChapters');
  }

  if (!Number.isFinite(p)) {
    throw new Error(`sampleChapter received invalid non-finite progress: ${p}`);
  }

  // Clamp finite values into [0, 1]
  const clampedProgress = Math.max(0, Math.min(1, p));

  const lastIndex = chapters.length - 1;

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const isLast = i === lastIndex;

    // Half-open: [start, end), except last chapter which includes end (up to 1.0)
    if (isLast) {
      if (clampedProgress >= chapter.progressStart && clampedProgress <= chapter.progressEnd) {
        return chapter;
      }
    } else {
      if (clampedProgress >= chapter.progressStart && clampedProgress < chapter.progressEnd) {
        return chapter;
      }
    }
  }

  // Fallback to last chapter if clamped at 1.0
  return chapters[lastIndex];
}
