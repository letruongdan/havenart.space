import { describe, it, expect, vi } from 'vitest';
import { Group, MeshBasicMaterial, BoxGeometry } from 'three';
import { ResourceRegistry } from '@/lib/three/resourceRegistry';
import { AssetLoader } from '@/lib/three/assetLoader';
import { createZoneManager } from '@/lib/three/zoneManager';
import type { ZoneHandle, ZoneLoader, ZoneManifestEntry } from '@/types/scene';
import type { ChapterId } from '@/types/story';

const testChapterZones: Record<ChapterId, string> = {
  exterior: 'exterior',
  approach: 'exterior',
  entrance: 'entrance',
  living: 'living',
  garden: 'garden',
  finale: 'garden',
};

const testManifests: readonly ZoneManifestEntry[] = [
  {
    id: 'shell',
    assetUri: null,
    encodedBytes: 100_000,
    bounds: { min: [-12, -1, -20], max: [12, 10, 32] },
    origin: [0, 0, 0],
    dependencies: [],
    licenseRecordIds: [],
  },
  {
    id: 'exterior',
    assetUri: null,
    encodedBytes: 500_000,
    bounds: { min: [-12, -1, -20], max: [12, 10, 0] },
    origin: [0, 0, -10],
    dependencies: [],
    licenseRecordIds: [],
  },
  {
    id: 'entrance',
    assetUri: null,
    encodedBytes: 400_000,
    bounds: { min: [-3, -1, 0], max: [3, 5, 4] },
    origin: [0, 0, 0],
    dependencies: ['exterior'],
    licenseRecordIds: [],
  },
  {
    id: 'living',
    assetUri: null,
    encodedBytes: 800_000,
    bounds: { min: [-8, -1, 4], max: [8, 6, 15.5] },
    origin: [0, 0, 8],
    dependencies: ['entrance'],
    licenseRecordIds: [],
  },
  {
    id: 'garden',
    assetUri: null,
    encodedBytes: 600_000,
    bounds: { min: [-12, -1, 15.5], max: [12, 12, 32] },
    origin: [0, 0, 22],
    dependencies: ['living'],
    licenseRecordIds: [],
  },
];

describe('W09 — Resource Registry & Ref-counting (W09-AC2)', () => {
  it('retains shared materials and disposes only when ref count drops to zero', () => {
    const registry = new ResourceRegistry();
    const material = new MeshBasicMaterial({ color: 0xff0000 });
    const disposeSpy = vi.spyOn(material, 'dispose');

    // Register sets refCount to 1
    registry.registerMaterial('mat_red', material);
    expect(registry.getMaterialRefCount('mat_red')).toBe(1);

    // Retain increments to 2
    registry.retainMaterial('mat_red');
    expect(registry.getMaterialRefCount('mat_red')).toBe(2);

    // Release decrements to 1 (should NOT dispose)
    registry.releaseMaterial('mat_red');
    expect(registry.getMaterialRefCount('mat_red')).toBe(1);
    expect(disposeSpy).not.toHaveBeenCalled();

    // Final release drops to 0 (MUST dispose)
    registry.releaseMaterial('mat_red');
    expect(registry.getMaterialRefCount('mat_red')).toBe(0);
    expect(disposeSpy).toHaveBeenCalledTimes(1);
    expect(registry.getMaterial('mat_red')).toBeNull();
  });

  it('retains shared geometries and disposes only when ref count reaches zero', () => {
    const registry = new ResourceRegistry();
    const geometry = new BoxGeometry(1, 1, 1);
    const disposeSpy = vi.spyOn(geometry, 'dispose');

    registry.registerGeometry('geom_box', geometry);
    expect(registry.getGeometryRefCount('geom_box')).toBe(1);

    registry.releaseGeometry('geom_box');
    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });
});

describe('W09 — Asset Loader Fallback & Core Errors (W09-AC3)', () => {
  it('returns procedural proxy when decorative network GLB load fails', async () => {
    const registry = new ResourceRegistry();
    const proxyGroup = new Group();
    proxyGroup.name = 'custom_living_proxy';
    registry.registerProxyFactory('living', () => proxyGroup);

    // Loader with failing GLB loader
    const loader = new AssetLoader({
      registry,
      loadGltf: vi.fn().mockRejectedValue(new Error('Network 404 GLB')),
      criticalZoneIds: ['shell'],
    });

    const decorativeManifest: ZoneManifestEntry = {
      id: 'living',
      assetUri: 'https://assets.havenart.space/living.glb',
      encodedBytes: 500_000,
      bounds: { min: [-8, -1, 4], max: [8, 6, 15.5] },
      origin: [0, 0, 8],
      dependencies: [],
      licenseRecordIds: [],
    };

    const handle = await loader.acquire(decorativeManifest);
    expect(handle.ready).toBe(true);
    expect(handle.id).toBe('living');
    expect(handle.root).toBe(proxyGroup);
  });

  it('throws error without swallowing when critical/core zone fails', async () => {
    const loader = new AssetLoader({
      loadGltf: vi.fn().mockRejectedValue(new Error('Critical shell download failed')),
      criticalZoneIds: ['shell'],
    });

    const shellManifest: ZoneManifestEntry = {
      id: 'shell',
      assetUri: 'https://assets.havenart.space/shell.glb',
      encodedBytes: 2_000_000,
      bounds: { min: [-12, -1, -20], max: [12, 10, 32] },
      origin: [0, 0, 0],
      dependencies: [],
      licenseRecordIds: [],
    };

    await expect(loader.acquire(shellManifest)).rejects.toThrow('Critical shell download failed');
  });

  it('aborts cleanly when signal is aborted', async () => {
    const loader = new AssetLoader({
      loadGltf: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 500))),
    });

    const controller = new AbortController();
    controller.abort();

    const manifest = testManifests[1]; // exterior
    await expect(loader.acquire(manifest, controller.signal)).rejects.toThrow();
  });
});

