import type { WeatherCondition, TimeOfDay } from '../weather/weather';
import type { HavenArtwork } from './pexels';
import { PEXELS_HAVEN_ARTWORKS } from './pexels';

const PEXELS_API_KEY_STORAGE = 'haven_pexels_api_key';
const PEXELS_CACHE_STORAGE = 'haven_pexels_cache_v1';
const PEXELS_BASE_URL = 'https://api.pexels.com/v1';

export interface PexelsFetchOptions {
  query?: string;
  weather?: WeatherCondition;
  mood?: string;
  timeOfDay?: TimeOfDay;
  perPage?: number;
}

/**
 * Retrieves configured Pexels API key from localStorage or environment variables.
 */
export function getPexelsApiKey(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(PEXELS_API_KEY_STORAGE);
      if (stored && stored.trim().length > 0) {
        return stored.trim();
      }
    }
  } catch {
    // Ignore storage errors
  }


  return null;
}

/**
 * Saves or clears Pexels API key.
 */
export function setPexelsApiKey(key: string | null): void {
  try {
    if (typeof localStorage !== 'undefined') {
      if (key && key.trim().length > 0) {
        localStorage.setItem(PEXELS_API_KEY_STORAGE, key.trim());
      } else {
        localStorage.removeItem(PEXELS_API_KEY_STORAGE);
      }
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Checks if a valid Pexels API key is currently available.
 */
export function hasPexelsApiKey(): boolean {
  return getPexelsApiKey() !== null;
}

/**
 * Derives a serene search query based on context.
 */
function deriveSearchQuery(options: PexelsFetchOptions): string {
  if (options.query && options.query.trim().length > 0) {
    return options.query.trim();
  }

  if (options.weather === 'rain') {
    return 'rain nature serene tranquil landscape';
  }
  if (options.weather === 'snow') {
    return 'snow winter forest quiet peaceful';
  }
  if (options.weather === 'fog') {
    return 'mist fog mountain lake morning';
  }
  if (options.weather === 'dusk' || options.timeOfDay === 'dusk') {
    return 'golden sunset ocean serene landscape';
  }
  if (options.weather === 'night' || options.timeOfDay === 'night') {
    return 'starry night sky starry lake solitude';
  }
  if (options.mood === 'hopeful') {
    return 'sunrise gentle sunlight nature morning';
  }
  if (options.mood === 'reflective') {
    return 'autumn quiet stream deep forest solitude';
  }
  if (options.mood === 'grateful' || options.mood === 'calm') {
    return 'zen garden calm lake reflection landscape';
  }

  return 'zen nature landscape calm peaceful';
}

// In-memory cache for live fetched Pexels photos
let inMemoryPexelsCache: Record<string, HavenArtwork[]> = {};

/**
 * Automatically searches and loads dynamic photos from Pexels API.
 * If API Key is configured, fetches high-resolution (1920px) images matching query/weather.
 * Falls back to curated collection if key is missing, network is offline, or rate-limited.
 */
export async function searchPexelsLivePhotos(options: PexelsFetchOptions = {}): Promise<HavenArtwork[]> {
  const apiKey = getPexelsApiKey();
  const query = deriveSearchQuery(options);
  const perPage = options.perPage || 15;

  // Check in-memory cache first
  const cacheKey = `${query}_${perPage}`;
  if (inMemoryPexelsCache[cacheKey] && inMemoryPexelsCache[cacheKey].length > 0) {
    return inMemoryPexelsCache[cacheKey];
  }

  if (!apiKey) {
    // No API key: filter from curated Pexels artworks
    return filterCuratedPexels(options);
  }

  try {
    const url = `${PEXELS_BASE_URL}/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&size=large`;
    const response = await fetch(url, {
      headers: {
        Authorization: apiKey,
      },
    });

    if (!response.ok) {
      console.warn(`Pexels API responded with status ${response.status}. Using curated catalog fallback.`);
      return filterCuratedPexels(options);
    }

    const data = await response.json();
    if (!data.photos || !Array.isArray(data.photos) || data.photos.length === 0) {
      return filterCuratedPexels(options);
    }

    const liveArtworks: HavenArtwork[] = data.photos.map((p: any) => {
      const weatherTag: WeatherCondition = options.weather || 'clear';
      const moodTag: string = options.mood || 'peaceful';
      const timeTag: TimeOfDay = options.timeOfDay || 'day';

      return {
        id: `pexels-live-${p.id}`,
        title: p.alt ? p.alt.trim() : 'Khoảnh khắc thiên nhiên an tĩnh',
        artist: `Pexels / ${p.photographer || 'Nhiếp ảnh gia'}`,
        src: p.src.large2x || p.src.large || p.src.original,
        license: 'Pexels License (Free to use)',
        sourceUrl: p.url || `https://www.pexels.com/photo/${p.id}/`,
        description: `Bức ảnh độ phân giải cao được tải tự động từ Pexels bởi nhiếp ảnh gia ${p.photographer}.`,
        weather: [weatherTag],
        moods: [moodTag, 'calm', 'peaceful'],
        timeOfDay: [timeTag],
        isPexels: true,
      };
    });

    inMemoryPexelsCache[cacheKey] = liveArtworks;
    return liveArtworks;
  } catch (err) {
    console.warn('Live Pexels fetch failed, utilizing curated catalog:', err);
    return filterCuratedPexels(options);
  }
}

/**
 * Filters existing curated Pexels collection based on options.
 */
function filterCuratedPexels(options: PexelsFetchOptions): HavenArtwork[] {
  let list = [...PEXELS_HAVEN_ARTWORKS];
  if (options.weather) {
    const matching = list.filter((a) => a.weather && a.weather.includes(options.weather!));
    if (matching.length > 0) return matching;
  }
  if (options.mood) {
    const matching = list.filter((a) => a.moods && a.moods.includes(options.mood!));
    if (matching.length > 0) return matching;
  }
  return list;
}

/**
 * Validates a Pexels API key by making a test request with 1 result.
 */
export async function testPexelsApiKey(testKey: string): Promise<{ success: boolean; message: string; photographer?: string }> {
  if (!testKey || testKey.trim().length === 0) {
    return { success: false, message: 'API Key không được để trống.' };
  }

  try {
    const response = await fetch(`${PEXELS_BASE_URL}/search?query=nature&per_page=1`, {
      headers: { Authorization: testKey.trim() },
    });

    if (response.status === 200) {
      const data = await response.json();
      const photo = data.photos?.[0];
      return {
        success: true,
        message: 'Kết nối Pexels API thành công! Có thể tự động load ảnh phong cảnh thời gian thực.',
        photographer: photo?.photographer,
      };
    }

    if (response.status === 401 || response.status === 403) {
      return { success: false, message: 'API Key không hợp lệ hoặc đã hết hạn.' };
    }

    return { success: false, message: `Lỗi kết nối Pexels: HTTP ${response.status}` };
  } catch (err: any) {
    return { success: false, message: `Lỗi mạng khi kiểm tra: ${err?.message || 'Không thể kết nối'}` };
  }
}
