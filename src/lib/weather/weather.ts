/**
 * Haven Art - Privacy-Preserving Local Weather & Time of Day Heuristic
 *
 * Principles:
 * - Zero tracking: Never sends user identity or journal data.
 * - Open-Meteo API: Free, open-source, no API keys, no analytics.
 * - Resilient Fallback: If Geolocation is denied or offline, smoothly adapts
 *   to local device time (dawn, day, dusk, night) without breaking the experience.
 */

export type WeatherCondition =
  | 'clear'
  | 'clouds'
  | 'rain'
  | 'fog'
  | 'snow'
  | 'dusk'
  | 'night';

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export interface WeatherInfo {
  condition: WeatherCondition;
  timeOfDay: TimeOfDay;
  temperature?: number;
  descriptionVi: string;
  isDay: boolean;
  isFallback: boolean;
  fetchedAt: number;
}

const WEATHER_CACHE_KEY = 'haven_weather_cache';
const DEFAULT_CACHE_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Returns time of day bucket based on local 24h clock:
 * - 05:00 - 07:59 -> dawn
 * - 08:00 - 16:59 -> day
 * - 17:00 - 19:59 -> dusk
 * - 20:00 - 04:59 -> night
 */
export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
  const hours = date.getHours();
  if (hours >= 5 && hours < 8) {
    return 'dawn';
  }
  if (hours >= 8 && hours < 17) {
    return 'day';
  }
  if (hours >= 17 && hours < 20) {
    return 'dusk';
  }
  return 'night';
}

/**
 * Maps WMO weather code (World Meteorological Organization) and day/night status
 * into Haven Art's serene weather conditions and poetic Vietnamese descriptions.
 */
export function getConditionFromWmoCode(
  wmoCode: number,
  isDay: boolean,
  timeOfDay: TimeOfDay
): { condition: WeatherCondition; descriptionVi: string } {
  // If it is sunset/dusk hours and sky is mostly clear or partly cloudy
  if (timeOfDay === 'dusk' && wmoCode <= 3) {
    return {
      condition: 'dusk',
      descriptionVi: 'Hoàng hôn rực rỡ, ráng chiều an yên',
    };
  }

  // If night time
  if ((!isDay || timeOfDay === 'night') && wmoCode <= 3) {
    return {
      condition: 'night',
      descriptionVi: 'Đêm thanh tĩnh, trời quang thăm thẳm',
    };
  }

  // WMO 0: Clear sky
  if (wmoCode === 0) {
    if (timeOfDay === 'dawn') {
      return { condition: 'clear', descriptionVi: 'Bình minh trong lành, nắng sớm hé rạng' };
    }
    return { condition: 'clear', descriptionVi: 'Trời quang đãng, nắng nhẹ an yên' };
  }

  // WMO 1, 2, 3: Mainly clear, partly cloudy, overcast
  if (wmoCode >= 1 && wmoCode <= 3) {
    if (wmoCode === 3) {
      return { condition: 'clouds', descriptionVi: 'Mây êm trôi, trời thu dịu mát' };
    }
    return { condition: 'clouds', descriptionVi: 'Mây nhẹ lãng đãng, tiết trời thanh bình' };
  }

  // WMO 45, 48: Fog, depositing rime fog
  if (wmoCode === 45 || wmoCode === 48) {
    return { condition: 'fog', descriptionVi: 'Sương mù bảng lảng, tĩnh lặng bao la' };
  }

  // WMO 51..57: Drizzle; 61..67: Rain; 80..82: Showers; 95..99: Thunderstorm
  if (
    (wmoCode >= 51 && wmoCode <= 67) ||
    (wmoCode >= 80 && wmoCode <= 82) ||
    (wmoCode >= 95 && wmoCode <= 99)
  ) {
    if (wmoCode >= 51 && wmoCode <= 55) {
      return { condition: 'rain', descriptionVi: 'Mưa phùn êm dịu, rửa sạch muộn phiền' };
    }
    if (wmoCode >= 95) {
      return { condition: 'rain', descriptionVi: 'Cơn mưa rào thanh tẩy đất trời' };
    }
    return { condition: 'rain', descriptionVi: 'Mưa rơi tí tách, góc trú ẩn bình an' };
  }

  // WMO 71..77, 85..86: Snow
  if ((wmoCode >= 71 && wmoCode <= 77) || wmoCode === 85 || wmoCode === 86) {
    return { condition: 'snow', descriptionVi: 'Tuyết rơi tĩnh lặng, miền băng tuyết thanh tịnh' };
  }

  // Default fallback
  return {
    condition: isDay ? 'clear' : 'night',
    descriptionVi: isDay ? 'Tiết trời thanh bình' : 'Đêm tĩnh mịch',
  };
}

