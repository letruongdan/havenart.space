'use client';

/**
 * HavenArt — Scene Canvas Host & WebGL Context Lifecycle (Gate G2 Full Montage)
 * Contract Version: havenart-contracts-1.1
 * References: docs/SCENE_ARCHITECTURE.md, docs/LIGHTING_SPEC.md, docs/PERFORMANCE_BUDGET.md
 *
 * Local Criteria (W25):
 * - W25-AC1: Mọi system dùng same rendered frame, no duplicate runtime/scene/audio/listeners.
 * - W25-AC2: G1 không regress; G2 full flow tới garden + contact, reverse, modal+locale.
 * - Persistent shell + full architectural zones (Exterior, Entrance, Living, Garden).
 * - Synchronized LightingRig & EnvironmentalMotion.
 */

import '@react-three/fiber';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { QualityTier } from '@/types/story';
import type { ZoneHandle } from '@/types/scene';
import type { StoryRuntime } from '@/types/runtime';
import { sampleRail } from '@/lib/three/cameraRail';
import { CAMERA_OPTICS, focalLengthToVerticalFov } from '@/config/camera';
import { getEffectiveDpr } from '@/config/quality';
import { VillaShell } from './VillaShell';
import { ZoneBoundary } from './ZoneBoundary';
import { Exterior } from './zones/Exterior';
import { Entrance } from './zones/Entrance';
import { Living } from './zones/Living';
import { Garden } from './zones/Garden';
import { createLightingRigObject } from './LightingRig';
import { EnvironmentalMotion } from './EnvironmentalMotion';
import { FurnitureProxy } from './proxies/FurnitureProxy';
import { GardenProxy } from './proxies/GardenProxy';

let activeRuntimeInstance: StoryRuntime | null = null;

export function setActiveStoryRuntime(runtime: StoryRuntime | null): void {
  activeRuntimeInstance = runtime;
}

export function getActiveStoryRuntime(): StoryRuntime | null {
  return activeRuntimeInstance;
}

export interface SceneCanvasProps {
  readonly tier?: Exclude<QualityTier, 'fallback'>;
  readonly residentHandles?: readonly ZoneHandle[];
  readonly runtime?: StoryRuntime | null;
  readonly onContextLost?: () => void;
  readonly onCoreFailure?: (error: Error) => void;
  readonly onSceneReady?: () => void;
  readonly children?: React.ReactNode;
}

/**
 * Dynamic Architectural Lighting rig synchronized strictly to renderedStoryProgress (W18, W25).
 */
function SceneLighting({
  runtime,
  tier = 'high',
}: {
  runtime?: StoryRuntime | null;
  tier?: Exclude<QualityTier, 'fallback'>;
}) {
  const rig = useMemo(() => createLightingRigObject(0, tier), [tier]);

  useFrame(() => {
    const activeRuntime = runtime ?? getActiveStoryRuntime();
    const p = activeRuntime ? activeRuntime.getSnapshot().renderedStoryProgress : 0;
    rig.update(p, tier);
  });

  return <primitive object={rig.group} />;
}

/**
 * Context loss listener hook attached directly to canvas DOM element.
 */
function ContextLossHandler({
  canvasRef,
  onContextLost,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onContextLost?: () => void;
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !onContextLost) return;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      onContextLost();
    };

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
    };
  }, [canvasRef, onContextLost]);

  return null;
}

/**
 * Camera Controller component inside R3F Canvas.
 * Synchronizes camera position, orientation quaternion, and vertical FOV
 * with continuous renderedStoryProgress from StoryRuntime (W08, W13, W25).
 */
function CameraController({ runtime }: { runtime?: StoryRuntime | null }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.near = CAMERA_OPTICS.nearPlaneM;
    camera.far = CAMERA_OPTICS.farPlaneM;
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame(() => {
    const activeRuntime = runtime ?? getActiveStoryRuntime();
    const p = activeRuntime ? activeRuntime.getSnapshot().renderedStoryProgress : 0;
    const pose = sampleRail(p);

    camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
    camera.quaternion.set(
      pose.quaternion[0],
      pose.quaternion[1],
      pose.quaternion[2],
      pose.quaternion[3]
    );

    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = focalLengthToVerticalFov(pose.focalLengthMm);
      if (Math.abs(camera.fov - targetFov) > 0.001) {
        camera.fov = targetFov;
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}

/**
 * SceneCanvas: React Three Fiber host for the complete HavenArt 3D experience.
 */
export const SceneCanvas: React.FC<SceneCanvasProps> = ({
  tier = 'high',
  residentHandles = [],
  runtime,
  onContextLost,
  onCoreFailure,
  onSceneReady,
  children,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Responsive DPR budgeting (W21, PERFORMANCE_BUDGET)
  const [effectiveDpr, setEffectiveDpr] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return getEffectiveDpr(tier, window.devicePixelRatio || 1, window.innerWidth, window.innerHeight);
    }
    return tier === 'high' ? 1.5 : tier === 'medium' ? 1.25 : 1.0;
  });

  useEffect(() => {
    const handleResize = () => {
      setEffectiveDpr(
        getEffectiveDpr(tier, window.devicePixelRatio || 1, window.innerWidth, window.innerHeight)
      );
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, [tier]);

  useEffect(() => {
    onSceneReady?.();
  }, [onSceneReady]);

  return (
    <div
      className="canvas-container relative w-full h-full overflow-hidden"
      style={{ touchAction: 'pan-y' }}
      aria-hidden="true"
    >
      <Canvas
        ref={canvasRef}
        gl={{
          antialias: tier !== 'low',
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.05,
        }}
        camera={{
          position: [0.0, 1.65, -18.0],
          fov: 31.89, // 42mm lens equivalent on 24mm height sensor (W08-AC2)
          near: 0.08,
          far: 100.0,
        }}
        dpr={effectiveDpr}
        shadows={tier !== 'low'}
      >
        <ContextLossHandler canvasRef={canvasRef} onContextLost={onContextLost} />
        <CameraController runtime={runtime} />

        {/* Dynamic Architectural Sun & Atmosphere Lighting (W18, W25) */}
        <SceneLighting runtime={runtime} tier={tier} />

        {/* Subtle Environmental Wind Motion (W18, W25) */}
        <EnvironmentalMotion tier={tier} enabled={tier !== 'low'} />

        {/* Persistent Villa Shell (W10, W25) */}
        <VillaShell tier={tier} />

        {/* Full Phase 1 Architectural Zones (Gate G2 Montage) */}
        <ZoneBoundary
          zoneId="root"
          isCore={false}
          onCoreFailure={onCoreFailure}
          residentHandles={residentHandles}
        >
          {residentHandles.length > 0 ? (
            children
          ) : (
            <>
              {/* Exterior Zone Detail (W14) */}
              <Exterior tier={tier} />

              {/* Entrance Zone Detail (W14) */}
              <Entrance tier={tier} />

              {/* Living Room Zone Detail with PBR Materials (W15) */}
              <Living tier={tier} />

              {/* Rear Garden Terrace & Finale Tree (W19) */}
              <Garden tier={tier} />

              {/* Baseline detail proxies for low tier or additional safety */}
              {tier === 'low' && (
                <>
                  <FurnitureProxy tier={tier} />
                  <GardenProxy tier={tier} />
                </>
              )}
            </>
          )}
        </ZoneBoundary>
      </Canvas>
    </div>
  );
};

export default SceneCanvas;
