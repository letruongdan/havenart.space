/**
 * HavenArt — Camera Rail Clearance & Collision Validation
 * Contract Version: havenart-contracts-1.1
 * References: docs/CAMERA_SCROLL_SPEC.md §7, docs/SCENE_ARCHITECTURE.md §2
 */

import type { CameraPose, Vec3 } from '@/types/story';
import { CAMERA_OPTICS } from '@/config/camera';

export interface ClearanceObstacle {
  readonly id: string;
  readonly min: Vec3;
  readonly max: Vec3;
}

export interface ClearanceIssue {
  readonly p: number;
  readonly obstacleId: string;
  readonly distanceM: number;
}

/**
 * Standard conservative collision obstacles representing villa walls and openings
 * according to docs/SCENE_ARCHITECTURE.md:
 * - Front wall with main doorway opening: X in [-1.4, 1.4] at Z = 0
 * - Rear wall with sliding glass door opening: X in [0.8, 3.8] at Z = 15.5
 */
export const VILLA_FIXTURE_OBSTACLES: readonly ClearanceObstacle[] = [
  // Front exterior left wall
  {
    id: 'front-wall-left',
    min: [-8.0, 0.0, -0.2],
    max: [-1.4, 3.8, 0.2],
  },
  // Front exterior right wall
  {
    id: 'front-wall-right',
    min: [1.4, 0.0, -0.2],
    max: [8.0, 3.8, 0.2],
  },
  // Front doorway header / lintel
  {
    id: 'front-doorway-lintel',
    min: [-1.4, 3.0, -0.2],
    max: [1.4, 3.8, 0.2],
  },
  // Rear living room left wall
  {
    id: 'rear-wall-left',
    min: [-8.0, 0.0, 15.3],
    max: [0.8, 3.8, 15.7],
  },
  // Rear living room right wall
  {
    id: 'rear-wall-right',
    min: [3.8, 0.0, 15.3],
    max: [8.0, 3.8, 15.7],
  },
  // Rear doorway header / lintel
  {
    id: 'rear-doorway-lintel',
    min: [0.8, 3.2, 15.3],
    max: [3.8, 3.8, 15.7],
  },
  // Living room west boundary wall
  {
    id: 'living-west-wall',
    min: [-8.0, 0.0, 0.0],
    max: [-5.8, 3.8, 15.5],
  },
] as const;

/**
 * Calculates Euclidean distance from a point to an axis-aligned bounding box (AABB).
 * Returns 0 if the point is strictly inside the box.
 */
function distancePointToAabb(point: Vec3, min: Vec3, max: Vec3): number {
  const cx = Math.max(min[0], Math.min(max[0], point[0]));
  const cy = Math.max(min[1], Math.min(max[1], point[1]));
  const cz = Math.max(min[2], Math.min(max[2], point[2]));

  const dx = point[0] - cx;
  const dy = point[1] - cy;
  const dz = point[2] - cz;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Validates camera rail samples against conservative clearance obstacles.
 * Returns a list of ClearanceIssue objects where camera is within minClearanceM.
 */
export function validateRailClearance(
  samples: readonly (CameraPose & { p?: number })[],
  obstacles: readonly ClearanceObstacle[],
  minClearanceM: number = CAMERA_OPTICS.minClearanceM
): readonly ClearanceIssue[] {
  const issues: ClearanceIssue[] = [];
  const total = samples.length;

  for (let i = 0; i < total; i++) {
    const sample = samples[i];
    const p = typeof sample.p === 'number'
      ? sample.p
      : total > 1
        ? Math.round((i / (total - 1)) * 1000) / 1000
        : 0;

    for (const obstacle of obstacles) {
      const distance = distancePointToAabb(sample.position, obstacle.min, obstacle.max);

      if (distance < minClearanceM) {
        issues.push({
          p,
          obstacleId: obstacle.id,
          distanceM: Math.round(distance * 1000) / 1000,
        });
      }
    }
  }

  return issues;
}