/**
 * Creates fallback WeatherInfo from local device clock.
 */
export function getFallbackWeather(date: Date = new Date()): WeatherInfo {
  const timeOfDay = getTimeOfDay(date);
  let condition: WeatherCondition;
  let descriptionVi: string;

  switch (timeOfDay) {
    case 'dawn':
      condition = 'fog';
      descriptionVi = 'Sương sớm ban mai tĩnh lặng';
      break;
    case 'day':
      condition = 'clear';
      descriptionVi = 'Nắng sớm dịu dàng, trời thanh bình';
      break;
    case 'dusk':
      condition = 'dusk';
      descriptionVi = 'Hoàng hôn buông lơi, ráng chiều an tĩnh';
      break;
    case 'night':
    default:
      condition = 'night';
      descriptionVi = 'Đêm vắng bình yên, trăng sao tĩnh mịch';
      break;
  }

  return {
    condition,
    timeOfDay,
    descriptionVi,
    isDay: timeOfDay === 'day' || timeOfDay === 'dawn',
    isFallback: true,
    fetchedAt: date.getTime(),
  };
}

/**
 * Fetches real-time weather from Open-Meteo for given coordinates.
 */
export async function fetchWeather(
  latitude: number,
  longitude: number,
  timeoutMs: number = 6000
): Promise<WeatherInfo> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo responded with status ${response.status}`);
    }

    const data = await response.json();
    const current = data.current;
    if (!current) {
      throw new Error('Invalid Open-Meteo response structure');
    }

    const isDay = current.is_day === 1;
    const timeOfDay = getTimeOfDay();
    const { condition, descriptionVi } = getConditionFromWmoCode(
      Number(current.weather_code ?? 0),
      isDay,
      timeOfDay
    );

    const weatherInfo: WeatherInfo = {
      condition,
      timeOfDay,
      temperature: current.temperature_2m,
      descriptionVi,
      isDay,
      isFallback: false,
      fetchedAt: Date.now(),
    };

    // Cache locally
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weatherInfo));
      }
    } catch {
      // Storage unavailable or quota exceeded; safe to ignore
    }

    return weatherInfo;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Detects real-time weather using browser Geolocation + Open-Meteo.
 * Gracefully falls back to local time heuristic on any failure or denial.
 */
export async function detectWeather(options: {
  timeoutMs?: number;
  maxCacheAgeMs?: number;
} = {}): Promise<WeatherInfo> {
  const maxCacheAge = options.maxCacheAgeMs ?? DEFAULT_CACHE_MAX_AGE_MS;
  const timeoutMs = options.timeoutMs ?? 5000;

  // 1. Check local cache
  try {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(WEATHER_CACHE_KEY);
      if (cached) {
        const parsed: WeatherInfo = JSON.parse(cached);
        if (Date.now() - parsed.fetchedAt < maxCacheAge) {
          // Re-evaluate timeOfDay to ensure day/dusk/night transitions
          parsed.timeOfDay = getTimeOfDay();
          return parsed;
        }
      }
    }
  } catch {
    // Ignore cache read errors
  }

  // 2. Check Geolocation support
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return getFallbackWeather();
  }

  // 3. Request location with timeout
  try {
    const coords = await new Promise<{ latitude: number; longitude: number }>(
      (resolve, reject) => {
        let done = false;
        const timer = setTimeout(() => {
          if (!done) {
            done = true;
            reject(new Error('Geolocation timeout'));
          }
        }, timeoutMs);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (!done) {
              done = true;
              clearTimeout(timer);
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              });
            }
          },
          (err) => {
            if (!done) {
              done = true;
              clearTimeout(timer);
              reject(err);
            }
          },
          {
            enableHighAccuracy: false,
            timeout: timeoutMs,
            maximumAge: 10 * 60 * 1000, // 10 min location cache
          }
        );
      }
    );

    return await fetchWeather(coords.latitude, coords.longitude, timeoutMs);
  } catch {
    // Permission denied, timeout, or network offline -> fallback safely
    return getFallbackWeather();
  }
}
