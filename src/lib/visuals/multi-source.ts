import type { WeatherCondition, TimeOfDay } from '../weather/weather';
import type { HavenArtwork } from './pexels';
import { searchPexelsLivePhotos, hasPexelsApiKey, getPexelsApiKey, setPexelsApiKey, testPexelsApiKey } from './pexels-api';
import { searchPixabayLivePhotos, hasPixabayApiKey, getPixabayApiKey, setPixabayApiKey, testPixabayApiKey } from './pixabay-api';
import { searchUnsplashLivePhotos, hasUnsplashApiKey, getUnsplashApiKey, setUnsplashApiKey, testUnsplashApiKey } from './unsplash-api';
import { searchWikimediaArtworks } from './wikimedia-api';

export interface MultiSourceOptions {
  query?: string;
  weather?: WeatherCondition;
  mood?: string;
  timeOfDay?: TimeOfDay;
  perPage?: number;
}

export interface ProviderStatus {
  id: 'pixabay' | 'unsplash' | 'pexels' | 'wikimedia';
  name: string;
  hasKey: boolean;
  isOpenApi: boolean;
  description: string;
  keyRegisterUrl: string;
}

/**
 * Returns status and metadata of all supported photo providers.
 */
export function getProviderStatuses(): ProviderStatus[] {
  return [
    {
      id: 'pixabay',
      name: 'Pixabay API',
      hasKey: hasPixabayApiKey(),
      isOpenApi: false,
      description: 'Khuyên dùng: Đăng ký nhận API key miễn phí tức thì 100%, không bị tạm ngưng.',
      keyRegisterUrl: 'https://pixabay.com/api/docs/',
    },
    {
      id: 'unsplash',
      name: 'Unsplash API',
      hasKey: hasUnsplashApiKey(),
      isOpenApi: false,
      description: 'Kho ảnh nghệ thuật thiên nhiên và phong cảnh hàng đầu thế giới.',
      keyRegisterUrl: 'https://unsplash.com/developers',
    },
    {
      id: 'wikimedia',
      name: 'Wikimedia Commons',
      hasKey: true,
      isOpenApi: true,
      description: 'Kho mở công cộng: Không cần API Key, truy cập trực tiếp danh họa thế giới.',
      keyRegisterUrl: 'https://commons.wikimedia.org/',
    },
    {
      id: 'pexels',
      name: 'Pexels API',
      hasKey: hasPexelsApiKey(),
      isOpenApi: false,
      description: 'Dành cho người dùng đã có API Key Pexels trước thời điểm tạm dừng cấp mới.',
      keyRegisterUrl: 'https://www.pexels.com/api/',
    },
  ];
}

/**
 * Searches and merges live photos from all active/configured providers.
 * If no keys are configured, gracefully falls back to open Wikimedia Commons.
 */
export async function searchAnyLivePhotos(
  options: MultiSourceOptions = {}
): Promise<HavenArtwork[]> {
  const tasks: Promise<HavenArtwork[]>[] = [];

  // 1. Pixabay (if key configured)
  if (hasPixabayApiKey()) {
    tasks.push(searchPixabayLivePhotos(options));
  }

  // 2. Unsplash (if key configured)
  if (hasUnsplashApiKey()) {
    tasks.push(searchUnsplashLivePhotos(options));
  }

  // 3. Pexels (if key configured)
  if (hasPexelsApiKey()) {
    tasks.push(searchPexelsLivePhotos(options));
  }

  // If no commercial API keys configured, fetch from open Wikimedia Commons
  if (tasks.length === 0) {
    tasks.push(searchWikimediaArtworks({ ...options, limit: options.perPage || 8 }));
  }

  const results = await Promise.allSettled(tasks);
  const combined: HavenArtwork[] = [];
  const seenIds = new Set<string>();

  for (const res of results) {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      for (const art of res.value) {
        if (!seenIds.has(art.id)) {
          seenIds.add(art.id);
          combined.push(art);
        }
      }
    }
  }

  return combined;
}

export {
  getPexelsApiKey,
  setPexelsApiKey,
  hasPexelsApiKey,
  testPexelsApiKey,
  getPixabayApiKey,
  setPixabayApiKey,
  hasPixabayApiKey,
  testPixabayApiKey,
  getUnsplashApiKey,
  setUnsplashApiKey,
  hasUnsplashApiKey,
  testUnsplashApiKey,
};
