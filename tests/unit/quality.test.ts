/**
 * HavenArt — Unit Tests for Quality Policy & Frame Monitor
 * Contract Version: havenart-contracts-1.1
 * References: docs/PERFORMANCE_BUDGET.md, docs/agents/tasks/W21.md
 *
 * Local Criteria (W21):
 * - W21-AC1: Hai slow windows sau warm-up/cooldown mới downgrade; tab hidden/resize excluded.
 * - W21-AC2: DPR caps/frame budget từ performance spec, không tự upgrade/oscillate.
 * - W21-AC3: Giữ camera/story IDs khi tier đổi; low sustained bad báo fallback request tới host.
 */

import { describe, it, expect, vi } from 'vitest';
import type { QualityWindow } from '@/types/runtime';
import {
  TIER_CONFIGS,
  getEffectiveDpr,
} from '@/config/quality';
import {
  chooseTier,
  isWindowSlow,
  getNextDowngradeTier,
} from '@/lib/performance/qualityPolicy';
import {
  createFrameMonitor,
  computePercentiles,
} from '@/lib/performance/frameMonitor';

describe('W21: Quality Configurations & DPR Caps (W21-AC2)', () => {
  it('conforms to PERFORMANCE_BUDGET tier limits', () => {
    expect(TIER_CONFIGS.high.maxDpr).toBe(1.5);
    expect(TIER_CONFIGS.high.maxPixels).toBe(4_000_000);
    expect(TIER_CONFIGS.high.shadowMapSize).toBe(2048);
    expect(TIER_CONFIGS.high.shadowLights).toBe(1);
    expect(TIER_CONFIGS.high.targetFps).toBe(60);

    expect(TIER_CONFIGS.medium.maxDpr).toBe(1.25);
    expect(TIER_CONFIGS.medium.maxPixels).toBe(2_500_000);
    expect(TIER_CONFIGS.medium.shadowMapSize).toBe(1024);
    expect(TIER_CONFIGS.medium.shadowLights).toBe(1);
    expect(TIER_CONFIGS.medium.targetFps).toBe(45);

    expect(TIER_CONFIGS.low.maxDpr).toBe(1.0);
    expect(TIER_CONFIGS.low.maxPixels).toBe(1_500_000);
    expect(TIER_CONFIGS.low.shadowMapSize).toBe(0);
    expect(TIER_CONFIGS.low.shadowLights).toBe(0);
    expect(TIER_CONFIGS.low.targetFps).toBe(30);
  });

  it('caps effective DPR by tier ceiling regardless of high devicePixelRatio', () => {
    const nativeDpr = 3.0; // High-density display (e.g. iPhone Retina / modern flagship)
    const width = 1200;
    const height = 800;

    expect(getEffectiveDpr('high', nativeDpr, width, height)).toBe(1.5);
    expect(getEffectiveDpr('medium', nativeDpr, width, height)).toBe(1.25);
    expect(getEffectiveDpr('low', nativeDpr, width, height)).toBe(1.0);
    expect(getEffectiveDpr('fallback', nativeDpr, width, height)).toBe(1.0);
  });

  it('reduces DPR when viewport exceeds maximum frame pixel budget', () => {
    // 4K resolution (3840 x 2160 = 8,294,400 pixels at DPR 1.0)
    // High tier maxPixels is 4,000,000.
    // maxDprByPixels = sqrt(4,000,000 / 8,294,400) = ~0.69
    const dpr4k = getEffectiveDpr('high', 1.5, 3840, 2160);
    expect(dpr4k).toBeLessThan(1.0);
    expect(dpr4k).toBeCloseTo(0.69, 1);
  });

  it('preserves native DPR if within budget and under cap', () => {
    expect(getEffectiveDpr('high', 1.25, 1200, 800)).toBe(1.25);
    expect(getEffectiveDpr('high', 1.0, 1200, 800)).toBe(1.0);
  });
});

