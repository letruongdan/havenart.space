/**
 * HavenArt — Telemetry & Analytics Event Types
 * Contract Version: havenart-contracts-1.1
 * Note: Pure internal analytics abstraction without PII or third-party SDK dependencies.
 */

import type { Locale, ChapterId, HotspotId, HotspotCategory } from './story';

export type AnalyticsMode = 'cinematic' | 'reduced-motion' | 'fallback';

export interface AnalyticsEnvelope {
  readonly schemaVersion: 1;
  readonly sequence: number;
  readonly locale: Locale;
  readonly mode: AnalyticsMode;
  readonly chapterId: ChapterId | null;
  readonly elapsedMs: number;
}

export type CtaPlacement = 'persistent' | 'mid' | 'finale';
export type CtaTarget = 'contact-section' | 'zalo' | 'messenger' | 'whatsapp';

export type AnalyticsEventPayloads = {
  experience_started: {
    readonly trigger: 'scroll' | 'chapter-nav' | 'hotspot';
  };
  chapter_entered: {
    readonly previousChapterId: ChapterId | null;
    readonly direction: 'forward' | 'backward' | 'initial';
    readonly entryIndex: number;
  };
  hotspot_opened: {
    readonly hotspotId: HotspotId;
    readonly category: HotspotCategory;
  };
  language_changed: {
    readonly fromLocale: Locale;
    readonly toLocale: Locale;
  };
  audio_enabled: Record<string, never>;
  cta_clicked: {
    readonly placement: CtaPlacement;
    readonly target: CtaTarget;
  };
  zalo_clicked: {
    readonly placement: CtaPlacement;
  };
  messenger_clicked: {
    readonly placement: CtaPlacement;
  };
  whatsapp_clicked: {
    readonly placement: CtaPlacement;
  };
  experience_completed: Record<string, never>;
};

export type AnalyticsEventName = keyof AnalyticsEventPayloads;

export type AnalyticsEvent = {
  [K in AnalyticsEventName]: AnalyticsEnvelope & {
    readonly name: K;
    readonly payload: AnalyticsEventPayloads[K];
  };
}[AnalyticsEventName];

export type AnalyticsSink = (event: AnalyticsEvent) => void;
