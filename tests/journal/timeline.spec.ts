import { describe, it, expect } from 'vitest';
import {
  groupEntriesByPeriod,
  formatFullDateTime,
  calculateReadingStats,
  countEntriesByMood,
} from '../../src/lib/journal/timeline';
import type { JournalEntry } from '../../src/lib/db/schema';

describe('Journal Timeline & Analytics Helpers', () => {
  const now = new Date('2026-10-02T10:00:00Z').getTime();

  function makeEntry(id: string, title: string, body: string, mood: string, timestamp: number): JournalEntry {
    return {
      id,
      title,
      body,
      mood,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };
  }

  describe('calculateReadingStats', () => {
    it('calculates word count and estimated reading time', () => {
      const body = 'Đây là một bài viết tĩnh lặng với tâm hồn an yên trong không gian Haven Art.';
      const stats = calculateReadingStats(body);
      expect(stats.words).toBe(17);
      expect(stats.minutes).toBe(1);
    });

    it('handles empty or whitespace strings safely', () => {
      const stats = calculateReadingStats('   ');
      expect(stats.words).toBe(0);
      expect(stats.minutes).toBe(1);
    });
  });

  describe('countEntriesByMood', () => {
    it('aggregates entry count per mood identifier', () => {
      const entries: JournalEntry[] = [
        makeEntry('1', 'T1', 'B1', 'calm', now),
        makeEntry('2', 'T2', 'B2', 'calm', now - 1000),
        makeEntry('3', 'T3', 'B3', 'grateful', now - 2000),
        makeEntry('4', 'T4', 'B4', 'peaceful', now - 3000),
      ];

      const counts = countEntriesByMood(entries);
      expect(counts['calm']).toBe(2);
      expect(counts['grateful']).toBe(1);
      expect(counts['peaceful']).toBe(1);
      expect(counts['hopeful']).toBe(0);
    });
  });

  describe('groupEntriesByPeriod', () => {
    it('groups entries into chronological buckets: Hôm nay, Hôm qua, Tháng trước', () => {
      const oneHourAgo = now - 1000 * 60 * 60;
      const oneDayAgo = now - 1000 * 60 * 60 * 24;
      const thirtyDaysAgo = now - 1000 * 60 * 60 * 24 * 30;

      const entries: JournalEntry[] = [
        makeEntry('1', 'Bài hôm nay', 'B1', 'calm', oneHourAgo),
        makeEntry('2', 'Bài hôm qua', 'B2', 'peaceful', oneDayAgo),
        makeEntry('3', 'Bài tháng trước', 'B3', 'grateful', thirtyDaysAgo),
      ];

      const groups = groupEntriesByPeriod(entries, now);
      expect(groups.length).toBeGreaterThanOrEqual(2);
      expect(groups[0].entries.some((e) => e.id === '1')).toBe(true);
    });

    it('returns empty array when entries list is empty', () => {
      const groups = groupEntriesByPeriod([], now);
      expect(groups).toEqual([]);
    });
  });

  describe('formatFullDateTime', () => {
    it('formats timestamp into human-readable Vietnamese date and time', () => {
      const formatted = formatFullDateTime(now);
      expect(formatted).toBeDefined();
      expect(formatted.length).toBeGreaterThan(5);
    });
  });
});
