'use client';

/**
 * HavenArt — Scene Canvas Host & WebGL Context Lifecycle
 * Contract Version: havenart-contracts-1.1
 * References: docs/SCENE_ARCHITECTURE.md, docs/LIGHTING_SPEC.md
 *
 * Local Criteria (W11):
 * - W11-AC1: WebGL context lifecycle và canvas mounting.
 * - W11-AC2: Bắt sự kiện webglcontextlost, dispatch fallback to static mode.
 * - W11-AC3: Persistent shell + zone boundary mounting.
 */

import '@react-three/fiber';
import React, { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { QualityTier } from '@/types/story';
import type { ZoneHandle } from '@/types/scene';
import type { StoryRuntime } from '@/types/runtime';
import { sampleRail } from '@/lib/three/cameraRail';
import { CAMERA_OPTICS, focalLengthToVerticalFov } from '@/config/camera';
import { VillaShell } from './VillaShell';
import { ZoneBoundary } from './ZoneBoundary';
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
 * Baseline architectural lighting setup for the scene.
 */
function BaselineLighting() {
  return (
    <>
      {/* Soft ambient fill: warm tropical atmosphere */}
      <ambientLight color="#fdfbf7" intensity={0.65} />

      {/* Primary directional sunlight: afternoon golden angle */}
      <directionalLight
        color="#fff5e6"
        intensity={1.2}
        position={[12, 18, -10]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0001}
      />

      {/* Secondary soft sky bounce light */}
      <directionalLight color="#9dc4db" intensity={0.3} position={[-8, 12, 10]} />
    </>
  );
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
      // Prevent default to enable clean recovery or graceful static fallback
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
 * with continuous renderedStoryProgress from StoryRuntime (W08, W13).
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
 * SceneCanvas: React Three Fiber host for the 3D scene.
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
        dpr={tier === 'high' ? [1, 2] : [1, 1.5]}
        shadows={tier !== 'low'}
      >
        <ContextLossHandler canvasRef={canvasRef} onContextLost={onContextLost} />
        <CameraController runtime={runtime} />

        {/* Ambient & Sun Lighting */}
        <BaselineLighting />

        {/* Persistent Villa Shell (W10) */}
        <VillaShell tier={tier} />

        {/* Zone detail and streaming boundary (W11-AC2) */}
        <ZoneBoundary
          zoneId="root"
          isCore={false}
          onCoreFailure={onCoreFailure}
          residentHandles={residentHandles}
        >
          {/* Baseline detail proxies when residentHandles are not yet loaded */}
          {residentHandles.length === 0 && (
            <>
              <FurnitureProxy tier={tier} />
              <GardenProxy tier={tier} />
            </>
          )}
          {children}
        </ZoneBoundary>
      </Canvas>
    </div>
  );
};

export default SceneCanvas;
