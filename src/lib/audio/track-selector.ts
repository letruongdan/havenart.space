import type { WeatherCondition, TimeOfDay } from '../weather/weather';
import { ALL_HAVEN_AUDIO_TRACKS, type HavenAudioTrack } from './ambient-catalog';

export interface AudioSelectionContext {
  weather?: WeatherCondition;
  timeOfDay?: TimeOfDay;
  mood?: string;
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

  return score;
}

function generateTrackReason(track: HavenAudioTrack, context: AudioSelectionContext): string {
  if (context.mood && track.moods?.includes(context.mood)) {
    const moodMap: Record<string, string> = {
      calm: 'Bình an, thư thái',
      grateful: 'Biết ơn, tươi sáng',
      reflective: 'Trầm tư, sâu lắng',
      peaceful: 'An tĩnh, thanh thản',
      hopeful: 'Hy vọng, nâng đỡ tâm hồn',
    };
    return `Giai điệu phù hợp tâm trạng: ${moodMap[context.mood] || context.mood}`;
  }

  if (context.weather && track.weather?.includes(context.weather)) {
    const weatherMap: Record<WeatherCondition, string> = {
      clear: 'Giai điệu trong trẻo, an bình',
      clouds: 'Âm hưởng mây trôi êm đềm',
      rain: 'Tiếng mưa rơi an trú, thanh lọc',
      fog: 'Khúc nhạc sương mai thanh tịnh',
      snow: 'Miền tuyết trắng tịch mịch',
      dusk: 'Âm hưởng ráng chiều ấm áp',
      night: 'Khúc ru đêm tĩnh mịch ngàn sao',
    };
    return weatherMap[context.weather] || 'Âm nhạc an lành';
  }

  return track.genreVi || 'Âm nhạc an lành cho tâm hồn';
}

/**
 * Smartly selects an ambient track for the current session or access.
 * Guarantees:
 * 1. Each visit/access selects a DIFFERENT track than recently played ("mỗi lượt truy cập là một bản nhạc khác nhau").
 * 2. Adapts seamlessly to user local weather and journal mood.
 * 3. Never throws or halts, smoothly looping when the full library is exhausted.
 */
export function selectTrackForSession(context: AudioSelectionContext = {}): AudioSelectionResult {
  const recentIds = new Set(getRecentTrackIds());
  if (context.excludedIds) {
    context.excludedIds.forEach((id) => recentIds.add(id));
  }

  const all = ALL_HAVEN_AUDIO_TRACKS;

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
} = {}): AudioSelectionResult {
  const excludedIds = options.currentId ? [options.currentId] : [];
  return selectTrackForSession({
    weather: options.weather,
    timeOfDay: options.timeOfDay,
    mood: options.mood,
    excludedIds,
  });
}
