/**
 * HavenArt — Story Runtime Lifecycle & Discrete Store Unit Tests
 * Contract Version: havenart-contracts-1.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStoryRuntime } from '@/lib/story/runtime';
import { sampleRailDerivative } from '@/lib/three/cameraRail';
import { CHAPTERS } from '@/config/story';
import { DEFAULT_RUNTIME_LIMITS } from '@/lib/story/progress';
import { useExperienceStore } from '@/stores/experienceStore';

describe('StoryRuntime Lifecycle & Execution (W12-AC1, W12-AC2, W12-AC3)', () => {
  function setupRuntime(initialProgress = 0) {
    return createStoryRuntime({
      chapters: CHAPTERS,
      initialProgress,
      sampleRailDerivative,
      limits: DEFAULT_RUNTIME_LIMITS,
    });
  }

  it('initializes with correct snapshot', () => {
    const runtime = setupRuntime(0);
    const snapshot = runtime.getSnapshot();

    expect(snapshot.frameId).toBe(0);
    expect(snapshot.rawScrollProgress).toBe(0);
    expect(snapshot.renderedStoryProgress).toBe(0);
    expect(snapshot.chapterId).toBe('exterior');
    expect(snapshot.localProgress).toBe(0);
    expect(snapshot.direction).toBe(0);
    expect(snapshot.mode).toBe('cinematic');
  });

  it('separates raw scroll target from rendered story progress (W12-AC1)', () => {
    const runtime = setupRuntime(0);

    // User scrolls instantly to 0.5
    runtime.setScrollTarget(0.5);
    expect(runtime.getSnapshot().rawScrollProgress).toBe(0.5);
    expect(runtime.getSnapshot().renderedStoryProgress).toBe(0); // Not jumped yet

    // Tick one frame of 16ms (60fps)
    const snapshot = runtime.tick(0.016);
    expect(snapshot.rawScrollProgress).toBe(0.5);
    expect(snapshot.renderedStoryProgress).toBeGreaterThan(0);
    expect(snapshot.renderedStoryProgress).toBeLessThan(0.5);
  });

  it('notifies chapter subscribers ONLY on discrete chapter changes (W12-AC3)', () => {
    const runtime = setupRuntime(0);
    const chapterListener = vi.fn();
    const unsubscribe = runtime.subscribeChapter(chapterListener);

    // Multiple ticks within 'exterior' chapter ([0, 0.15))
    runtime.setScrollTarget(0.08);
    for (let i = 0; i < 5; i++) {
      runtime.tick(0.016);
    }
    expect(chapterListener).not.toHaveBeenCalled();

    // Scroll into 'approach' chapter ([0.15, 0.27))
    runtime.setScrollTarget(0.20);
    while (runtime.getSnapshot().chapterId !== 'approach') {
      runtime.tick(0.05);
    }
    expect(chapterListener).toHaveBeenCalledTimes(1);
    expect(chapterListener).toHaveBeenCalledWith(
      expect.objectContaining({ chapterId: 'approach' })
    );

    // Unsubscribe and verify no further callbacks
    unsubscribe();
    runtime.setScrollTarget(0.35);
    while (runtime.getSnapshot().chapterId !== 'entrance') {
      runtime.tick(0.05);
    }
    expect(chapterListener).toHaveBeenCalledTimes(1);
  });

  it('freezes and resumes properly when modal dialog opens/closes (W12-AC3)', () => {
    const runtime = setupRuntime(0.4);
    // Advance into living room
    runtime.setScrollTarget(0.45);
    for (let i = 0; i < 10; i++) {
      runtime.tick(0.016);
    }

    const beforeFreezeP = runtime.getSnapshot().renderedStoryProgress;
    const token = runtime.freeze(1200);

    expect(token.id).toBeGreaterThan(0);
    expect(token.rendered).toBe(beforeFreezeP);
    expect(token.scrollY).toBe(1200);

    // During freeze: tick does not advance rendered progress
    runtime.tick(0.05);
    runtime.tick(0.05);
    expect(runtime.getSnapshot().renderedStoryProgress).toBe(beforeFreezeP);

    // Resume with reason 'close': smoothly resumes from token.rendered
    runtime.resume(token, 'close');
    expect(runtime.getSnapshot().renderedStoryProgress).toBe(beforeFreezeP);

    // Ticking resumes progress advancement
    runtime.tick(0.016);
    expect(runtime.getSnapshot().renderedStoryProgress).toBeGreaterThan(beforeFreezeP);
  });

  it('restores chapter and local progress synchronously without jumping velocity', () => {
    const runtime = setupRuntime(0);
    runtime.restore('garden', 0.5);

    const snapshot = runtime.getSnapshot();
    expect(snapshot.chapterId).toBe('garden');
    expect(snapshot.localProgress).toBeCloseTo(0.5, 3);
    // garden spans [0.68, 0.87], mid is 0.775
    expect(snapshot.renderedStoryProgress).toBeCloseTo(0.775, 3);
  });
});

describe('Zustand ExperienceStore (W12-AC3)', () => {
  beforeEach(() => {
    useExperienceStore.getState().reset();
  });

  it('maintains discrete state without frame-rate polling', () => {
    const store = useExperienceStore.getState();
    expect(store.chapterId).toBe('exterior');
    expect(store.isModalOpen).toBe(false);
    expect(store.activeHotspotId).toBeNull();

    // Open hotspot
    store.openHotspot('travertine-wall');
    expect(useExperienceStore.getState().activeHotspotId).toBe('travertine-wall');
    expect(useExperienceStore.getState().isModalOpen).toBe(true);

    // Close hotspot
    useExperienceStore.getState().closeHotspot();
    expect(useExperienceStore.getState().activeHotspotId).toBeNull();
    expect(useExperienceStore.getState().isModalOpen).toBe(false);
  });

  it('updates discrete chapter and mode', () => {
    useExperienceStore.getState().setChapter('living', 0.25);
    expect(useExperienceStore.getState().chapterId).toBe('living');
    expect(useExperienceStore.getState().localProgress).toBe(0.25);

    useExperienceStore.getState().setMode('static', 'user');
    expect(useExperienceStore.getState().mode).toBe('static');
    expect(useExperienceStore.getState().staticReason).toBe('user');
  });
});
