'use client';

/**
 * HavenArt — Exterior Zone Detail (Contemporary Tropical Minimalism)
 * Contract Version: havenart-contracts-1.1
 * References: docs/SCENE_ARCHITECTURE.md, docs/UX_STORYBOARD.md, docs/ASSET_PIPELINE.md
 *
 * Local Criteria (W14):
 * - W14-AC1: Kiến trúc Contemporary Tropical Minimalism, tự nhiên và tỷ lệ hợp lý.
 * - W14-AC2: Không che cửa/rail bởi cây mới; reverse nhìn đủ geometry.
 * - W14-AC3: Asset records/byte estimates có trong report; không sửa ASSET_LICENSES.
 */

import React from 'react';
import * as THREE from 'three';
import '@react-three/fiber';
import type { ZoneProps } from '@/types/story';
import type { QualityTier } from '@/types/story';

export type ExteriorProps = Partial<ZoneProps>;

/**
 * Procedural factory to build the Exterior Zone detail as a Three.js Group.
 * Fits strictly within ZONE_MANIFESTS bounds:
 * min: [-12, -1, -20], max: [12, 10, 0]
 *
 * Clearance Corridor Guarantee:
 * Leaves the camera rail corridor (X=0, Y=1.65, Z in [-20, 0])
 * with minimum clearance distance > 0.38m (actual clearance >= 1.7m).
 */
