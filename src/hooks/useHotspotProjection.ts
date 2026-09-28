'use client';

/**
 * HavenArt — 3D to 2D Hotspot Projection & Visibility Controller
 * Contract Version: havenart-contracts-1.1
 * References: docs/HOTSPOT_SPEC.md, docs/ACCESSIBILITY_SPEC.md
 *
 * Local Criteria (W17):
 * - W17-AC1: Cung cấp screen coordinates cho marker buttons.
 * - W17-AC3: Raycast budget: không raycast every mesh every frame.
 */

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Hotspot, HotspotId, Vec3, CameraPose } from '@/types/story';
import { isHotspotVisible } from '@/lib/story/hotspotVisibility';
import { focalLengthToVerticalFov, CAMERA_OPTICS } from '@/config/camera';

export interface ProjectedHotspot {
  readonly id: HotspotId;
  readonly hotspot: Hotspot;
  readonly screenX: number;
  readonly screenY: number;
  readonly distanceM: number;
  readonly inFrustum: boolean;
  readonly inActivationRange: boolean;
  readonly occluded: boolean;
  readonly visible: boolean;
}

/**
 * Pure projection helper from 3D world position to 2D screen coordinates using Three.js Camera.
 */
export function projectWorldToScreen(
  worldPos: Vec3,
  camera: THREE.Camera,
  viewportWidth: number,
  viewportHeight: number
): {
  screenX: number;
  screenY: number;
  inFrustum: boolean;
  distanceM: number;
} {
  const v = new THREE.Vector3(worldPos[0], worldPos[1], worldPos[2]);
  const camPos = camera.position;
  const distanceM = v.distanceTo(camPos);

  // Project 3D vector to Normalized Device Coordinates (NDC)
  v.project(camera);

  // Frustum bounds check in NDC space [-1, 1]
  const inFrustum =
    v.x >= -1 && v.x <= 1 &&
    v.y >= -1 && v.y <= 1 &&
    v.z >= -1 && v.z <= 1;

  const safeW = Math.max(1, viewportWidth);
  const safeH = Math.max(1, viewportHeight);

  const screenX = Math.round(((v.x + 1) / 2) * safeW);
  const screenY = Math.round(((-v.y + 1) / 2) * safeH);

  return { screenX, screenY, inFrustum, distanceM };
}

/**
 * Pure projection helper from 3D world position and CameraPose (pure data).
 */
export function projectPoseToScreen(
  worldPos: Vec3,
  cameraPose: CameraPose,
  viewportWidth: number,
  viewportHeight: number
): {
  screenX: number;
  screenY: number;
  inFrustum: boolean;
  distanceM: number;
} {
  const safeW = Math.max(1, viewportWidth);
  const safeH = Math.max(1, viewportHeight);
  const aspect = safeW / safeH;

  const camera = new THREE.PerspectiveCamera(
    focalLengthToVerticalFov(cameraPose.focalLengthMm),
    aspect,
    CAMERA_OPTICS.nearPlaneM,
    CAMERA_OPTICS.farPlaneM
  );
  camera.position.set(cameraPose.position[0], cameraPose.position[1], cameraPose.position[2]);
  camera.quaternion.set(
    cameraPose.quaternion[0],
    cameraPose.quaternion[1],
    cameraPose.quaternion[2],
    cameraPose.quaternion[3]
  );
  camera.updateMatrixWorld(true);

  return projectWorldToScreen(worldPos, camera, safeW, safeH);
}

export interface UseHotspotProjectionOptions {
  readonly hotspots: readonly Hotspot[];
  readonly activeRoom: string;
  readonly localProgress: number;
  readonly camera: THREE.Camera | null;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly isOccluded?: (hotspot: Hotspot, camera: THREE.Camera) => boolean;
  readonly occlusionThrottleIntervalFrames?: number;
}

/**
 * Hook calculating 2D screen positions and visibility states for hotspots.
 * Enforces raycast budget by skipping occlusion checks for out-of-frustum/range candidates.
 */
export function useHotspotProjection({
  hotspots,
  activeRoom,
  localProgress,
  camera,
  viewportWidth,
  viewportHeight,
  isOccluded,
  occlusionThrottleIntervalFrames = 6, // Throttle raycast: every 6 frames (~100ms)
}: UseHotspotProjectionOptions): readonly ProjectedHotspot[] {
  const frameCountRef = useRef<number>(0);
  const occlusionCacheRef = useRef<Map<HotspotId, boolean>>(new Map());

  return useMemo(() => {
    if (!camera || viewportWidth <= 0 || viewportHeight <= 0) {
      return [];
    }

    frameCountRef.current++;
    const shouldUpdateOcclusion =
      frameCountRef.current % occlusionThrottleIntervalFrames === 0;

    return hotspots.map((hotspot) => {
      const { screenX, screenY, inFrustum, distanceM } = projectWorldToScreen(
        hotspot.position,
        camera,
        viewportWidth,
        viewportHeight
      );

      const inActivationRange =
        localProgress >= hotspot.activationRange[0] &&
        localProgress <= hotspot.activationRange[1];

      // Raycast budget enforcement:
      // Only perform expensive occlusion check if preliminary fast checks pass
      const isCandidateForOcclusion =
        activeRoom === hotspot.room &&
        inActivationRange &&
        inFrustum &&
        distanceM <= hotspot.maxDistanceM;

      let occluded = false;
      if (isCandidateForOcclusion && isOccluded) {
        if (shouldUpdateOcclusion || !occlusionCacheRef.current.has(hotspot.id)) {
          const result = isOccluded(hotspot, camera);
          occlusionCacheRef.current.set(hotspot.id, result);
        }
        occluded = occlusionCacheRef.current.get(hotspot.id) ?? false;
      }

      const visible = isHotspotVisible({
        activeRoom,
        room: hotspot.room,
        distanceM,
        maxDistanceM: hotspot.maxDistanceM,
        inFrustum,
        occluded,
        inActivationRange,
      });

      return {
        id: hotspot.id,
        hotspot,
        screenX,
        screenY,
        distanceM,
        inFrustum,
        inActivationRange,
        occluded,
        visible,
      };
    });
  }, [
    hotspots,
    activeRoom,
    localProgress,
    camera,
    viewportWidth,
    viewportHeight,
    isOccluded,
    occlusionThrottleIntervalFrames,
  ]);
}
