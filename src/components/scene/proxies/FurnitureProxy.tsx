'use client';

/**
 * HavenArt — Furniture & Interior Detail Proxy
 * Contract Version: havenart-contracts-1.1
 * References: docs/SCENE_ARCHITECTURE.md, docs/HOTSPOT_SPEC.md, docs/UX_STORYBOARD.md
 *
 * Local Criteria (W10):
 * - W10-AC2: Shell không duplicate các mặt của detail, không unmount theo chapter.
 * - W10-AC3: Proxy giữ đủ silhouette từ mọi hướng; không đổi origin của rail;
 *            chứa hotspot anchors ổn định: 'travertine-wall', 'sliding-glass'.
 */

import React from 'react';
import * as THREE from 'three';
import '@react-three/fiber';
import type { ZoneProps } from '@/types/story';

export type FurnitureProxyProps = Partial<ZoneProps>;

/**
 * Procedural factory to build the furniture proxy as a Three.js Group.
 * Can be used in pure Three.js pipelines (e.g. ZoneLoader / ResourceRegistry)
 * or rendered within React Three Fiber components.
 */
export function createFurnitureProxyObject(): THREE.Group {
  const furnitureGroup = new THREE.Group();
  furnitureGroup.name = 'proxy_living';

  // Materials: contemporary tropical interior palette
  const sofaLinenMaterial = new THREE.MeshStandardMaterial({
    color: 0xd8d2c4,
    roughness: 0.8,
    metalness: 0.05,
    name: 'proxy-sofa-linen-material',
  });

  const sofaBaseMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3b32,
    roughness: 0.7,
    metalness: 0.1,
    name: 'proxy-sofa-wood-material',
  });

  const travertineMaterial = new THREE.MeshStandardMaterial({
    color: 0xede8dc,
    roughness: 0.6,
    metalness: 0.05,
    name: 'proxy-travertine-material',
  });

  const coffeeTableMaterial = new THREE.MeshStandardMaterial({
    color: 0x3e3228,
    roughness: 0.5,
    metalness: 0.1,
    name: 'proxy-coffee-table-material',
  });

  const bronzeFrameMaterial = new THREE.MeshStandardMaterial({
    color: 0x2e2924,
    roughness: 0.4,
    metalness: 0.6,
    name: 'proxy-bronze-frame-material',
  });

  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0xdbe7e8,
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.4,
    name: 'proxy-glass-material',
  });

  // 1. Sofa Seating Lounge (within obstacle envelope: X [-1.2, 1.5], Z [7.0, 9.5], Y [0, 0.9])
  // Sofa base plinth
  const sofaBaseGeom = new THREE.BoxGeometry(2.4, 0.15, 1.8);
  const sofaBase = new THREE.Mesh(sofaBaseGeom, sofaBaseMaterial);
  sofaBase.position.set(0.0, 0.075, 8.25);
  sofaBase.castShadow = true;
  sofaBase.receiveShadow = true;
  sofaBase.name = 'furniture-sofa-base';
  furnitureGroup.add(sofaBase);

  // Main sofa seat cushion
  const seatCushionGeom = new THREE.BoxGeometry(2.3, 0.35, 1.7);
  const seatCushion = new THREE.Mesh(seatCushionGeom, sofaLinenMaterial);
  seatCushion.position.set(0.0, 0.325, 8.25);
  seatCushion.castShadow = true;
  seatCushion.receiveShadow = true;
  seatCushion.name = 'furniture-sofa-seat';
  furnitureGroup.add(seatCushion);

  // Sofa backrest
  const backrestGeom = new THREE.BoxGeometry(0.3, 0.45, 1.7);
  const backrest = new THREE.Mesh(backrestGeom, sofaLinenMaterial);
  backrest.position.set(-1.0, 0.65, 8.25);
  backrest.castShadow = true;
  backrest.name = 'furniture-sofa-backrest';
  furnitureGroup.add(backrest);

  // Low minimalist coffee table
  const tableGeom = new THREE.BoxGeometry(1.2, 0.35, 0.7);
  const coffeeTable = new THREE.Mesh(tableGeom, coffeeTableMaterial);
  coffeeTable.position.set(0.0, 0.175, 9.8);
  coffeeTable.castShadow = true;
  coffeeTable.receiveShadow = true;
  coffeeTable.name = 'furniture-coffee-table';
  furnitureGroup.add(coffeeTable);

  // 2. Travertine Feature Accent Wall & Hotspot Anchor
  // Positioned around X = -2.5, Y = 1.4, Z = 9.2
  const travertineWallGeom = new THREE.BoxGeometry(0.2, 3.2, 3.6);
  const travertineWall = new THREE.Mesh(travertineWallGeom, travertineMaterial);
  travertineWall.position.set(-2.5, 1.6, 9.2);
  travertineWall.castShadow = true;
  travertineWall.receiveShadow = true;
  travertineWall.name = 'furniture-travertine-wall-mesh';
  furnitureGroup.add(travertineWall);

  // Stable Hotspot Anchor: 'travertine-wall' at [-2.5, 1.4, 9.2]
  const travertineAnchor = new THREE.Group();
  travertineAnchor.name = 'hotspot-anchor-travertine-wall';
  travertineAnchor.position.set(-2.5, 1.4, 9.2);
  furnitureGroup.add(travertineAnchor);

  // 3. Sliding Glass Door Frame & Hotspot Anchor
  // Positioned at rear transition Z = 14.8 to 15.5
  // Door frame surrounding the opening X in [0.8, 3.8], height 2.8m
  const topTrackGeom = new THREE.BoxGeometry(3.0, 0.08, 0.15);
  const topTrack = new THREE.Mesh(topTrackGeom, bronzeFrameMaterial);
  topTrack.position.set(2.3, 2.8, 15.4);
  topTrack.name = 'furniture-sliding-top-track';
  furnitureGroup.add(topTrack);

  const bottomTrackGeom = new THREE.BoxGeometry(3.0, 0.03, 0.15);
  const bottomTrack = new THREE.Mesh(bottomTrackGeom, bronzeFrameMaterial);
  bottomTrack.position.set(2.3, 0.015, 15.4);
  bottomTrack.name = 'furniture-sliding-bottom-track';
  furnitureGroup.add(bottomTrack);

  // Sliding glass panel in open position (slid towards X = 1.2, leaving camera rail at X = 2.0 unobstructed)
  const slidingPanelGeom = new THREE.BoxGeometry(1.0, 2.7, 0.05);
  const slidingPanel = new THREE.Mesh(slidingPanelGeom, glassMaterial);
  slidingPanel.position.set(1.3, 1.4, 15.4);
  slidingPanel.name = 'furniture-sliding-panel-glass';
  furnitureGroup.add(slidingPanel);

  // Stable Hotspot Anchor: 'sliding-glass' at [2.2, 1.5, 14.8]
  const slidingGlassAnchor = new THREE.Group();
  slidingGlassAnchor.name = 'hotspot-anchor-sliding-glass';
  slidingGlassAnchor.position.set(2.2, 1.5, 14.8);
  furnitureGroup.add(slidingGlassAnchor);

  return furnitureGroup;
}

/**
 * React Three Fiber component representing the Furniture Proxy.
 */
export const FurnitureProxy: React.FC<FurnitureProxyProps> = () => {
  const furnitureObject = React.useMemo(() => createFurnitureProxyObject(), []);

  return <primitive object={furnitureObject} />;
};

export default FurnitureProxy;
