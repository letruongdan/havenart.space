'use client';

/**
 * HavenArt — Experience Mode Gate & Dynamic Import Boundary
 * Contract Version: havenart-contracts-1.1
 * References: docs/ACCESSIBILITY_SPEC.md, docs/SCENE_ARCHITECTURE.md
 *
 * Local Criteria (W11):
 * - W11-AC1: prefers-reduced-motion và userStatic được kiểm tra trước khi import Three/R3F; SSR vẫn đủ HTML.
 * - W11-AC2: Core/context failure chuyển về static mode; late-load khi đã cuộn xa giữ static mode.
 * - W11-AC3: Poster/loading không che CTA; renderer shutdown không tắt nội dung DOM.
 */

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { Locale, Dictionary, StoryChapter, ContactConfig, ExperienceMode } from '@/types/story';
import {
  selectMode,
  detectReducedMotion,
  detectWebGlSupport,
  isScrolledFar,
  type StaticReason,
} from '@/lib/performance/selectMode';

// Dynamic import for SceneCanvas: ssr is false, ONLY imported when 3D is active
const DynamicSceneCanvas = dynamic(
  () => import('@/components/scene/SceneCanvas').then((mod) => mod.SceneCanvas),
  {
    ssr: false,
    loading: () => null,
  }
);

export interface ExperienceGateProps {
  readonly locale: Locale;
  readonly copy: Dictionary;
  readonly chapters?: readonly StoryChapter[];
  readonly contacts?: ContactConfig;
  readonly initialUserStatic?: boolean;
  readonly onModeChange?: (mode: ExperienceMode, reason: StaticReason) => void;
  readonly children?: React.ReactNode;
}

export const ExperienceGate: React.FC<ExperienceGateProps> = ({
  copy,
  initialUserStatic = false,
  onModeChange,
  children,
}) => {
  // Start with SSR-safe static mode until client environment is detected
  const [isClient, setIsClient] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [userRequestedStatic, setUserRequestedStatic] = useState(initialUserStatic);
  const [webglSupported, setWebglSupported] = useState(false);
  const [hasContextLost, setHasContextLost] = useState(false);
  const [hasCoreLoadError, setHasCoreLoadError] = useState(false);
  const [hasScrolledFarBeforeReady, setHasScrolledFarBeforeReady] = useState(false);
  const [is3DReady, setIs3DReady] = useState(false);

  // Initial client capability detection
  useEffect(() => {
    setIsClient(true);
    const reducedMotion = detectReducedMotion();
    const hasWebgl = detectWebGlSupport();

    setPrefersReducedMotion(reducedMotion);
    setWebglSupported(hasWebgl);

    // Watch prefers-reduced-motion media query dynamically
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handleMotionChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };
      mediaQuery.addEventListener('change', handleMotionChange);
      return () => {
        mediaQuery.removeEventListener('change', handleMotionChange);
      };
    }
  }, []);

  // Late-load scroll listener: if user scrolls far before 3D is ready, stay in static mode
  useEffect(() => {
    if (!isClient || is3DReady || userRequestedStatic || prefersReducedMotion) return;

    const handleScroll = () => {
      if (isScrolledFar(window.scrollY)) {
        setHasScrolledFarBeforeReady(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial position on mount
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isClient, is3DReady, userRequestedStatic, prefersReducedMotion]);

  // Compute active mode using pure logic
  const modeResult = selectMode({
    prefersReducedMotion,
    userRequestedStatic,
    webglSupported: isClient ? webglSupported : false,
    hasContextLost,
    hasCoreLoadError,
    hasScrolledFarBeforeReady,
    isReady: is3DReady,
  });

  const { mode, staticReason } = modeResult;

  // Notify parent of mode transitions
  useEffect(() => {
    onModeChange?.(mode, staticReason);
  }, [mode, staticReason, onModeChange]);

  // WebGL context lost callback
  const handleContextLost = useCallback(() => {
    setHasContextLost(true);
  }, []);

  // Core failure callback
  const handleCoreFailure = useCallback((_error: Error) => {
    setHasCoreLoadError(true);
  }, []);

  const handle3DReady = useCallback(() => {
    setIs3DReady(true);
  }, []);

  // Handler for user toggle to static mode
  const handleToggleStaticMode = useCallback(() => {
    setUserRequestedStatic(true);
  }, []);

  // Check if 3D should be loaded: only when on client, supported, not reduced motion, and not user static
  const shouldRenderCanvas =
    isClient &&
    webglSupported &&
    !prefersReducedMotion &&
    !userRequestedStatic &&
    !hasContextLost &&
    !hasCoreLoadError &&
    (!hasScrolledFarBeforeReady || is3DReady);

  return (
    <div className="experience-gate-root relative w-full min-h-screen" data-experience-mode={mode}>
      {/* 3D Canvas Layer: strictly unmounted in static mode (W11-AC1, W11-AC3) */}
      {shouldRenderCanvas && (
        <div
          className="canvas-viewport fixed inset-0 pointer-events-none z-0"
          aria-hidden="true"
        >
          <DynamicSceneCanvas
            tier="high"
            onContextLost={handleContextLost}
            onCoreFailure={handleCoreFailure}
            onSceneReady={handle3DReady}
          />
        </div>
      )}

      {/* Accessible Control: Switch to static mode button (ACCESSIBILITY_SPEC §2) */}
      {mode !== 'static' && (
        <div className="static-mode-control fixed bottom-4 right-4 z-40">
          <button
            type="button"
            onClick={handleToggleStaticMode}
            className="px-3 py-1.5 text-xs bg-black/60 hover:bg-black/80 text-white/90 rounded-md backdrop-blur border border-white/20 transition-colors focus:ring-2 focus:ring-amber-500 focus:outline-none min-h-[44px] min-w-[44px]"
            aria-label={copy.controls.staticMode}
          >
            {copy.controls.staticMode}
          </button>
        </div>
      )}

      {/* Primary DOM Content: 100% preserved and readable at all times (W11-AC1, W11-AC3) */}
      <div className="experience-content-layer relative z-10">
        {children}
      </div>
    </div>
  );
};

export default ExperienceGate;
