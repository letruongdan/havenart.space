import type { JournalEntry } from '../db/schema';

export interface ReadingStats {
  words: number;
  minutes: number;
}

export interface JournalTimelineGroup {
  periodKey: string;
  label: string;
  entries: JournalEntry[];
}

/**
 * Calculates word count and estimated reading time (avg 200 words/min).
 */
export function calculateReadingStats(text: string): ReadingStats {
  if (!text || typeof text !== 'string') {
    return { words: 0, minutes: 1 };
  }
  const clean = text.trim();
  if (!clean) {
    return { words: 0, minutes: 1 };
  }
  const words = clean.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return { words, minutes };
}

/**
 * Aggregates counts of entries for each predefined mood.
 */
export function countEntriesByMood(entries: JournalEntry[]): Record<string, number> {
  const counts: Record<string, number> = {
    calm: 0,
    grateful: 0,
    reflective: 0,
    peaceful: 0,
    hopeful: 0,
  };

  for (const entry of entries) {
    if (entry.mood && counts[entry.mood] !== undefined) {
      counts[entry.mood] += 1;
    }
  }

  return counts;
}

/**
 * Formats timestamp into an elegant date string in the chosen language.
 */
export function formatFullDateTime(timestamp: number, lang: string = 'vi'): string {
  try {
    const localeMap: Record<string, string> = {
      vi: 'vi-VN',
      en: 'en-US',
      ja: 'ja-JP',
      fr: 'fr-FR',
      ko: 'ko-KR',
      zh: 'zh-CN',
      de: 'de-DE',
      es: 'es-ES',
    };
    const locale = localeMap[lang] || 'en-US';
    const d = new Date(timestamp);
    const timeStr = d.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const dateStr = d.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return `${timeStr} • ${dateStr}`;
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

/**
 * Formats a short date for cards (e.g. "02/10/2026 • 10:45").
 */
export function formatShortDate(timestamp: number, lang: string = 'vi'): string {
  try {
    const localeMap: Record<string, string> = {
      vi: 'vi-VN',
      en: 'en-US',
      ja: 'ja-JP',
      fr: 'fr-FR',
      ko: 'ko-KR',
      zh: 'zh-CN',
      de: 'de-DE',
      es: 'es-ES',
    };
    const locale = localeMap[lang] || 'en-US';
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const time = d.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${day}/${month}/${year} • ${time}`;
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

/**
 * Groups an array of journal entries into chronological periods:
 * "Hôm nay", "Hôm qua", "Tuần này", "Tháng MM/YYYY", "Cũ hơn"
 */
export function groupEntriesByPeriod(
  entries: JournalEntry[],
  referenceTime: number = Date.now()
): JournalTimelineGroup[] {
  if (!entries || entries.length === 0) {
    return [];
  }

  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);

  const refDate = new Date(referenceTime);
  const startOfToday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfThisWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;

  const groupsMap = new Map<string, { label: string; entries: JournalEntry[] }>();

  for (const entry of sorted) {
    const created = entry.createdAt;
    let key: string;
    let label: string;

    if (created >= startOfToday) {
      key = 'today';
      label = 'Hôm nay';
    } else if (created >= startOfYesterday) {
      key = 'yesterday';
      label = 'Hôm qua';
    } else if (created >= startOfThisWeek) {
      key = 'this-week';
      label = 'Tuần này';
    } else {
      const entryDate = new Date(created);
      const month = String(entryDate.getMonth() + 1).padStart(2, '0');
      const year = entryDate.getFullYear();
      key = `${year}-${month}`;
      label = `Tháng ${month}, ${year}`;
    }

    if (!groupsMap.has(key)) {
      groupsMap.set(key, { label, entries: [] });
    }
    groupsMap.get(key)!.entries.push(entry);
  }

  const result: JournalTimelineGroup[] = [];
  for (const [periodKey, value] of groupsMap.entries()) {
    result.push({
      periodKey,
      label: value.label,
      entries: value.entries,
    });
  }

  return result;
}
