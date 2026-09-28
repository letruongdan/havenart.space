/**
 * HavenArt — Analytics Bridge Hook
 * Contract Version: havenart-contracts-1.1
 * References: docs/ANALYTICS_SPEC.md, docs/CONTRACTS.md (C10)
 *
 * Local Criteria (W28):
 * - W28-AC1: Không duplicate event bởi StrictMode/listener bubbling/locale; started/completed per document.
 * - W28-AC2: No PII/network/default storage analytics; navigation không đợi sink.
 * - W28-AC3: HTML source vi/en metadata, sitemap/robots và OG thật đúng môi trường.
 */

import { useRef, useEffect, useCallback, useMemo } from 'react';
import type { Locale, ChapterId, HotspotId, HotspotCategory, ExperienceMode } from '@/types/story';
import type {
  AnalyticsEvent,
  AnalyticsEventName,
  AnalyticsEventPayloads,
  AnalyticsMode,
  CtaPlacement,
  CtaTarget,
} from '@/types/telemetry';
import {
  createAnalyticsTracker,
  createChapterDwellTracker,
  createExperienceLifecycleTracker,
  createCtaCoordinator,
} from '@/lib/analytics/events';
import { HOTSPOTS } from '@/config/hotspots';
import type { StaticReason } from '@/lib/performance/selectMode';

export interface UseAnalyticsBridgeOptions {
  readonly locale: Locale;
  readonly mode: ExperienceMode;
  readonly staticReason?: StaticReason | null;
  readonly activeChapterId: ChapterId | null;
  readonly renderedProgress: number;
  readonly isAudioActive?: boolean;
  readonly activeHotspotId?: HotspotId | null;
  readonly sink?: (event: AnalyticsEvent) => void;
  readonly isDev?: boolean;
}

export interface AnalyticsBridgeReturn {
  emit: <K extends AnalyticsEventName>(
    name: K,
    payload: AnalyticsEventPayloads[K]
  ) => boolean;
  trackStart: (trigger: 'scroll' | 'chapter-nav' | 'hotspot') => void;
  trackChapter: (chapterId: ChapterId, isVisible: boolean) => void;
  trackHotspot: (hotspotId: HotspotId, category?: HotspotCategory) => void;
  trackLanguageChange: (fromLocale: Locale, toLocale: Locale) => void;
  trackAudioEnabled: () => void;
  handleCtaClick: (placement: CtaPlacement, target: CtaTarget) => boolean;
  updateCompletionProgress: (renderedProgress: number, ctaRatioVisible: number) => void;
  getDevBuffer: () => AnalyticsEvent[];
  clearDevBuffer: () => void;
}

// Module-level document lifecycle guards to strictly ensure at most 1 started/completed per document
let documentStartedEmitted = false;
let documentCompletedEmitted = false;

/**
 * Resets document-level guards (primarily for testing and full document reload verification)
 */
export function resetDocumentLifecycleGuards(): void {
  documentStartedEmitted = false;
  documentCompletedEmitted = false;
}

/**
 * Maps runtime experience mode and static reason to analytics reporting taxonomy (C10).
 */
export function toAnalyticsMode(
  mode: ExperienceMode,
  staticReason?: StaticReason | null
): AnalyticsMode {
  if (mode === 'cinematic') {
    return 'cinematic';
  }
  if (staticReason === 'reduced-motion') {
    return 'reduced-motion';
  }
  return 'fallback';
}

