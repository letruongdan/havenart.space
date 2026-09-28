/**
 * HavenArt — Progress Calculation, Velocity Limits & Interpolation
 * Contract Version: havenart-contracts-1.1
 * References: docs/CAMERA_SCROLL_SPEC.md, docs/SCENE_ARCHITECTURE.md
 *
 * Local Criteria (W12):
 * - W12-AC1: Tính toán p trong khoảng [0, 1].
 * - W12-AC2: Giới hạn vận tốc thế giới (m/s) và vận tốc góc (rad/s), giới hạn gia tốc,
 *            clamp dt tối đa tránh dt jump khi tab background.
 */

import type { StoryChapter } from '@/types/story';
import type { RailDerivative } from '@/types/scene';
import type { StoryRuntimeLimits } from '@/types/runtime';

/**
 * Default runtime kinematic limits per docs/CAMERA_SCROLL_SPEC.md §4 & §5
 */
export const DEFAULT_RUNTIME_LIMITS: StoryRuntimeLimits = {
  maxIndoorMps: 3.0,
  maxOutdoorMps: 5.0,
  maxRadiansPerSecond: 0.5236, // ~30 deg/s
  maxAccelerationMps2: 6.0,
  maxDtSeconds: 0.1, // 100ms clamp for background tabs (W12-AC2)
};

/**
 * Clamps a progress value strictly to [0, 1]. Handles NaN and non-finite values safely.
 */
export function clampProgress(p: number): number {
  if (Number.isNaN(p)) return 0;
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  return p;
}

/**
 * Converts global progress p [0, 1] to local progress [0, 1] within a chapter.
 */
export function progressToLocalProgress(p: number, chapter: StoryChapter): number {
  const clamped = clampProgress(p);
  const span = chapter.progressEnd - chapter.progressStart;
  if (span <= 0) return 0;
  const local = (clamped - chapter.progressStart) / span;
  if (local <= 0) return 0;
  if (local >= 1) return 1;
  return local;
}

/**
 * Converts local progress [0, 1] within a chapter back to global progress p.
 */
export function localProgressToGlobal(localP: number, chapter: StoryChapter): number {
  const clampedLocal = clampProgress(localP);
  const span = chapter.progressEnd - chapter.progressStart;
  return clampProgress(chapter.progressStart + clampedLocal * span);
}

/**
 * Determines whether a given progress is within indoor zones (entrance/living: [0.27, 0.68)).
 */
export function isIndoorProgress(p: number): boolean {
  return p >= 0.27 && p < 0.68;
}

/**
 * Calculates the maximum allowable progress velocity (dp/dt in progress units per second)
 * based on spatial camera rail derivative (meters/p and radians/p) and physical speed limits.
 */
export function calculateMaxProgressVelocity(
  p: number,
  derivative: RailDerivative,
  limits: StoryRuntimeLimits = DEFAULT_RUNTIME_LIMITS
): number {
  const isIndoor = isIndoorProgress(p);
  const maxWorldSpeedMps = isIndoor ? limits.maxIndoorMps : limits.maxOutdoorMps;

  // Linear speed constraint: dp/dt <= maxWorldSpeed / metersPerProgress
  const metersPerProgress = Math.max(derivative.metersPerProgress, 1e-4);
  const linearMaxProgressRate = maxWorldSpeedMps / metersPerProgress;

  // Angular speed constraint: dp/dt <= maxRadiansPerSecond / radiansPerProgress
  const radiansPerProgress = Math.max(derivative.radiansPerProgress, 1e-4);
  const angularMaxProgressRate = limits.maxRadiansPerSecond / radiansPerProgress;

  // Most restrictive limit governs
  return Math.min(linearMaxProgressRate, angularMaxProgressRate);
}

export interface ProgressStepResult {
  readonly nextProgress: number;
  readonly nextVelocity: number;
  readonly direction: -1 | 0 | 1;
}

/**
 * Advances rendered story progress towards target progress with clamped dt,
 * acceleration limits, and dynamic velocity limits.
 */
export function advanceProgress(
  currentP: number,
  targetP: number,
  currentVelocity: number,
  dtSeconds: number,
  maxVelocity: number,
  maxAcceleration: number = 2.0, // default max acceleration in progress/s^2
  maxDtSeconds: number = DEFAULT_RUNTIME_LIMITS.maxDtSeconds
): ProgressStepResult {
  // Clamp dt to eliminate huge jumps when tab is hidden or paused (W12-AC2)
  const dt = Math.min(Math.max(dtSeconds, 0), maxDtSeconds);
  if (dt <= 0) {
    return {
      nextProgress: currentP,
      nextVelocity: currentVelocity,
      direction: 0,
    };
  }

  const delta = targetP - currentP;
  if (Math.abs(delta) < 1e-5 && Math.abs(currentVelocity) < 1e-4) {
    return {
      nextProgress: targetP,
      nextVelocity: 0,
      direction: 0,
    };
  }

  const desiredDirection = Math.sign(delta) as -1 | 0 | 1;

  // Calculate braking distance required to stop from current velocity at maxAcceleration
  const speed = Math.abs(currentVelocity);
  const stoppingDist = (speed * speed) / (2 * Math.max(maxAcceleration, 1e-4));

  let targetVelocity: number;
  if (Math.abs(delta) <= stoppingDist && Math.sign(currentVelocity) === desiredDirection) {
    // Decelerate smoothly towards zero to arrive at target
    targetVelocity = 0;
  } else {
    // Accelerate towards maximum allowable velocity
    targetVelocity = desiredDirection * maxVelocity;
  }

  // Apply acceleration limit
  const maxVelChange = maxAcceleration * dt;
  const velDiff = targetVelocity - currentVelocity;
  const clampedVelDiff = Math.max(-maxVelChange, Math.min(maxVelChange, velDiff));
  let nextVelocity = currentVelocity + clampedVelDiff;

  // Clamp velocity magnitude to maxVelocity
  if (Math.abs(nextVelocity) > maxVelocity) {
    nextVelocity = Math.sign(nextVelocity) * maxVelocity;
  }

  // Integrate position
  let nextProgress = clampProgress(currentP + nextVelocity * dt);

  // Prevent overshoot past target if approaching with low speed
  if (
    (currentVelocity >= 0 && nextProgress >= targetP && currentP <= targetP) ||
    (currentVelocity <= 0 && nextProgress <= targetP && currentP >= targetP)
  ) {
    if (Math.abs(nextProgress - targetP) < 0.002) {
      nextProgress = targetP;
      nextVelocity = 0;
    }
  }

  const direction: -1 | 0 | 1 =
    nextProgress > currentP ? 1 : nextProgress < currentP ? -1 : 0;

  return {
    nextProgress,
    nextVelocity,
    direction,
  };
}
