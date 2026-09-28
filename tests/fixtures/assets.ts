/**
 * HavenArt — Asset & Spatial Test Fixtures
 * Contract Version: havenart-contracts-1.1
 */

import type { ZoneManifestEntry, ClearanceObstacle } from '@/types/scene';
import type { CameraPose } from '@/types/story';

export const mockZoneManifests: readonly ZoneManifestEntry[] = [
  {
    id: 'exterior',
    assetUri: null,
    encodedBytes: 0,
    bounds: {
      min: [-12, -1, -20],
      max: [12, 10, 0],
    },
    origin: [0, 0, -10],
    dependencies: [],
    licenseRecordIds: [],
  },
  {
    id: 'entrance',
    assetUri: null,
    encodedBytes: 0,
    bounds: {
      min: [-3, -1, 0],
      max: [3, 5, 4],
    },
    origin: [0, 0, 0],
    dependencies: ['exterior'],
    licenseRecordIds: [],
  },
  {
    id: 'living',
    assetUri: null,
    encodedBytes: 0,
    bounds: {
      min: [-8, -1, 4],
      max: [8, 6, 15.5],
    },
    origin: [0, 0, 8],
    dependencies: ['entrance'],
    licenseRecordIds: [],
  },
  {
    id: 'garden',
    assetUri: null,
    encodedBytes: 0,
    bounds: {
      min: [-12, -1, 15.5],
      max: [12, 12, 32],
    },
    origin: [0, 0, 22],
    dependencies: ['living'],
    licenseRecordIds: [],
  },
] as const;

export const mockObstacles: readonly ClearanceObstacle[] = [
  {
    id: 'main-door-left-pillar',
    min: [-2.5, 0, -0.3],
    max: [-1.4, 3.2, 0.3],
  },
  {
    id: 'main-door-right-pillar',
    min: [1.4, 0, -0.3],
    max: [2.5, 3.2, 0.3],
  },
  {
    id: 'living-room-sofa',
    min: [-1.2, 0, 7.0],
    max: [1.5, 0.9, 9.5],
  },
] as const;

export const mockCameraPose: CameraPose = {
  position: [0, 1.65, -18],
  target: [0, 1.65, 0],
  quaternion: [0, 0, 0, 1],
  focalLengthMm: 42,
};
