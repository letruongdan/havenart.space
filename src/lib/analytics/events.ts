/**
 * HavenArt — Analytics Event Abstraction, Validation & Dedupe Lifecycle
 * Contract Version: havenart-contracts-1.1
 * References: docs/ANALYTICS_SPEC.md, docs/CONTRACTS.md
 *
 * Local Criteria (W22):
 * - W22-AC1: Đủ 10 event/allowlist, reject payload ngoài enum và không PII.
 * - W22-AC2: Chapter dwell 300ms / visible, A -> B -> A valid; completion >= .99 + CTA 50% / 1000ms + started.
 * - W22-AC3: Không phát đôi CTA vì bubbling; không request/cookie/persistent ID mặc định.
 */

import type {
  AnalyticsEvent,
  AnalyticsEventName,
  AnalyticsEventPayloads,
  AnalyticsEnvelope,
  AnalyticsMode,
  CtaPlacement,
  CtaTarget,
} from '@/types/telemetry';
import type { ChapterId, HotspotId, HotspotCategory, Locale } from '@/types/story';

export const ALLOWED_EVENT_NAMES: readonly AnalyticsEventName[] = [
  'experience_started',
  'chapter_entered',
  'hotspot_opened',
  'language_changed',
  'audio_enabled',
  'cta_clicked',
  'zalo_clicked',
  'messenger_clicked',
  'whatsapp_clicked',
  'experience_completed',
] as const;

export const ALLOWED_LOCALES: readonly Locale[] = ['vi', 'en'];
export const ALLOWED_MODES: readonly AnalyticsMode[] = ['cinematic', 'reduced-motion', 'fallback'];
export const ALLOWED_CHAPTER_IDS: readonly ChapterId[] = [
  'exterior',
  'approach',
  'entrance',
  'living',
  'garden',
  'finale',
];
export const ALLOWED_HOTSPOT_IDS: readonly HotspotId[] = [
  'travertine-wall',
  'sliding-glass',
  'garden-tree',
];
export const ALLOWED_HOTSPOT_CATEGORIES: readonly HotspotCategory[] = [
  'architecture',
  'material',
  'lighting',
  'landscape',
];
export const ALLOWED_CTA_PLACEMENTS: readonly CtaPlacement[] = ['persistent', 'mid', 'finale'];
export const ALLOWED_CTA_TARGETS: readonly CtaTarget[] = [
  'contact-section',
  'zalo',
  'messenger',
  'whatsapp',
];

/**
 * Validates whether an event payload conforms strictly to the schema allowlist.
 * Rejects unknown event names, extra unauthorized fields, or non-enum values (W22-AC1).
 */
export function validateEventPayload<K extends AnalyticsEventName>(
  name: K,
  payload: unknown
): payload is AnalyticsEventPayloads[K] {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const p = payload as Record<string, unknown>;
  const keys = Object.keys(p);

  switch (name) {
    case 'experience_started':
      if (keys.length !== 1 || !('trigger' in p)) return false;
      return ['scroll', 'chapter-nav', 'hotspot'].includes(p.trigger as string);

    case 'chapter_entered': {
      if (keys.length !== 3) return false;
      const validPrev = p.previousChapterId === null || ALLOWED_CHAPTER_IDS.includes(p.previousChapterId as ChapterId);
      const validDir = ['forward', 'backward', 'initial'].includes(p.direction as string);
      const validIdx = typeof p.entryIndex === 'number' && Number.isInteger(p.entryIndex) && p.entryIndex >= 1;
      return validPrev && validDir && validIdx;
    }

    case 'hotspot_opened':
      if (keys.length !== 2) return false;
      return (
        ALLOWED_HOTSPOT_IDS.includes(p.hotspotId as HotspotId) &&
        ALLOWED_HOTSPOT_CATEGORIES.includes(p.category as HotspotCategory)
      );

    case 'language_changed':
      if (keys.length !== 2) return false;
      return (
        ALLOWED_LOCALES.includes(p.fromLocale as Locale) &&
        ALLOWED_LOCALES.includes(p.toLocale as Locale) &&
        p.fromLocale !== p.toLocale
      );

    case 'audio_enabled':
      return keys.length === 0;

    case 'cta_clicked':
      if (keys.length !== 2) return false;
      return (
        ALLOWED_CTA_PLACEMENTS.includes(p.placement as CtaPlacement) &&
        ALLOWED_CTA_TARGETS.includes(p.target as CtaTarget)
      );

    case 'zalo_clicked':
    case 'messenger_clicked':
    case 'whatsapp_clicked':
      if (keys.length !== 1) return false;
      return ALLOWED_CTA_PLACEMENTS.includes(p.placement as CtaPlacement);

    case 'experience_completed':
      return keys.length === 0;

    default:
      return false;
  }
}

