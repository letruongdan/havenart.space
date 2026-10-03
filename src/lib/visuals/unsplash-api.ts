import type { WeatherCondition, TimeOfDay } from '../weather/weather';
import type { HavenArtwork } from './pexels';

const UNSPLASH_API_KEY_STORAGE = 'haven_unsplash_api_key';
const UNSPLASH_BASE_URL = 'https://api.unsplash.com';

export interface UnsplashFetchOptions {
  query?: string;
  weather?: WeatherCondition;
  mood?: string;
  timeOfDay?: TimeOfDay;
  perPage?: number;
}

/**
 * Retrieves configured Unsplash Access Key from localStorage or environment.
 */
export function getUnsplashApiKey(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(UNSPLASH_API_KEY_STORAGE);
      if (stored && stored.trim().length > 0) {
        return stored.trim();
      }
    }
  } catch {}


  return null;
}

/**
 * Saves or clears Unsplash Access Key.
 */
export function setUnsplashApiKey(key: string | null): void {
  try {
    if (typeof localStorage !== 'undefined') {
      if (key && key.trim().length > 0) {
        localStorage.setItem(UNSPLASH_API_KEY_STORAGE, key.trim());
      } else {
        localStorage.removeItem(UNSPLASH_API_KEY_STORAGE);
      }
    }
  } catch {}
}

/**
 * Checks if a valid Unsplash key is configured.
 */
export function hasUnsplashApiKey(): boolean {
  return getUnsplashApiKey() !== null;
}

/**
 * Derives a serene search query based on context for Unsplash.
 */
export function deriveUnsplashQuery(options: UnsplashFetchOptions = {}): string {
  if (options.query && options.query.trim()) {
    return options.query.trim();
  }

  const terms: string[] = ['peaceful nature landscape'];

  if (options.weather) {
    const weatherMap: Record<WeatherCondition, string> = {
      rain: 'rainy forest moody',
      fog: 'misty mountains fog',
      snow: 'snow winter tranquility',
      dusk: 'sunset golden hour lake',
      night: 'night stars milky way',
      clear: 'serene meadow sunny',
      clouds: 'cloudy atmospheric mountains',
    };
    terms.push(weatherMap[options.weather]);
  } else if (options.timeOfDay) {
    const timeMap: Record<TimeOfDay, string> = {
      dawn: 'dawn sunrise calmness',
      day: 'scenic lake forest',
      dusk: 'dusk twilight glow',
      night: 'dark starry sky landscape',
    };
    terms.push(timeMap[options.timeOfDay]);
  }

  return terms.join(' ');
}

/**
 * Tests an Unsplash Access Key with a minimal search request.
 */
export async function testUnsplashApiKey(key: string): Promise<{
  valid: boolean;
  samplePhotographer?: string;
  totalResults?: number;
  error?: string;
}> {
  const trimmed = key.trim();
  if (!trimmed) {
    return { valid: false, error: 'Access Key không được để trống' };
  }

  try {
    const url = `${UNSPLASH_BASE_URL}/search/photos?query=serene+nature&orientation=landscape&per_page=2`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${trimmed}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      return { valid: false, error: 'Access Key Unsplash không hợp lệ hoặc đã chạm giới hạn (Rate Limit).' };
    }

    if (!res.ok) {
      return { valid: false, error: `Unsplash API phản hồi lỗi (HTTP ${res.status})` };
    }

    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return {
        valid: true,
        samplePhotographer: data.results[0].user?.name || 'Unsplash Creator',
        totalResults: data.total,
      };
    }

    return { valid: true, samplePhotographer: 'Unsplash Artist', totalResults: 0 };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Không thể kết nối đến máy chủ Unsplash.' };
  }
}

/**
 * Searches Unsplash live photos and standardizes to HavenArtwork.
 */
export async function searchUnsplashLivePhotos(
  options: UnsplashFetchOptions = {}
): Promise<HavenArtwork[]> {
  const apiKey = getUnsplashApiKey();
  if (!apiKey) return [];

  const query = deriveUnsplashQuery(options);
  const perPage = options.perPage || 15;

  try {
    const url = `${UNSPLASH_BASE_URL}/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=${perPage}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${apiKey}`,
      },
    });

    if (!res.ok) {
      console.warn(`Unsplash API responded with status ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    return data.results.map((photo: any) => ({
      id: `unsplash-${photo.id}`,
      title: photo.description || photo.alt_description || 'Phong cảnh tĩnh tại',
      artist: `Unsplash / ${photo.user?.name || 'Nhiếp ảnh gia'}`,
      src: `${photo.urls?.regular || photo.urls?.full}&w=1920&q=80`,
      license: 'Unsplash License (Free to use)',
      sourceUrl: photo.links?.html || `https://unsplash.com/photos/${photo.id}`,
      description: photo.alt_description || 'Kiệt tác thiên nhiên an tĩnh từ Unsplash.',
      weather: options.weather ? [options.weather] : ['clear'],
      moods: options.mood ? [options.mood] : ['calm', 'hopeful'],
      timeOfDay: options.timeOfDay ? [options.timeOfDay] : ['day'],
      provider: 'unsplash',
    }));
  } catch (err) {
    console.warn('Lỗi gọi Unsplash API:', err);
    return [];
  }
}
