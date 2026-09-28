/**
 * HavenArt — Frame Timing Monitor & Quality Controller
 * Contract Version: havenart-contracts-1.1
 * References: docs/PERFORMANCE_BUDGET.md, CONTRACTS.md (C10)
 *
 * Local Criteria (W21):
 * - W21-AC1: Hai slow windows sau warm-up/cooldown mới downgrade; tab hidden/resize excluded.
 * - W21-AC2: DPR caps/frame budget từ performance spec, không tự upgrade/oscillate.
 * - W21-AC3: Giữ camera/story IDs khi tier đổi; low sustained bad báo fallback request tới host.
 */

import type { QualityTier } from '@/types/story';
import type { QualityWindow } from '@/types/runtime';
import { QUALITY_THRESHOLDS } from '@/config/quality';
import { chooseTier, isWindowSlow } from './qualityPolicy';

export interface FrameSample {
  readonly timestampMs: number;
  readonly durationMs: number;
}

export interface FrameMonitorOptions {
  readonly initialTier?: QualityTier;
  readonly warmupMs?: number;
  readonly windowMs?: number;
  readonly cooldownMs?: number;
  readonly consecutiveSlowWindows?: number;
  readonly resizeGraceMs?: number;
  readonly onTierChange?: (newTier: QualityTier, reason: string) => void;
  readonly onFallbackRequest?: (reason: string) => void;
  readonly autoListen?: boolean;
}

export interface FrameMonitor {
  recordFrame(nowMs: number, deltaMs?: number): void;
  getCurrentTier(): QualityTier;
  setTier(tier: QualityTier): void;
  getWindow(): QualityWindow;
  setSuspended(suspended: boolean, nowMs?: number): void;
  notifyResize(nowMs?: number): void;
  reset(nowMs?: number): void;
  dispose(): void;
}

/**
 * Calculates median and 95th percentile frame times from a duration list.
 */
