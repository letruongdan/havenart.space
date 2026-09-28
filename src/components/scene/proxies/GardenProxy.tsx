'use client';

/**
 * HavenArt — Garden & Landscape Detail Proxy
 * Contract Version: havenart-contracts-1.1
 * References: docs/SCENE_ARCHITECTURE.md, docs/HOTSPOT_SPEC.md, docs/UX_STORYBOARD.md
 *
 * Local Criteria (W10):
 * - W10-AC2: Shell không duplicate các mặt của detail, không unmount theo chapter.
 * - W10-AC3: Proxy giữ đủ silhouette từ mọi hướng; không đổi origin của rail;
 *            chứa hotspot anchor ổn định: 'garden-tree'.
 */

import React from 'react';
import * as THREE from 'three';
import '@react-three/fiber';
import type { ZoneProps } from '@/types/story';

export type GardenProxyProps = Partial<ZoneProps>;

/**
 * Procedural factory to build the garden proxy as a Three.js Group.
 * Can be used in pure Three.js pipelines (e.g. ZoneLoader / ResourceRegistry)
 * or rendered within React Three Fiber components.
 */
export function createGardenProxyObject(): THREE.Group {
  const gardenGroup = new THREE.Group();
  gardenGroup.name = 'proxy_garden';

  // Materials: tropical landscape palette
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x48382b,
    roughness: 0.9,
    metalness: 0.05,
    name: 'proxy-tree-trunk-material',
  });

  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d5c38,
    roughness: 0.8,
    metalness: 0.0,
    name: 'proxy-tree-foliage-material',
  });

  const foliageLightMaterial = new THREE.MeshStandardMaterial({
    color: 0x4f734a,
    roughness: 0.85,
    metalness: 0.0,
    name: 'proxy-tree-foliage-light-material',
  });

  const planterMaterial = new THREE.MeshStandardMaterial({
    color: 0x544e47,
    roughness: 0.7,
    metalness: 0.1,
    name: 'proxy-planter-material',
  });

  const shrubMaterial = new THREE.MeshStandardMaterial({
    color: 0x384a32,
    roughness: 0.9,
    metalness: 0.0,
    name: 'proxy-shrub-material',
  });

  // 1. Hero Garden Tree & Hotspot Anchor
  // Positioned around X = 1.5, Y = 2.0, Z = 24.5
  // Tree Trunk (base at Y = 0 to Y = 3.2, radius ~0.25m)
  const trunkGeom = new THREE.CylinderGeometry(0.2, 0.3, 3.2, 8);
  const trunk = new THREE.Mesh(trunkGeom, trunkMaterial);
  trunk.position.set(1.5, 1.6, 24.5);
  trunk.castShadow = true;
  trunk.name = 'garden-hero-tree-trunk';
  gardenGroup.add(trunk);

  // Main foliage canopy (lower broad layer)
  const canopyLowerGeom = new THREE.DodecahedronGeometry(1.8, 1);
  const canopyLower = new THREE.Mesh(canopyLowerGeom, foliageMaterial);
  canopyLower.position.set(1.5, 3.8, 24.5);
  canopyLower.castShadow = true;
  canopyLower.name = 'garden-hero-tree-canopy-lower';
  gardenGroup.add(canopyLower);

  // Upper foliage canopy (lighter tropical crown)
  const canopyUpperGeom = new THREE.DodecahedronGeometry(1.3, 1);
  const canopyUpper = new THREE.Mesh(canopyUpperGeom, foliageLightMaterial);
  canopyUpper.position.set(1.3, 4.8, 24.3);
  canopyUpper.castShadow = true;
  canopyUpper.name = 'garden-hero-tree-canopy-upper';
  gardenGroup.add(canopyUpper);

  // Stable Hotspot Anchor: 'garden-tree' at [1.5, 2.0, 24.5]
  const treeAnchor = new THREE.Group();
  treeAnchor.name = 'hotspot-anchor-garden-tree';
  treeAnchor.position.set(1.5, 2.0, 24.5);
  gardenGroup.add(treeAnchor);

  // 2. Garden Landscape Planters & Low Shrubs (flanking the open lawn area)
  // Left planter bed: X [-6, -4], Z [20, 28]
  const leftPlanterGeom = new THREE.BoxGeometry(1.5, 0.4, 8.0);
  const leftPlanter = new THREE.Mesh(leftPlanterGeom, planterMaterial);
  leftPlanter.position.set(-5.0, 0.2, 24.0);
  leftPlanter.receiveShadow = true;
  leftPlanter.name = 'garden-planter-left';
  gardenGroup.add(leftPlanter);

  // Foliage on left planter
  const leftShrubGeom = new THREE.BoxGeometry(1.3, 0.5, 7.6);
  const leftShrub = new THREE.Mesh(leftShrubGeom, shrubMaterial);
  leftShrub.position.set(-5.0, 0.5, 24.0);
  leftShrub.name = 'garden-shrub-left';
  gardenGroup.add(leftShrub);

  // Right planter bed: X [4.5, 6.5], Z [20, 28]
  const rightPlanterGeom = new THREE.BoxGeometry(1.5, 0.4, 8.0);
  const rightPlanter = new THREE.Mesh(rightPlanterGeom, planterMaterial);
  rightPlanter.position.set(5.5, 0.2, 24.0);
  rightPlanter.receiveShadow = true;
  rightPlanter.name = 'garden-planter-right';
  gardenGroup.add(rightPlanter);

  // Foliage on right planter
  const rightShrubGeom = new THREE.BoxGeometry(1.3, 0.5, 7.6);
  const rightShrub = new THREE.Mesh(rightShrubGeom, shrubMaterial);
  rightShrub.position.set(5.5, 0.5, 24.0);
  rightShrub.name = 'garden-shrub-right';
  gardenGroup.add(rightShrub);

  return gardenGroup;
}

/**
 * React Three Fiber component representing the Garden Landscape Proxy.
 */
export const GardenProxy: React.FC<GardenProxyProps> = () => {
  const gardenObject = React.useMemo(() => createGardenProxyObject(), []);

  return <primitive object={gardenObject} />;
};

export default GardenProxy;
