/**
 * HavenArt — Pure Hotspot Visibility Predicate
 * Contract Version: havenart-contracts-1.1
 * References: docs/HOTSPOT_SPEC.md
 *
 * Local Criteria (W16):
 * - W16-AC1: Đúng room, local activation range, distance, frustum và không occluded mới true.
 * - W16-AC2: Sai từng một điều kiện phải false; equality distance được phép; non-finite distance/maxDistance false.
 * - W16-AC3: Không renderer/DOM/store hoặc đọc scroll trong helper.
 */

import type { VisibilityInput } from '@/types/runtime';

/**
 * Pure predicate evaluating if a hotspot is eligible for activation and marker display.
 * Pure mathematical calculation without renderer, DOM, store, or scroll dependencies (W16-AC3).
 */
export function isHotspotVisible(input: VisibilityInput): boolean {
  if (!input) return false;

  return (
    Number.isFinite(input.distanceM) &&
    Number.isFinite(input.maxDistanceM) &&
    input.distanceM >= 0 &&
    input.maxDistanceM > 0 &&
    input.activeRoom === input.room &&
    input.inActivationRange &&
    input.distanceM <= input.maxDistanceM &&
    input.inFrustum &&
    !input.occluded
  );
}
