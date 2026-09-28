'use client';

/**
 * HavenArt — Villa Structural Shell (Persistent World Envelope)
 * Contract Version: havenart-contracts-1.1
 * References: docs/SCENE_ARCHITECTURE.md, docs/UX_STORYBOARD.md
 *
 * Local Criteria (W10):
 * - W10-AC1: Tỷ lệ nhà/lối đi đúng blockout; không sealed box rồi ẩn tường (cửa mở thật).
 * - W10-AC2: Shell không duplicate các mặt của detail, không unmount theo chapter.
 * - W10-AC3: Giữ đúng world coordinates, origin (0, 0, 0) tại ngưỡng cửa chính.
 */

import React from 'react';
import * as THREE from 'three';
import '@react-three/fiber';
import type { QualityTier } from '@/types/story';

export interface VillaShellProps {
  readonly tier?: Exclude<QualityTier, 'fallback'>;
}

/**
 * Procedural factory to build the persistent villa shell as a Three.js Group.
 * Can be used directly in pure Three.js pipelines (e.g. ZoneLoader / ResourceRegistry)
 * or rendered within React Three Fiber components.
 */
export function createVillaShellObject(): THREE.Group {
  const shellGroup = new THREE.Group();
  shellGroup.name = 'persistent-villa-shell';

  // Materials: architectural neutral palette (contemporary tropical minimalism)
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2efe9,
    roughness: 0.85,
    metalness: 0.05,
    name: 'shell-wall-material',
  });

  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xdfdacd,
    roughness: 0.7,
    metalness: 0.1,
    name: 'shell-floor-material',
  });

  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x484f42,
    roughness: 0.95,
    metalness: 0.0,
    name: 'shell-ground-material',
  });

  const walkwayMaterial = new THREE.MeshStandardMaterial({
    color: 0xd3cdbe,
    roughness: 0.8,
    metalness: 0.05,
    name: 'shell-walkway-material',
  });

  const roofMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d3a36,
    roughness: 0.9,
    metalness: 0.2,
    name: 'shell-roof-material',
  });

  const pillarMaterial = new THREE.MeshStandardMaterial({
    color: 0x2b2825,
    roughness: 0.6,
    metalness: 0.3,
    name: 'shell-pillar-material',
  });

  // 1. Site ground plane: X [-12, 12], Z [-20, 32], Y = -0.05
  const groundGeom = new THREE.BoxGeometry(24, 0.1, 52);
  const groundMesh = new THREE.Mesh(groundGeom, groundMaterial);
  groundMesh.position.set(0, -0.05, 6);
  groundMesh.receiveShadow = true;
  groundMesh.name = 'shell-ground-mesh';
  shellGroup.add(groundMesh);

  // 2. Approach walkway: X [-1.5, 1.5], Z [-20, 0], Y = 0.005
  const walkwayGeom = new THREE.BoxGeometry(3.0, 0.01, 20);
  const walkwayMesh = new THREE.Mesh(walkwayGeom, walkwayMaterial);
  walkwayMesh.position.set(0, 0.005, -10);
  walkwayMesh.receiveShadow = true;
  walkwayMesh.name = 'shell-walkway-mesh';
  shellGroup.add(walkwayMesh);

  // 3. Interior floor slab: X [-8, 8], Z [0, 15.5], Y = 0.0 (top at 0)
  const floorGeom = new THREE.BoxGeometry(16, 0.04, 15.5);
  const floorMesh = new THREE.Mesh(floorGeom, floorMaterial);
  floorMesh.position.set(0, -0.02, 7.75);
  floorMesh.receiveShadow = true;
  floorMesh.name = 'shell-interior-floor-mesh';
  shellGroup.add(floorMesh);

  // 4. Rear terrace slab: X [-2, 6], Z [15.5, 19], Y = 0.0
  const terraceGeom = new THREE.BoxGeometry(8, 0.04, 3.5);
  const terraceMesh = new THREE.Mesh(terraceGeom, walkwayMaterial);
  terraceMesh.position.set(2, -0.02, 17.25);
  terraceMesh.receiveShadow = true;
  terraceMesh.name = 'shell-terrace-slab-mesh';
  shellGroup.add(terraceMesh);

  // 5. Roof slab: X [-8.5, 8.5], Z [-0.5, 16.0], Y = 3.9 (height = 3.8 to 4.0)
  const roofGeom = new THREE.BoxGeometry(17, 0.2, 16.5);
  const roofMesh = new THREE.Mesh(roofGeom, roofMaterial);
  roofMesh.position.set(0, 3.9, 7.75);
  roofMesh.castShadow = true;
  roofMesh.name = 'shell-roof-mesh';
  shellGroup.add(roofMesh);

  // 6. Front Wall (Z = 0) with REAL DOOR OPENING: X [-1.4, 1.4], Y [0, 2.8]
  // 6a. Left front wall: X [-8, -1.4], Y [0, 3.8] -> width = 6.6, center X = -4.7
  const leftFrontWallGeom = new THREE.BoxGeometry(6.6, 3.8, 0.2);
  const leftFrontWall = new THREE.Mesh(leftFrontWallGeom, wallMaterial);
  leftFrontWall.position.set(-4.7, 1.9, 0);
  leftFrontWall.castShadow = true;
  leftFrontWall.receiveShadow = true;
  leftFrontWall.name = 'shell-front-wall-left';
  shellGroup.add(leftFrontWall);

  // 6b. Right front wall: X [1.4, 8], Y [0, 3.8] -> width = 6.6, center X = 4.7
  const rightFrontWallGeom = new THREE.BoxGeometry(6.6, 3.8, 0.2);
  const rightFrontWall = new THREE.Mesh(rightFrontWallGeom, wallMaterial);
  rightFrontWall.position.set(4.7, 1.9, 0);
  rightFrontWall.castShadow = true;
  rightFrontWall.receiveShadow = true;
  rightFrontWall.name = 'shell-front-wall-right';
  shellGroup.add(rightFrontWall);

  // 6c. Front lintel above main door: X [-1.4, 1.4], Y [2.8, 3.8] -> width = 2.8, height = 1.0, center Y = 3.3
  const frontLintelGeom = new THREE.BoxGeometry(2.8, 1.0, 0.2);
  const frontLintel = new THREE.Mesh(frontLintelGeom, wallMaterial);
  frontLintel.position.set(0, 3.3, 0);
  frontLintel.castShadow = true;
  frontLintel.name = 'shell-front-lintel';
  shellGroup.add(frontLintel);

  // 7. Back Wall (Z = 15.5) with REAL SLIDING DOOR OPENING: X [0.8, 3.8], Y [0, 2.8]
  // 7a. Left back wall: X [-8, 0.8], Y [0, 3.8] -> width = 8.8, center X = -3.6
  const leftBackWallGeom = new THREE.BoxGeometry(8.8, 3.8, 0.2);
  const leftBackWall = new THREE.Mesh(leftBackWallGeom, wallMaterial);
  leftBackWall.position.set(-3.6, 1.9, 15.5);
  leftBackWall.castShadow = true;
  leftBackWall.receiveShadow = true;
  leftBackWall.name = 'shell-back-wall-left';
  shellGroup.add(leftBackWall);

  // 7b. Right back wall: X [3.8, 8], Y [0, 3.8] -> width = 4.2, center X = 5.9
  const rightBackWallGeom = new THREE.BoxGeometry(4.2, 3.8, 0.2);
  const rightBackWall = new THREE.Mesh(rightBackWallGeom, wallMaterial);
  rightBackWall.position.set(5.9, 1.9, 15.5);
  rightBackWall.castShadow = true;
  rightBackWall.receiveShadow = true;
  rightBackWall.name = 'shell-back-wall-right';
  shellGroup.add(rightBackWall);

  // 7c. Rear lintel above sliding door: X [0.8, 3.8], Y [2.8, 3.8] -> width = 3.0, height = 1.0, center Y = 3.3, center X = 2.3
  const rearLintelGeom = new THREE.BoxGeometry(3.0, 1.0, 0.2);
  const rearLintel = new THREE.Mesh(rearLintelGeom, wallMaterial);
  rearLintel.position.set(2.3, 3.3, 15.5);
  rearLintel.castShadow = true;
  rearLintel.name = 'shell-rear-lintel';
  shellGroup.add(rearLintel);

  // 8. Left Wall: X = -8.0, Z [0, 15.5], Y [0, 3.8] -> depth = 15.5, thickness = 0.2
  const leftWallGeom = new THREE.BoxGeometry(0.2, 3.8, 15.5);
  const leftWall = new THREE.Mesh(leftWallGeom, wallMaterial);
  leftWall.position.set(-8.0, 1.9, 7.75);
  leftWall.castShadow = true;
  leftWall.receiveShadow = true;
  leftWall.name = 'shell-left-wall';
  shellGroup.add(leftWall);

  // 9. Right Wall: X = 8.0, Z [0, 15.5], Y [0, 3.8] -> depth = 15.5, thickness = 0.2
  const rightWallGeom = new THREE.BoxGeometry(0.2, 3.8, 15.5);
  const rightWall = new THREE.Mesh(rightWallGeom, wallMaterial);
  rightWall.position.set(8.0, 1.9, 7.75);
  rightWall.castShadow = true;
  rightWall.receiveShadow = true;
  rightWall.name = 'shell-right-wall';
  shellGroup.add(rightWall);

  // 10. Structural Architectural Pillars
  // Entrance door jamb pillars
  const pillarGeom = new THREE.BoxGeometry(0.15, 3.8, 0.25);
  const leftEntrancePillar = new THREE.Mesh(pillarGeom, pillarMaterial);
  leftEntrancePillar.position.set(-1.45, 1.9, 0.0);
  leftEntrancePillar.name = 'shell-pillar-entrance-left';
  shellGroup.add(leftEntrancePillar);

  const rightEntrancePillar = new THREE.Mesh(pillarGeom, pillarMaterial);
  rightEntrancePillar.position.set(1.45, 1.9, 0.0);
  rightEntrancePillar.name = 'shell-pillar-entrance-right';
  shellGroup.add(rightEntrancePillar);

  // Rear terrace pergola pillars
  const terracePillarGeom = new THREE.BoxGeometry(0.2, 3.8, 0.2);
  const leftTerracePillar = new THREE.Mesh(terracePillarGeom, pillarMaterial);
  leftTerracePillar.position.set(0.7, 1.9, 18.8);
  leftTerracePillar.name = 'shell-pillar-terrace-left';
  shellGroup.add(leftTerracePillar);

  const rightTerracePillar = new THREE.Mesh(terracePillarGeom, pillarMaterial);
  rightTerracePillar.position.set(3.9, 1.9, 18.8);
  rightTerracePillar.name = 'shell-pillar-terrace-right';
  shellGroup.add(rightTerracePillar);

  return shellGroup;
}

/**
 * React Three Fiber component representing the persistent villa shell.
 * It remains mounted across all chapters (W10-AC2).
 */
export const VillaShell: React.FC<VillaShellProps> = () => {
  const shellObject = React.useMemo(() => createVillaShellObject(), []);

  return <primitive object={shellObject} />;
};

export default VillaShell;
