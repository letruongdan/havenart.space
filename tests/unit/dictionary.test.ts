import { describe, it, expect } from 'vitest';
import { getDictionary, getDictionarySync } from '@/lib/i18n/dictionary';
import { CHAPTER_IDS } from '@/config/story';
import { HOTSPOT_IDS } from '@/config/hotspots';
import type { Locale } from '@/types/story';

function extractAllKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return [prefix];
  }
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...extractAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

function assertNoEmptyStringsOrHtml(obj: unknown, path = '') {
  if (typeof obj === 'string') {
    expect(obj.trim().length, `String at "${path}" must not be empty`).toBeGreaterThan(0);
    expect(obj, `String at "${path}" must not contain raw HTML tags`).not.toMatch(/<[a-z][\s\S]*>/i);
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => assertNoEmptyStringsOrHtml(item, `${path}[${index}]`));
  } else if (obj !== null && typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      assertNoEmptyStringsOrHtml(val, path ? `${path}.${key}` : key);
    }
  }
}

describe('Dictionary Loader & Content Integrity', () => {
  it('loads valid dictionaries for both vi and en', async () => {
    const vi = await getDictionary('vi');
    const en = await getDictionary('en');
    expect(vi.brand.name).toBe('HavenArt');
    expect(en.brand.name).toBe('HavenArt');
    expect(getDictionarySync('vi')).toBe(vi);
    expect(getDictionarySync('en')).toBe(en);
  });

  it('throws for unsupported locales', async () => {
    await expect(getDictionary('fr' as Locale)).rejects.toThrow(/Unsupported locale/);
    expect(() => getDictionarySync('de' as Locale)).toThrow(/Unsupported locale/);
  });

  it('guarantees 100% key parity between VI and EN dictionaries', async () => {
    const vi = await getDictionary('vi');
    const en = await getDictionary('en');
    const viKeys = extractAllKeys(vi);
    const enKeys = extractAllKeys(en);

    expect(viKeys).toEqual(enKeys);
  });

  it('contains entries for all canonical chapters and hotspots', async () => {
    const vi = await getDictionary('vi');
    const en = await getDictionary('en');

    for (const chapterId of CHAPTER_IDS) {
      expect(vi.chapters[chapterId], `VI missing chapter: ${chapterId}`).toBeDefined();
      expect(en.chapters[chapterId], `EN missing chapter: ${chapterId}`).toBeDefined();
    }

    for (const hotspotId of HOTSPOT_IDS) {
      expect(vi.hotspots[hotspotId], `VI missing hotspot: ${hotspotId}`).toBeDefined();
      expect(en.hotspots[hotspotId], `EN missing hotspot: ${hotspotId}`).toBeDefined();
    }
  });

  it('ensures all text leaves are non-empty and free of raw HTML', async () => {
    const vi = await getDictionary('vi');
    const en = await getDictionary('en');

    assertNoEmptyStringsOrHtml(vi, 'vi');
    assertNoEmptyStringsOrHtml(en, 'en');
  });

  it('has valid metadata and contact channels in both languages', async () => {
    const vi = await getDictionary('vi');
    const en = await getDictionary('en');

    for (const dict of [vi, en]) {
      expect(dict.contact.channels.zalo).toBe('Zalo');
      expect(dict.contact.channels.messenger).toBe('Messenger');
      expect(dict.contact.channels.whatsapp).toBe('WhatsApp');
      expect(dict.metadata.title).toContain('HavenArt');
      expect(dict.metadata.description.length).toBeGreaterThan(20);
    }
  });
});