/**
 * Validates an entire AnalyticsEvent envelope and payload against strict telemetry rules.
 * Enforces schemaVersion 1, sequence, non-PII, and allowable bounds (W22-AC1).
 */
export function validateAnalyticsEvent(event: unknown): event is AnalyticsEvent {
  if (typeof event !== 'object' || event === null) return false;

  const e = event as Record<string, unknown>;

  if (e.schemaVersion !== 1) return false;
  if (typeof e.sequence !== 'number' || !Number.isInteger(e.sequence) || e.sequence < 1) return false;
  if (!ALLOWED_LOCALES.includes(e.locale as Locale)) return false;
  if (!ALLOWED_MODES.includes(e.mode as AnalyticsMode)) return false;
  if (e.chapterId !== null && !ALLOWED_CHAPTER_IDS.includes(e.chapterId as ChapterId)) return false;
  if (typeof e.elapsedMs !== 'number' || !Number.isFinite(e.elapsedMs) || e.elapsedMs < 0) return false;
  if (!ALLOWED_EVENT_NAMES.includes(e.name as AnalyticsEventName)) return false;

  return validateEventPayload(e.name as AnalyticsEventName, e.payload);
}

export interface AnalyticsTrackerOptions {
  readonly clock?: () => number;
  readonly sink?: (event: AnalyticsEvent) => void;
  readonly isDev?: boolean;
  readonly maxBufferSize?: number;
}

/**
 * Creates an analytics event bus with sequence counting, bounded dev buffer,
 * and no-op default production sink (W22-AC1, W22-AC3).
 */
export function createAnalyticsTracker(options: AnalyticsTrackerOptions = {}) {
  const clock = options.clock ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const startTime = clock();
  const isDev = options.isDev ?? false;
  const maxBufferSize = options.maxBufferSize ?? 100;
  const devBuffer: AnalyticsEvent[] = [];

  let sequence = 1;

  function emit<K extends AnalyticsEventName>(
    name: K,
    payload: AnalyticsEventPayloads[K],
    context: {
      locale: Locale;
      mode: AnalyticsMode;
      chapterId: ChapterId | null;
    }
  ): boolean {
    const elapsedMs = Math.max(0, Math.round(clock() - startTime));

    const envelope: AnalyticsEnvelope = {
      schemaVersion: 1,
      sequence,
      locale: context.locale,
      mode: context.mode,
      chapterId: context.chapterId,
      elapsedMs,
    };

    const candidate = {
      ...envelope,
      name,
      payload,
    };

    if (!validateAnalyticsEvent(candidate)) {
      return false;
    }

    sequence++;

    // Bounded dev buffer in memory (W22-AC3)
    if (isDev) {
      if (devBuffer.length >= maxBufferSize) {
        devBuffer.shift();
      }
      devBuffer.push(candidate);
    }

    // Call external sink safely if provided (default is pure no-op)
    if (options.sink) {
      try {
        options.sink(candidate);
      } catch {
        // Sink failures must never impact application execution
      }
    }

    return true;
  }

  return {
    emit,
    getDevBuffer: () => [...devBuffer],
    clearDevBuffer: () => {
      devBuffer.length = 0;
    },
    getCurrentSequence: () => sequence,
  };
}

export interface ChapterDwellTrackerDeps {
  readonly onEnter: (params: {
    chapterId: ChapterId;
    previousChapterId: ChapterId | null;
    direction: 'forward' | 'backward' | 'initial';
    entryIndex: number;
  }) => void;
  readonly dwellMs?: number;
  readonly clock?: () => number;
}

/**
 * Manages chapter stability and dwell duration (W22-AC2).
 * Only fires `chapter_entered` when a chapter is stable for >= 300ms while visible.
 * Supports A -> B -> A transitions with accurate backward direction and entryIndex counting.
 */
