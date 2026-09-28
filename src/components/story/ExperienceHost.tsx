'use client';

/**
 * HavenArt — Experience Host & Composition Root (Gate G1)
 * Contract Version: havenart-contracts-1.1
 * References: docs/CAMERA_SCROLL_SPEC.md, docs/SCENE_ARCHITECTURE.md
 *
 * Local Criteria (W13):
 * - W13-AC1: Một canvas/runtime, CSS/DOM slots đúng, route chỉ một #contact.
 * - W13-AC2: Scroll tới/lùi/Home/End không cut; fallback đầu phiên không tải renderer.
 * - W13-AC3: validateStory kiểm cấu trúc và references tới ID đã khai báo của W02.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import type {
  Locale,
  Dictionary,
  StoryChapter,
  Hotspot,
  ContactConfig,
  ExperienceMode,
} from '@/types/story';
import type { StoryRuntime } from '@/types/runtime';
import { createStoryRuntime } from '@/lib/story/runtime';
import { sampleRailDerivative } from '@/lib/three/cameraRail';
import { DEFAULT_RUNTIME_LIMITS } from '@/lib/story/progress';
import { CHAPTERS } from '@/config/story';
import { CONTACTS } from '@/config/contacts';
import { HOTSPOTS } from '@/config/hotspots';
import { ExperienceGate } from '@/components/story/ExperienceGate';
import { ScrollRuntime } from '@/components/story/ScrollRuntime';
import { StoryOverlay } from '@/components/story/StoryOverlay';
import { StorySections } from '@/components/story/StorySections';
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
  hotspots: _hotspots = HOTSPOTS,
  contacts = CONTACTS,
  initialUserStatic = false,
}) => {
  const activeChapterId = useExperienceStore((state) => state.chapterId);
  const mode = useExperienceStore((state) => state.mode);

  // Single StoryRuntime instance created once per composition root (W13-AC1)
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

  const handleModeChange = useCallback(
    (newMode: ExperienceMode, reason: StaticReason) => {
      runtime.setMode(newMode, reason);
    },
    [runtime]
  );

  const altLocale: Locale = locale === 'vi' ? 'en' : 'vi';
  const altLocaleLabel = locale === 'vi' ? 'English' : 'Tiếng Việt';
  const activeChapterTitle = activeChapterId ? copy.chapters[activeChapterId]?.title : null;

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
          {/* Top Utility Navigation & Locale Switcher */}
          <nav
            aria-label={copy.navigation.languageLabel}
            className="w-full border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-md sticky top-0 z-40"
          >
            <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link
                  href={`/${locale}`}
                  className="font-serif font-bold text-lg text-stone-900 tracking-tight hover:opacity-80 transition-opacity"
                >
                  {copy.brand.name}
                </Link>

                {activeChapterId && mode === 'cinematic' && (
                  <div className="hidden sm:flex items-center space-x-2 text-xs text-stone-500 border-l border-stone-300 pl-3">
                    <span className="font-mono uppercase tracking-wider text-stone-400">
                      {activeChapterId}
                    </span>
                    <span className="text-stone-300">/</span>
                    <span className="truncate max-w-[160px] text-stone-700 font-medium">
                      {activeChapterTitle}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-6 text-sm">
                <a
                  href="#contact"
                  className="text-stone-600 hover:text-stone-900 font-medium transition-colors"
                >
                  {copy.contact.title}
                </a>
                <span className="text-stone-300 select-none">|</span>
                <Link
                  href={`/${altLocale}`}
                  hrefLang={altLocale}
                  className="font-medium text-stone-800 hover:text-stone-950 underline underline-offset-4 transition-colors"
                >
                  {altLocaleLabel}
                </Link>
              </div>
            </div>
          </nav>

          {/* Primary Semantic Story Document */}
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
