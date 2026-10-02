import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getTimeOfDay,
  getConditionFromWmoCode,
  getFallbackWeather,
  detectWeather,
  fetchWeather,
  type WeatherCondition,
  type TimeOfDay,
  type WeatherInfo,
} from '../../src/lib/weather/weather';

describe('Weather Service & Fallback Heuristic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Time of Day Detection (getTimeOfDay)', () => {
    it('detects dawn between 05:00 and 07:59', () => {
      const d1 = new Date(2026, 9, 2, 5, 0, 0);
      const d2 = new Date(2026, 9, 2, 7, 59, 0);
      expect(getTimeOfDay(d1)).toBe('dawn');
      expect(getTimeOfDay(d2)).toBe('dawn');
    });

    it('detects day between 08:00 and 16:59', () => {
      const d1 = new Date(2026, 9, 2, 8, 0, 0);
      const d2 = new Date(2026, 9, 2, 12, 30, 0);
      const d3 = new Date(2026, 9, 2, 16, 59, 0);
      expect(getTimeOfDay(d1)).toBe('day');
      expect(getTimeOfDay(d2)).toBe('day');
      expect(getTimeOfDay(d3)).toBe('day');
    });

    it('detects dusk between 17:00 and 19:59', () => {
      const d1 = new Date(2026, 9, 2, 17, 0, 0);
      const d2 = new Date(2026, 9, 2, 18, 45, 0);
      const d3 = new Date(2026, 9, 2, 19, 59, 0);
      expect(getTimeOfDay(d1)).toBe('dusk');
      expect(getTimeOfDay(d2)).toBe('dusk');
      expect(getTimeOfDay(d3)).toBe('dusk');
    });

    it('detects night between 20:00 and 04:59', () => {
      const d1 = new Date(2026, 9, 2, 20, 0, 0);
      const d2 = new Date(2026, 9, 2, 23, 59, 0);
      const d3 = new Date(2026, 9, 2, 0, 15, 0);
      const d4 = new Date(2026, 9, 2, 4, 30, 0);
      expect(getTimeOfDay(d1)).toBe('night');
      expect(getTimeOfDay(d2)).toBe('night');
      expect(getTimeOfDay(d3)).toBe('night');
      expect(getTimeOfDay(d4)).toBe('night');
    });
  });

  describe('2. WMO Weather Code Translation (getConditionFromWmoCode)', () => {
    it('maps WMO code 0 to clear in daytime and night during darkness', () => {
      const dayClear = getConditionFromWmoCode(0, true, 'day');
      expect(dayClear.condition).toBe('clear');
      expect(dayClear.descriptionVi).toMatch(/quang đãng|trong xanh/i);

      const nightClear = getConditionFromWmoCode(0, false, 'night');
      expect(nightClear.condition).toBe('night');
      expect(nightClear.descriptionVi).toMatch(/đêm/i);
    });

    it('maps WMO codes 1, 2, 3 to clouds or dusk at sunset', () => {
      const cloudyDay = getConditionFromWmoCode(2, true, 'day');
      expect(cloudyDay.condition).toBe('clouds');

      const sunset = getConditionFromWmoCode(1, true, 'dusk');
      expect(sunset.condition).toBe('dusk');
      expect(sunset.descriptionVi).toMatch(/hoàng hôn|ráng chiều/i);
    });

    it('maps WMO codes 45, 48 to fog', () => {
      const fogDay = getConditionFromWmoCode(45, true, 'day');
      expect(fogDay.condition).toBe('fog');
      expect(fogDay.descriptionVi).toMatch(/sương mù/i);
    });

    it('maps rain codes 51, 61, 80, 95 to rain', () => {
      expect(getConditionFromWmoCode(51, true, 'day').condition).toBe('rain');
      expect(getConditionFromWmoCode(61, true, 'day').condition).toBe('rain');
      expect(getConditionFromWmoCode(80, true, 'day').condition).toBe('rain');
      expect(getConditionFromWmoCode(95, true, 'day').condition).toBe('rain');
    });

    it('maps snow codes 71, 85 to snow', () => {
      expect(getConditionFromWmoCode(71, true, 'day').condition).toBe('snow');
      expect(getConditionFromWmoCode(85, true, 'day').condition).toBe('snow');
    });
  });

  describe('3. Fallback Heuristic (getFallbackWeather)', () => {
    it('produces valid WeatherInfo based on local system time', () => {
      const duskDate = new Date(2026, 9, 2, 18, 0, 0);
      const fallback = getFallbackWeather(duskDate);

      expect(fallback.isFallback).toBe(true);
      expect(fallback.timeOfDay).toBe('dusk');
      expect(fallback.condition).toBe('dusk');
      expect(typeof fallback.descriptionVi).toBe('string');
      expect(fallback.descriptionVi.length).toBeGreaterThan(0);
    });
  });

  describe('4. detectWeather & Open-Meteo Integration', () => {
    it('gracefully returns fallback weather when geolocation is not supported', async () => {
      const originalGeo = navigator.geolocation;
      Object.defineProperty(navigator, 'geolocation', {
        value: undefined,
        configurable: true,
      });

      const weather = await detectWeather({ timeoutMs: 500 });
      expect(weather).toBeDefined();
      expect(weather.isFallback).toBe(true);

      Object.defineProperty(navigator, 'geolocation', {
        value: originalGeo,
        configurable: true,
      });
    });

    it('fetches Open-Meteo API when coordinates are available', async () => {
      const mockResponse = {
        current: {
          temperature_2m: 23.5,
          weather_code: 45,
          is_day: 1,
        },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const weather = await fetchWeather(21.0285, 105.8542);
      expect(weather.isFallback).toBe(false);
      expect(weather.temperature).toBe(23.5);
      expect(weather.condition).toBe('fog');
      expect(weather.isDay).toBe(true);
    });

    it('falls back when fetch fails or times out', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));

      // If geolocation returns position but fetch fails
      const mockGeo = {
        getCurrentPosition: (success: PositionCallback) => {
          success({
            coords: {
              latitude: 10.8231,
              longitude: 106.6297,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
          } as unknown as GeolocationPosition);
        },
      };

      Object.defineProperty(navigator, 'geolocation', {
        value: mockGeo,
        configurable: true,
      });

      const weather = await detectWeather({ timeoutMs: 1000 });
      expect(weather).toBeDefined();
      expect(weather.isFallback).toBe(true);
    });
  });
});
