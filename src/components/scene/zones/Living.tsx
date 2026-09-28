'use client';

/**
 * HavenArt — Living Room Zone Detail (Contemporary Tropical Living)
 * Contract Version: havenart-contracts-1.1
 * References: docs/SCENE_ARCHITECTURE.md, docs/UX_STORYBOARD.md, docs/HOTSPOT_SPEC.md, docs/LIGHTING_SPEC.md
 *
 * Local Criteria (W15):
 * - W15-AC1: Không furniture chắn clearance đã duyệt; khung vườn đúng vườn chung.
 * - W15-AC2: PBR roughness/texture scale mét đúng, không heavy bloom che scene yếu.
 * - W15-AC3: Material riêng có ownership; shared resource chỉ release không dispose trực tiếp.
 */

import React from 'react';
import * as THREE from 'three';
import '@react-three/fiber';
import type { ZoneProps } from '@/types/story';
import type { QualityTier } from '@/types/story';
import {
  createLivingMaterials,
  disposeLivingMaterials,
  type LivingMaterials,
} from '../materials/LivingMaterials';

export type LivingProps = Partial<ZoneProps>;

/**
 * Procedural factory to build the Living Zone detail as a Three.js Group.
 * Fits strictly within ZONE_MANIFESTS bounds:
 * min: [-8, -1, 4], max: [8, 6, 15.5]
 *
 * Anchors guaranteed:
 * - 'travertine-wall' at [-2.5, 1.4, 9.2]
 * - 'sliding-glass' at [2.2, 1.5, 14.8]
 *
 * Clearance Corridor Guarantee:
 * Camera rail passes from (0.0, 1.65, 4.4) -> (2.8, 1.60, 7.7) -> (2.0, 1.65, 14.6) -> (2.0, 1.65, 15.5).
 * All obstacles maintain distance >= CAMERA_OPTICS.minClearanceM (0.38m).
 */
