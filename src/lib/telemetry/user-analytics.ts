import type { JournalRepository } from '../db/repository';

export interface UserFeedback {
  id: string;
  rating: number; // 1 to 5
  category: 'peace' | 'music' | 'visuals' | 'journal' | 'general';
  comment: string;
  createdAt: number;
}

export interface VisitHistoryDay {
  date: string; // 'YYYY-MM-DD'
  count: number;
}

export interface UserAnalyticsSummary {
  visits: {
    total: number;
    uniqueSessions: number;
    today: number;
    thisWeek: number;
    dailyHistory: VisitHistoryDay[];
  };
  duration: {
    currentSessionSeconds: number;
    totalDurationSeconds: number;
    averageSessionSeconds: number;
    musicListeningSeconds: number;
  };
  journaling: {
    totalEntries: number;
    entriesToday: number;
    entriesThisWeek: number;
    totalWords: number;
    averageWordsPerEntry: number;
    moodBreakdown: Record<string, number>;
  };
  feedback: {
    averageRating: number;
    totalCount: number;
    distribution: Record<number, number>; // 1: n, 2: n, ... 5: n
    recentFeedbacks: UserFeedback[];
  };
}

const STORAGE_KEY_VISITS = 'haven_analytics_visits_v1';
const STORAGE_KEY_DURATION = 'haven_analytics_duration_v1';
const STORAGE_KEY_FEEDBACKS = 'haven_analytics_feedbacks_v1';
const SESSION_FLAG_KEY = 'haven_session_active';

let inMemorySessionSeconds = 0;

/**
 * Format Date as YYYY-MM-DD
 */
function getTodayDateString(timestamp: number = Date.now()): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Record a visit and increment session counts if new session.
 */
export function recordVisit(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    let visitsData = {
      total: 0,
      uniqueSessions: 0,
      dailyHistory: {} as Record<string, number>,
    };

    const raw = window.localStorage.getItem(STORAGE_KEY_VISITS);
    if (raw) {
      visitsData = { ...visitsData, ...JSON.parse(raw) };
    }

    // Always increment total page loads
    visitsData.total += 1;

    // Check if new session
    const isNewSession = !window.sessionStorage?.getItem(SESSION_FLAG_KEY);
    if (isNewSession) {
      visitsData.uniqueSessions += 1;
      window.sessionStorage?.setItem(SESSION_FLAG_KEY, '1');

      // Update total sessions count for duration average
      updateSessionCount();
    }

    // Update today count
    const todayStr = getTodayDateString();
    visitsData.dailyHistory[todayStr] = (visitsData.dailyHistory[todayStr] || 0) + 1;

    window.localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(visitsData));
  } catch {
    // Ignore storage issues
  }
}

function updateSessionCount(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_DURATION);
    const data = raw ? JSON.parse(raw) : { totalDurationSeconds: 0, musicListeningSeconds: 0, totalSessionsCount: 0 };
    data.totalSessionsCount = (data.totalSessionsCount || 0) + 1;
    window.localStorage.setItem(STORAGE_KEY_DURATION, JSON.stringify(data));
  } catch {
    // Ignore
  }
}

/**
 * Accumulate active duration time.
 */
export function updateActiveDuration(secondsElapsed: number, isMusicPlaying: boolean = false): void {
  inMemorySessionSeconds += secondsElapsed;

  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_DURATION);
    const data = raw
      ? JSON.parse(raw)
      : { totalDurationSeconds: 0, musicListeningSeconds: 0, totalSessionsCount: 1 };

    data.totalDurationSeconds = (data.totalDurationSeconds || 0) + secondsElapsed;
    if (isMusicPlaying) {
      data.musicListeningSeconds = (data.musicListeningSeconds || 0) + secondsElapsed;
    }

    window.localStorage.setItem(STORAGE_KEY_DURATION, JSON.stringify(data));
  } catch {
    // Ignore
  }
}

/**
 * Save new user feedback & rating.
 */
export function saveUserFeedback(input: {
  rating: number;
  category?: 'peace' | 'music' | 'visuals' | 'journal' | 'general';
  comment?: string;
}): UserFeedback {
  const clampedRating = Math.max(1, Math.min(5, Math.round(input.rating || 5)));
  const newFeedback: UserFeedback = {
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    rating: clampedRating,
    category: input.category || 'peace',
    comment: (input.comment || '').trim(),
    createdAt: Date.now(),
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const list = getUserFeedbacks();
      list.unshift(newFeedback);
      if (list.length > 100) list.pop(); // Keep max 100
      window.localStorage.setItem(STORAGE_KEY_FEEDBACKS, JSON.stringify(list));
    } catch {
      // Ignore
    }
  }

  return newFeedback;
}

/**
 * Get all user feedbacks (real user data only, no mock/seed).
 */
export function getUserFeedbacks(): UserFeedback[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_FEEDBACKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out any legacy mock sample IDs
        const realList = parsed.filter((f: UserFeedback) => !f.id?.startsWith('fb-sample-'));
        if (realList.length !== parsed.length) {
          window.localStorage.setItem(STORAGE_KEY_FEEDBACKS, JSON.stringify(realList));
        }
        return realList;
      }
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Delete a user feedback by ID.
 */
