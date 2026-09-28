'use client';

/**
 * HavenArt — Garden Zone Detail & Landscape Atmosphere
 * Contract Version: havenart-contracts-1.1
 * References: docs/SCENE_ARCHITECTURE.md, docs/UX_STORYBOARD.md, docs/HOTSPOT_SPEC.md
 *
 * Local Criteria (W19):
 * - W19-AC1: Cửa ra vườn giữ clearance; final rise ngoài mái và nhà ấm nhìn từ ngoài.
 * - W19-AC2: garden-tree anchor giữ tọa độ [1.5, 2.0, 24.5] và nghĩa; cây mới không che rail.
 * - W19-AC3: Không tạo #contact thứ hai; tôn trọng ranh giới zone.
 */

import React from 'react';
import * as THREE from 'three';
import '@react-three/fiber';
import type { ZoneProps } from '@/types/story';
import type { QualityTier } from '@/types/story';

export type GardenProps = Partial<ZoneProps>;

/**
 * Procedural factory to build the Garden Zone detail as a Three.js Group.
 * Fits strictly within ZONE_MANIFESTS bounds:
 * min: [-12, -1, 15.5], max: [12, 12, 32]
 *
 * Anchor guaranteed:
 * - 'garden-tree' at [1.5, 2.0, 24.5]
 *
 * Clearance Corridor Guarantee:
 * Camera rail passes from (2.0, 1.65, 14.6) -> (2.0, 1.65, 19.0) -> (0.0, 2.0, 23.0) -> (0.0, 6.0, 29.0).
 * All obstacles maintain distance >= CAMERA_OPTICS.minClearanceM (0.38m).
 */
