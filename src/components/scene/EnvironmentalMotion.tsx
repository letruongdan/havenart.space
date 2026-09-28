'use client';

/**
 * HavenArt — Subtle Environmental Foliage & Atmosphere Motion
 * Contract Version: havenart-contracts-1.1
 * References: docs/SCENE_ARCHITECTURE.md §3, docs/LIGHTING_SPEC.md §1
 *
 * Local Criteria (W18):
 * - W18-AC1 & W18-AC2: Motion is gentle ambient secondary animation; does NOT drive story clock or time-of-day.
 * - Disabled on low tier or reduced motion; amplitude bounded strictly within safe limits (<0.03 rad)
 *   so foliage never encroaches on camera corridor.
 */

import React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { QualityTier } from '@/types/story';

export interface EnvironmentalMotionProps {
  readonly tier?: Exclude<QualityTier, 'fallback'>;
  readonly enabled?: boolean;
  readonly targetObjects?: readonly THREE.Object3D[];
}

/**
 * Pure function to apply subtle wind sway to specified 3D objects.
 * Uses bounded trigonometric oscillations; amplitude is clamped strictly to prevent corridor violations.
 */
export function applyEnvironmentalSway(
  objects: readonly THREE.Object3D[],
  elapsedTime: number,
  intensity: number = 1.0
): void {
  if (objects.length === 0) return;

  if (intensity <= 0) {
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (obj) {
        obj.rotation.x = 0;
        obj.rotation.z = 0;
      }
    }
    return;
  }

  const baseAmp = 0.02 * Math.min(1.0, Math.max(0, intensity));
  const baseFreq = 0.85;

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    if (!obj) continue;

    // Phase offset per object index to avoid monolithic synchronous swaying
    const phase = i * 0.73;
    const swayX = Math.sin(elapsedTime * baseFreq + phase) * baseAmp;
    const swayZ = Math.cos(elapsedTime * baseFreq * 0.7 + phase) * (baseAmp * 0.6);

    obj.rotation.x = swayX;
    obj.rotation.z = swayZ;
  }
}

/**
 * React Three Fiber component for ambient environmental motion.
 */
export const EnvironmentalMotion: React.FC<EnvironmentalMotionProps> = ({
  tier = 'high',
  enabled = true,
  targetObjects = [],
}) => {
  const isEnabled = enabled && tier !== 'low';

  useFrame((state) => {
    if (!isEnabled || targetObjects.length === 0) return;

    const elapsedTime = state.clock.getElapsedTime();
    applyEnvironmentalSway(targetObjects, elapsedTime, tier === 'high' ? 1.0 : 0.5);
  });

  return null;
};

export default EnvironmentalMotion;
