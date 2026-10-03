import type { WeatherCondition, TimeOfDay } from '../weather/weather';
import { ALL_HAVEN_ARTWORKS, type HavenArtwork } from './pexels';

export interface SelectionContext {
  weather?: WeatherCondition;
  timeOfDay?: TimeOfDay;
  mood?: string;
  excludedIds?: string[];
}

export interface SelectionResult {
  artwork: HavenArtwork;
  reason: string;
  context: SelectionContext;
}

const RECENT_ARTWORKS_STORAGE_KEY = 'haven_recent_artworks';
const MAX_RECENT_TRACKING = 12;

// In-memory fallback if sessionStorage is inaccessible
let inMemoryRecentIds: string[] = [];
let dynamicLiveArtworks: HavenArtwork[] = [];
const failedArtworkIds = new Set<string>();

/**
 * 5 Guaranteed local offline masterpieces bundled in public/images/artworks/
 * These never 404 and have zero network dependencies.
 */
export const LOCAL_GUARANTEED_ARTWORKS: HavenArtwork[] = [
  {
    id: 'haven-local-hokusai-red-fuji',
    title: 'Gió lành, sớm mai quang đãng (Phú Sĩ Đỏ)',
    artist: 'Katsushika Hokusai',
    src: '/images/artworks/hokusai-red-fuji.webp',
    license: 'Public Domain',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Katsushika_Hokusai_-_Fine_Wind,_Clear_Morning_(Gaif%C5%AB_kaisei)_-_Google_Art_Project.jpg',
    description: 'Bình minh tĩnh lặng trên núi Phú Sĩ từ bộ tranh Ba Mươi Sáu Cảnh Núi Phú Sĩ.',
    weather: ['clear', 'dusk'],
    moods: ['peaceful', 'hopeful', 'grateful'],
    timeOfDay: ['dawn', 'day'],
  },
  {
    id: 'haven-local-monet-water-lilies',
    title: 'Hoa súng (Nymphéas)',
    artist: 'Claude Monet',
    src: '/images/artworks/monet-water-lilies.webp',
    license: 'Public Domain',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Claude_Monet_-_Water_Lilies_-_1906,_Ryerson.jpg',
    description: 'Hình bóng mờ ảo phản chiếu mặt nước êm đềm với những bông súng nở rộ tại Giverny.',
    weather: ['clouds', 'rain'],
    moods: ['calm', 'peaceful', 'grateful'],
    timeOfDay: ['day'],
  },
  {
    id: 'haven-local-turner-evening-star',
    title: 'Ngôi sao hôm (The Evening Star)',
    artist: 'J. M. W. Turner',
    src: '/images/artworks/turner-evening-star.webp',
    license: 'Public Domain',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Turner_-_The_Evening_Star,_about_1830,_NG1991.jpg',
    description: 'Hoàng hôn thanh bình trên bờ biển vắng với ánh sáng le lói của vì sao hôm.',
    weather: ['dusk', 'night', 'clear'],
    moods: ['reflective', 'peaceful'],
    timeOfDay: ['dusk', 'night'],
  },
  {
    id: 'haven-local-friedrich-morning-mist',
    title: 'Nắng sớm trên dãy núi',
    artist: 'Caspar David Friedrich',
    src: '/images/artworks/friedrich-morning-mist.webp',
    license: 'Public Domain',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Caspar_David_Friedrich_-_Morgennebel_im_Gebirge.jpg',
    description: 'Ánh bình minh dịu nhẹ bao trùm những dải núi thoai thoải trong làn sương sớm.',
    weather: ['fog', 'clear'],
    moods: ['hopeful', 'grateful'],
    timeOfDay: ['dawn', 'day'],
  },
];

export function recordFailedArtwork(id: string): void {
  if (!id) return;
  failedArtworkIds.add(id);
}

export function clearFailedArtworks(): void {
  failedArtworkIds.clear();
}

export function isArtworkFailed(id: string): boolean {
  return failedArtworkIds.has(id);
}

/**
 * Registers dynamically fetched live artworks (e.g. from Pexels API) into available pool.
 */
export function registerLiveArtworks(artworks: HavenArtwork[]): void {
  const existingIds = new Set(ALL_HAVEN_ARTWORKS.map((a) => a.id));
  const newOnes = artworks.filter((a) => !existingIds.has(a.id));
  dynamicLiveArtworks = newOnes;
}

/**
 * Retrieves all currently available artworks (curated + dynamic, excluding any that failed to load).
 */
export function getAllAvailableArtworks(): HavenArtwork[] {
  const list = [...dynamicLiveArtworks, ...ALL_HAVEN_ARTWORKS, ...LOCAL_GUARANTEED_ARTWORKS];
  const valid = list.filter((a) => !failedArtworkIds.has(a.id));
  return valid.length > 0 ? valid : [...LOCAL_GUARANTEED_ARTWORKS];
}

/**
 * Retrieves the list of recently displayed artwork IDs.
 */