export function useAnalyticsBridge(options: UseAnalyticsBridgeOptions): AnalyticsBridgeReturn {
  const {
    locale,
    mode,
    staticReason,
    activeChapterId,
    renderedProgress,
    isAudioActive = false,
    activeHotspotId = null,
    sink,
  } = options;

  const isDevMode =
    options.isDev ??
    (process.env.NODE_ENV !== 'production' ||
      (typeof window !== 'undefined' &&
        (Boolean((window as unknown as { __HAVENART_DEV_ANALYTICS__?: boolean }).__HAVENART_DEV_ANALYTICS__) ||
          window.location.search.includes('debug='))));

  const currentAnalyticsMode = useMemo(
    () => toAnalyticsMode(mode, staticReason),
    [mode, staticReason]
  );

  // 1. Analytics Event Bus (Single instance per mount, bounded buffer in dev, default no-op)
  const trackerRef = useRef<ReturnType<typeof createAnalyticsTracker> | null>(null);
  if (!trackerRef.current) {
    trackerRef.current = createAnalyticsTracker({
      isDev: isDevMode,
      sink,
    });
  }
  const tracker = trackerRef.current;

  // Refs to capture latest context values without recreating callback handlers
  const contextRef = useRef({
    locale,
    mode: currentAnalyticsMode,
    chapterId: activeChapterId,
  });

  useEffect(() => {
    contextRef.current = {
      locale,
      mode: currentAnalyticsMode,
      chapterId: activeChapterId,
    };
  }, [locale, currentAnalyticsMode, activeChapterId]);

  // Safe wrapper around tracker.emit with up-to-date context
  const emit = useCallback(
    <K extends AnalyticsEventName>(
      name: K,
      payload: AnalyticsEventPayloads[K]
    ): boolean => {
      return tracker.emit(name, payload, contextRef.current);
    },
    [tracker]
  );

  // 2. Dwell Tracker for Chapter Transitions (>= 300ms stability while document is visible)
  const dwellTrackerRef = useRef<ReturnType<typeof createChapterDwellTracker> | null>(null);
  if (!dwellTrackerRef.current) {
    dwellTrackerRef.current = createChapterDwellTracker({
      dwellMs: 300,
      onEnter: ({ previousChapterId, direction, entryIndex }) => {
        emit('chapter_entered', {
          previousChapterId,
          direction,
          entryIndex,
        });
      },
    });
  }
  const dwellTracker = dwellTrackerRef.current;

  // 3. Document Lifecycle Tracker (started / completed)
  const lifecycleTrackerRef = useRef<ReturnType<typeof createExperienceLifecycleTracker> | null>(null);
  if (!lifecycleTrackerRef.current) {
    lifecycleTrackerRef.current = createExperienceLifecycleTracker({
      ctaDwellMs: 1000,
      onStart: (trigger) => {
        if (!documentStartedEmitted) {
          documentStartedEmitted = true;
          emit('experience_started', { trigger });
        }
      },
      onComplete: () => {
        if (documentStartedEmitted && !documentCompletedEmitted) {
          documentCompletedEmitted = true;
          emit('experience_completed', {});
        }
      },
    });
  }
  const lifecycleTracker = lifecycleTrackerRef.current;

  // 4. CTA & Channel Click Coordinator (eliminates bubbling duplicates within 300ms)
  const ctaCoordinatorRef = useRef<ReturnType<typeof createCtaCoordinator> | null>(null);
  if (!ctaCoordinatorRef.current) {
    ctaCoordinatorRef.current = createCtaCoordinator(
      ({ placement, target }) => {
        emit('cta_clicked', { placement, target });
      },
      (channel, placement) => {
        if (channel === 'zalo') {
          emit('zalo_clicked', { placement });
        } else if (channel === 'messenger') {
          emit('messenger_clicked', { placement });
        } else if (channel === 'whatsapp') {
          emit('whatsapp_clicked', { placement });
        }
      },
      { dedupeWindowMs: 300 }
    );
  }
  const ctaCoordinator = ctaCoordinatorRef.current;

  // Exposed helper methods
  const trackStart = useCallback(
    (trigger: 'scroll' | 'chapter-nav' | 'hotspot') => {
      lifecycleTracker.triggerStart(trigger);
    },
    [lifecycleTracker]
  );

  const trackChapter = useCallback(
    (chapterId: ChapterId, isVisible: boolean) => {
      dwellTracker.update(chapterId, isVisible);
    },
    [dwellTracker]
  );

  const trackHotspot = useCallback(
    (hotspotId: HotspotId, category?: HotspotCategory) => {
      const resolvedCategory =
        category ?? HOTSPOTS.find((h) => h.id === hotspotId)?.category ?? 'architecture';
      emit('hotspot_opened', {
        hotspotId,
        category: resolvedCategory,
      });
      trackStart('hotspot');
    },
    [emit, trackStart]
  );

  const trackLanguageChange = useCallback(
    (fromLocale: Locale, toLocale: Locale) => {
      if (fromLocale !== toLocale) {
        emit('language_changed', { fromLocale, toLocale });
      }
    },
    [emit]
  );

  const trackAudioEnabled = useCallback(() => {
    emit('audio_enabled', {});
  }, [emit]);

  const handleCtaClick = useCallback(
    (placement: CtaPlacement, target: CtaTarget): boolean => {
      return ctaCoordinator.handleClick(placement, target);
    },
    [ctaCoordinator]
  );

  const updateCompletionProgress = useCallback(
    (currentProgress: number, ctaRatioVisible: number) => {
      const isVisible = typeof document !== 'undefined' ? !document.hidden : true;
      lifecycleTracker.updateCompletionState({
        renderedProgress: currentProgress,
        ctaRatioVisible,
        isVisible,
      });
    },
    [lifecycleTracker]
  );

  // Auto-detect scroll-based experience start (renderedStoryProgress > 0.005)
  useEffect(() => {
    if (renderedProgress > 0.005 && !lifecycleTracker.hasStarted()) {
      trackStart('scroll');
    }
  }, [renderedProgress, trackStart, lifecycleTracker]);

  // Auto-track chapter dwell on activeChapterId update
  useEffect(() => {
    if (!activeChapterId) return;

    const isVisible = typeof document !== 'undefined' ? !document.hidden : true;
    dwellTracker.update(activeChapterId, isVisible);

    const handleVisibility = () => {
      dwellTracker.update(activeChapterId, !document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeChapterId, dwellTracker]);

  // Track hotspot opened transitions
  const prevHotspotRef = useRef<HotspotId | null>(null);
  useEffect(() => {
    if (activeHotspotId && activeHotspotId !== prevHotspotRef.current) {
      trackHotspot(activeHotspotId);
    }
    prevHotspotRef.current = activeHotspotId;
  }, [activeHotspotId, trackHotspot]);

  // Track audio enabled transitions (only when audio switches to active after user request)
  const prevAudioRef = useRef<boolean>(isAudioActive);
  useEffect(() => {
    if (isAudioActive && !prevAudioRef.current) {
      trackAudioEnabled();
    }
    prevAudioRef.current = isAudioActive;
  }, [isAudioActive, trackAudioEnabled]);

  // Expose global debug reference in development for verification without polluting production
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as {
        __havenart_analytics__?: {
          getDevBuffer: () => AnalyticsEvent[];
          clearDevBuffer: () => void;
          emit: AnalyticsBridgeReturn['emit'];
          handleCtaClick: AnalyticsBridgeReturn['handleCtaClick'];
          trackStart: AnalyticsBridgeReturn['trackStart'];
          trackHotspot: AnalyticsBridgeReturn['trackHotspot'];
          trackLanguageChange: AnalyticsBridgeReturn['trackLanguageChange'];
          trackAudioEnabled: AnalyticsBridgeReturn['trackAudioEnabled'];
          updateCompletionProgress: AnalyticsBridgeReturn['updateCompletionProgress'];
          resetGuards: () => void;
        };
      }).__havenart_analytics__ = {
        getDevBuffer: tracker.getDevBuffer,
        clearDevBuffer: tracker.clearDevBuffer,
        emit,
        handleCtaClick,
        trackStart,
        trackHotspot,
        trackLanguageChange,
        trackAudioEnabled,
        updateCompletionProgress,
        resetGuards: () => {
          resetDocumentLifecycleGuards();
          lifecycleTracker.reset();
        },
      };
    }
  }, [tracker, emit, handleCtaClick, trackStart, trackHotspot, trackLanguageChange, trackAudioEnabled, updateCompletionProgress, lifecycleTracker]);

  return {
    emit,
    trackStart,
    trackChapter,
    trackHotspot,
    trackLanguageChange,
    trackAudioEnabled,
    handleCtaClick,
    updateCompletionProgress,
    getDevBuffer: tracker.getDevBuffer,
    clearDevBuffer: tracker.clearDevBuffer,
  };
}
