/**
 * HavenArt — Hotspot Visibility Predicate Unit Tests
 * Contract Version: havenart-contracts-1.1
 */

import { describe, it, expect } from 'vitest';
import { isHotspotVisible } from '@/lib/story/hotspotVisibility';
import type { VisibilityInput } from '@/types/runtime';

describe('isHotspotVisible (W16-AC1, W16-AC2, W16-AC3)', () => {
  const valid: VisibilityInput = {
    activeRoom: 'living',
    room: 'living',
    distanceM: 2.0,
    maxDistanceM: 3.5,
    inFrustum: true,
    occluded: false,
    inActivationRange: true,
  };

  it('W16-AC1: returns true when all spatial, frustum, occlusion, and range conditions hold', () => {
    expect(isHotspotVisible(valid)).toBe(true);
  });

  it('W16-AC1/W16-AC2: accepts exact distance equality at boundary (distanceM === maxDistanceM)', () => {
    expect(isHotspotVisible({ ...valid, distanceM: 3.5, maxDistanceM: 3.5 })).toBe(true);
    expect(isHotspotVisible({ ...valid, distanceM: 0, maxDistanceM: 3.5 })).toBe(true);
  });

  it('W16-AC2: returns false when activeRoom does not match hotspot room', () => {
    expect(isHotspotVisible({ ...valid, activeRoom: 'garden' })).toBe(false);
    expect(isHotspotVisible({ ...valid, activeRoom: 'exterior' })).toBe(false);
  });

  it('W16-AC2: returns false when outside local activation range', () => {
    expect(isHotspotVisible({ ...valid, inActivationRange: false })).toBe(false);
  });

  it('W16-AC2: returns false when distance exceeds maxDistanceM', () => {
    expect(isHotspotVisible({ ...valid, distanceM: 3.51 })).toBe(false);
    expect(isHotspotVisible({ ...valid, distanceM: 10.0 })).toBe(false);
  });

  it('W16-AC2: returns false when not in camera frustum', () => {
    expect(isHotspotVisible({ ...valid, inFrustum: false })).toBe(false);
  });

  it('W16-AC2: returns false when occluded by walls/objects', () => {
    expect(isHotspotVisible({ ...valid, occluded: true })).toBe(false);
  });

  it('W16-AC2: rejects invalid, negative, or non-finite distances and limits', () => {
    expect(isHotspotVisible({ ...valid, distanceM: NaN })).toBe(false);
    expect(isHotspotVisible({ ...valid, distanceM: -0.1 })).toBe(false);
    expect(isHotspotVisible({ ...valid, distanceM: Infinity })).toBe(false);
    expect(isHotspotVisible({ ...valid, distanceM: -Infinity })).toBe(false);

    expect(isHotspotVisible({ ...valid, maxDistanceM: NaN })).toBe(false);
    expect(isHotspotVisible({ ...valid, maxDistanceM: 0 })).toBe(false);
    expect(isHotspotVisible({ ...valid, maxDistanceM: -1 })).toBe(false);
    expect(isHotspotVisible({ ...valid, maxDistanceM: Infinity })).toBe(false);
    expect(isHotspotVisible({ ...valid, maxDistanceM: -Infinity })).toBe(false);
  });

  it('W16-AC3: pure function handles null/undefined gracefully without DOM or store side-effects', () => {
    expect(isHotspotVisible(null as unknown as VisibilityInput)).toBe(false);
    expect(isHotspotVisible(undefined as unknown as VisibilityInput)).toBe(false);
  });
});
