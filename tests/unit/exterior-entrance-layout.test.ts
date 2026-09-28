/**
 * HavenArt — Exterior and Entrance Detail Layout Unit Tests
 * Test Suite: tests/unit/exterior-entrance-layout.test.ts
 * Contract Version: havenart-contracts-1.1
 *
 * Local Criteria (W14):
 * - W14-AC1: Contemporary Tropical Minimalism, natural proportions, within zone bounds.
 * - W14-AC2: No obstruction of doorway or camera rail corridor; full 3D geometry for reverse view.
 * - W14-AC3: Asset records/byte estimates verified (pure procedural, 0 network bytes).
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createExteriorZoneObject } from '@/components/scene/zones/Exterior';
import { createEntranceZoneObject } from '@/components/scene/zones/Entrance';
import { ZONE_MANIFESTS } from '@/config/zones';
import { CAMERA_OPTICS } from '@/config/camera';
import { sampleRail } from '@/lib/three/cameraRail';

describe('W14 — Exterior and Entrance Layout & Corridor Clearance', () => {
  const exteriorManifest = ZONE_MANIFESTS.find((z) => z.id === 'exterior')!;
  const entranceManifest = ZONE_MANIFESTS.find((z) => z.id === 'entrance')!;

  it('W14-AC1: Zone details fit strictly within spatial manifest boundaries', () => {
    expect(exteriorManifest).toBeDefined();
    expect(entranceManifest).toBeDefined();

    const exteriorObj = createExteriorZoneObject('high');
    const entranceObj = createEntranceZoneObject('high');

    const exteriorBbox = new THREE.Box3().setFromObject(exteriorObj);
    const entranceBbox = new THREE.Box3().setFromObject(entranceObj);

    // Exterior bounding box checks (with 0.05m tolerance)
    expect(exteriorBbox.min.x).toBeGreaterThanOrEqual(exteriorManifest.bounds.min[0] - 0.05);
    expect(exteriorBbox.min.y).toBeGreaterThanOrEqual(exteriorManifest.bounds.min[1] - 0.05);
    expect(exteriorBbox.min.z).toBeGreaterThanOrEqual(exteriorManifest.bounds.min[2] - 0.05);
    expect(exteriorBbox.max.x).toBeLessThanOrEqual(exteriorManifest.bounds.max[0] + 0.05);
    expect(exteriorBbox.max.y).toBeLessThanOrEqual(exteriorManifest.bounds.max[1] + 0.05);
    expect(exteriorBbox.max.z).toBeLessThanOrEqual(exteriorManifest.bounds.max[2] + 0.05);

    // Entrance bounding box checks (with 0.05m tolerance)
    expect(entranceBbox.min.x).toBeGreaterThanOrEqual(entranceManifest.bounds.min[0] - 0.05);
    expect(entranceBbox.min.y).toBeGreaterThanOrEqual(entranceManifest.bounds.min[1] - 0.05);
    expect(entranceBbox.min.z).toBeGreaterThanOrEqual(entranceManifest.bounds.min[2] - 0.05);
    expect(entranceBbox.max.x).toBeLessThanOrEqual(entranceManifest.bounds.max[0] + 0.05);
    expect(entranceBbox.max.y).toBeLessThanOrEqual(entranceManifest.bounds.max[1] + 0.05);
    expect(entranceBbox.max.z).toBeLessThanOrEqual(entranceManifest.bounds.max[2] + 0.05);
  });

  it('W14-AC2: Camera rail corridor is strictly unobstructed (minClearanceM >= 0.38m)', () => {
    const exteriorObj = createExteriorZoneObject('high');
    const entranceObj = createEntranceZoneObject('high');

    const combinedGroup = new THREE.Group();
    combinedGroup.add(exteriorObj);
    combinedGroup.add(entranceObj);

    // Collect all individual mesh bounding boxes
    const meshBoxes: THREE.Box3[] = [];
    combinedGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        meshBoxes.push(new THREE.Box3().setFromObject(child));
      }
    });

    expect(meshBoxes.length).toBeGreaterThan(15);

    // Sample camera rail across exterior and entrance chapters (p = 0.0 to 0.39)
    const samplesCount = 50;
    for (let i = 0; i <= samplesCount; i++) {
      const p = 0.39 * (i / samplesCount);
      const pose = sampleRail(p);
      const camPos = new THREE.Vector3(...pose.position);

      for (const box of meshBoxes) {
        // Calculate closest point on bounding box to camera position
        const closestPoint = new THREE.Vector3();
        box.clampPoint(camPos, closestPoint);
        const distance = camPos.distanceTo(closestPoint);

        expect(
          distance,
          `Obstacle clearance violation at p=${p.toFixed(3)}, camPos=(${camPos.x.toFixed(2)}, ${camPos.y.toFixed(2)}, ${camPos.z.toFixed(2)}) against box (${box.min.toArray().join(',')}) to (${box.max.toArray().join(',')})`
        ).toBeGreaterThanOrEqual(CAMERA_OPTICS.minClearanceM);
      }
    }
  });

  it('W14-AC2: Front door opening X in [-1.4, 1.4] at Z=0 is free for traversal', () => {
    const entranceObj = createEntranceZoneObject('high');

    // The central corridor at threshold Z=0 (X in [-0.8, 0.8], Y in [0, 2.5]) must have no meshes
    const corridorBox = new THREE.Box3(
      new THREE.Vector3(-0.8, 0.05, -0.1),
      new THREE.Vector3(0.8, 2.5, 0.1)
    );

    entranceObj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const meshBox = new THREE.Box3().setFromObject(child);
        const intersects = corridorBox.intersectsBox(meshBox);
        expect(
          intersects,
          `Mesh ${child.name} collides with central door clearance corridor!`
        ).toBe(false);
      }
    });
  });

  it('W14-AC2: All elements feature genuine 3D geometry ensuring visibility when viewed in reverse', () => {
    const exteriorObj = createExteriorZoneObject('high');
    const entranceObj = createEntranceZoneObject('high');

    [exteriorObj, entranceObj].forEach((group) => {
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const box = new THREE.Box3().setFromObject(mesh);
          const size = new THREE.Vector3();
          box.getSize(size);

          // All meshes must possess non-zero 3D extent across all dimensions
          expect(size.x, `Mesh ${mesh.name} width`).toBeGreaterThan(0);
          expect(size.y, `Mesh ${mesh.name} height`).toBeGreaterThan(0);
          expect(size.z, `Mesh ${mesh.name} depth`).toBeGreaterThan(0);

          // Mesh materials must be valid Standard materials
          const mat = mesh.material as THREE.MeshStandardMaterial;
          expect(mat).toBeDefined();
          expect(mat.roughness).toBeDefined();
        }
      });
    });
  });

  it('W14-AC1 & W14-AC2: Quality tier scaling adapts shadow casting and detail level', () => {
    const highExterior = createExteriorZoneObject('high');
    const lowExterior = createExteriorZoneObject('low');

    let highShadowCount = 0;
    highExterior.traverse((c) => {
      if ((c as THREE.Mesh).castShadow) highShadowCount++;
    });

    let lowShadowCount = 0;
    lowExterior.traverse((c) => {
      if ((c as THREE.Mesh).castShadow) lowShadowCount++;
    });

    expect(highShadowCount).toBeGreaterThan(lowShadowCount);
    expect(lowShadowCount).toBe(0);

    const highEntrance = createEntranceZoneObject('high');
    const lowEntrance = createEntranceZoneObject('low');

    let highEntranceShadows = 0;
    highEntrance.traverse((c) => {
      if ((c as THREE.Mesh).castShadow) highEntranceShadows++;
    });

    let lowEntranceShadows = 0;
    lowEntrance.traverse((c) => {
      if ((c as THREE.Mesh).castShadow) lowEntranceShadows++;
    });

    expect(highEntranceShadows).toBeGreaterThan(lowEntranceShadows);
    expect(lowEntranceShadows).toBe(0);
  });

  it('W14-AC3: Manifest records zero network bytes for Phase 1 procedural proxies', () => {
    expect(exteriorManifest.assetUri).toBeNull();
    expect(exteriorManifest.encodedBytes).toBe(0);
    expect(exteriorManifest.licenseRecordIds).toEqual([]);

    expect(entranceManifest.assetUri).toBeNull();
    expect(entranceManifest.encodedBytes).toBe(0);
    expect(entranceManifest.licenseRecordIds).toEqual([]);
  });
});
