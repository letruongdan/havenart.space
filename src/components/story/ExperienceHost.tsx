'use client';

/**
 * HavenArt — Experience Host & Composition Root (Gate G2 Full Journey)
 * Contract Version: havenart-contracts-1.1
 * References: docs/CAMERA_SCROLL_SPEC.md, docs/SCENE_ARCHITECTURE.md, docs/AUDIO_SPEC.md, docs/HOTSPOT_SPEC.md
 *
 * Local Criteria (W25):
 * - W25-AC1: Mọi system dùng same rendered frame, no duplicate runtime/scene/audio/listeners.
 * - W25-AC2: G1 không regress; G2 full flow tới garden + contact, reverse, modal+locale.
 * - W25-AC3: Posters/OG từ scene gốc, ba sample audio thật và provenance đầy đủ trong ASSET_LICENSES.
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type {
  Locale,
  Dictionary,
  StoryChapter,
  Hotspot,
  HotspotId,
  ContactConfig,
  ExperienceMode,
} from '@/types/story';
import type { StoryRuntime } from '@/types/runtime';
import { createStoryRuntime } from '@/lib/story/runtime';
import { sampleRail, sampleRailDerivative } from '@/lib/three/cameraRail';
import { DEFAULT_RUNTIME_LIMITS } from '@/lib/story/progress';
import { CHAPTERS } from '@/config/story';
import { CONTACTS } from '@/config/contacts';
import { HOTSPOTS } from '@/config/hotspots';
import { CHAPTER_ZONE_MAP } from '@/config/zones';
import { isHotspotVisible } from '@/lib/story/hotspotVisibility';
import { projectPoseToScreen } from '@/hooks/useHotspotProjection';
import { createAudioController, type AudioController, type AudioState } from '@/lib/audio/audioController';
import { createFrameMonitor, type FrameMonitor } from '@/lib/performance/frameMonitor';
import { consumeLocaleHandoff } from '@/lib/i18n/navigationContext';
import { ExperienceGate } from '@/components/story/ExperienceGate';
import { ScrollRuntime } from '@/components/story/ScrollRuntime';
import { StoryOverlay } from '@/components/story/StoryOverlay';
import { StorySections } from '@/components/story/StorySections';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { HotspotButton } from '@/components/hotspots/HotspotButton';
import { HotspotPanel } from '@/components/hotspots/HotspotPanel';
import { useExperienceStore } from '@/stores/experienceStore';
import { setActiveStoryRuntime } from '@/components/scene/SceneCanvas';
import type { StaticReason } from '@/lib/performance/selectMode';

export interface ExperienceHostProps {
  readonly locale: Locale;
  readonly copy: Dictionary;
  readonly chapters?: readonly StoryChapter[];
  readonly hotspots?: readonly Hotspot[];
  readonly contacts?: ContactConfig;
  readonly initialUserStatic?: boolean;
}

export const ExperienceHost: React.FC<ExperienceHostProps> = ({
  locale,
  copy,
  chapters = CHAPTERS,
  hotspots = HOTSPOTS,
  contacts = CONTACTS,
  initialUserStatic = false,
}) => {
  const activeChapterId = useExperienceStore((state) => state.chapterId);
  const mode = useExperienceStore((state) => state.mode);

  // 1. Single StoryRuntime instance created once per composition root (W13, W25-AC1)
  const runtimeRef = useRef<StoryRuntime | null>(null);
  if (!runtimeRef.current) {
    runtimeRef.current = createStoryRuntime({
      chapters,
      initialProgress: 0,
      sampleRailDerivative,
      limits: DEFAULT_RUNTIME_LIMITS,
    });
  }
  const runtime = runtimeRef.current;

  // 2. Active hotspot state for APG modal panel (W17, W25)
  const [activeHotspotId, setActiveHotspotId] = useState<HotspotId | null>(null);

  // 3. Audio Controller State & Opt-in management (W20, W25-AC1)
  const [audioState, setAudioState] = useState<AudioState>('off');
  const audioControllerRef = useRef<AudioController | null>(null);

  // 4. Viewport size tracking for hotspot projection
  const [viewport, setViewport] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // 5. Track continuous rendered progress from runtime for synchronized hotspot projection
  const [renderedProgress, setRenderedProgress] = useState<number>(0);
  const [localProgress, setLocalProgress] = useState<number>(0);

  // Register active runtime with SceneCanvas and window for E2E verification
  useEffect(() => {
    setActiveStoryRuntime(runtime);
    if (typeof window !== 'undefined') {
      (window as unknown as { __havenart_runtime__?: StoryRuntime }).__havenart_runtime__ = runtime;
    }
    return () => {
      setActiveStoryRuntime(null);
      if (typeof window !== 'undefined') {
        delete (window as unknown as { __havenart_runtime__?: StoryRuntime }).__havenart_runtime__;
      }
      runtime.dispose();
    };
  }, [runtime]);

  // Viewport resize tracking
  useEffect(() => {
    const handleResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Subscribe to StoryRuntime snapshot updates to drive audio, hotspots, and progress
  useEffect(() => {
    let animationFrameId: number;

    const syncFrame = () => {
      const snap = runtime.getSnapshot();
      setRenderedProgress(snap.renderedStoryProgress);
      setLocalProgress(snap.localProgress);

      if (audioControllerRef.current) {
        audioControllerRef.current.setProgress(snap.renderedStoryProgress);
      }

      animationFrameId = requestAnimationFrame(syncFrame);
    };

    animationFrameId = requestAnimationFrame(syncFrame);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [runtime]);

  // Audio Controller Lifecycle (W20, W25-AC1)
  useEffect(() => {
    const controller = createAudioController({
      initialProgress: runtime.getSnapshot().renderedStoryProgress,
    });
    audioControllerRef.current = controller;

    const unsubscribeAudio = controller.subscribeState((newState) => {
      setAudioState(newState);
    });

    const handleVisibilityChange = () => {
      controller.setSuspended(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribeAudio();
      controller.dispose();
      audioControllerRef.current = null;
    };
  }, [runtime]);

  const handleToggleAudio = useCallback(async () => {
    if (audioControllerRef.current) {
      await audioControllerRef.current.toggle();
    }
  }, []);

  // Frame Timing Monitor & Quality Controller (W21, W25)
  const monitorRef = useRef<FrameMonitor | null>(null);
  useEffect(() => {
    const monitor = createFrameMonitor({
      initialTier: 'high',
      onTierChange: (newTier) => {
        runtime.setQualityTier(newTier);
      },
      onFallbackRequest: () => {
        runtime.setMode('static', 'performance');
      },
    });
    monitorRef.current = monitor;

    const handleResize = () => {
      monitor.notifyResize(performance.now());
    };
    const handleVisibility = () => {
      monitor.setSuspended(document.hidden, performance.now());
    };

    window.addEventListener('resize', handleResize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibility);

    let rafId: number;
    let lastTime = performance.now();
    const tickMonitor = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      monitor.recordFrame(now, dt);
      rafId = requestAnimationFrame(tickMonitor);
    };
    rafId = requestAnimationFrame(tickMonitor);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      monitor.dispose();
      monitorRef.current = null;
    };
  }, [runtime]);

  // Locale Handoff Restoration (W24, W25-AC2)
  useEffect(() => {
    const handoff = consumeLocaleHandoff(locale);
    if (handoff) {
      if (handoff.mode === 'static') {
        runtime.setMode('static', 'user');
      }
      if (handoff.targetAnchor === '#contact') {
        requestAnimationFrame(() => {
          document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
        });
      } else if (handoff.chapterId) {
        runtime.restore(handoff.chapterId, handoff.localProgress);
      }
    }
  }, [locale, runtime]);

  const handleModeChange = useCallback(
    (newMode: ExperienceMode, reason: StaticReason) => {
      runtime.setMode(newMode, reason);
    },
    [runtime]
  );

  // Compute 2D projected coordinates and visibility for active hotspots (W16, W17, W25)
  const projectedHotspots = useMemo(() => {
    if (mode !== 'cinematic' || viewport.width <= 0 || viewport.height <= 0) {
      return [];
    }

    const pose = sampleRail(renderedProgress);
    const activeRoom = activeChapterId ? CHAPTER_ZONE_MAP[activeChapterId] : 'exterior';

    return hotspots.map((hotspot) => {
      const { screenX, screenY, inFrustum, distanceM } = projectPoseToScreen(
        hotspot.position,
        pose,
        viewport.width,
        viewport.height
      );

      const inActivationRange =
        localProgress >= hotspot.activationRange[0] &&
        localProgress <= hotspot.activationRange[1];

      const visible = isHotspotVisible({
        activeRoom,
        room: hotspot.room,
        distanceM,
        maxDistanceM: hotspot.maxDistanceM,
        inFrustum,
        occluded: false,
        inActivationRange,
      });

      return {
        hotspot,
        screenX,
        screenY,
        visible,
      };
    });
  }, [mode, viewport.width, viewport.height, renderedProgress, activeChapterId, localProgress, hotspots]);

  // Active hotspot copy for panel
  const activeHotspotCopy = activeHotspotId ? copy.hotspots[activeHotspotId] : null;

  return (
    <ExperienceGate
      locale={locale}
      copy={copy}
      chapters={chapters}
      contacts={contacts}
      initialUserStatic={initialUserStatic}
      onModeChange={handleModeChange}
    >
      <ScrollRuntime runtime={runtime}>
        <div className="experience-host-wrapper min-h-screen flex flex-col justify-between">
          {/* Top Brand Header with Integrated LanguageSwitcher & Audio Controls (W07, W20, W24, W25) */}
          <BrandHeader
            locale={locale}
            copy={copy}
            activeChapterId={activeChapterId}
            currentLocalProgress={localProgress}
            currentMode={mode}
            isAudioActive={audioState === 'playing' || audioState === 'loading'}
            onToggleAudio={handleToggleAudio}
            onBeforeLanguageChange={() => {
              if (activeHotspotId) {
                setActiveHotspotId(null);
              }
            }}
          />

          {/* Primary Semantic Story Document (Single unique #contact owned here) */}
          <main id="main-content" tabIndex={-1} className="focus:outline-none flex-1">
            <StorySections
              chapters={chapters}
              copy={copy}
              contacts={contacts}
            />
          </main>

          {/* Floating Reactive 3D Story Overlay (cinematic mode only) */}
          {mode === 'cinematic' && (
            <StoryOverlay
              locale={locale}
              activeChapterId={activeChapterId}
              copy={copy}
            />
          )}

          {/* 3D Interactive Hotspot Markers Layer (W17, W25) */}
          {mode === 'cinematic' && (
            <div className="hotspot-markers-overlay fixed inset-0 pointer-events-none z-30" aria-hidden="true">
              {projectedHotspots.map(({ hotspot, screenX, screenY, visible }) => {
                const itemCopy = copy.hotspots[hotspot.id];
                if (!itemCopy) return null;

                return (
                  <HotspotButton
                    key={hotspot.id}
                    id={hotspot.id}
                    screenX={screenX}
                    screenY={screenY}
                    visible={visible}
                    title={itemCopy.title}
                    triggerLabel={itemCopy.triggerLabel}
                    categoryLabel={itemCopy.categoryLabel}
                    isOpen={activeHotspotId === hotspot.id}
                    onClick={() => setActiveHotspotId(hotspot.id)}
                  />
                );
              })}
            </div>
          )}

          {/* Accessible Architectural Detail Modal Panel (APG Dialog, W17, W25) */}
          <HotspotPanel
            isOpen={activeHotspotId !== null}
            hotspotId={activeHotspotId}
            copy={activeHotspotCopy}
            onClose={() => setActiveHotspotId(null)}
            onContactCta={() => {
              setActiveHotspotId(null);
              document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
            }}
            closeLabel={copy.controls.closeDetails}
            contactCtaLabel={copy.contact.cta}
            runtime={runtime}
          />

          {/* Document Footer */}
          <footer className="py-12 px-6 border-t border-stone-200 bg-stone-100 text-center text-xs text-stone-500">
            <div className="max-w-4xl mx-auto space-y-2">
              <p>
                © 2026 {copy.brand.name}. {copy.brand.tagline}
              </p>
              <p className="font-light">{copy.brand.conceptLabel}</p>
            </div>
          </footer>
        </div>
      </ScrollRuntime>
    </ExperienceGate>
  );
};

export default ExperienceHost;