export function createGardenZoneObject(tier: Exclude<QualityTier, 'fallback'> = 'high'): THREE.Group {
  const gardenGroup = new THREE.Group();
  gardenGroup.name = 'zone_garden';

  const isHigh = tier === 'high';
  const isLow = tier === 'low';

  // 1. Materials: Tropical Landscape Palette
  const teakWoodMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a382b,
    roughness: 0.7,
    metalness: 0.05,
    name: 'garden-teak-wood',
  });

  const stoneMaterial = new THREE.MeshStandardMaterial({
    color: 0xd6d0c2,
    roughness: 0.75,
    metalness: 0.05,
    name: 'garden-travertine-step',
  });

  const treeTrunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x443527,
    roughness: 0.9,
    metalness: 0.0,
    name: 'garden-tree-trunk',
  });

  const foliageDeepMaterial = new THREE.MeshStandardMaterial({
    color: 0x2b4524,
    roughness: 0.8,
    metalness: 0.0,
    name: 'garden-foliage-deep',
  });

  const foliageLightMaterial = new THREE.MeshStandardMaterial({
    color: 0x3f6334,
    roughness: 0.75,
    metalness: 0.0,
    name: 'garden-foliage-light',
  });

  const planterMaterial = new THREE.MeshStandardMaterial({
    color: 0x4e4842,
    roughness: 0.8,
    metalness: 0.1,
    name: 'garden-planter-curb',
  });

  const boundaryWallMaterial = new THREE.MeshStandardMaterial({
    color: 0x38342f,
    roughness: 0.85,
    metalness: 0.1,
    name: 'garden-boundary-wall',
  });

  // 2. Terrace Outdoor Living Elements (Z in [15.8, 18.5], placed safely at X in [-1.2, 0.4])
  // Minimalist Outdoor Teak Bench (flanking the left terrace edge)
  const benchGeom = new THREE.BoxGeometry(1.4, 0.4, 0.6);
  const bench = new THREE.Mesh(benchGeom, teakWoodMaterial);
  bench.position.set(-0.4, 0.2, 17.5);
  bench.castShadow = !isLow;
  bench.receiveShadow = true;
  bench.name = 'garden-terrace-bench';
  gardenGroup.add(bench);

  // Minimalist Outdoor Low Stool / Side Table
  const stoolGeom = new THREE.BoxGeometry(0.45, 0.35, 0.45);
  const stool = new THREE.Mesh(stoolGeom, teakWoodMaterial);
  stool.position.set(-0.4, 0.175, 16.5);
  stool.castShadow = !isLow;
  stool.receiveShadow = true;
  stool.name = 'garden-terrace-stool';
  gardenGroup.add(stool);

  // 3. Terrace-to-Lawn Stepping Stones (Z in [18.8, 21.5])
  const stepZOffsets = [19.2, 20.2, 21.2];
  stepZOffsets.forEach((z, idx) => {
    // Stepping stones guiding path towards garden center
    const stoneGeom = new THREE.BoxGeometry(0.9, 0.03, 0.7);
    const stone = new THREE.Mesh(stoneGeom, stoneMaterial);
    const stoneX = 1.6 - idx * 0.5; // Curves gently from X=1.6 at Z=19.2 to X=0.6 at Z=21.2
    stone.position.set(stoneX, 0.015, z);
    stone.receiveShadow = true;
    stone.name = `garden-stepping-stone-${idx}`;
    gardenGroup.add(stone);
  });

  // 4. Hero Garden Tree & Hotspot Anchor (X = 1.5, Y = 2.0, Z = 24.5)
  // Tree Trunk
  const heroTrunkGeom = new THREE.CylinderGeometry(0.18, 0.26, 3.6, isHigh ? 12 : 8);
  const heroTrunk = new THREE.Mesh(heroTrunkGeom, treeTrunkMaterial);
  heroTrunk.position.set(1.5, 1.8, 24.5);
  heroTrunk.castShadow = !isLow;
  heroTrunk.receiveShadow = true;
  heroTrunk.name = 'garden-hero-tree-trunk';
  gardenGroup.add(heroTrunk);

  // Lower Main Foliage Canopy (positioned at X=1.75, Y=4.25 to preserve camera clearance corridor)
  const detailLevel = isHigh ? 1 : 0;
  const heroCanopyLowerGeom = new THREE.DodecahedronGeometry(1.5, detailLevel);
  const heroCanopyLower = new THREE.Mesh(heroCanopyLowerGeom, foliageDeepMaterial);
  heroCanopyLower.position.set(1.75, 4.25, 24.6);
  heroCanopyLower.castShadow = !isLow;
  heroCanopyLower.receiveShadow = true;
  heroCanopyLower.name = 'garden-hero-tree-canopy-lower';
  gardenGroup.add(heroCanopyLower);

  // Upper Tropical Crown
  const heroCanopyUpperGeom = new THREE.DodecahedronGeometry(1.2, detailLevel);
  const heroCanopyUpper = new THREE.Mesh(heroCanopyUpperGeom, foliageLightMaterial);
  heroCanopyUpper.position.set(1.6, 5.15, 24.5);
  heroCanopyUpper.castShadow = !isLow;
  heroCanopyUpper.name = 'garden-hero-tree-canopy-upper';
  gardenGroup.add(heroCanopyUpper);

  // Stable Hotspot Anchor: 'garden-tree' at [1.5, 2.0, 24.5]
  const gardenTreeAnchor = new THREE.Group();
  gardenTreeAnchor.name = 'hotspot-anchor-garden-tree';
  gardenTreeAnchor.position.set(1.5, 2.0, 24.5);
  gardenGroup.add(gardenTreeAnchor);

  // 5. Perimeter Landscape Trees & Tropical Foliage (Framing the view back to villa)
  const perimeterTrees = [
    { name: 'left-mid-tree', x: -4.8, z: 22.0, h: 3.8, r: 0.20, crownR: 1.7, mat: foliageDeepMaterial },
    { name: 'left-rear-tree', x: -6.5, z: 27.0, h: 4.5, r: 0.22, crownR: 2.0, mat: foliageLightMaterial },
    { name: 'right-mid-palm', x: 5.5, z: 22.5, h: 4.2, r: 0.18, crownR: 1.6, mat: foliageLightMaterial },
    { name: 'right-rear-tree', x: 5.2, z: 27.5, h: 4.6, r: 0.24, crownR: 2.1, mat: foliageDeepMaterial },
  ];

  perimeterTrees.forEach((t) => {
    const trunkGeom = new THREE.CylinderGeometry(t.r * 0.7, t.r, t.h, isHigh ? 10 : 6);
    const trunkMesh = new THREE.Mesh(trunkGeom, treeTrunkMaterial);
    trunkMesh.position.set(t.x, t.h / 2, t.z);
    trunkMesh.castShadow = !isLow;
    trunkMesh.name = `garden-tree-trunk-${t.name}`;
    gardenGroup.add(trunkMesh);

    const crownGeom = new THREE.DodecahedronGeometry(t.crownR, detailLevel);
    const crownMesh = new THREE.Mesh(crownGeom, t.mat);
    crownMesh.position.set(t.x, t.h + t.crownR * 0.6, t.z);
    crownMesh.castShadow = !isLow;
    crownMesh.receiveShadow = true;
    crownMesh.name = `garden-tree-crown-${t.name}`;
    gardenGroup.add(crownMesh);
  });

  // 6. Perimeter Garden Planters & Understory Shrubs
  const planterLocations = [
    { x: -5.5, z: 24.5, w: 1.6, d: 7.0 },
    { x: 5.8, z: 24.5, w: 1.6, d: 7.0 },
  ];

  planterLocations.forEach((p, idx) => {
    const pGeom = new THREE.BoxGeometry(p.w, 0.35, p.d);
    const pMesh = new THREE.Mesh(pGeom, planterMaterial);
    pMesh.position.set(p.x, 0.175, p.z);
    pMesh.receiveShadow = true;
    pMesh.castShadow = !isLow;
    pMesh.name = `garden-planter-border-${idx}`;
    gardenGroup.add(pMesh);
  });

  // Low tropical shrubs
  const shrubCoords = [
    { x: -5.2, z: 22.0 },
    { x: -5.4, z: 25.0 },
    { x: -5.1, z: 27.5 },
    { x: 5.4, z: 22.0 },
    { x: 5.5, z: 25.0 },
    { x: 5.3, z: 27.5 },
  ];

  shrubCoords.forEach((coord, idx) => {
    const sGeom = new THREE.IcosahedronGeometry(0.55, 0);
    const sMesh = new THREE.Mesh(sGeom, foliageDeepMaterial);
    sMesh.position.set(coord.x, 0.5, coord.z);
    sMesh.castShadow = isHigh;
    sMesh.receiveShadow = true;
    sMesh.name = `garden-shrub-${idx}`;
    gardenGroup.add(sMesh);
  });

  // 7. Rear Architectural Perimeter Wall (Z = 30.5, enclosing boundary)
  const rearWallGeom = new THREE.BoxGeometry(18.0, 2.8, 0.2);
  const rearWall = new THREE.Mesh(rearWallGeom, boundaryWallMaterial);
  rearWall.position.set(0.0, 1.4, 30.5);
  rearWall.castShadow = !isLow;
  rearWall.receiveShadow = true;
  rearWall.name = 'garden-rear-boundary-wall';
  gardenGroup.add(rearWall);

  return gardenGroup;
}

/**
 * React Three Fiber component for the Garden Zone.
 */
export const Garden: React.FC<GardenProps> = ({ tier = 'high' }) => {
  const gardenObject = React.useMemo(() => createGardenZoneObject(tier), [tier]);

  return <primitive object={gardenObject} />;
};

export default Garden;
