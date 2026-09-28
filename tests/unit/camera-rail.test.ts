import { describe, it, expect } from 'vitest';
import { sampleRail, sampleRailDerivative } from '@/lib/three/cameraRail';
import {
  validateRailClearance,
  VILLA_FIXTURE_OBSTACLES,
  type ClearanceObstacle,
} from '@/lib/three/railClearance';
import {
  CAMERA_OPTICS,
  focalLengthToVerticalFov,
} from '@/config/camera';

describe('W08 — Camera Rail Spline & Determinism (W08-AC1)', () => {
  it('is completely deterministic regardless of evaluation direction or query order', () => {
    const testPoints = [0.0, 0.15, 0.27, 0.39, 0.54, 0.68, 0.76, 0.87, 1.0, 0.42, 0.93];

    // Forward evaluation
    const forwardResults = testPoints.map((p) => sampleRail(p));

    // Reverse evaluation
    const reversedPoints = [...testPoints].reverse();
    const reverseResults = reversedPoints.map((p) => sampleRail(p)).reverse();

    for (let i = 0; i < testPoints.length; i++) {
      expect(forwardResults[i].position).toEqual(reverseResults[i].position);
      expect(forwardResults[i].target).toEqual(reverseResults[i].target);
      expect(forwardResults[i].quaternion).toEqual(reverseResults[i].quaternion);
      expect(forwardResults[i].focalLengthMm).toBe(reverseResults[i].focalLengthMm);
    }
  });

  it('clamps finite progress outside [0, 1] and throws on NaN or infinite', () => {
    const atZero = sampleRail(0.0);
    const belowZero = sampleRail(-0.5);
    expect(belowZero.position).toEqual(atZero.position);

    const atOne = sampleRail(1.0);
    const aboveOne = sampleRail(1.5);
    expect(aboveOne.position).toEqual(atOne.position);

    expect(() => sampleRail(NaN)).toThrow();
    expect(() => sampleRail(Infinity)).toThrow();
    expect(() => sampleRail(-Infinity)).toThrow();
  });

  it('has continuous position along the rail without teleports or cuts', () => {
    const steps = 100;
    let prevPose = sampleRail(0);

    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      const pose = sampleRail(p);

      const dx = pose.position[0] - prevPose.position[0];
      const dy = pose.position[1] - prevPose.position[1];
      const dz = pose.position[2] - prevPose.position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Across 1% progress step, camera should not jump by more than 1.5 meters
      expect(dist).toBeLessThan(1.5);
      prevPose = pose;
    }
  });

  it('maintains quaternion normalization and eliminates hemisphere flips', () => {
    const steps = 100;
    let prevQ = sampleRail(0).quaternion;

    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      const pose = sampleRail(p);
      const q = pose.quaternion;

      // Unit quaternion norm check
      const norm = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
      expect(norm).toBeCloseTo(1.0, 4);

      // Dot product with previous quaternion to verify no sign-flip jumps (positive hemisphere)
      const dot = prevQ[0] * q[0] + prevQ[1] * q[1] + prevQ[2] * q[2] + prevQ[3] * q[3];
      expect(dot).toBeGreaterThan(0.85);

      prevQ = q;
    }
  });

  it('maintains zero camera roll throughout the entire journey', () => {
    const steps = 50;

    for (let i = 0; i <= steps; i++) {
      const p = i / steps;
      const pose = sampleRail(p);
      const q = pose.quaternion;

      // Compute right vector (local X axis) in world coords:
      // X_world = q * (1, 0, 0) * q^-1
      // Specifically the Y-component of the local X-axis:
      // y_comp = 2 * (qx * qy + qw * qz)
      const rightY = 2 * (q[0] * q[1] + q[3] * q[2]);

      // If roll is zero, camera horizon is horizontal (right vector has Y == 0)
      expect(Math.abs(rightY)).toBeLessThan(1e-3);
    }
  });

  it('produces positive, smooth speed and rotation derivatives', () => {
    const checkPoints = [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95];

    for (const p of checkPoints) {
      const deriv = sampleRailDerivative(p);
      expect(deriv.metersPerProgress).toBeGreaterThan(0);
      expect(deriv.radiansPerProgress).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(deriv.metersPerProgress)).toBe(true);
      expect(Number.isFinite(deriv.radiansPerProgress)).toBe(true);
    }
  });
});

describe('W08 — Camera Optics & Focal Length (W08-AC2)', () => {
  it('seeds default focal length at 42mm within 35–55mm equivalent', () => {
    expect(CAMERA_OPTICS.defaultFocalLengthMm).toBe(42);
    expect(CAMERA_OPTICS.defaultFocalLengthMm).toBeGreaterThanOrEqual(CAMERA_OPTICS.minFocalLengthMm);
    expect(CAMERA_OPTICS.defaultFocalLengthMm).toBeLessThanOrEqual(CAMERA_OPTICS.maxFocalLengthMm);

    const pose = sampleRail(0.5);
    expect(pose.focalLengthMm).toBe(42);
  });

  it('correctly converts focal length (mm) to vertical FOV (deg) without confusion', () => {
    // 42mm on 24mm sensor height:
    // fov = 2 * atan(24 / (2 * 42)) * 180 / PI = 2 * atan(12/42) * 180 / PI ~= 31.89 degrees
    const fov42 = focalLengthToVerticalFov(42);
    expect(fov42).toBeCloseTo(31.89, 1);

    // 50mm normal lens on 24mm sensor: ~= 27.0 degrees
    const fov50 = focalLengthToVerticalFov(50);
    expect(fov50).toBeCloseTo(26.99, 1);

    // Rejects non-positive focal length
    expect(() => focalLengthToVerticalFov(0)).toThrow();
    expect(() => focalLengthToVerticalFov(-35)).toThrow();
  });
});

describe('W08 — Rail Clearance & Collision Obstacles (W08-AC3)', () => {
  it('successfully sweeps through real villa doors with zero clearance issues', () => {
    const sampleCount = 101;
    const samples = [];

    for (let i = 0; i < sampleCount; i++) {
      const p = i / (sampleCount - 1);
      samples.push({ ...sampleRail(p), p });
    }

    const issues = validateRailClearance(samples, VILLA_FIXTURE_OBSTACLES);
    expect(issues).toEqual([]);
  });

  it('detects clearance issues when an obstacle is placed directly on the camera path', () => {
    const samples = [{ ...sampleRail(0.39), p: 0.39 }];

    // Inject obstacle directly at the entrance foyer position [0.0, 1.65, 4.4]
    const artificialObstacle: ClearanceObstacle = {
      id: 'pillar-foyer-collision',
      min: [-0.2, 0.0, 4.2],
      max: [0.2, 3.0, 4.6],
    };

    const issues = validateRailClearance(samples, [artificialObstacle]);
    expect(issues.length).toBe(1);
    expect(issues[0].obstacleId).toBe('pillar-foyer-collision');
    expect(issues[0].p).toBe(0.39);
    expect(issues[0].distanceM).toBeLessThan(CAMERA_OPTICS.minClearanceM);
  });
});
