/**
 * HavenArt — Scene & 3D Environment Contracts
 * Contract Version: havenart-contracts-1.1
 */

import type { Object3D } from 'three';
import type { Vec3, ChapterId } from './story';

export interface RailDerivative {
  readonly metersPerProgress: number;
  readonly radiansPerProgress: number;
}

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

export interface ZoneManifestEntry {
  readonly id: string;
  readonly assetUri: string | null;
  readonly encodedBytes: number;
  readonly bounds: {
    readonly min: Vec3;
    readonly max: Vec3;
  };
  readonly origin: Vec3;
  readonly dependencies: readonly string[];
  readonly licenseRecordIds: readonly string[];
}

export interface ZoneHandle {
  readonly id: string;
  readonly ready: boolean;
  readonly root: Object3D;
  release(): void;
}

export interface ZoneLoader {
  acquire(zone: ZoneManifestEntry, signal?: AbortSignal): Promise<ZoneHandle>;
}

export interface ZoneManagerDeps {
  readonly loader: ZoneLoader;
  readonly zones: readonly ZoneManifestEntry[];
  readonly budgetBytes: number;
  readonly maxDetailZones: number;
  readonly chapterZones: Record<ChapterId, string>;
  onResidentChange(handles: readonly ZoneHandle[]): void;
  onCoreFailure(error: Error): void;
}

export interface ZoneManager {
  update(p: number, direction: -1 | 0 | 1): void;
  dispose(): void;
}
