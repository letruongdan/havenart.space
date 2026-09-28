/**
 * HavenArt — Camera & Rail Configuration
 * Contract Version: havenart-contracts-1.1
 * References: docs/CAMERA_SCROLL_SPEC.md, docs/SCENE_ARCHITECTURE.md
 */

import type { Vec3 } from '@/types/story';

export interface CameraWaypoint {
  readonly progress: number;
  readonly position: Vec3;
  readonly target: Vec3;
  readonly focalLengthMm: number;
  readonly description: string;
}

/**
 * Camera optical parameters
 * Note: focalLengthMm is focal length in millimeters (full frame 36x24mm sensor),
 * NOT field-of-view in degrees (W08-AC2).
 */
export const CAMERA_OPTICS = {
  defaultFocalLengthMm: 42,
  minFocalLengthMm: 35,
  maxFocalLengthMm: 55,
  sensorWidthMm: 36,
  sensorHeightMm: 24,
  nearPlaneM: 0.08,
  farPlaneM: 100.0,
  corridorRadiusM: 0.30,
  minClearanceM: 0.38, // corridorRadius (0.30) + nearPlane (0.08)
} as const;

/**
 * Converts focal length (mm) to vertical FOV (degrees) for a given sensor height.
 * Default sensor height is 24mm (35mm full frame standard).
 */
export function focalLengthToVerticalFov(
  focalLengthMm: number,
  sensorHeightMm: number = CAMERA_OPTICS.sensorHeightMm
): number {
  if (focalLengthMm <= 0) {
    throw new Error(`focalLengthMm must be strictly positive, received ${focalLengthMm}`);
  }
  return 2 * Math.atan(sensorHeightMm / (2 * focalLengthMm)) * (180 / Math.PI);
}

/**
 * Phase 1 Camera Waypoints according to docs/CAMERA_SCROLL_SPEC.md §2
 * Continuous journey: exterior -> approach -> entrance -> living -> garden -> finale
 */
export const CAMERA_WAYPOINTS: readonly CameraWaypoint[] = [
  {
    progress: 0.0,
    position: [0.0, 1.65, -18.0],
    target: [0.0, 1.65, -7.0],
    focalLengthMm: 42,
    description: 'Exterior: View of tropical villa and trees against soft afternoon sky',
  },
  {
    progress: 0.15,
    position: [0.0, 1.65, -7.0],
    target: [0.0, 1.65, 0.0],
    focalLengthMm: 42,
    description: 'Approach: Moving down pathway, front door straight ahead',
  },
  {
    progress: 0.27,
    position: [0.0, 1.65, -0.8],
    target: [0.0, 1.65, 4.4],
    focalLengthMm: 42,
    description: 'Entrance approach: Approaching main threshold at Z=0',
  },
  {
    progress: 0.39,
    position: [0.0, 1.65, 4.4],
    target: [2.8, 1.60, 7.7],
    focalLengthMm: 42,
    description: 'Entrance foyer: Stepping inside, opening visual axis towards living area',
  },
  {
    progress: 0.54,
    position: [2.8, 1.60, 7.7],
    target: [2.0, 1.65, 14.6],
    focalLengthMm: 42,
    description: 'Living room: Slower pace examining travertine wall and sliding glass door',
  },
  {
    progress: 0.68,
    position: [2.0, 1.65, 14.6],
    target: [2.0, 1.65, 19.0],
    focalLengthMm: 42,
    description: 'Rear threshold: Passing through open sliding glass door at Z=15.5',
  },
  {
    progress: 0.76,
    position: [2.0, 1.65, 19.0],
    target: [0.0, 2.00, 23.0],
    focalLengthMm: 42,
    description: 'Terrace: Emerging onto rear garden terrace with villa light behind',
  },
  {
    progress: 0.87,
    position: [0.0, 2.00, 23.0],
    target: [0.0, 2.50, 15.0],
    focalLengthMm: 42,
    description: 'Garden: Surrounded by lush trees, smoothly turning to gaze back at home',
  },
  {
    progress: 1.0,
    position: [0.0, 6.00, 29.0],
    target: [0.0, 2.00, 10.0],
    focalLengthMm: 42,
    description: 'Finale: Elevated panoramic reveal embracing villa, interior warmth, and garden',
  },
] as const;