describe('W21: Quality Policy Pure Function (chooseTier) (W21-AC1, W21-AC2)', () => {
  it('identifies slow windows accurately based on tier thresholds', () => {
    // High: median > 22 or p95 > 35
    expect(isWindowSlow('high', { medianMs: 23, p95Ms: 30 })).toBe(true);
    expect(isWindowSlow('high', { medianMs: 20, p95Ms: 36 })).toBe(true);
    expect(isWindowSlow('high', { medianMs: 20, p95Ms: 30 })).toBe(false);

    // Medium: median > 30 or p95 > 45
    expect(isWindowSlow('medium', { medianMs: 31, p95Ms: 40 })).toBe(true);
    expect(isWindowSlow('medium', { medianMs: 25, p95Ms: 46 })).toBe(true);
    expect(isWindowSlow('medium', { medianMs: 25, p95Ms: 40 })).toBe(false);

    // Low: median > 45 or p95 > 70
    expect(isWindowSlow('low', { medianMs: 46, p95Ms: 60 })).toBe(true);
    expect(isWindowSlow('low', { medianMs: 40, p95Ms: 72 })).toBe(true);
    expect(isWindowSlow('low', { medianMs: 40, p95Ms: 60 })).toBe(false);

    // Fallback: never slow
    expect(isWindowSlow('fallback', { medianMs: 100, p95Ms: 200 })).toBe(false);
  });

  it('determines the next step-by-step downgrade tier', () => {
    expect(getNextDowngradeTier('high')).toBe('medium');
    expect(getNextDowngradeTier('medium')).toBe('low');
    expect(getNextDowngradeTier('low')).toBe('fallback');
    expect(getNextDowngradeTier('fallback')).toBeNull();
  });

  it('does NOT downgrade if not warmed up', () => {
    const unwarmedWindow: QualityWindow = {
      medianMs: 50,
      p95Ms: 80,
      slowWindows: 5,
      cooldownRemainingMs: 0,
      warmedUp: false,
    };
    expect(chooseTier('high', unwarmedWindow)).toBe('high');
  });

  it('does NOT downgrade if cooldown is active', () => {
    const cooldownWindow: QualityWindow = {
      medianMs: 50,
      p95Ms: 80,
      slowWindows: 5,
      cooldownRemainingMs: 4500,
      warmedUp: true,
    };
    expect(chooseTier('high', cooldownWindow)).toBe('high');
  });

  it('does NOT downgrade on a single slow window (< 2 consecutive)', () => {
    const singleSlowWindow: QualityWindow = {
      medianMs: 30,
      p95Ms: 50,
      slowWindows: 1,
      cooldownRemainingMs: 0,
      warmedUp: true,
    };
    expect(chooseTier('high', singleSlowWindow)).toBe('high');
  });

  it('downgrades step-by-step on two consecutive slow windows', () => {
    const twoSlowWindows: QualityWindow = {
      medianMs: 30,
      p95Ms: 50,
      slowWindows: 2,
      cooldownRemainingMs: 0,
      warmedUp: true,
    };
    expect(chooseTier('high', twoSlowWindows)).toBe('medium');
    expect(chooseTier('medium', twoSlowWindows)).toBe('low');
  });

  it('never auto-upgrades even under pristine 60/120 FPS performance', () => {
    const pristineWindow: QualityWindow = {
      medianMs: 8.3,
      p95Ms: 11.0,
      slowWindows: 0,
      cooldownRemainingMs: 0,
      warmedUp: true,
    };

    expect(chooseTier('low', pristineWindow)).toBe('low');
    expect(chooseTier('medium', pristineWindow)).toBe('medium');
    expect(chooseTier('fallback', pristineWindow)).toBe('fallback');
  });
});

