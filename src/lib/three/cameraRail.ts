/**
 * HavenArt — Spline Camera Rail & Continuous Evaluation
 * Contract Version: havenart-contracts-1.1
 * References: docs/CAMERA_SCROLL_SPEC.md, docs/SCENE_ARCHITECTURE.md
 */

import { Vector3, Quaternion, Matrix4, CatmullRomCurve3 } from 'three';
import type { CameraPose, Vec3 } from '@/types/story';
import { CAMERA_WAYPOINTS, CAMERA_OPTICS } from '@/config/camera';

export interface RailDerivative {
  readonly metersPerProgress: number;
  readonly radiansPerProgress: number;
}

// Prepare 3D control points from waypoints
const waypointPositions = CAMERA_WAYPOINTS.map(
  (w) => new Vector3(w.position[0], w.position[1], w.position[2])
);

const waypointTargets = CAMERA_WAYPOINTS.map(
  (w) => new Vector3(w.target[0], w.target[1], w.target[2])
);

// Spline curves using centripetal parameterization to eliminate wild overshoots
const positionCurve = new CatmullRomCurve3(waypointPositions, false, 'centripetal');
const targetCurve = new CatmullRomCurve3(waypointTargets, false, 'centripetal');

const waypointProgresses = CAMERA_WAYPOINTS.map((w) => w.progress);
const numWaypoints = CAMERA_WAYPOINTS.length;

/**
 * Piecewise monotonic cubic Hermite interpolator (PCHIP)
 * Maps progress p in [0, 1] to spline curve parameter t in [0, 1].
 * Guarantees strictly monotonic t(p) (no oscillation, dt/dp > 0).
 */
function progressToSplineT(p: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;

  // Find waypoint interval
  let idx = 0;
  while (idx < numWaypoints - 1 && waypointProgresses[idx + 1] <= p) {
    idx++;
  }

  if (idx >= numWaypoints - 1) {
    return 1;
  }

  const p0 = waypointProgresses[idx];
  const p1 = waypointProgresses[idx + 1];
  const t0 = idx / (numWaypoints - 1);
  const t1 = (idx + 1) / (numWaypoints - 1);

  const localFraction = (p - p0) / (p1 - p0);

  // Smooth Hermite S-curve within interval for C1 continuity
  const smoothFraction = localFraction * localFraction * (3 - 2 * localFraction);

  return t0 + smoothFraction * (t1 - t0);
}

/**
 * Computes camera orientation quaternion with zero roll angle (W08-AC1).
 * Camera looks from eye towards target, with horizon aligned with world Y-up.
 */
function computeOrientation(eye: Vector3, target: Vector3): Quaternion {
  const forward = new Vector3().subVectors(target, eye);
  const dist = forward.length();

  if (dist < 1e-4) {
    throw new Error('Look-at target cannot coincide with camera position');
  }

  // Camera local -Z points towards target in standard Three.js convention
  const zAxis = new Vector3().subVectors(eye, target).normalize();

  const worldUp = new Vector3(0, 1, 0);

  // If looking nearly straight up or down, fallback to Z-up to prevent singularity
  let xAxis = new Vector3().crossVectors(worldUp, zAxis);
  if (xAxis.lengthSq() < 1e-6) {
    xAxis = new Vector3().crossVectors(new Vector3(0, 0, 1), zAxis);
  }
  xAxis.normalize();

  // True up vector orthogonal to forward and right
  const yAxis = new Vector3().crossVectors(zAxis, xAxis).normalize();

  // Construct rotation matrix with basis vectors as columns
  const rotMatrix = new Matrix4().set(
    xAxis.x, yAxis.x, zAxis.x, 0,
    xAxis.y, yAxis.y, zAxis.y, 0,
    xAxis.z, yAxis.z, zAxis.z, 0,
    0, 0, 0, 1
  );

  return new Quaternion().setFromRotationMatrix(rotMatrix);
}

// Pre-sampled canonical quaternion orientation path to enforce hemisphere consistency
const NUM_REFERENCE_SAMPLES = 200;
const referenceQuaternions: Quaternion[] = [];

