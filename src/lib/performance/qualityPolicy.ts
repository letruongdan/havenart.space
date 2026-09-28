/**
 * HavenArt — Quality Degradation Policy
 * Contract Version: havenart-contracts-1.1
 * References: docs/PERFORMANCE_BUDGET.md, CONTRACTS.md (C10)
 */

import type { QualityTier } from '@/types/story';
import type { QualityWindow } from '@/types/runtime';
import { QUALITY_THRESHOLDS } from '@/config/quality';

/**
 * Pure predicate checking whether a measured window exceeds the slow threshold for a given tier.
 */
export function isWindowSlow(
  tier: QualityTier,
  window: Pick<QualityWindow, 'medianMs' | 'p95Ms'>
): boolean {
  switch (tier) {
    case 'high':
      return (
        window.medianMs > QUALITY_THRESHOLDS.highToMedium.medianMs ||
        window.p95Ms > QUALITY_THRESHOLDS.highToMedium.p95Ms
      );
    case 'medium':
      return (
        window.medianMs > QUALITY_THRESHOLDS.mediumToLow.medianMs ||
        window.p95Ms > QUALITY_THRESHOLDS.mediumToLow.p95Ms
      );
    case 'low':
      return (
        window.medianMs > QUALITY_THRESHOLDS.lowToFallback.medianMs ||
        window.p95Ms > QUALITY_THRESHOLDS.lowToFallback.p95Ms
      );
    case 'fallback':
      return false;
  }
}

/**
 * Returns the immediate next downgrade tier.
 */
export function getNextDowngradeTier(current: QualityTier): QualityTier | null {
  switch (current) {
    case 'high':
      return 'medium';
    case 'medium':
      return 'low';
    case 'low':
      return 'fallback';
    case 'fallback':
      return null;
  }
}

/**
 * Contract C10: Evaluates quality tier based on current tier and measured window.
 *
 * Rules:
 * 1. Never auto-upgrades (prevents oscillation).
 * 2. If current is 'fallback', stays 'fallback'.
 * 3. If !window.warmedUp, returns current tier.
 * 4. If window.cooldownRemainingMs > 0, returns current tier.
 * 5. Requires consecutive slow windows (>= consecutiveSlowWindows, default 2) to downgrade.
 * 6. Downgrades step-by-step: high -> medium -> low -> fallback.
 */
export function chooseTier(current: QualityTier, window: QualityWindow): QualityTier {
  if (current === 'fallback') {
    return 'fallback';
  }

  if (!window.warmedUp) {
    return current;
  }

  if (window.cooldownRemainingMs > 0) {
    return current;
  }

  if (window.slowWindows < QUALITY_THRESHOLDS.consecutiveSlowWindows) {
    return current;
  }

  if (isWindowSlow(current, window)) {
    const nextTier = getNextDowngradeTier(current);
    return nextTier ?? current;
  }

  return current;
}
