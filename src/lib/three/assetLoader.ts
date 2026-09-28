/**
 * HavenArt — Three.js Zone Asset Loader with Proxy Fallback
 * Contract Version: havenart-contracts-1.1
 * References: docs/ASSET_PIPELINE.md, docs/SCENE_ARCHITECTURE.md
 */

import { Object3D, Group } from 'three';
import type { ZoneHandle, ZoneLoader, ZoneManifestEntry } from '@/types/scene';
import { ResourceRegistry, defaultResourceRegistry } from './resourceRegistry';

export type GltfLoadFunction = (uri: string, signal?: AbortSignal) => Promise<Object3D>;

export interface AssetLoaderOptions {
  readonly registry?: ResourceRegistry;
  readonly loadGltf?: GltfLoadFunction;
  readonly criticalZoneIds?: readonly string[];
}

export class AssetLoader implements ZoneLoader {
  private registry: ResourceRegistry;
  private loadGltf?: GltfLoadFunction;
  private criticalZoneIds: Set<string>;

  constructor(options: AssetLoaderOptions = {}) {
    this.registry = options.registry || defaultResourceRegistry;
    this.loadGltf = options.loadGltf;
    this.criticalZoneIds = new Set(options.criticalZoneIds || ['shell']);
  }

  async acquire(zone: ZoneManifestEntry, signal?: AbortSignal): Promise<ZoneHandle> {
    if (signal?.aborted) {
      throw new Error(`Acquisition aborted for zone ${zone.id}`);
    }

    // 1. Procedural proxy zones (assetUri === null)
    if (!zone.assetUri) {
      const root = this.registry.createProxy(zone.id);
      root.name = `zone_${zone.id}`;
      root.position.set(zone.origin[0], zone.origin[1], zone.origin[2]);

      let released = false;
      return {
        id: zone.id,
        ready: true,
        root,
        release: () => {
          if (released) return;
          released = true;
          if (root.parent) {
            root.parent.remove(root);
          }
        },
      };
    }

    // 2. Network asset zones (assetUri !== null)
    try {
      if (signal?.aborted) {
        throw new Error(`Acquisition aborted for zone ${zone.id}`);
      }

      let root: Object3D;

      if (this.loadGltf) {
        root = await this.loadGltf(zone.assetUri, signal);
      } else {
        // Default Three.js fallback or mock loader
        const group = new Group();
        group.name = `loaded_${zone.id}`;
        root = group;
      }

      if (signal?.aborted) {
        throw new Error(`Acquisition aborted after load for zone ${zone.id}`);
      }

      root.position.set(zone.origin[0], zone.origin[1], zone.origin[2]);

      let released = false;
      return {
        id: zone.id,
        ready: true,
        root,
        release: () => {
          if (released) return;
          released = true;
          if (root.parent) {
            root.parent.remove(root);
          }
        },
      };
    } catch (err: unknown) {
      // If acquisition was deliberately aborted, propagate immediately
      if (signal?.aborted || (err instanceof Error && err.message.includes('aborted'))) {
        throw err;
      }

      // If this is a core/critical zone, do not swallow the error (W09-AC3)
      if (this.criticalZoneIds.has(zone.id)) {
        throw err instanceof Error ? err : new Error(`Failed to load critical zone: ${zone.id}`);
      }

      // For decorative zones, gracefully fall back to the procedural proxy (W09-AC3)
      const fallbackRoot = this.registry.createProxy(zone.id);
      fallbackRoot.name = `proxy_fallback_${zone.id}`;
      fallbackRoot.position.set(zone.origin[0], zone.origin[1], zone.origin[2]);

      let released = false;
      return {
        id: zone.id,
        ready: true,
        root: fallbackRoot,
        release: () => {
          if (released) return;
          released = true;
          if (fallbackRoot.parent) {
            fallbackRoot.parent.remove(fallbackRoot);
          }
        },
      };
    }
  }
}
