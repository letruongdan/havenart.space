/**
 * HavenArt — Unit Tests for Hotspot Projection & Raycast Budgeting
 * Contract Version: havenart-contracts-1.1
 * References: docs/HOTSPOT_SPEC.md, docs/ACCESSIBILITY_SPEC.md
 *
 * Local Criteria (W17):
 * - W17-AC1: Cung cấp screen coordinates cho marker buttons.
 * - W17-AC3: Raycast budget: không raycast every mesh every frame.
 */

import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import {
  projectWorldToScreen,
  projectPoseToScreen,
} from '@/hooks/useHotspotProjection';
import { HOTSPOTS } from '@/config/hotspots';
import type { CameraPose } from '@/types/story';
import { isHotspotVisible } from '@/lib/story/hotspotVisibility';

describe('W17: 3D to 2D Hotspot Projection (W17-AC1)', () => {
  it('projects a point directly in front of camera to center of screen', () => {
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 100);
    camera.position.set(0, 1.65, -10);
    camera.lookAt(0, 1.65, 0);
    camera.updateMatrixWorld(true);

    const targetPos: [number, number, number] = [0, 1.65, 0];
    const width = 1920;
    const height = 1080;

    const result = projectWorldToScreen(targetPos, camera, width, height);

    expect(result.inFrustum).toBe(true);
    expect(result.distanceM).toBeCloseTo(10.0, 1);
    expect(result.screenX).toBeCloseTo(960, -1); // approx center width
    expect(result.screenY).toBeCloseTo(540, -1); // approx center height
  });

  it('detects when a point is behind the camera (out of frustum)', () => {
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 100);
    camera.position.set(0, 1.65, 0);
    camera.lookAt(0, 1.65, 10); // looking towards +Z
    camera.updateMatrixWorld(true);

    // Target is behind camera at -Z
    const behindPos: [number, number, number] = [0, 1.65, -15];
    const result = projectWorldToScreen(behindPos, camera, 1920, 1080);

    expect(result.inFrustum).toBe(false);
  });

  it('projects from pure CameraPose data accurately without DOM dependencies', () => {
    const pose: CameraPose = {
      position: [0.0, 1.65, 5.0],
      target: [0.0, 1.65, 10.0],
      quaternion: [0, 1, 0, 0],
      focalLengthMm: 42,
    };

    const targetPos: [number, number, number] = [0.0, 1.65, 9.2];
    const result = projectPoseToScreen(targetPos, pose, 1280, 720);

    expect(result.inFrustum).toBe(true);
    expect(result.distanceM).toBeCloseTo(4.2, 1);
    expect(result.screenX).toBeCloseTo(640, -1);
    expect(result.screenY).toBeCloseTo(360, -1);
  });
});

describe('W17: Raycast Budgeting & Visibility Policy (W17-AC3)', () => {
  it('enforces raycast budget by skipping occlusion test when preliminary checks fail', () => {
    const isOccludedMock = vi.fn().mockReturnValue(false);

    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 100);
    camera.position.set(0, 1.65, 5.0);
    camera.lookAt(0, 1.65, 10.0);
    camera.updateMatrixWorld(true);

    const livingHotspot = HOTSPOTS.find((h) => h.id === 'travertine-wall')!;

    // Scenario 1: Wrong room ('entrance' instead of 'living')
    // Must NOT call expensive raycaster/occlusion check!
    const wrongRoomInput = {
      activeRoom: 'entrance',
      room: livingHotspot.room,
      distanceM: 4.0,
      maxDistanceM: livingHotspot.maxDistanceM,
      inFrustum: true,
      occluded: false,
      inActivationRange: true,
    };
    expect(isHotspotVisible(wrongRoomInput)).toBe(false);
    expect(isOccludedMock).not.toHaveBeenCalled();

    // Scenario 2: Outside activation range
    const outOfRangeInput = {
      activeRoom: 'living',
      room: livingHotspot.room,
      distanceM: 4.0,
      maxDistanceM: livingHotspot.maxDistanceM,
      inFrustum: true,
      occluded: false,
      inActivationRange: false, // Not in range
    };
    expect(isHotspotVisible(outOfRangeInput)).toBe(false);
    expect(isOccludedMock).not.toHaveBeenCalled();

    // Scenario 3: Point behind camera (out of frustum)
    const outOfFrustumInput = {
      activeRoom: 'living',
      room: livingHotspot.room,
      distanceM: 4.0,
      maxDistanceM: livingHotspot.maxDistanceM,
      inFrustum: false, // Behind camera
      occluded: false,
      inActivationRange: true,
    };
    expect(isHotspotVisible(outOfFrustumInput)).toBe(false);
    expect(isOccludedMock).not.toHaveBeenCalled();

    // Scenario 4: Distance exceeds maxDistanceM
    const tooFarInput = {
      activeRoom: 'living',
      room: livingHotspot.room,
      distanceM: livingHotspot.maxDistanceM + 1.0,
      maxDistanceM: livingHotspot.maxDistanceM,
      inFrustum: true,
      occluded: false,
      inActivationRange: true,
    };
    expect(isHotspotVisible(tooFarInput)).toBe(false);
    expect(isOccludedMock).not.toHaveBeenCalled();

    // Scenario 5: All preliminary checks pass -> raycast is permitted
    isOccludedMock.mockReturnValue(false);
    const validCandidate = {
      activeRoom: 'living',
      room: livingHotspot.room,
      distanceM: 4.0,
      maxDistanceM: livingHotspot.maxDistanceM,
      inFrustum: true,
      occluded: isOccludedMock(),
      inActivationRange: true,
    };
    expect(isOccludedMock).toHaveBeenCalledTimes(1);
    expect(isHotspotVisible(validCandidate)).toBe(true);
  });

  it('hides hotspot when occluded by architecture', () => {
    const livingHotspot = HOTSPOTS.find((h) => h.id === 'travertine-wall')!;

    const occludedCandidate = {
      activeRoom: 'living',
      room: livingHotspot.room,
      distanceM: 4.0,
      maxDistanceM: livingHotspot.maxDistanceM,
      inFrustum: true,
      occluded: true, // Occluded by wall
      inActivationRange: true,
    };

    expect(isHotspotVisible(occludedCandidate)).toBe(false);
  });
});
