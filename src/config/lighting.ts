/**
 * HavenArt — Lighting Track & Optical Configuration
 * Contract Version: havenart-contracts-1.1
 * References: docs/LIGHTING_SPEC.md, docs/SCENE_ARCHITECTURE.md
 */

import type { Vec3, QualityTier } from '@/types/story';

export interface LightingKeyframe {
  readonly progress: number;
  readonly sunIntensity: number;
  readonly sunDirection: Vec3;
  readonly ambientIntensity: number;
  readonly practicalScale: number;
  readonly exposure: number;
  readonly environment: 'golden' | 'sunset' | 'dusk';
  readonly skyColorHex: number;
  readonly groundColorHex: number;
  readonly sunColorHex: number;
}

/**
 * Curated artistic lighting track keyframes according to docs/LIGHTING_SPEC.md §2 & §3.
 * Continuous progression: Late golden hour (p=0.0) -> Warm sunset (p=0.39-0.68) -> Early dusk (p=0.87-1.0).
 */
export const LIGHTING_KEYFRAMES: readonly LightingKeyframe[] = [
  {
    progress: 0.0,
    sunIntensity: 2.2,
    sunDirection: [-0.55, 0.72, -0.42],
    ambientIntensity: 0.45,
    practicalScale: 0.0,
    exposure: 1.0,
    environment: 'golden',
    skyColorHex: 0xf5eedc,
    groundColorHex: 0x484236,
    sunColorHex: 0xfff6e6,
  },
  {
    progress: 0.27,
    sunIntensity: 2.02, // 2.2 * 0.92
    sunDirection: [-0.58, 0.68, -0.45],
    ambientIntensity: 0.48,
    practicalScale: 0.08,
    exposure: 1.02,
    environment: 'golden',
    skyColorHex: 0xf8e8cc,
    groundColorHex: 0x443e32,
    sunColorHex: 0xffeed0,
  },
  {
    progress: 0.39,
    sunIntensity: 1.89, // 2.2 * 0.86
    sunDirection: [-0.60, 0.64, -0.48],
    ambientIntensity: 0.52,
    practicalScale: 0.15,
    exposure: 1.05,
    environment: 'sunset',
    skyColorHex: 0xfce4be,
    groundColorHex: 0x403a30,
    sunColorHex: 0xffe4b8,
  },
  {
    progress: 0.68,
    sunIntensity: 1.36, // 2.2 * 0.62
    sunDirection: [-0.65, 0.52, -0.55],
    ambientIntensity: 0.58,
    practicalScale: 0.42,
    exposure: 1.04,
    environment: 'sunset',
    skyColorHex: 0xf5d0a6,
    groundColorHex: 0x38342c,
    sunColorHex: 0xffcf94,
  },
  {
    progress: 0.87,
    sunIntensity: 0.84, // 2.2 * 0.38
    sunDirection: [-0.70, 0.42, -0.58],
    ambientIntensity: 0.54,
    practicalScale: 0.72,
    exposure: 1.0,
    environment: 'dusk',
    skyColorHex: 0xbacde0,
    groundColorHex: 0x303028,
    sunColorHex: 0xfcb87a,
  },
  {
    progress: 1.0,
    sunIntensity: 0.62, // 2.2 * 0.28
    sunDirection: [-0.72, 0.38, -0.58],
    ambientIntensity: 0.48,
    practicalScale: 0.85,
    exposure: 0.98,
    environment: 'dusk',
    skyColorHex: 0x8ea8c4,
    groundColorHex: 0x242420,
    sunColorHex: 0xf09f65,
  },
] as const;

/**
 * Lighting budget & shadow map configuration per quality tier (docs/LIGHTING_SPEC.md §4).
 */
export const LIGHTING_TIER_CONFIG = {
  high: {
    shadowMapSize: 2048,
    shadowBias: -0.00015,
    normalBias: 0.02,
    enableShadows: true,
    maxPracticalLights: 4,
  },
  medium: {
    shadowMapSize: 1024,
    shadowBias: -0.00025,
    normalBias: 0.04,
    enableShadows: true,
    maxPracticalLights: 2,
  },
  low: {
    shadowMapSize: 0,
    shadowBias: 0,
    normalBias: 0,
    enableShadows: false,
    maxPracticalLights: 1,
  },
} as const;

export type LightingTierSettings = (typeof LIGHTING_TIER_CONFIG)[Exclude<QualityTier, 'fallback'>];