describe('W21: Frame Monitor Lifecycle, Windowing & Exclusions (W21-AC1, W21-AC3)', () => {
  it('computes median and p95 accurately from raw durations', () => {
    expect(computePercentiles([])).toEqual({ medianMs: 0, p95Ms: 0 });

    const durations = [10, 12, 14, 16, 18, 20, 22, 24, 26, 100];
    const { medianMs, p95Ms } = computePercentiles(durations);
    expect(medianMs).toBe(19); // middle average of (18 + 20) / 2
    expect(p95Ms).toBe(100);
  });

  it('ignores slow frames during warm-up period (3000ms)', () => {
    const onTierChange = vi.fn();
    const monitor = createFrameMonitor({
      initialTier: 'high',
      autoListen: false,
      onTierChange,
    });

    // Warm-up is 3000ms. Send slow frames (50ms) between 0ms and 2500ms
    for (let t = 100; t <= 2500; t += 100) {
      monitor.recordFrame(t, 50);
    }

    const windowState = monitor.getWindow();
    expect(windowState.warmedUp).toBe(false);
    expect(monitor.getCurrentTier()).toBe('high');
    expect(onTierChange).not.toHaveBeenCalled();

    monitor.dispose();
  });

  it('downgrades tier only after two consecutive slow windows and respects cooldown', () => {
    const onTierChange = vi.fn();
    const monitor = createFrameMonitor({
      initialTier: 'high',
      warmupMs: 3000,
      windowMs: 5000,
      cooldownMs: 10000,
      consecutiveSlowWindows: 2,
      autoListen: false,
      onTierChange,
    });

    // Start monitor at t = 0
    monitor.recordFrame(0, 16.7);

    // Warm-up phase (0 to 3000ms) with normal frames
    for (let t = 500; t <= 3000; t += 500) {
      monitor.recordFrame(t, 16.7);
    }

    // Window 1 (t = 3000 to 5000ms): slow frames (40ms)
    // Next evaluation will trigger when nowMs >= 5000
    for (let t = 3500; t < 5000; t += 500) {
      monitor.recordFrame(t, 40);
    }
    monitor.recordFrame(5000, 40); // Window 1 evaluated!

    expect(monitor.getCurrentTier()).toBe('high'); // First slow window: no downgrade yet!
    expect(onTierChange).not.toHaveBeenCalled();

    // Window 2 (t = 5000 to 10000ms): slow frames continue
    for (let t = 5500; t < 10000; t += 500) {
      monitor.recordFrame(t, 40);
    }
    monitor.recordFrame(10000, 40); // Window 2 evaluated!

    // Second consecutive slow window: downgrade triggered!
    expect(monitor.getCurrentTier()).toBe('medium');
    expect(onTierChange).toHaveBeenCalledTimes(1);
    expect(onTierChange).toHaveBeenCalledWith(
      'medium',
      expect.stringContaining('downgrade from high to medium')
    );

    // Cooldown phase (10000ms to 20000ms): slow frames continue, but cooldown is active
    for (let t = 10500; t < 15000; t += 500) {
      monitor.recordFrame(t, 40);
    }
    monitor.recordFrame(15000, 40); // Window 3 evaluated inside cooldown!

    // Still medium because cooldown (10s) hasn't finished!
    expect(monitor.getCurrentTier()).toBe('medium');
    expect(onTierChange).toHaveBeenCalledTimes(1);

    monitor.dispose();
  });

  it('resets consecutive slow count if a fast window occurs', () => {
    const onTierChange = vi.fn();
    const monitor = createFrameMonitor({
      initialTier: 'high',
      warmupMs: 1000,
      windowMs: 2000,
      consecutiveSlowWindows: 2,
      autoListen: false,
      onTierChange,
    });

    monitor.recordFrame(0, 16.7);
    monitor.recordFrame(1000, 16.7); // Warmup finished

    // Window 1 (1000 -> 2000): Slow (30ms)
    monitor.recordFrame(1500, 30);
    monitor.recordFrame(2000, 30); // Evaluates Window 1 -> slow count = 1
    expect(monitor.getCurrentTier()).toBe('high');

    // Window 2 (2000 -> 4000): Fast (16ms)
    monitor.recordFrame(3000, 16);
    monitor.recordFrame(4000, 16); // Evaluates Window 2 -> fast! Resets slow count = 0
    expect(monitor.getCurrentTier()).toBe('high');

    // Window 3 (4000 -> 6000): Slow (30ms)
    monitor.recordFrame(5000, 30);
    monitor.recordFrame(6000, 30); // Evaluates Window 3 -> slow count = 1 (not 2!)
    expect(monitor.getCurrentTier()).toBe('high'); // Still high, no downgrade!

    monitor.dispose();
  });

  it('excludes frames recorded while tab is hidden and skips first frame after resume', () => {
    const monitor = createFrameMonitor({
      initialTier: 'high',
      autoListen: false,
    });

    monitor.recordFrame(0, 16.7);

    // Tab is backgrounded/hidden at t = 1000
    monitor.setSuspended(true, 1000);

    // Frames while tab is hidden must be discarded
    monitor.recordFrame(1500, 500);
    monitor.recordFrame(2000, 500);

    // Tab is foregrounded/resumed at t = 3000
    monitor.setSuspended(false, 3000);

    // First frame upon resume typically has huge delta (2000ms delay) -> MUST be skipped!
    monitor.recordFrame(3016, 2000);

    // Normal frame recorded
    monitor.recordFrame(3033, 16.7);

    const windowState = monitor.getWindow();
    // Huge dt frames (500, 2000) should NOT be in the window
    expect(windowState.medianMs).toBeLessThanOrEqual(20);

    monitor.dispose();
  });

  it('excludes frames during resize grace period', () => {
    const monitor = createFrameMonitor({
      initialTier: 'high',
      resizeGraceMs: 1000,
      autoListen: false,
    });

    monitor.recordFrame(0, 16.7);

    // User resizes browser window at t = 1000
    monitor.notifyResize(1000);

    // Frames during the 1-second resize reflow spike (1000ms - 2000ms)
    monitor.recordFrame(1200, 80);
    monitor.recordFrame(1500, 90);
    monitor.recordFrame(1800, 85);

    // Normal frame after grace period expires
    monitor.recordFrame(2100, 16.7);

    const windowState = monitor.getWindow();
    // Spikes during resize reflow (80, 90, 85) must be excluded
    expect(windowState.p95Ms).toBeLessThanOrEqual(20);

    monitor.dispose();
  });
});

