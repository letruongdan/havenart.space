import type { JournalRepository } from '../db/repository';
import { DEFAULT_DRAFT_ID } from '../db/schema';
import { ALL_HAVEN_AUDIO_TRACKS } from '../audio/ambient-catalog';
import { ALL_HAVEN_ARTWORKS } from '../visuals/pexels';
import {
  getUserAnalyticsSummary,
  type UserAnalyticsSummary,
} from './user-analytics';

export interface SystemEvent {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'success' | 'error';
  category: 'system' | 'audio' | 'visual' | 'db' | 'network';
  message: string;
}

export interface SystemTelemetry {
  timestamp: number;
  uptimeSeconds: number;
  storage: {
    supported: boolean;
    quotaBytes?: number;
    usageBytes?: number;
    usagePercentage?: number;
    persisted?: boolean;
    entriesCount: number;
    softDeletedCount: number;
    draftsCount: number;
    totalWords: number;
    moodBreakdown: Record<string, number>;
  };
  performance: {
    supported: boolean;
    pageLoadTimeMs?: number;
    domInteractiveMs?: number;
    domCompleteMs?: number;
    firstPaintMs?: number;
    firstContentfulPaintMs?: number;
    transferSizeBytes?: number;
    resourcesCount?: number;
    memory?: {
      usedJSHeapSize?: number;
      totalJSHeapSize?: number;
      jsHeapSizeLimit?: number;
    };
  };
  device: {
    userAgent: string;
    screenResolution: string;
    viewport: string;
    dpr: number;
    hardwareConcurrency: number;
    deviceMemoryGb?: number;
    isOnline: boolean;
    connectionType?: string;
    prefersReducedMotion: boolean;
  };
  audio: {
    supported: boolean;
    contextState: string;
    sampleRate?: number;
    totalTracks: number;
    pianoTracksCount: number;
    ambientTracksCount: number;
    currentVolume: number;
  };
  visual: {
    webgl2Supported: boolean;
    rendererInfo?: string;
    totalArtworks: number;
    activeMode: 'shader' | 'static';
  };
  pwa: {
    serviceWorkerSupported: boolean;
    serviceWorkerRegistered: boolean;
    cachesSupported: boolean;
    cacheCount: number;
    cachedAssetsCount: number;
  };
  weather: {
    detected: boolean;
    condition?: string;
    temperature?: number;
    descriptionVi?: string;
    isCached?: boolean;
  };
  events: SystemEvent[];
  userAnalytics?: UserAnalyticsSummary;
}

const appSessionStart = Date.now();
const MAX_EVENTS = 100;
let inMemoryEvents: SystemEvent[] = [];

/**
 * Format raw byte size into binary units (B, KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i === 0) return `${bytes} B`;
  return `${(bytes / Math.pow(k, i)).toFixed(dm)} ${sizes[i]}`;
}

/**
 * Format seconds into HH:MM:SS or MM:SS.
 */
