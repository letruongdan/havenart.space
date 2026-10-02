import type { WeatherCondition, TimeOfDay } from '../weather/weather';
import { ALL_HAVEN_AUDIO_TRACKS, type HavenAudioTrack } from './ambient-catalog';

export interface AudioSelectionContext {
  weather?: WeatherCondition;
  timeOfDay?: TimeOfDay;
  mood?: string;
  category?: 'all' | 'piano' | 'ambient';
  excludedIds?: string[];
}

export interface AudioSelectionResult {
  track: HavenAudioTrack;
  reason: string;
  context: AudioSelectionContext;
}

const RECENT_TRACKS_STORAGE_KEY = 'haven_recent_tracks';
const MAX_RECENT_TRACKS = 6;

let inMemoryRecentTrackIds: string[] = [];

/**
 * Retrieves recently played track IDs.
 */
export function getRecentTrackIds(): string[] {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const stored = sessionStorage.getItem(RECENT_TRACKS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch {
    // In-memory fallback
  }
  return [...inMemoryRecentTrackIds];
}

/**
 * Records a track ID as recently played to prevent immediate repetition.
 */
export function recordPlayedTrack(id: string): void {
  if (!id) return;
  const recent = getRecentTrackIds().filter((existingId) => existingId !== id);
  recent.push(id);

  if (recent.length > MAX_RECENT_TRACKS) {
    recent.splice(0, recent.length - MAX_RECENT_TRACKS);
  }

  inMemoryRecentTrackIds = [...recent];

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(RECENT_TRACKS_STORAGE_KEY, JSON.stringify(recent));
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Clears the recently played tracks list (used in tests or manual reset).
 */
export function clearRecentTracks(): void {
  inMemoryRecentTrackIds = [];
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(RECENT_TRACKS_STORAGE_KEY);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Calculates match score for an audio track based on context.
 */
function scoreTrack(track: HavenAudioTrack, context: AudioSelectionContext): number {
  let score = 1;

  if (context.mood && track.moods && track.moods.includes(context.mood)) {
    score += 6;
  }

  if (context.weather && track.weather && track.weather.includes(context.weather)) {
    score += 5;
  }

  if (context.timeOfDay && track.timeOfDay && track.timeOfDay.includes(context.timeOfDay)) {
    score += 3;
  }

  // Slight bonus for piano when mood is reflective or grateful
  if (track.category === 'piano' && (context.mood === 'reflective' || context.mood === 'grateful')) {
    score += 2;
  }

  return score;
}

function generateTrackReason(track: HavenAudioTrack, context: AudioSelectionContext): string {
  const prefix = track.category === 'piano' ? 'Độc tấu Piano' : 'Âm thanh tự nhiên';

  if (context.mood && track.moods?.includes(context.mood)) {
    const moodMap: Record<string, string> = {
      calm: 'bình an, thư thái',
      grateful: 'biết ơn, tươi sáng',
      reflective: 'trầm tư, sâu lắng',
      peaceful: 'an tĩnh, thanh thản',
      hopeful: 'hy vọng, nâng đỡ tâm hồn',
    };
    return `${prefix}: ${track.title} • Tâm trạng ${moodMap[context.mood] || context.mood}`;
  }

  if (context.weather && track.weather?.includes(context.weather)) {
    const weatherMap: Record<WeatherCondition, string> = {
      clear: 'Tiết trời trong trẻo, an bình',
      clouds: 'Âm hưởng mây trôi êm đềm',
      rain: 'Mưa rơi tí tách an trú',
      fog: 'Khúc nhạc sương mai thanh tịnh',
      snow: 'Miền tuyết trắng tịch mịch',
      dusk: 'Ráng chiều hoàng hôn ấm áp',
      night: 'Khúc ru đêm tĩnh mịch ngàn sao',
    };
    return `${prefix}: ${track.title} • ${weatherMap[context.weather] || 'Thời tiết an lành'}`;
  }

  return `${prefix}: ${track.title} • ${track.genreVi}`;
}

/**
 * Smartly selects an ambient or piano track for the current session or access.
 * Guarantees:
 * 1. Each visit/access selects a DIFFERENT track than recently played ("mỗi lượt truy cập là một bản nhạc khác nhau").
 * 2. Adapts seamlessly to user local weather, journal mood, and music category (Piano/Ambient).
 * 3. Never throws or halts, smoothly looping when the full library is exhausted.
 */
export function selectTrackForSession(context: AudioSelectionContext = {}): AudioSelectionResult {
  const recentIds = new Set(getRecentTrackIds());
  if (context.excludedIds) {
    context.excludedIds.forEach((id) => recentIds.add(id));
  }

  let all = ALL_HAVEN_AUDIO_TRACKS;
  if (context.category && context.category !== 'all') {
    const filtered = all.filter((t) => t.category === context.category);
    if (filtered.length > 0) {
      all = filtered;
    }
  }

  let candidates = all.filter((track) => !recentIds.has(track.id));

  if (candidates.length === 0) {
    const recentArray = getRecentTrackIds();
    const lastPlayedId = recentArray[recentArray.length - 1];
    candidates = all.filter((track) => track.id !== lastPlayedId);

    if (candidates.length === 0) {
      candidates = [...all];
    }
  }

  const scored = candidates.map((track) => ({
    track,
    score: scoreTrack(track, context),
  }));

  const maxScore = Math.max(...scored.map((s) => s.score));

  const topCandidates = scored
    .filter((s) => s.score >= maxScore)
    .map((s) => s.track);

  const chosenIndex = Math.floor(Math.random() * topCandidates.length);
  const chosen = topCandidates[chosenIndex] || candidates[0] || all[0];

  recordPlayedTrack(chosen.id);

  return {
    track: chosen,
    reason: generateTrackReason(chosen, context),
    context,
  };
}

/**
 * Selects the next track upon manual user click or track change.
 * Guarantees the chosen track is not the current one.
 */
export function selectNextTrack(options: {
  currentId?: string;
  weather?: WeatherCondition;
  timeOfDay?: TimeOfDay;
  mood?: string;
  category?: 'all' | 'piano' | 'ambient';
} = {}): AudioSelectionResult {
  const excludedIds = options.currentId ? [options.currentId] : [];
  return selectTrackForSession({
    weather: options.weather,
    timeOfDay: options.timeOfDay,
    mood: options.mood,
    category: options.category,
    excludedIds,
  });
}
