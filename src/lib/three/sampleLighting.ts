/**
 * HavenArt — Continuous Lighting Track Sampling
 * Contract Version: havenart-contracts-1.1
 * References: docs/LIGHTING_SPEC.md, docs/SCENE_ARCHITECTURE.md
 *
 * Local Criteria (W18):
 * - W18-AC1: Late afternoon -> sunset -> dusk subtle; reverse lookup at same p produces identical lighting.
 * - W18-AC2: No standalone tween or time-of-day clock divergent from story progress; finite/non-negative values.
 */

import type { LightingPreset, Vec3 } from '@/types/story';
import { LIGHTING_KEYFRAMES, type LightingKeyframe } from '@/config/lighting';

/**
 * Linearly interpolates between two numbers.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Smoothstep interpolation for soft non-linear transitions.
 */
function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

/**
 * Linearly interpolates between two hex colors in sRGB channel space.
 */
function lerpColorHex(colorA: number, colorB: number, t: number): number {
  const rA = (colorA >> 16) & 0xff;
  const gA = (colorA >> 8) & 0xff;
  const bA = colorA & 0xff;

  const rB = (colorB >> 16) & 0xff;
  const gB = (colorB >> 8) & 0xff;
  const bB = colorB & 0xff;

  const r = Math.round(lerp(rA, rB, t));
  const g = Math.round(lerp(gA, gB, t));
  const b = Math.round(lerp(bA, bB, t));

  return (r << 16) | (g << 8) | b;
}

function normalizeVec3(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1.0;
  return [v[0] / len, v[1] / len, v[2] / len];
}

export interface DetailedLightingSample extends LightingPreset {
  readonly exposure: number;
  readonly practicalScale: number;
  readonly skyColorHex: number;
  readonly groundColorHex: number;
  readonly sunColorHex: number;
}

/**
 * Evaluates the lighting track at the given progress `p` (C10 Contract).
 * Guaranteed to be deterministic and identical in both forward and reverse playback.
 * All return values are strictly finite and non-negative (W18-AC2).
 */
export function sampleLighting(p: number): DetailedLightingSample {
  // Clamp progress to valid closed interval [0, 1]
  const clampedP = Math.max(0, Math.min(1, Number.isFinite(p) ? p : 0));

  const keyframes = LIGHTING_KEYFRAMES;

  // Handle boundary progress values
  if (clampedP <= keyframes[0].progress) {
    const kf = keyframes[0];
    return {
      environment: kf.environment,
      sunIntensity: kf.sunIntensity,
      sunDirection: normalizeVec3(kf.sunDirection),
      ambientIntensity: kf.ambientIntensity,
      practicalLights: Math.round(kf.practicalScale * 4),
      exposure: kf.exposure,
      practicalScale: kf.practicalScale,
      skyColorHex: kf.skyColorHex,
      groundColorHex: kf.groundColorHex,
      sunColorHex: kf.sunColorHex,
    };
  }

  const lastIndex = keyframes.length - 1;
  if (clampedP >= keyframes[lastIndex].progress) {
    const kf = keyframes[lastIndex];
    return {
      environment: kf.environment,
      sunIntensity: kf.sunIntensity,
      sunDirection: normalizeVec3(kf.sunDirection),
      ambientIntensity: kf.ambientIntensity,
      practicalLights: Math.round(kf.practicalScale * 4),
      exposure: kf.exposure,
      practicalScale: kf.practicalScale,
      skyColorHex: kf.skyColorHex,
      groundColorHex: kf.groundColorHex,
      sunColorHex: kf.sunColorHex,
    };
  }

  // Find adjacent keyframes [kfA, kfB]
  let kfA: LightingKeyframe = keyframes[0];
  let kfB: LightingKeyframe = keyframes[1];

  for (let i = 0; i < lastIndex; i++) {
    if (clampedP >= keyframes[i].progress && clampedP <= keyframes[i + 1].progress) {
      kfA = keyframes[i];
      kfB = keyframes[i + 1];
      break;
    }
  }

  const span = kfB.progress - kfA.progress;
  const localT = span > 0 ? (clampedP - kfA.progress) / span : 0;
  const t = smoothstep(0, 1, localT);

  // 1. Sun direction interpolation with vector normalization
  const dirX = lerp(kfA.sunDirection[0], kfB.sunDirection[0], t);
  const dirY = lerp(kfA.sunDirection[1], kfB.sunDirection[1], t);
  const dirZ = lerp(kfA.sunDirection[2], kfB.sunDirection[2], t);
  const length = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ) || 1.0;
  const sunDirection: Vec3 = [dirX / length, dirY / length, dirZ / length];

  // 2. Scalars interpolation (finite & non-negative)
  const sunIntensity = Math.max(0, lerp(kfA.sunIntensity, kfB.sunIntensity, t));
  const ambientIntensity = Math.max(0, lerp(kfA.ambientIntensity, kfB.ambientIntensity, t));
  const practicalScale = Math.max(0, lerp(kfA.practicalScale, kfB.practicalScale, t));
  const exposure = Math.max(0.1, lerp(kfA.exposure, kfB.exposure, t));

  // 3. Dominant environment tag
  const environment = t < 0.5 ? kfA.environment : kfB.environment;

  // 4. Color interpolations
  const skyColorHex = lerpColorHex(kfA.skyColorHex, kfB.skyColorHex, t);
  const groundColorHex = lerpColorHex(kfA.groundColorHex, kfB.groundColorHex, t);
  const sunColorHex = lerpColorHex(kfA.sunColorHex, kfB.sunColorHex, t);

  const practicalLights = Math.round(practicalScale * 4);

  return {
    environment,
    sunIntensity,
    sunDirection,
    ambientIntensity,
    practicalLights,
    exposure,
    practicalScale,
    skyColorHex,
    groundColorHex,
    sunColorHex,
  };
}
