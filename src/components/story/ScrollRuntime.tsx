'use client';

/**
 * HavenArt — Scroll Coordinator & rAF Loop Component
 * Contract Version: havenart-contracts-1.1
 * References: docs/CAMERA_SCROLL_SPEC.md, docs/SCENE_ARCHITECTURE.md
 *
 * Local Criteria (W12):
 * - W12-AC1: Native raw target từ scroll tách biệt với renderedStoryProgress.
 * - W12-AC2: rAF loop tính delta time có giới hạn, tránh dt jump khi tab background.
 * - W12-AC3: Dọn dẹp triệt để event listener và animation frame khi unmount.
 */

import React, { useEffect, useRef } from 'react';
import type { StoryRuntime, StorySnapshot } from '@/types/runtime';
import { useStoryRuntime } from '@/hooks/useStoryRuntime';
import { clampProgress } from '@/lib/story/progress';

export interface ScrollRuntimeProps {
  readonly runtime: StoryRuntime;
  readonly onSnapshot?: (snapshot: Readonly<StorySnapshot>) => void;
  readonly children?: React.ReactNode;
}

export const ScrollRuntime: React.FC<ScrollRuntimeProps> = ({
  runtime,
  onSnapshot,
  children,
}) => {
  // Sync discrete chapter changes to experience store
  useStoryRuntime(runtime);

  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const isHiddenRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Calculate raw progress from window scroll position
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      const rawP = clampProgress(scrollY / maxScroll);
      runtime.setScrollTarget(rawP);
    };

    // 2. Visibility change handling: freeze dt when tab is hidden (W12-AC2)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        isHiddenRef.current = true;
        lastTimeRef.current = null;
      } else {
        isHiddenRef.current = false;
        lastTimeRef.current = performance.now();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial scroll measurement
    handleScroll();

    // 3. Single requestAnimationFrame loop owned by coordinator (W12-AC1, W12-AC2)
    const loop = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }

      const rawDt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (!isHiddenRef.current) {
        const snapshot = runtime.tick(rawDt);
        onSnapshot?.(snapshot);
      }

      rafIdRef.current = requestAnimationFrame(loop);
    };

    rafIdRef.current = requestAnimationFrame(loop);

    // 4. Clean cleanup to prevent duplicated listeners or lingering rAF (W12-AC3)
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [runtime, onSnapshot]);

  return <>{children}</>;
};

export default ScrollRuntime;
