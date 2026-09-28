/**
 * HavenArt — Phase 1 Zone Manifests & Spatial Partitioning Configuration
 * Contract Version: havenart-contracts-1.1
 * References: docs/SCENE_ARCHITECTURE.md, docs/ASSET_PIPELINE.md
 */

import type { ZoneManifestEntry } from '@/types/scene';
import type { ChapterId } from '@/types/story';

/**
 * Phase 1 Zone Manifest Entries.
 * In Phase 1, procedural proxies are resident (assetUri === null)
 * with zero required network download (C07 contract).
 */
export const ZONE_MANIFESTS: readonly ZoneManifestEntry[] = [
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

/**
 * Mapping from ChapterId to corresponding Zone ID (C07)
 */
export const CHAPTER_ZONE_MAP: Record<ChapterId, string> = {
  exterior: 'exterior',
  approach: 'exterior',
  entrance: 'entrance',
  living: 'living',
  garden: 'garden',
  finale: 'garden',
} as const;

export const DEFAULT_STREAMING_BUDGET_BYTES = 45 * 1024 * 1024; // 45 MB
export const DEFAULT_MAX_RESIDENT_DETAIL_ZONES = 2;
