'use client';

/**
 * HavenArt — Dynamic Lighting Rig & Optical Atmosphere
 * Contract Version: havenart-contracts-1.1
 * References: docs/LIGHTING_SPEC.md, docs/SCENE_ARCHITECTURE.md
 *
 * Local Criteria (W18):
 * - W18-AC1: Late afternoon -> sunset -> dusk progression; identical lighting forward and reverse.
 * - W18-AC2: Synchronized strictly with renderedStoryProgress; no independent clock.
 * - W18-AC3: Shadow budget per tier (1 shadow caster only, sized 2048/1024/0).
 */

import React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { QualityTier } from '@/types/story';
import { LIGHTING_TIER_CONFIG } from '@/config/lighting';
import { sampleLighting } from '@/lib/three/sampleLighting';

export interface LightingRigProps {
  readonly progress?: number;
  readonly tier?: Exclude<QualityTier, 'fallback'>;
}

/**
 * Pure Three.js factory to create the Lighting Rig and its updater.
 * Adheres strictly to the 1 shadow-caster budget (W18-AC3).
 */
export function createLightingRigObject(
  initialProgress: number = 0,
  tier: Exclude<QualityTier, 'fallback'> = 'high'
): {
  group: THREE.Group;
  sunLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  livingFillLight: THREE.PointLight;
  entranceFillLight: THREE.PointLight;
  update: (progress: number, qualityTier?: Exclude<QualityTier, 'fallback'>) => void;
} {
  const group = new THREE.Group();
  group.name = 'lighting-rig';

  const tierSettings = LIGHTING_TIER_CONFIG[tier];
  const initialSample = sampleLighting(initialProgress);

  // 1. Hemisphere Light (Sky and Ground Ambient contribution)
  const hemiLight = new THREE.HemisphereLight(
    initialSample.skyColorHex,
    initialSample.groundColorHex,
    initialSample.ambientIntensity
  );
  hemiLight.name = 'hemi-sky-light';
  group.add(hemiLight);

  // 2. Main Directional Sun Light (Single Shadow Caster)
  const sunLight = new THREE.DirectionalLight(initialSample.sunColorHex, initialSample.sunIntensity);
  sunLight.name = 'directional-sun-light';

  // Position sun along direction vector from site centroid (0, 1.6, 7.5)
  const sunDistance = 35.0;
  sunLight.position.set(
    -initialSample.sunDirection[0] * sunDistance,
    initialSample.sunDirection[1] * sunDistance,
    -initialSample.sunDirection[2] * sunDistance + 7.5
  );

  const sunTarget = new THREE.Object3D();
  sunTarget.name = 'sun-light-target';
  sunTarget.position.set(0, 1.6, 7.5);
  group.add(sunTarget);
  sunLight.target = sunTarget;

  // Shadow budget configuration
  if (tierSettings.enableShadows) {
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = tierSettings.shadowMapSize;
    sunLight.shadow.mapSize.height = tierSettings.shadowMapSize;
    sunLight.shadow.bias = tierSettings.shadowBias;
    sunLight.shadow.normalBias = tierSettings.normalBias;

    const d = 18;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.camera.near = 1.0;
    sunLight.shadow.camera.far = 80.0;
  } else {
    sunLight.castShadow = false;
  }
  group.add(sunLight);

  // 3. Subtle Practical Fill Lights (No shadows to respect budget)
  // Interior Living Room Warm Glow
  const livingFillLight = new THREE.PointLight(
    0xffeed4,
    initialSample.practicalScale * 1.5,
    14.0,
    2.0
  );
  livingFillLight.position.set(0.0, 3.2, 8.0);
  livingFillLight.castShadow = false;
  livingFillLight.name = 'living-practical-fill';
  group.add(livingFillLight);

  // Entrance Foyer Warm Glow
  const entranceFillLight = new THREE.PointLight(
    0xfff2de,
    initialSample.practicalScale * 0.8,
    8.0,
    2.0
  );
  entranceFillLight.position.set(0.0, 3.2, 2.0);
  entranceFillLight.castShadow = false;
  entranceFillLight.name = 'entrance-practical-fill';
  group.add(entranceFillLight);

  // Updater function for per-frame continuous sampling
  const update = (progress: number, currentTier: Exclude<QualityTier, 'fallback'> = tier) => {
    const sample = sampleLighting(progress);
    const currentTierSettings = LIGHTING_TIER_CONFIG[currentTier];

    // Update hemisphere
    hemiLight.color.setHex(sample.skyColorHex);
    hemiLight.groundColor.setHex(sample.groundColorHex);
    hemiLight.intensity = sample.ambientIntensity;

    // Update directional sun
    sunLight.color.setHex(sample.sunColorHex);
    sunLight.intensity = sample.sunIntensity;
    sunLight.position.set(
      -sample.sunDirection[0] * sunDistance,
      sample.sunDirection[1] * sunDistance,
      -sample.sunDirection[2] * sunDistance + 7.5
    );

    // Update shadows if tier changed
    if (sunLight.castShadow !== currentTierSettings.enableShadows) {
      sunLight.castShadow = currentTierSettings.enableShadows;
      if (currentTierSettings.enableShadows) {
        sunLight.shadow.mapSize.width = currentTierSettings.shadowMapSize;
        sunLight.shadow.mapSize.height = currentTierSettings.shadowMapSize;
        sunLight.shadow.bias = currentTierSettings.shadowBias;
        sunLight.shadow.normalBias = currentTierSettings.normalBias;
      }
    }

    // Update practical lights
    livingFillLight.intensity = sample.practicalScale * 1.5;
    entranceFillLight.intensity = sample.practicalScale * 0.8;
  };

  return {
    group,
    sunLight,
    hemiLight,
    livingFillLight,
    entranceFillLight,
    update,
  };
}

/**
 * React Three Fiber component for the lighting rig.
 */
export const LightingRig: React.FC<LightingRigProps> = ({ progress = 0, tier = 'high' }) => {
  const rig = React.useMemo(() => createLightingRigObject(0, tier), [tier]);

  React.useEffect(() => {
    rig.update(progress, tier);
  }, [progress, tier, rig]);

  useFrame(() => {
    // Keeps rig in exact sync with current progress prop
    rig.update(progress, tier);
  });

  return <primitive object={rig.group} />;
};

export default LightingRig;
