import type { WeatherCondition, TimeOfDay } from '../weather/weather';
import type { HavenArtwork } from './pexels';

const PIXABAY_API_KEY_STORAGE = 'haven_pixabay_api_key';
const PIXABAY_CACHE_STORAGE = 'haven_pixabay_cache_v1';
const PIXABAY_BASE_URL = 'https://pixabay.com/api/';

export interface PixabayFetchOptions {
  query?: string;
  weather?: WeatherCondition;
  mood?: string;
  timeOfDay?: TimeOfDay;
  perPage?: number;
}

/**
 * Retrieves configured Pixabay API key from localStorage or environment.
 */
export function getPixabayApiKey(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(PIXABAY_API_KEY_STORAGE);
      if (stored && stored.trim().length > 0) {
        return stored.trim();
      }
    }
  } catch {}

  try {
    const envKey = (import.meta.env?.PUBLIC_PIXABAY_API_KEY || import.meta.env?.VITE_PIXABAY_API_KEY) as string | undefined;
    if (envKey && envKey.trim().length > 0) {
      return envKey.trim();
    }
  } catch {}

  return null;
}

/**
 * Saves or clears Pixabay API key.
 */
export function setPixabayApiKey(key: string | null): void {
  try {
    if (typeof localStorage !== 'undefined') {
      if (key && key.trim().length > 0) {
        localStorage.setItem(PIXABAY_API_KEY_STORAGE, key.trim());
      } else {
        localStorage.removeItem(PIXABAY_API_KEY_STORAGE);
      }
    }
  } catch {}
}

/**
 * Checks if a valid Pixabay API key is configured.
 */
export function hasPixabayApiKey(): boolean {
  return getPixabayApiKey() !== null;
}

/**
 * Derives a serene search query based on context for Pixabay.
 */
export function derivePixabayQuery(options: PixabayFetchOptions = {}): string {
  if (options.query && options.query.trim()) {
    return options.query.trim();
  }

  const terms: string[] = ['landscape'];

  if (options.weather) {
    const weatherMap: Record<WeatherCondition, string> = {
      rain: 'rain landscape calm',
      fog: 'mist fog forest',
      snow: 'snow winter peaceful mountain',
      dusk: 'sunset calm lake',
      night: 'starry night sky serene',
      clear: 'serene sunny nature meadow',
      clouds: 'cloudy mountains quiet',
    };
    terms.push(weatherMap[options.weather] || 'nature');
  } else if (options.timeOfDay) {
    const timeMap: Record<TimeOfDay, string> = {
      dawn: 'sunrise lake calm',
      day: 'forest nature scenic',
      dusk: 'twilight golden hour',
      night: 'stars night nature',
    };
    terms.push(timeMap[options.timeOfDay]);
  } else {
    terms.push('zen tranquil nature');
  }

  return terms.join(' ');
}

/**
 * Tests a Pixabay API key with a minimal search request.
 */
export async function testPixabayApiKey(key: string): Promise<{
  valid: boolean;
  samplePhotographer?: string;
  totalResults?: number;
  error?: string;
}> {
  const trimmed = key.trim();
  if (!trimmed) {
    return { valid: false, error: 'API key không được để trống' };
  }

  try {
    const url = `${PIXABAY_BASE_URL}?key=${encodeURIComponent(trimmed)}&q=zen+nature&image_type=photo&orientation=horizontal&per_page=3&safesearch=true`;
    const res = await fetch(url);

    if (res.status === 400 || res.status === 401 || res.status === 403) {
      return { valid: false, error: 'API key Pixabay không hợp lệ hoặc đã bị vô hiệu hóa.' };
    }

    if (!res.ok) {
      return { valid: false, error: `Pixabay API phản hồi lỗi (HTTP ${res.status})` };
    }

    const data = await res.json();
    if (data.hits && data.hits.length > 0) {
      return {
        valid: true,
        samplePhotographer: data.hits[0].user || 'Pixabay Contributor',
        totalResults: data.totalHits,
      };
    }

    return { valid: true, samplePhotographer: 'Pixabay Member', totalResults: 0 };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Không thể kết nối đến máy chủ Pixabay.' };
  }
}

/**
 * Searches Pixabay photos and transforms into HavenArtwork.
 */
export async function searchPixabayLivePhotos(
  options: PixabayFetchOptions = {}
): Promise<HavenArtwork[]> {
  const apiKey = getPixabayApiKey();
  if (!apiKey) return [];

  const query = derivePixabayQuery(options);
  const perPage = options.perPage || 15;

  try {
    const url = `${PIXABAY_BASE_URL}?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&safesearch=true&per_page=${perPage}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.warn(`Pixabay API responded with status ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data.hits || !Array.isArray(data.hits)) return [];

    return data.hits.map((hit: any) => ({
      id: `pixabay-${hit.id}`,
      title: hit.tags ? hit.tags.split(',').slice(0, 2).join(' • ') : 'Thiên nhiên tĩnh lặng',
      artist: `Pixabay / ${hit.user || 'Nhiếp ảnh gia'}`,
      src: hit.largeImageURL || hit.webformatURL,
      license: 'Pixabay License (Free for commercial use)',
      sourceUrl: hit.pageURL || `https://pixabay.com/photos/${hit.id}/`,
      description: `Ảnh phong cảnh thiên nhiên thanh tịnh từ cộng đồng Pixabay (${hit.tags || ''}).`,
      weather: options.weather ? [options.weather] : ['clear'],
      moods: options.mood ? [options.mood] : ['calm', 'peaceful'],
      timeOfDay: options.timeOfDay ? [options.timeOfDay] : ['day'],
      provider: 'pixabay',
    }));
  } catch (err) {
    console.warn('Lỗi gọi Pixabay API:', err);
    return [];
  }
}