export function deleteUserFeedback(id: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const list = getUserFeedbacks().filter((f) => f.id !== id);
    window.localStorage.setItem(STORAGE_KEY_FEEDBACKS, JSON.stringify(list));
  } catch {
    // Ignore
  }
}

/**
 * Aggregates complete user analytics summary.
 */
export async function getUserAnalyticsSummary(options?: {
  repo?: JournalRepository | null;
}): Promise<UserAnalyticsSummary> {
  const now = Date.now();
  const todayStr = getTodayDateString(now);

  // 1. Visits metrics
  let totalVisits = 0;
  let uniqueSessions = 0;
  let todayVisits = 0;
  let thisWeekVisits = 0;
  const dailyMap: Record<string, number> = {};

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_VISITS);
      if (raw) {
        const parsed = JSON.parse(raw);
        totalVisits = parsed.total || 0;
        uniqueSessions = parsed.uniqueSessions || 0;
        if (parsed.dailyHistory) {
          Object.assign(dailyMap, parsed.dailyHistory);
        }
      }
    } catch {
      // Ignore
    }
  }

  todayVisits = dailyMap[todayStr] || 0;

  // Compute 7 days history
  const dailyHistory: VisitHistoryDay[] = [];
  const oneDayMs = 24 * 60 * 60 * 1000;
  for (let i = 6; i >= 0; i--) {
    const dStr = getTodayDateString(now - i * oneDayMs);
    const count = dailyMap[dStr] || 0;
    dailyHistory.push({ date: dStr, count });
    thisWeekVisits += count;
  }

  // 2. Duration metrics
  let totalDurationSeconds = 0;
  let musicListeningSeconds = 0;
  let totalSessionsCount = uniqueSessions;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_DURATION);
      if (raw) {
        const parsed = JSON.parse(raw);
        totalDurationSeconds = parsed.totalDurationSeconds || 0;
        musicListeningSeconds = parsed.musicListeningSeconds || 0;
        if (parsed.totalSessionsCount !== undefined) {
          totalSessionsCount = parsed.totalSessionsCount;
        }
      }
    } catch {
      // Ignore
    }
  }

  const averageSessionSeconds = totalSessionsCount > 0 ? Math.round(totalDurationSeconds / totalSessionsCount) : 0;

  // 3. Journaling activity
  let totalEntries = 0;
  let entriesToday = 0;
  let entriesThisWeek = 0;
  let totalWords = 0;
  let averageWordsPerEntry = 0;
  const moodBreakdown: Record<string, number> = {
    calm: 0,
    grateful: 0,
    reflective: 0,
    peaceful: 0,
    hopeful: 0,
  };

  if (options?.repo) {
    try {
      const entries = await options.repo.listActiveEntries();
      totalEntries = entries.length;

      const refDate = new Date(now);
      const startOfToday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate()).getTime();
      const startOfThisWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;

      for (const e of entries) {
        if (e.createdAt >= startOfToday) {
          entriesToday += 1;
        }
        if (e.createdAt >= startOfThisWeek) {
          entriesThisWeek += 1;
        }
        if (e.mood && moodBreakdown[e.mood] !== undefined) {
          moodBreakdown[e.mood] += 1;
        }
        if (e.body) {
          totalWords += e.body.trim().split(/\s+/).filter(Boolean).length;
        }
      }

      averageWordsPerEntry = Math.round(totalWords / Math.max(1, totalEntries));
    } catch {
      // Ignore
    }
  }

  // 4. Feedback metrics
  const feedbacks = getUserFeedbacks();
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;

  for (const f of feedbacks) {
    const star = Math.max(1, Math.min(5, f.rating));
    distribution[star] = (distribution[star] || 0) + 1;
    ratingSum += star;
  }

  const averageRating = feedbacks.length > 0 ? Math.round((ratingSum / feedbacks.length) * 10) / 10 : 0;

  return {
    visits: {
      total: totalVisits,
      uniqueSessions,
      today: todayVisits,
      thisWeek: thisWeekVisits,
      dailyHistory,
    },
    duration: {
      currentSessionSeconds: inMemorySessionSeconds,
      totalDurationSeconds,
      averageSessionSeconds,
      musicListeningSeconds,
    },
    journaling: {
      totalEntries,
      entriesToday,
      entriesThisWeek,
      totalWords,
      averageWordsPerEntry,
      moodBreakdown,
    },
    feedback: {
      averageRating,
      totalCount: feedbacks.length,
      distribution,
      recentFeedbacks: feedbacks,
    },
  };
}

/**
 * Reset all user analytics (for unit testing).
 */
export function resetUserAnalyticsForTesting(): void {
  inMemorySessionSeconds = 0;
  if (typeof window !== 'undefined') {
    window.localStorage?.removeItem(STORAGE_KEY_VISITS);
    window.localStorage?.removeItem(STORAGE_KEY_DURATION);
    window.localStorage?.removeItem(STORAGE_KEY_FEEDBACKS);
    window.sessionStorage?.removeItem(SESSION_FLAG_KEY);
  }
}
