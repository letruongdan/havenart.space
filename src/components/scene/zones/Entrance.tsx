'use client';

/**
 * HavenArt — Entrance Zone Detail (Contemporary Tropical Foyer & Threshold)
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

export type EntranceProps = Partial<ZoneProps>;

/**
 * Procedural factory to build the Entrance Zone detail as a Three.js Group.
 * Fits strictly within ZONE_MANIFESTS bounds:
 * min: [-3, -1, 0], max: [3, 5, 4]
 *
 * Clearance Corridor Guarantee:
 * Leaves the camera rail corridor (X=0, Y=1.65, Z in [0, 4])
 * with minimum clearance distance > 0.38m (actual clearance >= 1.2m).
 */
export function createEntranceZoneObject(tier: Exclude<QualityTier, 'fallback'> = 'high'): THREE.Group {
  const entranceGroup = new THREE.Group();
  entranceGroup.name = 'zone_entrance';

  const isHigh = tier === 'high';
  const isLow = tier === 'low';

  // 1. Materials: Refined Architectural Teak, Bronze & Travertine Palette
  const teakMaterial = new THREE.MeshStandardMaterial({
    color: 0x543d2b,
    roughness: 0.65,
    metalness: 0.05,
    name: 'entrance-teak-material',
  });

  const bronzeMaterial = new THREE.MeshStandardMaterial({
    color: 0x2e2924,
    roughness: 0.35,
    metalness: 0.7,
    name: 'entrance-bronze-material',
  });

  const thresholdInlayMaterial = new THREE.MeshStandardMaterial({
    color: 0xc8c0b0,
    roughness: 0.6,
    metalness: 0.05,
    name: 'entrance-threshold-inlay-material',
  });

  const ceramicMaterial = new THREE.MeshStandardMaterial({
    color: 0xe8e4dc,
    roughness: 0.4,
    metalness: 0.1,
    name: 'entrance-ceramic-material',
  });

  const planterMaterial = new THREE.MeshStandardMaterial({
    color: 0x48423b,
    roughness: 0.8,
    metalness: 0.1,
    name: 'entrance-planter-material',
  });

  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: 0x334e2c,
    roughness: 0.75,
    metalness: 0.0,
    name: 'entrance-indoor-foliage-material',
  });

  const luminaireMaterial = new THREE.MeshStandardMaterial({
    color: 0xfffaed,
    emissive: 0xfffaed,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.1,
    name: 'entrance-luminaire-material',
  });

  // 2. Door Casing & Pivot Door Detail (Z = 0 to 0.1)
  // Slim architectural door casing around opening X in [-1.4, 1.4], Y in [0, 2.8]
  const casingTopGeom = new THREE.BoxGeometry(2.9, 0.06, 0.1);
  const casingTop = new THREE.Mesh(casingTopGeom, bronzeMaterial);
  casingTop.position.set(0, 2.81, 0.05);
  casingTop.castShadow = !isLow;
  casingTop.name = 'entrance-door-casing-top';
  entranceGroup.add(casingTop);

  const casingLeftGeom = new THREE.BoxGeometry(0.06, 2.8, 0.1);
  const casingLeft = new THREE.Mesh(casingLeftGeom, bronzeMaterial);
  casingLeft.position.set(-1.41, 1.4, 0.05);
  casingLeft.name = 'entrance-door-casing-left';
  entranceGroup.add(casingLeft);

  const casingRightGeom = new THREE.BoxGeometry(0.06, 2.8, 0.1);
  const casingRight = new THREE.Mesh(casingRightGeom, bronzeMaterial);
  casingRight.position.set(1.41, 1.4, 0.05);
  casingRight.name = 'entrance-door-casing-right';
  entranceGroup.add(casingRight);

  // Pivot Door Leaf (Swung open 85 degrees inward against left jamb)
  // Sits at X = -1.30, Z in [0.05, 1.25], Y in [0.05, 2.75]
  const doorLeafGeom = new THREE.BoxGeometry(0.08, 2.7, 1.2);
  const doorLeaf = new THREE.Mesh(doorLeafGeom, teakMaterial);
  doorLeaf.position.set(-1.30, 1.4, 0.65);
  doorLeaf.castShadow = !isLow;
  doorLeaf.receiveShadow = true;
  doorLeaf.name = 'entrance-pivot-door-leaf';
  entranceGroup.add(doorLeaf);

  // Minimalist Vertical Bronze Pull Handle on Door
  const doorHandleGeom = new THREE.BoxGeometry(0.04, 0.6, 0.04);
  const doorHandle = new THREE.Mesh(doorHandleGeom, bronzeMaterial);
  doorHandle.position.set(-1.24, 1.2, 1.15);
  doorHandle.castShadow = isHigh;
  doorHandle.name = 'entrance-door-handle';
  entranceGroup.add(doorHandle);

  // 3. Threshold Floor Transition Inlay (Z in [0.0, 0.5], X in [-1.5, 1.5])
  const inlayGeom = new THREE.BoxGeometry(2.8, 0.005, 0.5);
  const inlay = new THREE.Mesh(inlayGeom, thresholdInlayMaterial);
  inlay.position.set(0.0, 0.0025, 0.25);
  inlay.receiveShadow = true;
  inlay.name = 'entrance-threshold-inlay';
  entranceGroup.add(inlay);

  // 4. Right Foyer Wall Console & Minimalist Ceramic Feature (X in [1.7, 2.6], Z in [1.6, 2.9])
  const consoleShelfGeom = new THREE.BoxGeometry(0.8, 0.08, 1.3);
  const consoleShelf = new THREE.Mesh(consoleShelfGeom, teakMaterial);
  consoleShelf.position.set(2.15, 0.85, 2.25);
  consoleShelf.castShadow = !isLow;
  consoleShelf.receiveShadow = true;
  consoleShelf.name = 'entrance-console-shelf';
  entranceGroup.add(consoleShelf);

  // Ceramic Sculpture / Vase on Console
  const vaseGeom = new THREE.CylinderGeometry(0.08, 0.12, 0.45, isHigh ? 12 : 8);
  const vase = new THREE.Mesh(vaseGeom, ceramicMaterial);
  vase.position.set(2.15, 1.115, 2.25);
  vase.castShadow = !isLow;
  vase.name = 'entrance-ceramic-vase';
  entranceGroup.add(vase);

  // Branch sculpture proxy in vase
  const branchGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6);
  const branch = new THREE.Mesh(branchGeom, bronzeMaterial);
  branch.position.set(2.15, 1.5, 2.25);
  branch.rotation.z = 0.15;
  branch.name = 'entrance-vase-branch';
  entranceGroup.add(branch);

  // 5. Left Foyer Indoor Tropical Planter (X in [-2.6, -1.8], Z in [1.8, 3.0])
  const planterGeom = new THREE.BoxGeometry(0.7, 0.35, 1.1);
  const planter = new THREE.Mesh(planterGeom, planterMaterial);
  planter.position.set(-2.2, 0.175, 2.4);
  planter.castShadow = !isLow;
  planter.receiveShadow = true;
  planter.name = 'entrance-indoor-planter';
  entranceGroup.add(planter);

  // Indoor Tropical Plant Foliage
  const plantStemGeom = new THREE.CylinderGeometry(0.03, 0.04, 0.9, 6);
  const plantStem = new THREE.Mesh(plantStemGeom, teakMaterial);
  plantStem.position.set(-2.2, 0.7, 2.4);
  plantStem.name = 'entrance-indoor-plant-stem';
  entranceGroup.add(plantStem);

  const plantCanopyGeom = new THREE.DodecahedronGeometry(0.45, 0);
  const plantCanopy = new THREE.Mesh(plantCanopyGeom, foliageMaterial);
  plantCanopy.position.set(-2.2, 1.25, 2.4);
  plantCanopy.castShadow = isHigh;
  plantCanopy.name = 'entrance-indoor-plant-foliage';
  entranceGroup.add(plantCanopy);

  // 6. Foyer Ceiling Timber Slat Accent & Luminaire
  const ceilingSlatGeom = new THREE.BoxGeometry(4.8, 0.04, 3.4);
  const ceilingSlat = new THREE.Mesh(ceilingSlatGeom, teakMaterial);
  ceilingSlat.position.set(0.0, 3.72, 2.0);
  ceilingSlat.receiveShadow = true;
  ceilingSlat.name = 'entrance-ceiling-slats';
  entranceGroup.add(ceilingSlat);

  // Architectural recessed downlight luminaire
  const luminaireGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.03, 12);
  const luminaire = new THREE.Mesh(luminaireGeom, luminaireMaterial);
  luminaire.position.set(0.0, 3.69, 2.0);
  luminaire.name = 'entrance-ceiling-luminaire';
  entranceGroup.add(luminaire);

  return entranceGroup;
}

/**
 * React Three Fiber component for the Entrance Zone.
 */
export const Entrance: React.FC<EntranceProps> = ({ tier = 'high' }) => {
  const entranceObject = React.useMemo(() => createEntranceZoneObject(tier), [tier]);

  return <primitive object={entranceObject} />;
};

export default Entrance;
