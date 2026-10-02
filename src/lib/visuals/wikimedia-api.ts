import type { WeatherCondition, TimeOfDay } from '../weather/weather';
import type { HavenArtwork } from './pexels';

const WIKIMEDIA_BASE_URL = 'https://commons.wikimedia.org/w/api.php';

export interface WikimediaFetchOptions {
  query?: string;
  weather?: WeatherCondition;
  mood?: string;
  timeOfDay?: TimeOfDay;
  limit?: number;
}

/**
 * Searches Wikimedia Commons for high-resolution public domain landscape art and nature.
 * Zero API Key needed — open to all users globally!
 */
export async function searchWikimediaArtworks(
  options: WikimediaFetchOptions = {}
): Promise<HavenArtwork[]> {
  const query = options.query || (
    options.weather === 'rain'
      ? 'rain landscape painting'
      : options.weather === 'fog'
        ? 'misty mountains painting'
        : options.weather === 'snow'
          ? 'winter landscape painting'
          : options.timeOfDay === 'night'
            ? 'starry night landscape painting'
            : 'peaceful landscape painting'
  );

  const limit = options.limit || 10;
  const searchUrl = `${WIKIMEDIA_BASE_URL}?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${limit}&prop=imageinfo&iiprop=url|size|extmetadata&format=json&origin=*`;

  try {
    const res = await fetch(searchUrl);
    if (!res.ok) return [];

    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return [];

    const results: HavenArtwork[] = [];

    for (const pageId of Object.keys(pages)) {
      const page = pages[pageId];
      const imageInfo = page.imageinfo?.[0];
      if (!imageInfo || !imageInfo.url) continue;

      // Filter out svg/icons/non-landscape tiny images
      const width = imageInfo.width || 0;
      const height = imageInfo.height || 0;
      if (width < 800 || width <= height) continue; // Landscape aspect ratio preference

      const ext = imageInfo.extmetadata || {};
      const rawTitle = page.title ? page.title.replace(/^File:/i, '').replace(/\.[^.]+$/, '').replace(/_/g, ' ') : 'Danh họa thiên nhiên';
      const artist = ext.Artist?.value ? ext.Artist.value.replace(/<[^>]*>/g, '').trim() : 'Wikimedia Commons / Public Domain';
      const license = ext.LicenseShortName?.value || 'Public Domain';

      results.push({
        id: `wikimedia-${pageId}`,
        title: rawTitle.slice(0, 50),
        artist,
        src: imageInfo.url,
        license,
        sourceUrl: imageInfo.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
        description: ext.ImageDescription?.value ? ext.ImageDescription.value.replace(/<[^>]*>/g, '').slice(0, 150) : 'Tác phẩm nghệ thuật phong cảnh công cộng từ Wikimedia Commons.',
        weather: options.weather ? [options.weather] : ['clear'],
        moods: options.mood ? [options.mood] : ['reflective', 'calm'],
        timeOfDay: options.timeOfDay ? [options.timeOfDay] : ['day'],
        provider: 'wikimedia',
      });
    }

    return results;
  } catch (err) {
    console.warn('Lỗi gọi Wikimedia Commons API:', err);
    return [];
  }
}