export function computePercentiles(durationsMs: readonly number[]): {
  medianMs: number;
  p95Ms: number;
} {
  if (durationsMs.length === 0) {
    return { medianMs: 0, p95Ms: 0 };
  }

  const sorted = [...durationsMs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianMs =
    sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  const p95Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  const p95Ms = sorted[p95Index];

  return {
    medianMs: Math.round(medianMs * 10) / 10,
    p95Ms: Math.round(p95Ms * 10) / 10,
  };
}

/**
 * Creates an in-memory, bounded sliding-window frame timing monitor.
 * Guarantees zero network/analytics calls.
 */
export function createFrameMonitor(options: FrameMonitorOptions = {}): FrameMonitor {
  const warmupMs = options.warmupMs ?? QUALITY_THRESHOLDS.warmupMs;
  const windowMs = options.windowMs ?? QUALITY_THRESHOLDS.windowMs;
  const cooldownMs = options.cooldownMs ?? QUALITY_THRESHOLDS.cooldownMs;
  const resizeGraceMs = options.resizeGraceMs ?? QUALITY_THRESHOLDS.resizeGraceMs;
  const consecutiveSlowWindows =
    options.consecutiveSlowWindows ?? QUALITY_THRESHOLDS.consecutiveSlowWindows;

  let isInitialized = false;
  let currentTier: QualityTier = options.initialTier ?? 'high';
  let startTimeMs = 0;
  let lastFrameTimestampMs = 0;
  let nextWindowEvaluationMs = 0;
  let slowWindowsCount = 0;
  let cooldownUntilMs = 0;
  let isSuspended = false;
  let suspensionStartMs = 0;
  let totalSuspensionMs = 0;
  let skipNextFrame = false;
  let resizeGraceUntilMs = 0;

  const samples: FrameSample[] = [];
  const maxBufferSize = 600; // Bounded ring/buffer memory

  let cleanups: (() => void) | null = null;

  function initStartTime(nowMs: number): void {
    if (!isInitialized) {
      isInitialized = true;
      startTimeMs = nowMs;
      nextWindowEvaluationMs = nowMs + windowMs;
    }
  }

  function getEffectiveElapsed(nowMs: number): number {
    return Math.max(0, nowMs - startTimeMs - totalSuspensionMs);
  }

  function recordFrame(nowMs: number, deltaMs?: number): void {
    initStartTime(nowMs);

    // 1. Exclude frames while tab is hidden
    if (isSuspended) {
      return;
    }

    // 2. Skip first frame upon resume to eliminate suspension dt spike
    if (skipNextFrame) {
      skipNextFrame = false;
      lastFrameTimestampMs = nowMs;
      return;
    }

    // Compute frame duration
    const durationMs =
      typeof deltaMs === 'number'
        ? deltaMs
        : lastFrameTimestampMs > 0
          ? nowMs - lastFrameTimestampMs
          : 16.7;
    lastFrameTimestampMs = nowMs;

    // 3. Exclude frames during resize grace period
    if (nowMs <= resizeGraceUntilMs) {
      return;
    }

    // 4. Record sample in bounded buffer
    samples.push({ timestampMs: nowMs, durationMs });

    // Prune expired samples outside sliding window
    const cutoff = nowMs - windowMs;
    while (samples.length > 0 && samples[0].timestampMs < cutoff) {
      samples.shift();
    }
    while (samples.length > maxBufferSize) {
      samples.shift();
    }

    // 5. Check if window evaluation interval has elapsed
    if (nowMs >= nextWindowEvaluationMs) {
      evaluateWindow(nowMs);
      nextWindowEvaluationMs = nowMs + windowMs;
    }
  }

  function evaluateWindow(nowMs: number): void {
    const effectiveElapsed = getEffectiveElapsed(nowMs);
    const warmedUp = effectiveElapsed >= warmupMs;
    const cooldownRemainingMs = Math.max(0, cooldownUntilMs - nowMs);

    const windowDurations = samples
      .filter((s) => s.timestampMs >= nowMs - windowMs)
      .map((s) => s.durationMs);

    const { medianMs, p95Ms } = computePercentiles(windowDurations);

    // Warm-up or cooldown ignores slow window triggers
    if (!warmedUp || cooldownRemainingMs > 0) {
      return;
    }

    const slow = isWindowSlow(currentTier, { medianMs, p95Ms });
    if (slow) {
      slowWindowsCount++;
    } else {
      // Fast window resets consecutive slow windows counter
      slowWindowsCount = 0;
    }

    const windowSnapshot: QualityWindow = {
      medianMs,
      p95Ms,
      slowWindows: slowWindowsCount,
      cooldownRemainingMs: 0,
      warmedUp: true,
    };

    if (slowWindowsCount >= consecutiveSlowWindows) {
      const newTier = chooseTier(currentTier, windowSnapshot);
      if (newTier !== currentTier) {
        const oldTier = currentTier;
        currentTier = newTier;
        cooldownUntilMs = nowMs + cooldownMs;
        slowWindowsCount = 0;

        const reason = `Window median ${medianMs}ms, p95 ${p95Ms}ms triggered downgrade from ${oldTier} to ${newTier}`;
        options.onTierChange?.(newTier, reason);

        if (newTier === 'fallback') {
          options.onFallbackRequest?.(reason);
        }
      }
    }
  }

  function getCurrentTier(): QualityTier {
    return currentTier;
  }

  function setTier(tier: QualityTier): void {
    currentTier = tier;
    slowWindowsCount = 0;
  }

  function getWindow(): QualityWindow {
    const nowMs = lastFrameTimestampMs > 0 ? lastFrameTimestampMs : 0;
    const effectiveElapsed = getEffectiveElapsed(nowMs);
    const warmedUp = effectiveElapsed >= warmupMs;
    const cooldownRemainingMs = Math.max(0, cooldownUntilMs - nowMs);

    const windowDurations = samples
      .filter((s) => s.timestampMs >= nowMs - windowMs)
      .map((s) => s.durationMs);

    const { medianMs, p95Ms } = computePercentiles(windowDurations);

    return {
      medianMs,
      p95Ms,
      slowWindows: slowWindowsCount,
      cooldownRemainingMs,
      warmedUp,
    };
  }

  function setSuspended(suspended: boolean, nowMs?: number): void {
    const currentNow =
      nowMs ?? (typeof performance !== 'undefined' ? performance.now() : 0);

    if (suspended && !isSuspended) {
      isSuspended = true;
      suspensionStartMs = currentNow;
    } else if (!suspended && isSuspended) {
      isSuspended = false;
      skipNextFrame = true;
      if (suspensionStartMs > 0) {
        const suspendedDuration = Math.max(0, currentNow - suspensionStartMs);
        totalSuspensionMs += suspendedDuration;
        nextWindowEvaluationMs += suspendedDuration;
        if (cooldownUntilMs > 0) {
          cooldownUntilMs += suspendedDuration;
        }
        suspensionStartMs = 0;
      }
    }
  }

  function notifyResize(nowMs?: number): void {
    const currentNow =
      nowMs ?? (typeof performance !== 'undefined' ? performance.now() : 0);
    resizeGraceUntilMs = currentNow + resizeGraceMs;
  }

  function reset(nowMs?: number): void {
    const currentNow =
      nowMs ?? (typeof performance !== 'undefined' ? performance.now() : 0);
    startTimeMs = currentNow;
    lastFrameTimestampMs = currentNow;
    nextWindowEvaluationMs = currentNow + windowMs;
    slowWindowsCount = 0;
    cooldownUntilMs = 0;
    isSuspended = false;
    suspensionStartMs = 0;
    totalSuspensionMs = 0;
    skipNextFrame = false;
    resizeGraceUntilMs = 0;
    samples.length = 0;
  }

  function dispose(): void {
    cleanups?.();
    cleanups = null;
    samples.length = 0;
  }

  // Setup optional browser event listeners
  if (options.autoListen !== false) {
    const cleanupFns: Array<() => void> = [];

    if (typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        setSuspended(document.hidden);
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      cleanupFns.push(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      });
    }

    if (typeof window !== 'undefined') {
      const handleResize = () => {
        notifyResize();
      };
      window.addEventListener('resize', handleResize);
      cleanupFns.push(() => {
        window.removeEventListener('resize', handleResize);
      });
    }

    cleanups = () => {
      for (const fn of cleanupFns) {
        fn();
      }
    };
  }

  return {
    recordFrame,
    getCurrentTier,
    setTier,
    getWindow,
    setSuspended,
    notifyResize,
    reset,
    dispose,
  };
}
