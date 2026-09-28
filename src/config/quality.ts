/**
 * HavenArt — Quality & Performance Configurations
 * Contract Version: havenart-contracts-1.1
 * References: docs/PERFORMANCE_BUDGET.md
 */

import type { QualityTier } from '@/types/story';

export interface TierConfig {
  readonly maxDpr: number;
  readonly maxPixels: number;
  readonly targetFps: number;
  readonly targetFrameTimeMs: number;
  readonly shadowMapSize: number;
  readonly shadowLights: number;
  readonly maxResidentZones: number;
}

export const TIER_CONFIGS: Record<Exclude<QualityTier, 'fallback'>, TierConfig> = {
  high: {
    maxDpr: 1.5,
    maxPixels: 4_000_000,
    targetFps: 60,
    targetFrameTimeMs: 16.7,
    shadowMapSize: 2048,
    shadowLights: 1,
    maxResidentZones: 3,
  },
  medium: {
    maxDpr: 1.25,
    maxPixels: 2_500_000,
    targetFps: 45,
    targetFrameTimeMs: 22.2,
    shadowMapSize: 1024,
    shadowLights: 1,
    maxResidentZones: 2,
  },
  low: {
    maxDpr: 1.0,
    maxPixels: 1_500_000,
    targetFps: 30,
    targetFrameTimeMs: 33.3,
    shadowMapSize: 0,
    shadowLights: 0,
    maxResidentZones: 2,
  },
} as const;

export interface QualityThresholds {
  readonly warmupMs: number;
  readonly windowMs: number;
  readonly cooldownMs: number;
  readonly consecutiveSlowWindows: number;
  readonly resizeGraceMs: number;
  readonly highToMedium: {
    readonly medianMs: number;
    readonly p95Ms: number;
  };
  readonly mediumToLow: {
    readonly medianMs: number;
    readonly p95Ms: number;
  };
  readonly lowToFallback: {
    readonly medianMs: number;
    readonly p95Ms: number;
  };
}

export const QUALITY_THRESHOLDS: QualityThresholds = {
  warmupMs: 3000, // 3s warm-up
  windowMs: 5000, // 5s sliding window
  cooldownMs: 10000, // 10s cooldown between tier changes
  consecutiveSlowWindows: 2, // 2 consecutive slow windows required
  resizeGraceMs: 1000, // 1s grace period after viewport resize
  highToMedium: {
    medianMs: 22,
    p95Ms: 35,
  },
  mediumToLow: {
    medianMs: 30,
    p95Ms: 45,
  },
  lowToFallback: {
    medianMs: 45,
    p95Ms: 70,
  },
} as const;

/**
 * Calculates effective DPR capped by tier maximum and total frame pixel budget.
 *
 * @param tier Current QualityTier
 * @param devicePixelRatio Native device pixel ratio (window.devicePixelRatio)
 * @param width Viewport CSS width
 * @param height Viewport CSS height
 */
export function getEffectiveDpr(
  tier: QualityTier,
  devicePixelRatio: number,
  width: number,
  height: number
): number {
  if (tier === 'fallback') {
    return 1.0;
  }

  const config = TIER_CONFIGS[tier];
  // 1. Cap by tier max DPR
  let dpr = Math.min(Math.max(1.0, devicePixelRatio), config.maxDpr);

  // 2. Cap by total frame pixel budget
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const rawPixelCount = safeWidth * safeHeight * dpr * dpr;

  if (rawPixelCount > config.maxPixels) {
    const maxDprByPixels = Math.sqrt(config.maxPixels / (safeWidth * safeHeight));
    dpr = Math.min(dpr, maxDprByPixels);
  }

  // Quantize to 2 decimals, min 0.5
  return Math.max(0.5, Math.round(dpr * 100) / 100);
}