export function formatDuration(seconds: number): string {
  const sec = Math.max(0, Math.floor(seconds || 0));
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const remainingSecs = sec % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(remainingSecs)}`;
  }
  return `${pad(mins)}:${pad(remainingSecs)}`;
}

/**
 * Record an internal system telemetry event into circular memory buffer.
 */
export function logSystemEvent(event: Omit<SystemEvent, 'id' | 'timestamp'>): void {
  const newEvent: SystemEvent = {
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };

  inMemoryEvents.unshift(newEvent);
  if (inMemoryEvents.length > MAX_EVENTS) {
    inMemoryEvents.pop();
  }
}

/**
 * Retrieve recent system events.
 */
export function getRecentEvents(limit: number = 50): SystemEvent[] {
  return inMemoryEvents.slice(0, limit);
}

/**
 * Clear in-memory event buffer.
 */
export function clearRecentEvents(): void {
  inMemoryEvents = [];
}

/**
 * Aggregates complete system telemetry across hardware, database, audio, visual, and performance.
 */
export async function getSystemTelemetry(options?: {
  repo?: JournalRepository | null;
}): Promise<SystemTelemetry> {
  const now = Date.now();
  const uptimeSeconds = Math.floor((now - appSessionStart) / 1000);

  // 1. Storage & Database Metrics
  let storageSupported = typeof navigator !== 'undefined' && 'storage' in navigator;
  let quotaBytes: number | undefined;
  let usageBytes: number | undefined;
  let usagePercentage: number | undefined;
  let persisted: boolean | undefined;

  if (storageSupported && navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      quotaBytes = estimate.quota;
      usageBytes = estimate.usage;
      if (quotaBytes && usageBytes) {
        usagePercentage = Math.round((usageBytes / quotaBytes) * 1000) / 10;
      }
      if (navigator.storage.persisted) {
        persisted = await navigator.storage.persisted();
      }
    } catch {
      // Gracefully ignore storage estimation errors
    }
  }

  let entriesCount = 0;
  let softDeletedCount = 0;
  let draftsCount = 0;
  let totalWords = 0;
  const moodBreakdown: Record<string, number> = {
    calm: 0,
    grateful: 0,
    reflective: 0,
    peaceful: 0,
    hopeful: 0,
  };

  if (options?.repo) {
    try {
      const activeEntries = await options.repo.listActiveEntries();
      entriesCount = activeEntries.length;

      for (const entry of activeEntries) {
        if (entry.mood && moodBreakdown[entry.mood] !== undefined) {
          moodBreakdown[entry.mood] += 1;
        }
        if (entry.body) {
          totalWords += entry.body.trim().split(/\s+/).filter(Boolean).length;
        }
      }

      // Check soft-deleted count if repository supports direct query
      if (typeof options.repo.getRawDb === 'function') {
        const db = options.repo.getRawDb();
        if (db) {
          const allEntries = await db.getAll('entries');
          softDeletedCount = allEntries.filter((e) => e.deletedAt !== null).length;
        }
      }

      // Check drafts
      const draft = await options.repo.getDraft(DEFAULT_DRAFT_ID);
      if (draft && (draft.title || draft.body)) {
        draftsCount = 1;
      }
    } catch {
      // Ignore database telemetry errors
    }
  }

  // 2. Performance Metrics
  const perf = typeof window !== 'undefined' && window.performance;
  let pageLoadTimeMs: number | undefined;
  let domInteractiveMs: number | undefined;
  let domCompleteMs: number | undefined;
  let firstPaintMs: number | undefined;
  let firstContentfulPaintMs: number | undefined;
  let transferSizeBytes: number | undefined;
  let resourcesCount: number | undefined;
  let memoryStats: { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number } | undefined;

  if (perf) {
    try {
      const navEntries = perf.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navEntries.length > 0) {
        const nav = navEntries[0];
        if (nav.loadEventEnd > 0) {
          pageLoadTimeMs = Math.round(nav.loadEventEnd - nav.startTime);
        }
        if (nav.domInteractive > 0) {
          domInteractiveMs = Math.round(nav.domInteractive);
        }
        if (nav.domComplete > 0) {
          domCompleteMs = Math.round(nav.domComplete);
        }
        if (nav.transferSize !== undefined) {
          transferSizeBytes = nav.transferSize;
        }
      }

      const paintEntries = perf.getEntriesByType('paint');
      for (const entry of paintEntries) {
        if (entry.name === 'first-paint') {
          firstPaintMs = Math.round(entry.startTime);
        } else if (entry.name === 'first-contentful-paint') {
          firstContentfulPaintMs = Math.round(entry.startTime);
        }
      }

      resourcesCount = perf.getEntriesByType('resource').length;

      const mem = (perf as any).memory;
      if (mem) {
        memoryStats = {
          usedJSHeapSize: mem.usedJSHeapSize,
          totalJSHeapSize: mem.totalJSHeapSize,
          jsHeapSizeLimit: mem.jsHeapSizeLimit,
        };
      }
    } catch {
      // Ignore performance retrieval errors
    }
  }

  // 3. Hardware & Device Metrics
  const isClient = typeof window !== 'undefined';
  const nav = isClient ? window.navigator : undefined;

  const device = {
    userAgent: nav?.userAgent || 'Node/SSR',
    screenResolution: isClient && window.screen ? `${window.screen.width}x${window.screen.height}` : 'N/A',
    viewport: isClient ? `${window.innerWidth}x${window.innerHeight}` : 'N/A',
    dpr: isClient ? window.devicePixelRatio || 1 : 1,
    hardwareConcurrency: nav?.hardwareConcurrency || 1,
    deviceMemoryGb: (nav as any)?.deviceMemory,
    isOnline: nav?.onLine ?? true,
    connectionType: (nav as any)?.connection?.effectiveType,
    prefersReducedMotion: isClient && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false,
  };

  // 4. Audio Engine Metrics
  const audioSupported = isClient && ('AudioContext' in window || 'webkitAudioContext' in window);
  const pianoTracksCount = ALL_HAVEN_AUDIO_TRACKS.filter((t) => t.category === 'piano').length;
  const ambientTracksCount = ALL_HAVEN_AUDIO_TRACKS.filter((t) => t.category === 'ambient').length;

  let currentVolume = 0.4;
  if (isClient && window.localStorage) {
    try {
      const volStr = window.localStorage.getItem('haven_volume');
      if (volStr) currentVolume = parseFloat(volStr);
    } catch {
      // Ignore
    }
  }

  // 5. Visuals & Shader Metrics
  let webgl2Supported = false;
  let rendererInfo: string | undefined;

  if (isClient) {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      if (gl) {
        webgl2Supported = true;
        const dbgExt = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbgExt) {
          rendererInfo = gl.getParameter(dbgExt.UNMASKED_RENDERER_WEBGL);
        } else {
          rendererInfo = gl.getParameter(gl.RENDERER) || 'Generic WebGL2 GPU';
        }
      }
    } catch {
      // Ignore WebGL detection error
    }
  }

  // 6. PWA & Offline Caches
  const serviceWorkerSupported = isClient && 'serviceWorker' in navigator;
  const serviceWorkerRegistered = Boolean(serviceWorkerSupported && navigator.serviceWorker?.controller);
  const cachesSupported = isClient && 'caches' in window;
  let cacheCount = 0;
  let cachedAssetsCount = 0;

  if (cachesSupported) {
    try {
      const keys = await caches.keys();
      cacheCount = keys.length;
      for (const k of keys) {
        const cache = await caches.open(k);
        const requests = await cache.keys();
        cachedAssetsCount += requests.length;
      }
    } catch {
      // Ignore cache inspection error
    }
  }

  // 7. Weather status from cache
  let weatherDetected = false;
  let weatherCondition: string | undefined;
  let weatherTemperature: number | undefined;
  let weatherDescriptionVi: string | undefined;
  let isCachedWeather = false;

  if (isClient && window.localStorage) {
    try {
      const cachedStr = window.localStorage.getItem('haven_weather_cache');
      if (cachedStr) {
        const parsed = JSON.parse(cachedStr);
        if (parsed.data) {
          weatherDetected = true;
          weatherCondition = parsed.data.condition;
          weatherTemperature = parsed.data.temperature;
          weatherDescriptionVi = parsed.data.descriptionVi;
          isCachedWeather = true;
        }
      }
    } catch {
      // Ignore
    }
  }

  // 8. User Analytics & Feedback
  const userAnalytics = await getUserAnalyticsSummary({ repo: options?.repo });

  return {
    timestamp: now,
    uptimeSeconds,
    storage: {
      supported: storageSupported,
      quotaBytes,
      usageBytes,
      usagePercentage,
      persisted,
      entriesCount,
      softDeletedCount,
      draftsCount,
      totalWords,
      moodBreakdown,
    },
    performance: {
      supported: Boolean(perf),
      pageLoadTimeMs,
      domInteractiveMs,
      domCompleteMs,
      firstPaintMs,
      firstContentfulPaintMs,
      transferSizeBytes,
      resourcesCount,
      memory: memoryStats,
    },
    device,
    audio: {
      supported: audioSupported,
      contextState: audioSupported ? 'ready' : 'unsupported',
      totalTracks: ALL_HAVEN_AUDIO_TRACKS.length,
      pianoTracksCount,
      ambientTracksCount,
      currentVolume,
    },
    visual: {
      webgl2Supported,
      rendererInfo,
      totalArtworks: ALL_HAVEN_ARTWORKS.length,
      activeMode: webgl2Supported ? 'shader' : 'static',
    },
    pwa: {
      serviceWorkerSupported,
      serviceWorkerRegistered,
      cachesSupported,
      cacheCount,
      cachedAssetsCount,
    },
    weather: {
      detected: weatherDetected,
      condition: weatherCondition,
      temperature: weatherTemperature,
      descriptionVi: weatherDescriptionVi,
      isCached: isCachedWeather,
    },
    events: getRecentEvents(25),
    userAnalytics,
  };
}

/**
 * Generate a complete, sanitized JSON diagnostic report for download.
 */
export function generateDiagnosticReport(telemetry: SystemTelemetry): string {
  const report = {
    reportType: 'haven-art-system-diagnostics',
    version: '1.0',
    generatedAt: new Date(telemetry.timestamp).toISOString(),
    telemetry,
  };

  return JSON.stringify(report, null, 2);
}

/**
 * Run database maintenance to purge deleted items older than windowMs.
 */
export async function runDatabasePurge(repo: JournalRepository, windowMs: number = 0): Promise<number> {
  if (!repo) return 0;
  const count = await repo.purgeExpiredDeletes(windowMs);
  logSystemEvent({
    level: 'success',
    category: 'db',
    message: `Đã dọn dẹp ${count} bài viết đã xóa trong CSDL`,
  });
  return count;
}

/**
 * Request persistent browser storage so browser will not evict IndexedDB under storage pressure.
 */
export async function requestStoragePersistence(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      logSystemEvent({
        level: isPersisted ? 'success' : 'warn',
        category: 'system',
        message: isPersisted
          ? 'Đã cấp quyền lưu trữ bền vững (Persistent Storage)'
          : 'Trình duyệt từ chối quyền lưu trữ bền vững',
      });
      return isPersisted;
    } catch (err: any) {
      logSystemEvent({
        level: 'error',
        category: 'system',
        message: `Lỗi yêu cầu lưu trữ: ${err?.message || err}`,
      });
      return false;
    }
  }
  return false;
}

/**
 * Clear all registered PWA caches.
 */
export async function clearAllPwaCaches(): Promise<number> {
  if (typeof window === 'undefined' || !('caches' in window)) return 0;
  try {
    const keys = await caches.keys();
    let cleared = 0;
    for (const key of keys) {
      const success = await caches.delete(key);
      if (success) cleared++;
    }
    logSystemEvent({
      level: 'success',
      category: 'network',
      message: `Đã làm sạch ${cleared} bộ nhớ đệm PWA`,
    });
    return cleared;
  } catch (err: any) {
    logSystemEvent({
      level: 'error',
      category: 'network',
      message: `Lỗi xóa cache: ${err?.message || err}`,
    });
    return 0;
  }
}

