/**
 * HavenArt — Progress & Kinematics Unit Tests
 * Contract Version: havenart-contracts-1.1
 */

import { describe, it, expect } from 'vitest';
import {
  clampProgress,
  progressToLocalProgress,
  localProgressToGlobal,
  isIndoorProgress,
  calculateMaxProgressVelocity,
  advanceProgress,
  DEFAULT_RUNTIME_LIMITS,
} from '@/lib/story/progress';
import { CHAPTERS } from '@/config/story';

describe('clampProgress', () => {
  it('clamps values inside and outside [0, 1]', () => {
    expect(clampProgress(0.5)).toBe(0.5);
    expect(clampProgress(-0.1)).toBe(0);
    expect(clampProgress(1.2)).toBe(1);
    expect(clampProgress(NaN)).toBe(0);
    expect(clampProgress(Infinity)).toBe(1);
    expect(clampProgress(-Infinity)).toBe(0);
  });
});

describe('local/global progress mapping', () => {
  const livingChapter = CHAPTERS.find((c) => c.id === 'living')!;

  it('maps global progress to local progress [0, 1]', () => {
    expect(progressToLocalProgress(livingChapter.progressStart, livingChapter)).toBe(0);
    expect(progressToLocalProgress(livingChapter.progressEnd, livingChapter)).toBe(1);

    const mid = (livingChapter.progressStart + livingChapter.progressEnd) / 2;
    expect(progressToLocalProgress(mid, livingChapter)).toBeCloseTo(0.5, 4);
  });

  it('round-trips local and global progress accurately', () => {
    const local = 0.42;
    const global = localProgressToGlobal(local, livingChapter);
    const recovered = progressToLocalProgress(global, livingChapter);
    expect(recovered).toBeCloseTo(local, 4);
  });
});

describe('indoor zone detection & max velocity calculations (W12-AC2)', () => {
  it('identifies indoor progress intervals correctly', () => {
    expect(isIndoorProgress(0.1)).toBe(false); // exterior
    expect(isIndoorProgress(0.27)).toBe(true);  // entrance
    expect(isIndoorProgress(0.5)).toBe(true);   // living
    expect(isIndoorProgress(0.68)).toBe(false); // garden
    expect(isIndoorProgress(0.9)).toBe(false);  // finale
  });

  it('respects spatial derivative and applies indoor vs outdoor speed limits', () => {
    // Indoor: max 3 m/s
    const indoorDerivative = { metersPerProgress: 20, radiansPerProgress: 1.0 };
    const indoorVMax = calculateMaxProgressVelocity(0.5, indoorDerivative, DEFAULT_RUNTIME_LIMITS);
    expect(indoorVMax).toBeLessThanOrEqual(DEFAULT_RUNTIME_LIMITS.maxIndoorMps / 20);

    // Outdoor: max 5 m/s
    const outdoorDerivative = { metersPerProgress: 20, radiansPerProgress: 1.0 };
    const outdoorVMax = calculateMaxProgressVelocity(0.1, outdoorDerivative, DEFAULT_RUNTIME_LIMITS);
    expect(outdoorVMax).toBeCloseTo(DEFAULT_RUNTIME_LIMITS.maxOutdoorMps / 20, 4);
  });

  it('respects angular speed limit when turning sharply', () => {
    const sharpTurnDerivative = { metersPerProgress: 10, radiansPerProgress: 10.0 };
    const vMax = calculateMaxProgressVelocity(0.7, sharpTurnDerivative, DEFAULT_RUNTIME_LIMITS);
    // Angular constraint governs: 0.5236 / 10 = ~0.05236
    expect(vMax).toBeCloseTo(DEFAULT_RUNTIME_LIMITS.maxRadiansPerSecond / 10.0, 4);
  });
});

describe('advanceProgress smooth integration (W12-AC1, W12-AC2)', () => {
  it('clamps dt to maxDtSeconds to eliminate background tab dt jumps', () => {
    // Large 10s dt jump (e.g. user switched back from hidden tab)
    const result = advanceProgress(0.1, 0.9, 0, 10.0, 0.1, 1.0, 0.1);
    // At max dt = 0.1s and max acceleration = 1.0, velocity change is at most 0.1 * 1.0 = 0.1
    expect(result.nextVelocity).toBeLessThanOrEqual(0.1);
    expect(result.nextProgress).toBeLessThan(0.2); // Not jumping directly to 0.9!
  });

  it('smoothly reverses direction with finite deceleration and acceleration', () => {
    // Moving forward at +0.1 progress/s, but target is behind at 0.0
    const currentP = 0.5;
    const targetP = 0.2;
    const initialVelocity = 0.1;

    const step1 = advanceProgress(currentP, targetP, initialVelocity, 0.02, 0.2, 2.0);
    // Velocity should decrease (decelerate), not immediately jump to negative max speed
    expect(step1.nextVelocity).toBeLessThan(initialVelocity);
    expect(step1.direction).toBe(1); // Still moving forward during deceleration
  });

  it('converges precisely at target when close', () => {
    const result = advanceProgress(0.500001, 0.5, 0.00001, 0.016, 0.1, 1.0);
    expect(result.nextProgress).toBe(0.5);
    expect(result.nextVelocity).toBe(0);
    expect(result.direction).toBe(0);
  });
});
