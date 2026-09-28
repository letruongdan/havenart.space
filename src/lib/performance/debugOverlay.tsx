'use client';

/**
 * HavenArt — Performance & Telemetry Diagnostics Overlay
 * Contract Version: havenart-contracts-1.1
 * References: docs/PERFORMANCE_BUDGET.md, docs/agents/tasks/W26.md
 *
 * Local Criteria (W26):
 * - W26-AC1: Hiển thị số đo frame-time, median, p95, DPR, tier.
 * - W26-AC2: Ghi rõ tier, mode, story progress, hướng di chuyển và audio state.
 * - W26-AC3: Không ảnh hưởng hiệu năng production; toggle hiển thị linh hoạt.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { QualityTier, ChapterId, ExperienceMode } from '@/types/story';
import type { StoryRuntime } from '@/types/runtime';
import type { FrameMonitor } from './frameMonitor';
import type { AudioController, AudioState } from '../audio/audioController';

export interface DebugMetrics {
  fps: number;
  frameTimeMs: number;
  medianMs: number;
  p95Ms: number;
  tier: QualityTier;
  mode: ExperienceMode;
  chapterId: ChapterId;
  renderedProgress: number;
  rawProgress: number;
  direction: -1 | 0 | 1;
  dpr: number;
  devicePixelRatio: number;
  audioState: AudioState;
  memoryMb?: number;
}

export interface DebugOverlayProps {
  readonly runtime?: StoryRuntime | null;
  readonly frameMonitor?: FrameMonitor | null;
  readonly audioController?: AudioController | null;
  readonly initialVisible?: boolean;
  readonly className?: string;
}

/**
 * Developer & QA diagnostic overlay for real-time telemetry inspection.
 */