export function createExteriorZoneObject(tier: Exclude<QualityTier, 'fallback'> = 'high'): THREE.Group {
  const exteriorGroup = new THREE.Group();
  exteriorGroup.name = 'zone_exterior';

  const isHigh = tier === 'high';
  const isLow = tier === 'low';

  // 1. Materials: Architectural Contemporary Tropical Palette
  const curbMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a544c,
    roughness: 0.8,
    metalness: 0.1,
    name: 'exterior-curb-material',
  });

  const soilMaterial = new THREE.MeshStandardMaterial({
    color: 0x3b3329,
    roughness: 0.95,
    metalness: 0.0,
    name: 'exterior-soil-material',
  });

  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x4d3b2c,
    roughness: 0.85,
    metalness: 0.05,
    name: 'exterior-trunk-material',
  });

  const foliageDeepMaterial = new THREE.MeshStandardMaterial({
    color: 0x2e4726,
    roughness: 0.8,
    metalness: 0.0,
    name: 'exterior-foliage-deep',
  });

  const foliageLightMaterial = new THREE.MeshStandardMaterial({
    color: 0x486b3c,
    roughness: 0.75,
    metalness: 0.0,
    name: 'exterior-foliage-light',
  });

  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x1f3033,
    roughness: 0.15,
    metalness: 0.3,
    transparent: true,
    opacity: 0.85,
    name: 'exterior-water-material',
  });

  const bollardMaterial = new THREE.MeshStandardMaterial({
    color: 0x2e2924,
    roughness: 0.4,
    metalness: 0.6,
    name: 'exterior-bollard-material',
  });

  const steppingStoneMaterial = new THREE.MeshStandardMaterial({
    color: 0xd6d0c2,
    roughness: 0.7,
    metalness: 0.05,
    name: 'exterior-stepping-stone-material',
  });

  // 2. Landscape Planter Borders (Flanking central walkway X in [-1.5, 1.5])
  // Left Planter Border: X in [-8.5, -1.8], Z in [-19.0, -1.0], Y = 0.15
  const leftBorderGeom = new THREE.BoxGeometry(6.7, 0.2, 18.0);
  const leftBorder = new THREE.Mesh(leftBorderGeom, curbMaterial);
  leftBorder.position.set(-5.15, 0.1, -10.0);
  leftBorder.receiveShadow = true;
  leftBorder.castShadow = !isLow;
  leftBorder.name = 'exterior-left-curb';
  exteriorGroup.add(leftBorder);

  // Left Planter Soil Bed
  const leftSoilGeom = new THREE.BoxGeometry(6.5, 0.05, 17.8);
  const leftSoil = new THREE.Mesh(leftSoilGeom, soilMaterial);
  leftSoil.position.set(-5.15, 0.18, -10.0);
  leftSoil.receiveShadow = true;
  leftSoil.name = 'exterior-left-soil';
  exteriorGroup.add(leftSoil);

  // Right Planter Border: X in [1.8, 8.5], Z in [-19.0, -1.0], Y = 0.15
  const rightBorderGeom = new THREE.BoxGeometry(6.7, 0.2, 18.0);
  const rightBorder = new THREE.Mesh(rightBorderGeom, curbMaterial);
  rightBorder.position.set(5.15, 0.1, -10.0);
  rightBorder.receiveShadow = true;
  rightBorder.castShadow = !isLow;
  rightBorder.name = 'exterior-right-curb';
  exteriorGroup.add(rightBorder);

  // Right Planter Soil Bed
  const rightSoilGeom = new THREE.BoxGeometry(6.5, 0.05, 17.8);
  const rightSoil = new THREE.Mesh(rightSoilGeom, soilMaterial);
  rightSoil.position.set(5.15, 0.18, -10.0);
  rightSoil.receiveShadow = true;
  rightSoil.name = 'exterior-right-soil';
  exteriorGroup.add(rightSoil);

  // 3. Water Reflection Basin (Left Side, X in [-6.5, -2.8], Z in [-12.0, -6.0])
  const basinFrameGeom = new THREE.BoxGeometry(3.7, 0.16, 6.0);
  const basinFrame = new THREE.Mesh(basinFrameGeom, curbMaterial);
  basinFrame.position.set(-4.65, 0.22, -9.0);
  basinFrame.receiveShadow = true;
  basinFrame.name = 'exterior-water-basin-frame';
  exteriorGroup.add(basinFrame);

  const waterSurfaceGeom = new THREE.BoxGeometry(3.5, 0.02, 5.8);
  const waterSurface = new THREE.Mesh(waterSurfaceGeom, waterMaterial);
  waterSurface.position.set(-4.65, 0.28, -9.0);
  waterSurface.name = 'exterior-water-surface';
  exteriorGroup.add(waterSurface);

  // 4. Stepping Stones (Travertine Accents)
  const stepOffsetsZ = [-16.0, -13.5, -5.0, -2.5];
  stepOffsetsZ.forEach((z, idx) => {
    const stepGeom = new THREE.BoxGeometry(0.8, 0.04, 0.8);
    const stepMesh = new THREE.Mesh(stepGeom, steppingStoneMaterial);
    stepMesh.position.set(-2.4, 0.21, z);
    stepMesh.receiveShadow = true;
    stepMesh.name = `exterior-step-left-${idx}`;
    exteriorGroup.add(stepMesh);

    const stepMeshR = new THREE.Mesh(stepGeom, steppingStoneMaterial);
    stepMeshR.position.set(2.4, 0.21, z);
    stepMeshR.receiveShadow = true;
    stepMeshR.name = `exterior-step-right-${idx}`;
    exteriorGroup.add(stepMeshR);
  });

  // 5. Tropical Trees (Hero Frangipani & Palms with full 3D geometry for reverse view)
  const treeConfigs = [
    { name: 'left-hero-frangipani', x: -4.2, z: -15.0, h: 3.4, r: 0.18, crownR: 1.8, mat: foliageDeepMaterial },
    { name: 'left-secondary-palm', x: -6.0, z: -8.0, h: 4.0, r: 0.15, crownR: 1.5, mat: foliageLightMaterial },
    { name: 'left-approach-tree', x: -3.8, z: -3.5, h: 3.2, r: 0.16, crownR: 1.4, mat: foliageDeepMaterial },
    { name: 'right-hero-frangipani', x: 4.5, z: -14.0, h: 3.6, r: 0.20, crownR: 1.9, mat: foliageLightMaterial },
    { name: 'right-secondary-palm', x: 6.2, z: -7.5, h: 4.2, r: 0.16, crownR: 1.6, mat: foliageDeepMaterial },
    { name: 'right-approach-tree', x: 4.0, z: -3.0, h: 3.1, r: 0.15, crownR: 1.4, mat: foliageLightMaterial },
  ];

  treeConfigs.forEach((cfg) => {
    // Tree trunk
    const radialSegs = isHigh ? 12 : 8;
    const trunkGeom = new THREE.CylinderGeometry(cfg.r * 0.75, cfg.r, cfg.h, radialSegs);
    const trunkMesh = new THREE.Mesh(trunkGeom, trunkMaterial);
    trunkMesh.position.set(cfg.x, cfg.h / 2, cfg.z);
    trunkMesh.castShadow = !isLow;
    trunkMesh.receiveShadow = true;
    trunkMesh.name = `exterior-tree-trunk-${cfg.name}`;
    exteriorGroup.add(trunkMesh);

    // Tree canopy layers (geometric polyhedra ensuring full 3D silhouette from all view angles)
    const detailLevel = isHigh ? 1 : 0;
    const lowerCanopyGeom = new THREE.DodecahedronGeometry(cfg.crownR, detailLevel);
    const lowerCanopy = new THREE.Mesh(lowerCanopyGeom, cfg.mat);
    lowerCanopy.position.set(cfg.x, cfg.h + cfg.crownR * 0.6, cfg.z);
    lowerCanopy.castShadow = !isLow;
    lowerCanopy.receiveShadow = true;
    lowerCanopy.name = `exterior-tree-canopy-lower-${cfg.name}`;
    exteriorGroup.add(lowerCanopy);

    const upperCanopyGeom = new THREE.DodecahedronGeometry(cfg.crownR * 0.7, detailLevel);
    const upperCanopy = new THREE.Mesh(upperCanopyGeom, foliageLightMaterial);
    upperCanopy.position.set(cfg.x + 0.2, cfg.h + cfg.crownR * 1.2, cfg.z - 0.2);
    upperCanopy.castShadow = !isLow;
    upperCanopy.name = `exterior-tree-canopy-upper-${cfg.name}`;
    exteriorGroup.add(upperCanopy);
  });

  // 6. Tropical Understory Shrubs (Monstera / Philodendron proxies)
  const shrubLocations = [
    { x: -2.6, z: -17.0 },
    { x: -2.7, z: -11.5 },
    { x: -2.6, z: -6.5 },
    { x: -2.5, z: -1.8 },
    { x: 2.6, z: -16.5 },
    { x: 2.7, z: -11.0 },
    { x: 2.6, z: -6.0 },
    { x: 2.5, z: -1.8 },
  ];

  shrubLocations.forEach((loc, idx) => {
    const shrubGeom = new THREE.IcosahedronGeometry(0.5, 0);
    const shrubMesh = new THREE.Mesh(shrubGeom, foliageDeepMaterial);
    shrubMesh.position.set(loc.x, 0.45, loc.z);
    shrubMesh.castShadow = isHigh;
    shrubMesh.receiveShadow = true;
    shrubMesh.name = `exterior-shrub-${idx}`;
    exteriorGroup.add(shrubMesh);
  });

  // 7. Minimalist Garden Lighting Bollards along the approach
  const bollardPositions = [
    { x: -1.9, z: -16.0 },
    { x: -1.9, z: -11.0 },
    { x: -1.9, z: -6.0 },
    { x: 1.9, z: -16.0 },
    { x: 1.9, z: -11.0 },
    { x: 1.9, z: -6.0 },
  ];

  bollardPositions.forEach((pos, idx) => {
    const bollardGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8);
    const bollardMesh = new THREE.Mesh(bollardGeom, bollardMaterial);
    bollardMesh.position.set(pos.x, 0.225, pos.z);
    bollardMesh.castShadow = isHigh;
    bollardMesh.name = `exterior-bollard-${idx}`;
    exteriorGroup.add(bollardMesh);
  });

  return exteriorGroup;
}

/**
 * React Three Fiber component for the Exterior Zone.
 */
export const Exterior: React.FC<ExteriorProps> = ({ tier = 'high' }) => {
  const exteriorObject = React.useMemo(() => createExteriorZoneObject(tier), [tier]);

  return <primitive object={exteriorObject} />;
};

export default Exterior;
