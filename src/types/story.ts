/**
 * HavenArt — Core Story & Application Types
 * Contract Version: havenart-contracts-1.1
 * Note: Pure TypeScript types only; NO WebGL / Three.js runtime imports.
 */

export type Locale = 'vi' | 'en';
export type QualityTier = 'high' | 'medium' | 'low' | 'fallback';
export type Vec3 = readonly [number, number, number];
export type ExperienceMode = 'poster' | 'loading' | 'cinematic' | 'static';

export type ChapterId = 'exterior' | 'approach' | 'entrance' | 'living' | 'garden' | 'finale';
export type HotspotId = 'travertine-wall' | 'sliding-glass' | 'garden-tree';

export type HotspotCategory =
  | 'furniture'
  | 'material'
  | 'lighting'
  | 'architecture'
  | 'landscape'
  | 'detail';

export interface StoryChapter {
  readonly id: ChapterId;
  readonly slug: string;
  readonly progressStart: number;
  readonly progressEnd: number;
  readonly cameraRange: readonly [number, number];
  readonly copyKey: string;
  readonly lightingPreset: string;
  readonly audioPreset: string;
  readonly hotspotIds: readonly HotspotId[];
  readonly qualityHints: {
    readonly preferredTier: Exclude<QualityTier, 'fallback'>;
  };
}

export interface Hotspot {
  readonly id: HotspotId;
  readonly room: ChapterId;
  readonly position: Vec3;
  readonly category: HotspotCategory;
  readonly copyKey: string;
  readonly activationRange: readonly [number, number];
  readonly maxDistanceM: number;
}

export interface CameraPose {
  readonly position: Vec3;
  readonly target: Vec3;
  readonly quaternion: readonly [number, number, number, number];
  readonly focalLengthMm: number;
}

export interface LightingPreset {
  readonly environment: string;
  readonly sunIntensity: number;
  readonly sunDirection: Vec3;
  readonly ambientIntensity: number;
  readonly practicalLights: number;
  readonly exposure: number;
}

export type ContactChannel = 'zalo' | 'messenger' | 'whatsapp';
export type ContactConfig = Record<ContactChannel, string | null>;

export interface SiteConfig {
  readonly publicOrigin: string | null;
  readonly environment: 'preview' | 'production';
}

export interface ChapterCopy {
  readonly title: string;
  readonly story: string;
  readonly intention: string;
  readonly principles: readonly string[];
  readonly materials: string;
  readonly light: string;
  readonly imageAlt: string;
}

export interface HotspotCopy {
  readonly title: string;
  readonly categoryLabel: string;
  readonly description: string;
  readonly rationale: string;
  readonly insight: string;
  readonly triggerLabel: string;
}

export interface Dictionary {
  readonly brand: {
    readonly name: string;
    readonly tagline: string;
    readonly supporting: string;
    readonly conceptLabel: string;
  };
  readonly navigation: {
    readonly skipContent: string;
    readonly skipContact: string;
    readonly languageLabel: string;
  };
  readonly controls: {
    readonly start: string;
    readonly staticMode: string;
    readonly enableSound: string;
    readonly muteSound: string;
    readonly closeDetails: string;
    readonly progressLabel: string;
  };
  readonly services: {
    readonly title: string;
    readonly description: string;
  };
  readonly chapters: Record<ChapterId, ChapterCopy>;
  readonly hotspots: Record<HotspotId, HotspotCopy>;
  readonly contact: {
    readonly title: string;
    readonly description: string;
    readonly cta: string;
    readonly unconfigured: string;
    readonly channels: Record<ContactChannel, string>;
  };
  readonly status: {
    readonly loading: string;
    readonly fallback: string;
    readonly audioLoading: string;
    readonly audioUnavailable: string;
    readonly audioPaused: string;
  };
  readonly metadata: {
    readonly title: string;
    readonly description: string;
    readonly ogTitle: string;
    readonly ogDescription: string;
    readonly ogAlt: string;
  };
}

export interface ShellProps {
  readonly locale: Locale;
  readonly copy: Dictionary;
  readonly activeChapterId: ChapterId | null;
}

export interface StorySectionsProps {
  readonly chapters: readonly StoryChapter[];
  readonly copy: Dictionary;
  readonly contacts: ContactConfig;
}

export interface ContactSectionProps {
  readonly copy: Dictionary['contact'];
  readonly contacts: ContactConfig;
}

export interface ZoneProps {
  readonly tier: Exclude<QualityTier, 'fallback'>;
}

export interface ExperienceHostProps {
  readonly locale: Locale;
  readonly copy: Dictionary;
  readonly chapters: readonly StoryChapter[];
  readonly hotspots: readonly Hotspot[];
}