export const DebugOverlay: React.FC<DebugOverlayProps> = ({
  runtime,
  frameMonitor,
  audioController,
  initialVisible = false,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(initialVisible);
  const [isMinimized, setIsMinimized] = useState(false);
  const [metrics, setMetrics] = useState<DebugMetrics>({
    fps: 60,
    frameTimeMs: 16.6,
    medianMs: 16.6,
    p95Ms: 18.0,
    tier: 'high',
    mode: 'cinematic',
    chapterId: 'exterior',
    renderedProgress: 0,
    rawProgress: 0,
    direction: 0,
    dpr: 1,
    devicePixelRatio: 1,
    audioState: 'off',
  });

  const lastFrameTimestampRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const fpsWindowStartRef = useRef<number>(performance.now());

  // Keyboard shortcut toggle: Shift + D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        setIsVisible((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update metrics loop
  useEffect(() => {
    if (!isVisible) return;

    let animationFrameId: number;

    const updateLoop = (now: number) => {
      frameCountRef.current++;

      // Compute instantaneous frame time
      const delta = now - lastFrameTimestampRef.current;
      lastFrameTimestampRef.current = now;

      // Compute FPS over 500ms intervals
      let currentFps = metrics.fps;
      if (now - fpsWindowStartRef.current >= 500) {
        currentFps = Math.round((frameCountRef.current * 1000) / (now - fpsWindowStartRef.current));
        frameCountRef.current = 0;
        fpsWindowStartRef.current = now;
      }

      // Read runtime snapshot
      const snapshot = runtime ? runtime.getSnapshot() : null;

      // Read frame monitor stats
      const win = frameMonitor ? frameMonitor.getWindow() : { medianMs: delta, p95Ms: delta };
      const currentTier = frameMonitor ? frameMonitor.getCurrentTier() : (snapshot?.qualityTier ?? 'high');

      // Read audio state
      const currentAudioState = audioController ? audioController.getState() : 'off';

      // Read memory heap if available (Chromium performance.memory)
      const memoryObj = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      const memoryMb = memoryObj ? Math.round(memoryObj.usedJSHeapSize / (1024 * 1024)) : undefined;

      setMetrics({
        fps: currentFps,
        frameTimeMs: Math.round(delta * 10) / 10,
        medianMs: Math.round(win.medianMs * 10) / 10,
        p95Ms: Math.round(win.p95Ms * 10) / 10,
        tier: currentTier,
        mode: snapshot?.mode ?? 'cinematic',
        chapterId: snapshot?.chapterId ?? 'exterior',
        renderedProgress: snapshot ? Math.round(snapshot.renderedStoryProgress * 1000) / 1000 : 0,
        rawProgress: snapshot ? Math.round(snapshot.rawScrollProgress * 1000) / 1000 : 0,
        direction: snapshot?.direction ?? 0,
        dpr: typeof window !== 'undefined' ? Math.round((window.devicePixelRatio || 1) * 10) / 10 : 1,
        devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
        audioState: currentAudioState,
        memoryMb,
      });

      animationFrameId = requestAnimationFrame(updateLoop);
    };

    animationFrameId = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isVisible, runtime, frameMonitor, audioController, metrics.fps]);

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      className={`fixed top-16 right-4 z-50 font-mono text-xs text-stone-200 bg-stone-950/85 backdrop-blur-md border border-stone-800 rounded-lg shadow-2xl p-3 select-none transition-all ${className}`}
      aria-label="HavenArt Performance Diagnostics"
      role="region"
    >
      <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-2">
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <strong className="text-stone-100 font-semibold tracking-wide">TELEMETRY</strong>
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => setIsMinimized((prev) => !prev)}
            className="text-stone-400 hover:text-stone-200 px-1 py-0.5 rounded hover:bg-stone-800 transition-colors"
            aria-label={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
          >
            {isMinimized ? '＋' : '－'}
          </button>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="text-stone-400 hover:text-red-400 px-1 py-0.5 rounded hover:bg-stone-800 transition-colors"
            aria-label="Đóng overlay"
          >
            ✕
          </button>
        </div>
      </div>

      {!isMinimized ? (
        <div className="space-y-1.5 w-60">
          <div className="flex justify-between">
            <span className="text-stone-400">FPS / Delta:</span>
            <span
              className={`font-semibold ${
                metrics.fps >= 50
                  ? 'text-emerald-400'
                  : metrics.fps >= 30
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {metrics.fps} fps ({metrics.frameTimeMs}ms)
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-stone-400">Median / p95:</span>
            <span>
              {metrics.medianMs}ms / {metrics.p95Ms}ms
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-stone-400">Tier / Mode:</span>
            <span>
              <span className="uppercase text-amber-300 font-bold">{metrics.tier}</span> /{' '}
              <span className="text-stone-300">{metrics.mode}</span>
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-stone-400">Chapter:</span>
            <span className="text-stone-200 capitalize font-medium">{metrics.chapterId}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-stone-400">Progress:</span>
            <span>
              p:{metrics.renderedProgress} (raw:{metrics.rawProgress})
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-stone-400">Direction:</span>
            <span>
              {metrics.direction === 1
                ? '↓ Forward'
                : metrics.direction === -1
                ? '↑ Reverse'
                : '• Idle'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-stone-400">DPR (effective):</span>
            <span>{metrics.dpr}x</span>
          </div>

          <div className="flex justify-between">
            <span className="text-stone-400">Audio State:</span>
            <span
              className={`capitalize ${
                metrics.audioState === 'playing' ? 'text-emerald-400' : 'text-stone-400'
              }`}
            >
              {metrics.audioState}
            </span>
          </div>

          {metrics.memoryMb !== undefined && (
            <div className="flex justify-between border-t border-stone-800 pt-1 mt-1">
              <span className="text-stone-400">JS Heap:</span>
              <span>{metrics.memoryMb} MB</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center space-x-3 text-stone-300">
          <span>{metrics.fps} FPS</span>
          <span>•</span>
          <span className="uppercase text-amber-400">{metrics.tier}</span>
        </div>
      )}
    </aside>
  );
};

export default DebugOverlay;