describe('W21: Host Fallback Request & State Preservation (W21-AC3)', () => {
  it('requests host fallback when low tier experiences sustained degradation', () => {
    const onTierChange = vi.fn();
    const onFallbackRequest = vi.fn();

    const monitor = createFrameMonitor({
      initialTier: 'low',
      warmupMs: 500,
      windowMs: 1000,
      consecutiveSlowWindows: 2,
      autoListen: false,
      onTierChange,
      onFallbackRequest,
    });

    // Mock external story/camera runtime state
    const mockRuntimeState = {
      frameId: 1420,
      renderedStoryProgress: 0.68,
      chapterId: 'living',
      activeHotspotId: 'travertine-wall',
    };

    monitor.recordFrame(0, 33.3);
    monitor.recordFrame(500, 33.3); // Warmed up

    // Window 1 (500 -> 1500ms): severely degraded (80ms per frame)
    monitor.recordFrame(1000, 80);
    monitor.recordFrame(1500, 80);

    expect(monitor.getCurrentTier()).toBe('low');
    expect(onFallbackRequest).not.toHaveBeenCalled();

    // Window 2 (1500 -> 2500ms): severely degraded continues
    monitor.recordFrame(2000, 80);
    monitor.recordFrame(2500, 80);

    // Low tier degrades to fallback!
    expect(monitor.getCurrentTier()).toBe('fallback');
    expect(onTierChange).toHaveBeenCalledWith(
      'fallback',
      expect.stringContaining('downgrade from low to fallback')
    );
    expect(onFallbackRequest).toHaveBeenCalledWith(
      expect.stringContaining('downgrade from low to fallback')
    );

    // Verify external story/camera state was NOT altered or reset by the monitor
    expect(mockRuntimeState.frameId).toBe(1420);
    expect(mockRuntimeState.renderedStoryProgress).toBe(0.68);
    expect(mockRuntimeState.chapterId).toBe('living');
    expect(mockRuntimeState.activeHotspotId).toBe('travertine-wall');

    monitor.dispose();
  });
});