for (let i = 0; i <= NUM_REFERENCE_SAMPLES; i++) {
  const p = i / NUM_REFERENCE_SAMPLES;
  const t = progressToSplineT(p);
  const pos = positionCurve.getPoint(t);
  const tgt = targetCurve.getPoint(t);
  const q = computeOrientation(pos, tgt);

  if (i > 0) {
    const prev = referenceQuaternions[i - 1];
    if (prev.dot(q) < 0) {
      q.x = -q.x;
      q.y = -q.y;
      q.z = -q.z;
      q.w = -q.w;
    }
  }
  referenceQuaternions.push(q);
}

/**
 * Evaluates the camera rail at progress p in [0, 1].
 * Completely deterministic in both forward and reverse evaluation.
 */
export function sampleRail(p: number): CameraPose {
  if (Number.isNaN(p) || !Number.isFinite(p)) {
    throw new Error(`sampleRail expects a finite number, received ${p}`);
  }

  const clampedP = Math.max(0, Math.min(1, p));
  const t = progressToSplineT(clampedP);

  const pos = positionCurve.getPoint(t);
  const tgt = targetCurve.getPoint(t);

  const rawQuat = computeOrientation(pos, tgt);

  // Match sign with closest pre-computed reference quaternion for hemisphere consistency
  const refIdx = Math.round(clampedP * NUM_REFERENCE_SAMPLES);
  const refQuat = referenceQuaternions[refIdx];
  if (refQuat && refQuat.dot(rawQuat) < 0) {
    rawQuat.x = -rawQuat.x;
    rawQuat.y = -rawQuat.y;
    rawQuat.z = -rawQuat.z;
    rawQuat.w = -rawQuat.w;
  }

  const position: Vec3 = [
    Math.round(pos.x * 1e5) / 1e5,
    Math.round(pos.y * 1e5) / 1e5,
    Math.round(pos.z * 1e5) / 1e5,
  ];

  const target: Vec3 = [
    Math.round(tgt.x * 1e5) / 1e5,
    Math.round(tgt.y * 1e5) / 1e5,
    Math.round(tgt.z * 1e5) / 1e5,
  ];

  const quaternion: readonly [number, number, number, number] = [
    Math.round(rawQuat.x * 1e6) / 1e6,
    Math.round(rawQuat.y * 1e6) / 1e6,
    Math.round(rawQuat.z * 1e6) / 1e6,
    Math.round(rawQuat.w * 1e6) / 1e6,
  ];

  return {
    position,
    target,
    quaternion,
    focalLengthMm: CAMERA_OPTICS.defaultFocalLengthMm,
  };
}

/**
 * Computes speed derivatives along the rail:
 * - metersPerProgress (linear speed)
 * - radiansPerProgress (rotational speed)
 */
export function sampleRailDerivative(p: number): RailDerivative {
  if (Number.isNaN(p) || !Number.isFinite(p)) {
    throw new Error(`sampleRailDerivative expects a finite number, received ${p}`);
  }

  const clampedP = Math.max(0, Math.min(1, p));
  const dp = 0.002;

  const p1 = Math.max(0, clampedP - dp / 2);
  const p2 = Math.min(1, clampedP + dp / 2);
  const delta = p2 - p1;

  if (delta <= 0) {
    return { metersPerProgress: 0, radiansPerProgress: 0 };
  }

  const pose1 = sampleRail(p1);
  const pose2 = sampleRail(p2);

  // Position displacement
  const dx = pose2.position[0] - pose1.position[0];
  const dy = pose2.position[1] - pose1.position[1];
  const dz = pose2.position[2] - pose1.position[2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const metersPerProgress = dist / delta;

  // Angular displacement from quaternion dot product
  const q1 = pose1.quaternion;
  const q2 = pose2.quaternion;
  const dot = Math.abs(q1[0] * q2[0] + q1[1] * q2[1] + q1[2] * q2[2] + q1[3] * q2[3]);
  const clampedDot = Math.min(1.0, Math.max(-1.0, dot));
  const angleRad = 2 * Math.acos(clampedDot);
  const radiansPerProgress = angleRad / delta;

  return {
    metersPerProgress: Math.round(metersPerProgress * 100) / 100,
    radiansPerProgress: Math.round(radiansPerProgress * 100) / 100,
  };
}
