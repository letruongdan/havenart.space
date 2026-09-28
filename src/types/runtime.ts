/**
 * HavenArt — Runtime Execution & Coordination Contracts
 * Contract Version: havenart-contracts-1.1
 */

import type { ChapterId, ExperienceMode, QualityTier, StoryChapter, Locale } from './story';
import type { RailDerivative } from './scene';

export interface StorySnapshot {
  readonly frameId: number;
  readonly rawScrollProgress: number;
  readonly renderedStoryProgress: number;
  readonly chapterId: ChapterId;
  readonly localProgress: number;
  readonly direction: -1 | 0 | 1;
  readonly mode: ExperienceMode;
  readonly staticReason:
    | 'reduced-motion'
    | 'user'
    | 'unsupported'
    | 'load-error'
    | 'performance'
    | null;
  readonly qualityTier: QualityTier;
}

export interface FreezeToken {
  readonly id: number;
  readonly raw: number;
  readonly rendered: number;
  readonly scrollY: number;
}

export interface StoryRuntimeLimits {
  readonly maxIndoorMps: number;
  readonly maxOutdoorMps: number;
  readonly maxRadiansPerSecond: number;
  readonly maxAccelerationMps2: number;
  readonly maxDtSeconds: number;
}

export interface StoryRuntimeDeps {
  readonly chapters: readonly StoryChapter[];
  readonly initialProgress: number;
  readonly sampleRailDerivative: (p: number) => RailDerivative;
  readonly limits: StoryRuntimeLimits;
}

export interface StoryRuntime {
  getSnapshot(): Readonly<StorySnapshot>;
  setScrollTarget(p: number): void;
  tick(dtSeconds: number): Readonly<StorySnapshot>;
  freeze(scrollY: number): FreezeToken;
  resume(token: FreezeToken, reason: 'close' | 'navigate'): void;
  restore(chapterId: ChapterId, localProgress: number): void;
  subscribeChapter(listener: (snapshot: Readonly<StorySnapshot>) => void): () => void;
  setMode(mode: ExperienceMode, reason: StorySnapshot['staticReason']): void;
  setQualityTier(tier: QualityTier): void;
  dispose(): void;
}

export interface LocaleHandoffPayload {
  readonly schemaVersion: 1;
  readonly fromLocale: Locale;
  readonly toLocale: Locale;
  readonly chapterId: ChapterId;
  readonly localProgress: number;
  readonly mode: ExperienceMode;
  readonly targetAnchor: string | null;
  readonly createdAtMs: number;
}

export interface VisibilityInput {
  readonly activeRoom: string;
  readonly room: string;
  readonly distanceM: number;
  readonly maxDistanceM: number;
  readonly inFrustum: boolean;
  readonly occluded: boolean;
  readonly inActivationRange: boolean;
}

export interface AudioController {
  enable(): Promise<boolean>;
  disable(): void;
  setProgress(p: number): void;
  dispose(): void;
}

export interface QualityWindow {
  readonly medianMs: number;
  readonly p95Ms: number;
  readonly slowWindows: number;
  readonly cooldownRemainingMs: number;
  readonly warmedUp: boolean;
}
