/**
 * HavenArt — Story Definition Validation
 * Contract Version: havenart-contracts-1.1
 * Note: Pure structural definition validator; does not require runtime scene assets.
 */

import type { StoryChapter, Hotspot, Locale } from '@/types/story';

export interface StoryValidationInput {
  readonly chapters: readonly StoryChapter[];
  readonly hotspots: readonly Hotspot[];
  readonly registries: {
    readonly lighting: readonly string[];
    readonly audio: readonly string[];
    readonly zones: readonly string[];
    readonly posters: readonly string[];
  };
  readonly resources: Record<string, { readonly zoneId: string; readonly posterKey: string }>;
  readonly localeKeys: Record<Locale, readonly string[]>;
}

const EPSILON = 1e-6;

export function validateStory(input: StoryValidationInput): string[] {
  const errors: string[] = [];

  if (!input) {
    return ['StoryValidationInput is null or undefined'];
  }

  const { chapters, hotspots, registries, resources, localeKeys } = input;

  // 1. Validate chapters
  if (!Array.isArray(chapters) || chapters.length === 0) {
    errors.push('Chapters array must be non-empty');
    return errors;
  }

  const chapterIdSet = new Set<string>();
  const slugSet = new Set<string>();

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];

    if (!chapter.id) {
      errors.push(`Chapter at index ${i} has empty or missing id`);
    } else if (chapterIdSet.has(chapter.id)) {
      errors.push(`Duplicate chapter id: "${chapter.id}"`);
    } else {
      chapterIdSet.add(chapter.id);
    }

    if (!chapter.slug) {
      errors.push(`Chapter "${chapter.id}" has empty or missing slug`);
    } else if (slugSet.has(chapter.slug)) {
      errors.push(`Duplicate chapter slug: "${chapter.slug}"`);
    } else {
      slugSet.add(chapter.slug);
    }

    if (!Number.isFinite(chapter.progressStart) || !Number.isFinite(chapter.progressEnd)) {
      errors.push(`Chapter "${chapter.id}" has non-finite progress boundaries`);
    } else if (chapter.progressStart >= chapter.progressEnd) {
      errors.push(
        `Chapter "${chapter.id}" progressStart (${chapter.progressStart}) must be strictly less than progressEnd (${chapter.progressEnd})`
      );
    }

    // Continuity checks
    if (i === 0) {
      if (Math.abs(chapter.progressStart - 0.0) > EPSILON) {
        errors.push(`First chapter "${chapter.id}" must start at 0.0, found ${chapter.progressStart}`);
      }
    } else {
      const prevChapter = chapters[i - 1];
      const gapOrOverlap = chapter.progressStart - prevChapter.progressEnd;
      if (Math.abs(gapOrOverlap) > EPSILON) {
        if (gapOrOverlap > 0) {
          errors.push(
            `Gap detected between chapter "${prevChapter.id}" (end: ${prevChapter.progressEnd}) and "${chapter.id}" (start: ${chapter.progressStart})`
          );
        } else {
          errors.push(
            `Overlap detected between chapter "${prevChapter.id}" (end: ${prevChapter.progressEnd}) and "${chapter.id}" (start: ${chapter.progressStart})`
          );
        }
      }
    }

    if (i === chapters.length - 1) {
      if (Math.abs(chapter.progressEnd - 1.0) > EPSILON) {
        errors.push(`Final chapter "${chapter.id}" must end at 1.0, found ${chapter.progressEnd}`);
      }
    }

    // Camera range check
    if (
      !chapter.cameraRange ||
      chapter.cameraRange.length !== 2 ||
      !Number.isFinite(chapter.cameraRange[0]) ||
      !Number.isFinite(chapter.cameraRange[1]) ||
      chapter.cameraRange[0] < 0 ||
      chapter.cameraRange[1] > 1 ||
      chapter.cameraRange[0] > chapter.cameraRange[1]
    ) {
      errors.push(`Chapter "${chapter.id}" has invalid cameraRange: [${chapter.cameraRange}]`);
    }

    // Registry presets check
    if (!registries?.lighting?.includes(chapter.lightingPreset)) {
      errors.push(
        `Chapter "${chapter.id}" references unknown lightingPreset: "${chapter.lightingPreset}"`
      );
    }
    if (!registries?.audio?.includes(chapter.audioPreset)) {
      errors.push(`Chapter "${chapter.id}" references unknown audioPreset: "${chapter.audioPreset}"`);
    }

    // Copy keys check
    for (const locale of ['vi', 'en'] as const) {
      const keys = localeKeys?.[locale];
      if (!keys || !keys.includes(chapter.copyKey)) {
        errors.push(
          `Chapter "${chapter.id}" copyKey "${chapter.copyKey}" missing in localeKeys.${locale}`
        );
      }
    }

    // Resource mapping check
    const resource = resources?.[chapter.id];
    if (!resource) {
      errors.push(`Chapter "${chapter.id}" is missing a resource mapping`);
    } else {
      if (!registries?.zones?.includes(resource.zoneId)) {
        errors.push(
          `Chapter "${chapter.id}" resource zoneId "${resource.zoneId}" not found in registries.zones`
        );
      }
      if (!registries?.posters?.includes(resource.posterKey)) {
        errors.push(
          `Chapter "${chapter.id}" resource posterKey "${resource.posterKey}" not found in registries.posters`
        );
      }
    }
  }

  // 2. Validate hotspots
  if (Array.isArray(hotspots)) {
    const hotspotIdSet = new Set<string>();

    for (const hotspot of hotspots) {
      if (!hotspot.id) {
        errors.push('Hotspot has empty or missing id');
      } else if (hotspotIdSet.has(hotspot.id)) {
        errors.push(`Duplicate hotspot id: "${hotspot.id}"`);
      } else {
        hotspotIdSet.add(hotspot.id);
      }

      if (!chapterIdSet.has(hotspot.room)) {
        errors.push(`Hotspot "${hotspot.id}" references non-existent room/chapter: "${hotspot.room}"`);
      }

      if (
        !hotspot.activationRange ||
        hotspot.activationRange.length !== 2 ||
        !Number.isFinite(hotspot.activationRange[0]) ||
        !Number.isFinite(hotspot.activationRange[1]) ||
        hotspot.activationRange[0] < 0 ||
        hotspot.activationRange[1] > 1 ||
        hotspot.activationRange[0] >= hotspot.activationRange[1]
      ) {
        errors.push(
          `Hotspot "${hotspot.id}" has invalid activationRange: [${hotspot.activationRange}]. Must be normalized local progress [start, end] where start < end.`
        );
      }

      if (!Number.isFinite(hotspot.maxDistanceM) || hotspot.maxDistanceM <= 0) {
        errors.push(`Hotspot "${hotspot.id}" maxDistanceM must be a positive finite number`);
      }

      for (const locale of ['vi', 'en'] as const) {
        const keys = localeKeys?.[locale];
        if (!keys || !keys.includes(hotspot.copyKey)) {
          errors.push(
            `Hotspot "${hotspot.id}" copyKey "${hotspot.copyKey}" missing in localeKeys.${locale}`
          );
        }
      }
    }
  }

  return errors;
}