export function getRecentArtworkIds(): string[] {
  try {
    if (typeof sessionStorage !== 'undefined') {
      const stored = sessionStorage.getItem(RECENT_ARTWORKS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }
  } catch {
    // In-memory fallback
  }
  return [...inMemoryRecentIds];
}

/**
 * Records an artwork ID as recently seen to prevent immediate repetition.
 */
export function recordViewedArtwork(id: string): void {
  if (!id) return;
  const recent = getRecentArtworkIds().filter((existingId) => existingId !== id);
  recent.push(id);

  if (recent.length > MAX_RECENT_TRACKING) {
    recent.splice(0, recent.length - MAX_RECENT_TRACKING);
  }

  inMemoryRecentIds = [...recent];

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(RECENT_ARTWORKS_STORAGE_KEY, JSON.stringify(recent));
    }
  } catch {
    // Ignore storage quota or disabled errors
  }
}

/**
 * Clears the recent history (used in tests or manual reset).
 */
export function clearRecentArtworks(): void {
  inMemoryRecentIds = [];
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(RECENT_ARTWORKS_STORAGE_KEY);
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Calculates a match score for an artwork based on context (weather, mood, time of day).
 */
function scoreArtwork(artwork: HavenArtwork, context: SelectionContext): number {
  let score = 1; // Base score

  // 1. Mood relevance (high weight when user recently journaled or expressed mood)
  if (context.mood && artwork.moods && artwork.moods.includes(context.mood)) {
    score += 6;
  }

  // 2. Weather relevance (high weight when local weather is known)
  if (context.weather && artwork.weather && artwork.weather.includes(context.weather)) {
    score += 5;
  }

  // 3. Time of day relevance
  if (context.timeOfDay && artwork.timeOfDay && artwork.timeOfDay.includes(context.timeOfDay)) {
    score += 3;
  }

  return score;
}

/**
 * Generates an inspiring, serene reason for why this artwork was chosen.
 */
function generateSelectionReason(artwork: HavenArtwork, context: SelectionContext): string {
  if (context.mood && artwork.moods?.includes(context.mood)) {
    const moodMap: Record<string, string> = {
      calm: 'bình an, tĩnh lặng',
      grateful: 'biết ơn, tươi sáng',
      reflective: 'trầm tư, sâu lắng',
      peaceful: 'an yên, thư thái',
      hopeful: 'hy vọng, rạng rỡ',
    };
    return `Tâm trạng ${moodMap[context.mood] || context.mood}`;
  }

  if (context.weather && artwork.weather?.includes(context.weather)) {
    const weatherMap: Record<WeatherCondition, string> = {
      clear: 'Tiết trời trong xanh, nắng nhẹ',
      clouds: 'Trời mây êm đềm lãng đãng',
      rain: 'Làn mưa dịu dàng gội rửa',
      fog: 'Màn sương sớm tĩnh lặng bao la',
      snow: 'Miền tuyết trắng an nhiên',
      dusk: 'Ráng chiều hoàng hôn ấm áp',
      night: 'Bầu trời đêm thanh tĩnh ngàn sao',
    };
    return weatherMap[context.weather] || 'Thời tiết an lành';
  }

  return 'Kiệt tác thanh tịnh cho tâm hồn';
}

/**
 * Smartly selects an artwork for the current session or access.
 * Guarantees:
 * 1. Each visit/access selects a DIFFERENT image than recently viewed ("mỗi lượt truy cập là một ảnh khác nhau").
 * 2. Adapts seamlessly to user local weather and journal mood.
 * 3. Never throws or halts, smoothly looping when the full gallery is exhausted.
 */
export function selectArtworkForSession(context: SelectionContext = {}): SelectionResult {
  const recentIds = new Set(getRecentArtworkIds());
  if (context.excludedIds) {
    context.excludedIds.forEach((id) => recentIds.add(id));
  }
  const all = getAllAvailableArtworks();

  // Filter out recent artworks
  let candidates = all.filter((art) => !recentIds.has(art.id));

  // If all or too many artworks have been seen, loosen recent filter
  // but strictly retain exclusion of the most recently viewed artwork
  if (candidates.length === 0) {
    const recentArray = getRecentArtworkIds();
    const lastSeenId = recentArray[recentArray.length - 1];
    candidates = all.filter((art) => art.id !== lastSeenId);

    // If still empty (e.g. catalog size <= 1), fallback to all
    if (candidates.length === 0) {
      candidates = [...all];
    }
  }

  // Calculate scores for candidates
  const scored = candidates.map((art) => ({
    art,
    score: scoreArtwork(art, context),
  }));

  // Find max score
  const maxScore = Math.max(...scored.map((s) => s.score));

  // Keep top tier candidates (score >= maxScore)
  const topCandidates = scored
    .filter((s) => s.score >= maxScore)
    .map((s) => s.art);

  // Pick one randomly among top tier to ensure variety & surprise
  const chosenIndex = Math.floor(Math.random() * topCandidates.length);
  const chosen = topCandidates[chosenIndex] || candidates[0] || all[0];

  recordViewedArtwork(chosen.id);

  return {
    artwork: chosen,
    reason: generateSelectionReason(chosen, context),
    context,
  };
}

/**
 * Selects the next artwork upon manual user click or rotation.
 * Guarantees the chosen artwork is not the current one.
 */
export function selectNextArtwork(options: {
  currentId?: string;
  weather?: WeatherCondition;
  timeOfDay?: TimeOfDay;
  mood?: string;
} = {}): SelectionResult {
  const excludedIds = options.currentId ? [options.currentId] : [];
  return selectArtworkForSession({
    weather: options.weather,
    timeOfDay: options.timeOfDay,
    mood: options.mood,
    excludedIds,
  });
}
