/**
 * HavenArt — Living Room PBR Materials & Resource Ownership
 * Contract Version: havenart-contracts-1.1
 * References: docs/LIGHTING_SPEC.md, docs/SCENE_ARCHITECTURE.md, docs/HOTSPOT_SPEC.md
 *
 * Local Criteria (W15):
 * - W15-AC2: PBR roughness/texture scale mét đúng, không heavy bloom che scene yếu.
 * - W15-AC3: Material riêng có ownership; shared resource chỉ release không dispose trực tiếp.
 */

import * as THREE from 'three';

export interface LivingMaterials {
  readonly travertine: THREE.MeshStandardMaterial;
  readonly teakWood: THREE.MeshStandardMaterial;
  readonly linenFabric: THREE.MeshStandardMaterial;
  readonly bronzeMetal: THREE.MeshStandardMaterial;
  readonly architecturalGlass: THREE.MeshStandardMaterial;
  readonly woolRug: THREE.MeshStandardMaterial;
  readonly ceramicDecor: THREE.MeshStandardMaterial;
  readonly ambientLuminaire: THREE.MeshStandardMaterial;
}

/**
 * Creates dedicated PBR materials for the Living Room zone.
 * Calibrated against docs/LIGHTING_SPEC.md §6:
 * - Travertine: Warm ivory stone, roughness 0.60, non-blinding specular
 * - Teak wood: Warm architectural timber, roughness 0.65
 * - Architectural glass: Highly transparent (opacity ~0.35), slight tint, roughness 0.08
 * - Bronze frames: Brushed dark metallic frame, roughness 0.35, metalness 0.65
 * - Linen: Natural tactile fabric, roughness 0.85
 */
export function createLivingMaterials(): LivingMaterials {
  const travertine = new THREE.MeshStandardMaterial({
    color: 0xede8dc,
    roughness: 0.60,
    metalness: 0.04,
    name: 'living-travertine-material',
  });

  const teakWood = new THREE.MeshStandardMaterial({
    color: 0x543f2e,
    roughness: 0.65,
    metalness: 0.08,
    name: 'living-teak-wood-material',
  });

  const linenFabric = new THREE.MeshStandardMaterial({
    color: 0xdad4c8,
    roughness: 0.85,
    metalness: 0.02,
    name: 'living-linen-fabric-material',
  });

  const bronzeMetal = new THREE.MeshStandardMaterial({
    color: 0x2d2822,
    roughness: 0.35,
    metalness: 0.65,
    name: 'living-bronze-metal-material',
  });

  const architecturalGlass = new THREE.MeshStandardMaterial({
    color: 0xdce8ea,
    roughness: 0.08,
    metalness: 0.10,
    transparent: true,
    opacity: 0.35,
    name: 'living-architectural-glass-material',
  });

  const woolRug = new THREE.MeshStandardMaterial({
    color: 0xc9c3b4,
    roughness: 0.90,
    metalness: 0.0,
    name: 'living-wool-rug-material',
  });

  const ceramicDecor = new THREE.MeshStandardMaterial({
    color: 0x3a3632,
    roughness: 0.50,
    metalness: 0.10,
    name: 'living-ceramic-decor-material',
  });

  const ambientLuminaire = new THREE.MeshStandardMaterial({
    color: 0xfff8e8,
    emissive: 0xfff8e8,
    emissiveIntensity: 0.40,
    roughness: 0.30,
    metalness: 0.05,
    name: 'living-ambient-luminaire-material',
  });

  return {
    travertine,
    teakWood,
    linenFabric,
    bronzeMetal,
    architecturalGlass,
    woolRug,
    ceramicDecor,
    ambientLuminaire,
  };
}

/**
 * Safely disposes only the dedicated materials owned by the Living zone instance (W15-AC3).
 * Shared textures and global registry resources are never disposed here.
 */
export function disposeLivingMaterials(materials: LivingMaterials): void {
  Object.values(materials).forEach((mat) => {
    if (mat && typeof mat.dispose === 'function') {
      mat.dispose();
    }
  });
}