describe('W09 — Zone Streaming & LRU Eviction (W09-AC1)', () => {
  it('pins active zone and shell; never evicts them while active', async () => {
    const residentChangeSpy = vi.fn();
    const coreFailureSpy = vi.fn();

    const fakeLoader: ZoneLoader = {
      acquire: vi.fn().mockImplementation(async (zone: ZoneManifestEntry) => ({
        id: zone.id,
        ready: true,
        root: new Group(),
        release: vi.fn(),
      })),
    };

    const zoneManager = createZoneManager({
      loader: fakeLoader,
      zones: testManifests,
      budgetBytes: 1_000_000, // Budget allows active + 1 small neighbor
      maxDetailZones: 2,
      chapterZones: testChapterZones,
      onResidentChange: residentChangeSpy,
      onCoreFailure: coreFailureSpy,
    });

    // Update at p=0.0 (exterior) forward
    zoneManager.update(0.0, 1);
    await new Promise((r) => setTimeout(r, 10));

    expect(residentChangeSpy).toHaveBeenCalled();
    const lastHandles = residentChangeSpy.mock.calls.at(-1)![0] as ZoneHandle[];
    const residentIds = lastHandles.map((h) => h.id);

    // Active zone (exterior) and shell MUST be resident
    expect(residentIds).toContain('exterior');
    expect(residentIds).toContain('shell');

    zoneManager.dispose();
  });

  it('swaps neighbor priority when direction is reversed', async () => {
    const fakeHandles = new Map<string, ZoneHandle>();

    const fakeLoader: ZoneLoader = {
      acquire: vi.fn().mockImplementation(async (zone: ZoneManifestEntry) => {
        const handle: ZoneHandle = {
          id: zone.id,
          ready: true,
          root: new Group(),
          release: vi.fn(),
        };
        fakeHandles.set(zone.id, handle);
        return handle;
      }),
    };

    const residentChangeSpy = vi.fn();

    const zoneManager = createZoneManager({
      loader: fakeLoader,
      zones: testManifests,
      budgetBytes: 1_500_000,
      maxDetailZones: 2, // Active + 1 neighbor
      chapterZones: testChapterZones,
      onResidentChange: residentChangeSpy,
      onCoreFailure: vi.fn(),
    });

    // 1. In 'entrance' (p=0.3), direction = 1 (forward) -> neighbor prioritized is 'living'
    zoneManager.update(0.3, 1);
    await new Promise((r) => setTimeout(r, 15));

    let handles = residentChangeSpy.mock.calls.at(-1)![0] as ZoneHandle[];
    let ids = handles.map((h) => h.id);
    expect(ids).toContain('entrance');
    expect(ids).toContain('living');

    // 2. In 'entrance' (p=0.3), direction = -1 (reverse) -> neighbor prioritized is 'exterior'
    zoneManager.update(0.3, -1);
    await new Promise((r) => setTimeout(r, 15));

    handles = residentChangeSpy.mock.calls.at(-1)![0] as ZoneHandle[];
    ids = handles.map((h) => h.id);
    expect(ids).toContain('entrance');
    expect(ids).toContain('exterior');
    expect(ids).not.toContain('living');

    zoneManager.dispose();
  });

  it('reports core failure to onCoreFailure when shell or active zone cannot load', async () => {
    const coreFailureSpy = vi.fn();

    const failingLoader: ZoneLoader = {
      acquire: vi.fn().mockRejectedValue(new Error('Shell GLB Missing')),
    };

    const zoneManager = createZoneManager({
      loader: failingLoader,
      zones: testManifests,
      budgetBytes: 2_000_000,
      maxDetailZones: 3,
      chapterZones: testChapterZones,
      onResidentChange: vi.fn(),
      onCoreFailure: coreFailureSpy,
    });

    zoneManager.update(0.0, 1);
    await new Promise((r) => setTimeout(r, 10));

    expect(coreFailureSpy).toHaveBeenCalled();
    expect(coreFailureSpy.mock.calls[0][0].message).toContain('Shell GLB Missing');

    zoneManager.dispose();
  });
});
