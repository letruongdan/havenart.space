/**
 * HavenArt — Lighting Track & Optical Atmosphere Unit Tests
 * Test Suite: tests/unit/lighting.test.ts
 * Contract Version: havenart-contracts-1.1
 *
 * Local Criteria (W18):
 * - W18-AC1: Late afternoon -> sunset -> dusk progression; identical lighting forward and reverse.
 * - W18-AC2: No standalone tween divergent from progress; finite, non-negative values; unit normal sun direction.
 * - W18-AC3: Shadow budget per tier (1 shadow caster only, sized 2048/1024/0); no auto-exposure drift.
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { sampleLighting } from '@/lib/three/sampleLighting';
import { createLightingRigObject } from '@/components/scene/LightingRig';
import { applyEnvironmentalSway } from '@/components/scene/EnvironmentalMotion';

describe('W18 — Lighting Track Sampling & Determinism', () => {
  it('W18-AC1: Curated progression transitions smoothly from golden hour to sunset to dusk', () => {
    const p0 = sampleLighting(0.0);
    const pEntrance = sampleLighting(0.27);
    const pLiving = sampleLighting(0.39);
    const pGarden = sampleLighting(0.68);
    const pDusk = sampleLighting(0.87);
    const pFinale = sampleLighting(1.0);

    // Environment transitions
    expect(p0.environment).toBe('golden');
    expect(pEntrance.environment).toBe('golden');
    expect(pLiving.environment).toBe('sunset');
    expect(pGarden.environment).toBe('sunset');
    expect(pDusk.environment).toBe('dusk');
    expect(pFinale.environment).toBe('dusk');

    // Sun intensity decreases monotonically across key points
    expect(p0.sunIntensity).toBeGreaterThan(pEntrance.sunIntensity);
    expect(pEntrance.sunIntensity).toBeGreaterThan(pLiving.sunIntensity);
    expect(pLiving.sunIntensity).toBeGreaterThan(pGarden.sunIntensity);
    expect(pGarden.sunIntensity).toBeGreaterThan(pDusk.sunIntensity);
    expect(pDusk.sunIntensity).toBeGreaterThan(pFinale.sunIntensity);

    // Practical lighting scale increases monotonically across key points
    expect(p0.practicalScale).toBe(0.0);
    expect(pEntrance.practicalScale).toBeGreaterThanOrEqual(p0.practicalScale);
    expect(pLiving.practicalScale).toBeGreaterThan(pEntrance.practicalScale);
    expect(pGarden.practicalScale).toBeGreaterThan(pLiving.practicalScale);
    expect(pDusk.practicalScale).toBeGreaterThan(pGarden.practicalScale);
    expect(pFinale.practicalScale).toBeGreaterThan(pDusk.practicalScale);
  });

  it('W18-AC1: Forward and reverse lookups produce 100% identical lighting values', () => {
    const testPoints = [0.0, 0.12, 0.27, 0.35, 0.54, 0.68, 0.79, 0.87, 0.95, 1.0];

    // Forward evaluation
    const forwardSamples = testPoints.map((p) => sampleLighting(p));

    // Reverse evaluation
    const reverseSamples = [...testPoints].reverse().map((p) => sampleLighting(p)).reverse();

    for (let i = 0; i < testPoints.length; i++) {
      const fwd = forwardSamples[i];
      const rev = reverseSamples[i];

      expect(fwd.environment).toBe(rev.environment);
      expect(fwd.sunIntensity).toBeCloseTo(rev.sunIntensity, 6);
      expect(fwd.ambientIntensity).toBeCloseTo(rev.ambientIntensity, 6);
      expect(fwd.practicalScale).toBeCloseTo(rev.practicalScale, 6);
      expect(fwd.exposure).toBeCloseTo(rev.exposure, 6);
      expect(fwd.practicalLights).toBe(rev.practicalLights);
      expect(fwd.skyColorHex).toBe(rev.skyColorHex);
      expect(fwd.groundColorHex).toBe(rev.groundColorHex);
      expect(fwd.sunColorHex).toBe(rev.sunColorHex);

      expect(fwd.sunDirection[0]).toBeCloseTo(rev.sunDirection[0], 6);
      expect(fwd.sunDirection[1]).toBeCloseTo(rev.sunDirection[1], 6);
      expect(fwd.sunDirection[2]).toBeCloseTo(rev.sunDirection[2], 6);
    }
  });

  it('W18-AC2: Sun direction vector is continuously normalized to unit length', () => {
    for (let p = 0; p <= 1.0; p += 0.05) {
      const sample = sampleLighting(p);
      const [x, y, z] = sample.sunDirection;
      const length = Math.sqrt(x * x + y * y + z * z);
      expect(length).toBeCloseTo(1.0, 4);
    }
  });

  it('W18-AC2: Boundary and non-finite inputs clamp safely without throwing or NaN', () => {
    const negative = sampleLighting(-0.5);
    const zero = sampleLighting(0.0);
    expect(negative.sunIntensity).toBe(zero.sunIntensity);

    const overOne = sampleLighting(1.5);
    const one = sampleLighting(1.0);
    expect(overOne.sunIntensity).toBe(one.sunIntensity);

    const nanSample = sampleLighting(NaN);
    expect(nanSample.sunIntensity).toBe(zero.sunIntensity);

    const infSample = sampleLighting(Infinity);
    expect(infSample.sunIntensity).toBe(zero.sunIntensity);
  });

  it('W18-AC3: Lighting rig adheres strictly to shadow budget per tier', () => {
    // High tier: 2048 map, shadows enabled on sun only
    const highRig = createLightingRigObject(0.0, 'high');
    expect(highRig.sunLight.castShadow).toBe(true);
    expect(highRig.sunLight.shadow.mapSize.width).toBe(2048);
    expect(highRig.livingFillLight.castShadow).toBe(false);
    expect(highRig.entranceFillLight.castShadow).toBe(false);

    // Medium tier: 1024 map, shadows enabled on sun only
    const mediumRig = createLightingRigObject(0.0, 'medium');
    expect(mediumRig.sunLight.castShadow).toBe(true);
    expect(mediumRig.sunLight.shadow.mapSize.width).toBe(1024);
    expect(mediumRig.livingFillLight.castShadow).toBe(false);
    expect(mediumRig.entranceFillLight.castShadow).toBe(false);

    // Low tier: shadows completely disabled
    const lowRig = createLightingRigObject(0.0, 'low');
    expect(lowRig.sunLight.castShadow).toBe(false);
    expect(lowRig.livingFillLight.castShadow).toBe(false);
    expect(lowRig.entranceFillLight.castShadow).toBe(false);

    // Verify dynamic update respects tier
    highRig.update(0.68, 'high');
    expect(highRig.sunLight.intensity).toBeCloseTo(sampleLighting(0.68).sunIntensity, 4);
    expect(highRig.livingFillLight.intensity).toBeGreaterThan(0.2);
  });

  it('W18-AC3: Environmental motion sway is bounded strictly within safe limits', () => {
    const dummyObj1 = new THREE.Object3D();
    const dummyObj2 = new THREE.Object3D();
    const targets = [dummyObj1, dummyObj2];

    // High tier motion across time
    for (let t = 0; t <= 10; t += 0.5) {
      applyEnvironmentalSway(targets, t, 1.0);
      expect(Math.abs(dummyObj1.rotation.x)).toBeLessThanOrEqual(0.021);
      expect(Math.abs(dummyObj1.rotation.z)).toBeLessThanOrEqual(0.015);
      expect(Math.abs(dummyObj2.rotation.x)).toBeLessThanOrEqual(0.021);
      expect(Math.abs(dummyObj2.rotation.z)).toBeLessThanOrEqual(0.015);
    }

    // Zero intensity / low tier motion produces zero sway
    applyEnvironmentalSway(targets, 5.0, 0.0);
    expect(dummyObj1.rotation.x).toBe(0);
    expect(dummyObj1.rotation.z).toBe(0);
  });
});