export function createLivingZoneObject(
  tier: Exclude<QualityTier, 'fallback'> = 'high',
  providedMaterials?: LivingMaterials
): { group: THREE.Group; materials: LivingMaterials } {
  const materials = providedMaterials ?? createLivingMaterials();
  const livingGroup = new THREE.Group();
  livingGroup.name = 'zone_living';

  const isHigh = tier === 'high';
  const isLow = tier === 'low';

  // 1. Travertine Feature Wall & Credenza (Left Room Wall at X = -2.5, Z = 9.2)
  // Travertine Wall Panel (Hotspot Anchor: 'travertine-wall')
  const travertineWallGeom = new THREE.BoxGeometry(2.4, 2.8, 0.12);
  const travertineWall = new THREE.Mesh(travertineWallGeom, materials.travertine);
  travertineWall.position.set(-2.5, 1.4, 9.2);
  travertineWall.castShadow = !isLow;
  travertineWall.receiveShadow = true;
  travertineWall.name = 'living-travertine-wall-panel';
  livingGroup.add(travertineWall);

  // Stable Hotspot Anchor: 'travertine-wall' at [-2.5, 1.4, 9.2]
  const travertineAnchor = new THREE.Group();
  travertineAnchor.name = 'hotspot-anchor-travertine-wall';
  travertineAnchor.position.set(-2.5, 1.4, 9.2);
  livingGroup.add(travertineAnchor);

  // Floating Low Credenza below Travertine Wall
  const credenzaGeom = new THREE.BoxGeometry(2.6, 0.35, 0.45);
  const credenza = new THREE.Mesh(credenzaGeom, materials.teakWood);
  credenza.position.set(-2.5, 0.25, 9.2);
  credenza.castShadow = !isLow;
  credenza.receiveShadow = true;
  credenza.name = 'living-teak-credenza';
  livingGroup.add(credenza);

  // Ceramic Art Vessel on Credenza
  const vesselGeom = new THREE.CylinderGeometry(0.1, 0.14, 0.32, isHigh ? 12 : 8);
  const vessel = new THREE.Mesh(vesselGeom, materials.ceramicDecor);
  vessel.position.set(-3.2, 0.58, 9.2);
  vessel.castShadow = isHigh;
  vessel.name = 'living-credenza-vessel';
  livingGroup.add(vessel);

  // 2. Main Lounge Seating Zone (X in [-1.8, 0.8], Z in [7.0, 9.6])
  // Wool Rug Area
  const rugGeom = new THREE.BoxGeometry(3.2, 0.005, 3.0);
  const rug = new THREE.Mesh(rugGeom, materials.woolRug);
  rug.position.set(-0.5, 0.003, 8.3);
  rug.receiveShadow = true;
  rug.name = 'living-wool-rug';
  livingGroup.add(rug);

  // Sofa Teak Base Plinth
  const sofaBaseGeom = new THREE.BoxGeometry(2.3, 0.15, 1.6);
  const sofaBase = new THREE.Mesh(sofaBaseGeom, materials.teakWood);
  sofaBase.position.set(-0.6, 0.075, 8.3);
  sofaBase.castShadow = !isLow;
  sofaBase.receiveShadow = true;
  sofaBase.name = 'living-sofa-base';
  livingGroup.add(sofaBase);

  // Main Sofa Seat Cushion
  const sofaSeatGeom = new THREE.BoxGeometry(2.2, 0.3, 1.5);
  const sofaSeat = new THREE.Mesh(sofaSeatGeom, materials.linenFabric);
  sofaSeat.position.set(-0.6, 0.3, 8.3);
  sofaSeat.castShadow = !isLow;
  sofaSeat.receiveShadow = true;
  sofaSeat.name = 'living-sofa-seat-cushion';
  livingGroup.add(sofaSeat);

  // Sofa Backrest Cushion
  const backrestGeom = new THREE.BoxGeometry(0.25, 0.45, 1.5);
  const backrest = new THREE.Mesh(backrestGeom, materials.linenFabric);
  backrest.position.set(-1.6, 0.65, 8.3);
  backrest.castShadow = !isLow;
  backrest.name = 'living-sofa-backrest';
  livingGroup.add(backrest);

  // Minimalist Coffee Table (Teak & Bronze)
  const coffeeTableTopGeom = new THREE.BoxGeometry(0.9, 0.04, 0.9);
  const coffeeTableTop = new THREE.Mesh(coffeeTableTopGeom, materials.teakWood);
  coffeeTableTop.position.set(0.4, 0.32, 8.3);
  coffeeTableTop.castShadow = !isLow;
  coffeeTableTop.receiveShadow = true;
  coffeeTableTop.name = 'living-coffee-table-top';
  livingGroup.add(coffeeTableTop);

  const coffeeTableLegsGeom = new THREE.BoxGeometry(0.8, 0.3, 0.8);
  const coffeeTableLegs = new THREE.Mesh(coffeeTableLegsGeom, materials.bronzeMetal);
  coffeeTableLegs.position.set(0.4, 0.15, 8.3);
  coffeeTableLegs.castShadow = isHigh;
  coffeeTableLegs.name = 'living-coffee-table-legs';
  livingGroup.add(coffeeTableLegs);

  // 3. Right Side Accent Seating & Floor Lamp (X in [3.4, 4.4], Z in [10.0, 11.5])
  const accentChairGeom = new THREE.BoxGeometry(0.8, 0.65, 0.8);
  const accentChair = new THREE.Mesh(accentChairGeom, materials.linenFabric);
  accentChair.position.set(3.8, 0.325, 10.5);
  accentChair.castShadow = !isLow;
  accentChair.receiveShadow = true;
  accentChair.name = 'living-accent-chair';
  livingGroup.add(accentChair);

  // Minimalist Bronze Floor Reading Lamp
  const lampStemGeom = new THREE.CylinderGeometry(0.02, 0.02, 1.4, 8);
  const lampStem = new THREE.Mesh(lampStemGeom, materials.bronzeMetal);
  lampStem.position.set(4.1, 0.7, 11.2);
  lampStem.castShadow = isHigh;
  lampStem.name = 'living-lamp-stem';
  livingGroup.add(lampStem);

  const lampShadeGeom = new THREE.CylinderGeometry(0.12, 0.16, 0.18, 12);
  const lampShade = new THREE.Mesh(lampShadeGeom, materials.ambientLuminaire);
  lampShade.position.set(4.1, 1.4, 11.2);
  lampShade.name = 'living-lamp-shade';
  livingGroup.add(lampShade);

  // 4. Sliding Glass Door System (Rear Wall Z = 15.4 to 15.5, Opening X in [0.8, 3.8])
  // Bronze Track Frame Header & Sill
  const trackHeaderGeom = new THREE.BoxGeometry(3.1, 0.08, 0.14);
  const trackHeader = new THREE.Mesh(trackHeaderGeom, materials.bronzeMetal);
  trackHeader.position.set(2.3, 2.81, 15.45);
  trackHeader.castShadow = !isLow;
  trackHeader.name = 'living-sliding-track-header';
  livingGroup.add(trackHeader);

  const trackSillGeom = new THREE.BoxGeometry(3.1, 0.02, 0.14);
  const trackSill = new THREE.Mesh(trackSillGeom, materials.bronzeMetal);
  trackSill.position.set(2.3, 0.01, 15.45);
  trackSill.receiveShadow = true;
  trackSill.name = 'living-sliding-track-sill';
  livingGroup.add(trackSill);

  // Fixed Left Glass Panel: X in [0.8, 1.45], Y in [0.02, 2.8]
  const fixedGlassGeom = new THREE.BoxGeometry(0.65, 2.76, 0.03);
  const fixedGlass = new THREE.Mesh(fixedGlassGeom, materials.architecturalGlass);
  fixedGlass.position.set(1.125, 1.4, 15.42);
  fixedGlass.name = 'living-fixed-glass-pane';
  livingGroup.add(fixedGlass);

  const fixedMullionGeom = new THREE.BoxGeometry(0.06, 2.76, 0.06);
  const fixedMullion = new THREE.Mesh(fixedMullionGeom, materials.bronzeMetal);
  fixedMullion.position.set(1.44, 1.4, 15.42);
  fixedMullion.name = 'living-fixed-glass-mullion';
  livingGroup.add(fixedMullion);

  // Open Sliding Glass Panel (slid left onto fixed panel): X in [0.85, 1.45], Z = 15.48
  const slidingGlassGeom = new THREE.BoxGeometry(0.60, 2.74, 0.03);
  const slidingGlass = new THREE.Mesh(slidingGlassGeom, materials.architecturalGlass);
  slidingGlass.position.set(1.15, 1.4, 15.48);
  slidingGlass.name = 'living-sliding-glass-pane-open';
  livingGroup.add(slidingGlass);

  // Clear Traversal Corridor: X in [1.5, 3.8] is completely unobstructed, opening view to garden!

  // Stable Hotspot Anchor: 'sliding-glass' at [2.2, 1.5, 14.8]
  const slidingGlassAnchor = new THREE.Group();
  slidingGlassAnchor.name = 'hotspot-anchor-sliding-glass';
  slidingGlassAnchor.position.set(2.2, 1.5, 14.8);
  livingGroup.add(slidingGlassAnchor);

  // 5. Architectural Ceiling Timber Battens (Y = 3.75, X in [-6, 6], Z in [5, 15])
  const battenOffsetsZ = [5.5, 7.5, 9.5, 11.5, 13.5];
  battenOffsetsZ.forEach((z, idx) => {
    const battenGeom = new THREE.BoxGeometry(11.8, 0.08, 0.12);
    const batten = new THREE.Mesh(battenGeom, materials.teakWood);
    batten.position.set(0.0, 3.75, z);
    batten.receiveShadow = true;
    batten.name = `living-ceiling-batten-${idx}`;
    livingGroup.add(batten);
  });

  return { group: livingGroup, materials };
}

/**
 * React Three Fiber component for the Living Room Zone.
 */
export const Living: React.FC<LivingProps> = ({ tier = 'high' }) => {
  const { group, materials } = React.useMemo(() => createLivingZoneObject(tier), [tier]);

  React.useEffect(() => {
    return () => {
      disposeLivingMaterials(materials);
    };
  }, [materials]);

  return <primitive object={group} />;
};

export default Living;
