import { describe, it, expect } from 'vitest';
import { sampleChapter } from '@/lib/story/sampleChapter';
import { validateStory } from '@/lib/story/validateStory';
import { CHAPTERS } from '@/config/story';
import {
  validStoryValidationInput,
  invalidChaptersGap,
  invalidChaptersOverlap,
  invalidHotspotsRange,
} from '../fixtures/story';

describe('Story Chapter Sampler (sampleChapter)', () => {
  it('correctly samples chapters across half-open boundaries', () => {
    // exterior: [0, 0.15)
    expect(sampleChapter(CHAPTERS, 0.0).id).toBe('exterior');
    expect(sampleChapter(CHAPTERS, 0.05).id).toBe('exterior');
    expect(sampleChapter(CHAPTERS, 0.149999).id).toBe('exterior');

    // boundary 0.15 belongs to approach: [0.15, 0.27)
    expect(sampleChapter(CHAPTERS, 0.15).id).toBe('approach');
    expect(sampleChapter(CHAPTERS, 0.20).id).toBe('approach');

    // boundary 0.27 belongs to entrance: [0.27, 0.39)
    expect(sampleChapter(CHAPTERS, 0.27).id).toBe('entrance');
    expect(sampleChapter(CHAPTERS, 0.35).id).toBe('entrance');

    // boundary 0.39 belongs to living: [0.39, 0.68)
    expect(sampleChapter(CHAPTERS, 0.39).id).toBe('living');
    expect(sampleChapter(CHAPTERS, 0.50).id).toBe('living');

    // boundary 0.68 belongs to garden: [0.68, 0.87)
    expect(sampleChapter(CHAPTERS, 0.68).id).toBe('garden');
    expect(sampleChapter(CHAPTERS, 0.75).id).toBe('garden');

    // boundary 0.87 belongs to finale: [0.87, 1.0]
    expect(sampleChapter(CHAPTERS, 0.87).id).toBe('finale');
    expect(sampleChapter(CHAPTERS, 0.95).id).toBe('finale');
    expect(sampleChapter(CHAPTERS, 1.0).id).toBe('finale');
  });

  it('clamps finite values outside [0, 1] safely', () => {
    expect(sampleChapter(CHAPTERS, -0.2).id).toBe('exterior');
    expect(sampleChapter(CHAPTERS, -100).id).toBe('exterior');
    expect(sampleChapter(CHAPTERS, 1.05).id).toBe('finale');
    expect(sampleChapter(CHAPTERS, 50).id).toBe('finale');
  });

  it('throws an error for non-finite values (NaN, Infinity)', () => {
    expect(() => sampleChapter(CHAPTERS, NaN)).toThrow(/invalid non-finite progress/);
    expect(() => sampleChapter(CHAPTERS, Infinity)).toThrow(/invalid non-finite progress/);
    expect(() => sampleChapter(CHAPTERS, -Infinity)).toThrow(/invalid non-finite progress/);
  });

  it('is completely deterministic regardless of direction', () => {
    const testPoints = [0.0, 0.149, 0.15, 0.269, 0.27, 0.389, 0.39, 0.679, 0.68, 0.869, 0.87, 1.0];
    const forwardResults = testPoints.map((p) => sampleChapter(CHAPTERS, p).id);
    const backwardResults = [...testPoints].reverse().map((p) => sampleChapter(CHAPTERS, p).id).reverse();

    expect(forwardResults).toEqual(backwardResults);
  });
});

describe('Story Definition Validator (validateStory)', () => {
  it('validates canonical story configuration without errors', () => {
    const errors = validateStory(validStoryValidationInput);
    expect(errors).toEqual([]);
  });

  it('detects chapter gaps', () => {
    const errors = validateStory({
      ...validStoryValidationInput,
      chapters: invalidChaptersGap,
    });
    expect(errors.some((e) => e.includes('Gap detected'))).toBe(true);
  });

  it('detects chapter overlaps', () => {
    const errors = validateStory({
      ...validStoryValidationInput,
      chapters: invalidChaptersOverlap,
    });
    expect(errors.some((e) => e.includes('Overlap detected'))).toBe(true);
  });

  it('detects invalid hotspot activation ranges', () => {
    const errors = validateStory({
      ...validStoryValidationInput,
      hotspots: invalidHotspotsRange,
    });
    expect(errors.some((e) => e.includes('invalid activationRange'))).toBe(true);
  });

  it('detects duplicate chapter ids', () => {
    const duplicateChapters = [
      ...CHAPTERS.slice(0, 1),
      { ...CHAPTERS[0], slug: 'exterior-duplicate' },
      ...CHAPTERS.slice(2),
    ];
    const errors = validateStory({
      ...validStoryValidationInput,
      chapters: duplicateChapters,
    });
    expect(errors.some((e) => e.includes('Duplicate chapter id'))).toBe(true);
  });

  it('detects unknown preset references in registries', () => {
    const invalidPresetChapters = [
      { ...CHAPTERS[0], lightingPreset: 'unknown-neon-light' },
      ...CHAPTERS.slice(1),
    ];
    const errors = validateStory({
      ...validStoryValidationInput,
      chapters: invalidPresetChapters,
    });
    expect(errors.some((e) => e.includes('references unknown lightingPreset'))).toBe(true);
  });

  it('detects missing copy keys in dictionaries', () => {
    const missingKeyInput = {
      ...validStoryValidationInput,
      localeKeys: {
        vi: ['chapters.exterior'], // missing other chapters
        en: validStoryValidationInput.localeKeys.en,
      },
    };
    const errors = validateStory(missingKeyInput);
    expect(errors.some((e) => e.includes('missing in localeKeys.vi'))).toBe(true);
  });

  it('detects hotspots placed in non-existent rooms', () => {
    const invalidRoomHotspots = [
      {
        ...validStoryValidationInput.hotspots[0],
        room: 'phantom-room' as unknown as typeof CHAPTERS[0]['id'],
      },
    ];
    const errors = validateStory({
      ...validStoryValidationInput,
      hotspots: invalidRoomHotspots,
    });
    expect(errors.some((e) => e.includes('references non-existent room/chapter'))).toBe(true);
  });
});
