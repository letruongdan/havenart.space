/**
 * HavenArt — Living Room Detail & Materials Unit Tests
 * Test Suite: tests/unit/living-layout.test.ts
 * Contract Version: havenart-contracts-1.1
 *
 * Local Criteria (W15):
 * - W15-AC1: No furniture obstructing approved camera clearance; open view to garden.
 * - W15-AC2: PBR roughness & metric scales calibrated; no heavy bloom triggers.
 * - W15-AC3: Dedicated material ownership & disposal; hotspot anchors preserved.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createLivingZoneObject } from '@/components/scene/zones/Living';
import {
  createLivingMaterials,
  disposeLivingMaterials,
} from '@/components/scene/materials/LivingMaterials';
import { ZONE_MANIFESTS } from '@/config/zones';
import { CAMERA_OPTICS } from '@/config/camera';
import { HOTSPOTS } from '@/config/hotspots';
import { sampleRail } from '@/lib/three/cameraRail';

describe('W15 — Living Room Detail, Materials & Corridor Clearance', () => {
  const livingManifest = ZONE_MANIFESTS.find((z) => z.id === 'living')!;

  it('W15-AC1: Living room detail fits strictly within spatial manifest boundaries', () => {
    expect(livingManifest).toBeDefined();

    const { group, materials } = createLivingZoneObject('high');
    const bbox = new THREE.Box3().setFromObject(group);

    // Tolerance of 0.05m for bounding box check
    expect(bbox.min.x).toBeGreaterThanOrEqual(livingManifest.bounds.min[0] - 0.05);
    expect(bbox.min.y).toBeGreaterThanOrEqual(livingManifest.bounds.min[1] - 0.05);
    expect(bbox.min.z).toBeGreaterThanOrEqual(livingManifest.bounds.min[2] - 0.05);
    expect(bbox.max.x).toBeLessThanOrEqual(livingManifest.bounds.max[0] + 0.05);
    expect(bbox.max.y).toBeLessThanOrEqual(livingManifest.bounds.max[1] + 0.05);
    expect(bbox.max.z).toBeLessThanOrEqual(livingManifest.bounds.max[2] + 0.05);

    disposeLivingMaterials(materials);
  });

  it('W15-AC1: Camera rail corridor through living room is strictly unobstructed (minClearanceM >= 0.38m)', () => {
    const { group, materials } = createLivingZoneObject('high');

    // Collect all mesh bounding boxes
    const meshBoxes: THREE.Box3[] = [];
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        meshBoxes.push(new THREE.Box3().setFromObject(child));
      }
    });

    expect(meshBoxes.length).toBeGreaterThan(10);

    // Sample camera rail across living room range (p = 0.39 to 0.68)
    const samplesCount = 50;
    for (let i = 0; i <= samplesCount; i++) {
      const p = 0.39 + (0.68 - 0.39) * (i / samplesCount);
      const pose = sampleRail(p);
      const camPos = new THREE.Vector3(...pose.position);

      for (const box of meshBoxes) {
        const closestPoint = new THREE.Vector3();
        box.clampPoint(camPos, closestPoint);
        const distance = camPos.distanceTo(closestPoint);

        expect(
          distance,
          `Obstacle clearance violation at p=${p.toFixed(3)}, camPos=(${camPos.x.toFixed(2)}, ${camPos.y.toFixed(2)}, ${camPos.z.toFixed(2)})`
        ).toBeGreaterThanOrEqual(CAMERA_OPTICS.minClearanceM);
      }
    }

    disposeLivingMaterials(materials);
  });

  it('W15-AC1: Rear sliding glass opening maintains open traversal corridor at X=2.0, Z=15.5', () => {
    const { group, materials } = createLivingZoneObject('high');

    // Corridor at doorway traversal: X in [1.6, 2.4], Y in [0.05, 2.5], Z in [15.3, 15.6]
    const traversalBox = new THREE.Box3(
      new THREE.Vector3(1.6, 0.05, 15.3),
      new THREE.Vector3(2.4, 2.5, 15.6)
    );

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        // Exclude floor tracks beneath the floor plane Y <= 0.02
        const meshBox = new THREE.Box3().setFromObject(child);
        if (meshBox.max.y > 0.05 && meshBox.min.y < 2.5) {
          const intersects = traversalBox.intersectsBox(meshBox);
          expect(
            intersects,
            `Mesh ${child.name} obstructs rear sliding door traversal corridor!`
          ).toBe(false);
        }
      }
    });

    disposeLivingMaterials(materials);
  });

  it('W15-AC2: PBR materials adhere to metric roughness and lighting guidelines without excessive bloom', () => {
    const mats = createLivingMaterials();

    // Travertine: warm stone, roughness 0.60, non-specular
    expect(mats.travertine.roughness).toBeGreaterThanOrEqual(0.5);
    expect(mats.travertine.roughness).toBeLessThanOrEqual(0.7);
    expect(mats.travertine.metalness).toBeLessThan(0.1);

    // Teak wood: natural timber, roughness 0.65
    expect(mats.teakWood.roughness).toBeGreaterThanOrEqual(0.6);
    expect(mats.teakWood.roughness).toBeLessThanOrEqual(0.8);

    // Bronze metal: metallic frame
    expect(mats.bronzeMetal.metalness).toBeGreaterThanOrEqual(0.5);
    expect(mats.bronzeMetal.roughness).toBeLessThan(0.5);

    // Architectural glass: high transmission, low roughness
    expect(mats.architecturalGlass.transparent).toBe(true);
    expect(mats.architecturalGlass.opacity).toBeGreaterThan(0.2);
    expect(mats.architecturalGlass.opacity).toBeLessThan(0.5);
    expect(mats.architecturalGlass.roughness).toBeLessThan(0.15);

    // Luminaire: subdued emissive to avoid heavy bloom artifacts
    expect(mats.ambientLuminaire.emissiveIntensity).toBeLessThanOrEqual(0.5);

    disposeLivingMaterials(mats);
  });

  it('W15-AC3: Hotspot anchors are precisely located and match HOTSPOTS configuration', () => {
    const { group, materials } = createLivingZoneObject('high');

    const travertineConfig = HOTSPOTS.find((h) => h.id === 'travertine-wall')!;
    const slidingGlassConfig = HOTSPOTS.find((h) => h.id === 'sliding-glass')!;

    expect(travertineConfig).toBeDefined();
    expect(slidingGlassConfig).toBeDefined();

    let travertineAnchorFound = false;
    let slidingGlassAnchorFound = false;

    group.traverse((child) => {
      if (child.name === 'hotspot-anchor-travertine-wall') {
        travertineAnchorFound = true;
        expect(child.position.x).toBeCloseTo(travertineConfig.position[0], 2);
        expect(child.position.y).toBeCloseTo(travertineConfig.position[1], 2);
        expect(child.position.z).toBeCloseTo(travertineConfig.position[2], 2);
      }
      if (child.name === 'hotspot-anchor-sliding-glass') {
        slidingGlassAnchorFound = true;
        expect(child.position.x).toBeCloseTo(slidingGlassConfig.position[0], 2);
        expect(child.position.y).toBeCloseTo(slidingGlassConfig.position[1], 2);
        expect(child.position.z).toBeCloseTo(slidingGlassConfig.position[2], 2);
      }
    });

    expect(travertineAnchorFound).toBe(true);
    expect(slidingGlassAnchorFound).toBe(true);

    disposeLivingMaterials(materials);
  });

  it('W15-AC3: Quality tier adjusts shadow casting and material ownership clean disposal', () => {
    const high = createLivingZoneObject('high');
    const low = createLivingZoneObject('low');

    let highShadowCount = 0;
    high.group.traverse((c) => {
      if ((c as THREE.Mesh).castShadow) highShadowCount++;
    });

    let lowShadowCount = 0;
    low.group.traverse((c) => {
      if ((c as THREE.Mesh).castShadow) lowShadowCount++;
    });

    expect(highShadowCount).toBeGreaterThan(lowShadowCount);
    expect(lowShadowCount).toBe(0);

    // Clean disposal without errors
    expect(() => disposeLivingMaterials(high.materials)).not.toThrow();
    expect(() => disposeLivingMaterials(low.materials)).not.toThrow();
  });
});