export function createChapterDwellTracker(deps: ChapterDwellTrackerDeps) {
  const dwellThreshold = deps.dwellMs ?? 300;
  const clock = deps.clock ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));

  let committedChapter: ChapterId | null = null;
  let candidateChapter: ChapterId | null = null;
  let candidateStartTime: number | null = null;

  // Track visit count per chapter
  const visitCounts = new Map<ChapterId, number>();

  function update(activeChapterId: ChapterId, isVisible: boolean): void {
    const now = clock();

    // If document is hidden, reset candidate dwell timer (W22-AC2)
    if (!isVisible) {
      candidateChapter = null;
      candidateStartTime = null;
      return;
    }

    // Already in currently committed chapter
    if (activeChapterId === committedChapter) {
      candidateChapter = null;
      candidateStartTime = null;
      return;
    }

    // Different chapter detected: start or update candidate
    if (activeChapterId !== candidateChapter) {
      candidateChapter = activeChapterId;
      candidateStartTime = now;
      return;
    }

    // Same candidate still active: check if dwell threshold reached
    if (candidateStartTime !== null && now - candidateStartTime >= dwellThreshold) {
      const prevChapter = committedChapter;
      committedChapter = candidateChapter;

      const previousIndex = prevChapter ? ALLOWED_CHAPTER_IDS.indexOf(prevChapter) : -1;
      const currentIndex = ALLOWED_CHAPTER_IDS.indexOf(committedChapter);

      let direction: 'forward' | 'backward' | 'initial' = 'initial';
      if (prevChapter !== null) {
        direction = currentIndex < previousIndex ? 'backward' : 'forward';
      }

      const nextVisitCount = (visitCounts.get(committedChapter) ?? 0) + 1;
      visitCounts.set(committedChapter, nextVisitCount);

      deps.onEnter({
        chapterId: committedChapter,
        previousChapterId: prevChapter,
        direction,
        entryIndex: nextVisitCount,
      });

      // Clear candidate once committed
      candidateChapter = null;
      candidateStartTime = null;
    }
  }

  return {
    update,
    getCommittedChapter: () => committedChapter,
    reset: () => {
      committedChapter = null;
      candidateChapter = null;
      candidateStartTime = null;
      visitCounts.clear();
    },
  };
}

export interface ExperienceLifecycleDeps {
  readonly onStart: (trigger: 'scroll' | 'chapter-nav' | 'hotspot') => void;
  readonly onComplete: () => void;
  readonly ctaDwellMs?: number;
  readonly clock?: () => number;
}

/**
 * Tracks start and completion lifecycle events (W22-AC2).
 * - `experience_started`: at most 1 per document lifecycle upon intentional exploration.
 * - `experience_completed`: at most 1 per document lifecycle, ONLY after started,
 *   with progress >= 0.99 and finale CTA visible >= 50% continuously for 1000ms while visible.
 */
export function createExperienceLifecycleTracker(deps: ExperienceLifecycleDeps) {
  const ctaDwellThreshold = deps.ctaDwellMs ?? 1000;
  const clock = deps.clock ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));

  let hasStarted = false;
  let hasCompleted = false;
  let ctaDwellStartTime: number | null = null;

  function triggerStart(trigger: 'scroll' | 'chapter-nav' | 'hotspot'): boolean {
    if (hasStarted) return false;
    hasStarted = true;
    deps.onStart(trigger);
    return true;
  }

  function updateCompletionState(params: {
    renderedProgress: number;
    ctaRatioVisible: number;
    isVisible: boolean;
  }): void {
    if (!hasStarted || hasCompleted) return;

    const now = clock();

    const isEligible =
      params.isVisible &&
      params.renderedProgress >= 0.99 &&
      params.ctaRatioVisible >= 0.5;

    if (!isEligible) {
      ctaDwellStartTime = null;
      return;
    }

    if (ctaDwellStartTime === null) {
      ctaDwellStartTime = now;
      return;
    }

    if (now - ctaDwellStartTime >= ctaDwellThreshold) {
      hasCompleted = true;
      ctaDwellStartTime = null;
      deps.onComplete();
    }
  }

  return {
    triggerStart,
    updateCompletionState,
    hasStarted: () => hasStarted,
    hasCompleted: () => hasCompleted,
    reset: () => {
      hasStarted = false;
      hasCompleted = false;
      ctaDwellStartTime = null;
    },
  };
}

export interface CtaDedupeOptions {
  readonly dedupeWindowMs?: number;
  readonly clock?: () => number;
}

/**
 * Deduplicates CTA and channel clicks to eliminate double-firing from bubbling (W22-AC3).
 */
export function createCtaCoordinator(
  onCta: (params: { placement: CtaPlacement; target: CtaTarget }) => void,
  onChannel?: (channel: 'zalo' | 'messenger' | 'whatsapp', placement: CtaPlacement) => void,
  options: CtaDedupeOptions = {}
) {
  const windowMs = options.dedupeWindowMs ?? 300;
  const clock = options.clock ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));

  let lastClickTime = 0;
  let lastActionKey = '';

  function handleClick(placement: CtaPlacement, target: CtaTarget): boolean {
    const now = clock();
    const actionKey = `${placement}:${target}`;

    if (now - lastClickTime < windowMs && actionKey === lastActionKey) {
      return false; // Suppress duplicate event
    }

    lastClickTime = now;
    lastActionKey = actionKey;

    onCta({ placement, target });

    if (target === 'zalo' || target === 'messenger' || target === 'whatsapp') {
      onChannel?.(target, placement);
    }

    return true;
  }

  return {
    handleClick,
  };
}
