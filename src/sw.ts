import {
  SHELL_CACHE_NAME,
  IMAGES_CACHE_NAME,
  CORE_SHELL_ASSETS,
  shouldCacheUrl,
  isAudioUrl,
  isImageUrl,
} from './sw-policy';

export {
  SHELL_CACHE_NAME,
  IMAGES_CACHE_NAME,
  CORE_SHELL_ASSETS,
  shouldCacheUrl,
  isAudioUrl,
  isImageUrl,
};

export interface ExtendableEventLike {
  waitUntil(promise: Promise<unknown>): void;
}

export interface FetchEventLike {
  request: Request;
  respondWith(response: Promise<Response> | Response): void;
}

/**
 * Pre-caches essential shell assets on service worker installation.
 */
export async function handleInstall(
  event: ExtendableEventLike,
  cacheAssets: string[] = CORE_SHELL_ASSETS
): Promise<void> {
  const cachePromise = (async () => {
    const cache = await caches.open(SHELL_CACHE_NAME);
    const safeAssets = cacheAssets.filter((asset) => !isAudioUrl(asset));
    await cache.addAll(safeAssets);
  })();

  event.waitUntil(cachePromise);
  await cachePromise;
}

/**
 * Removes obsolete caches during service worker activation.
 */
export async function cleanupStaleCaches(
  validCaches: string[] = [SHELL_CACHE_NAME, IMAGES_CACHE_NAME]
): Promise<string[]> {
  const allCacheNames = await caches.keys();
  const deleted: string[] = [];

  for (const name of allCacheNames) {
    if (!validCaches.includes(name)) {
      await caches.delete(name);
      deleted.push(name);
    }
  }

  return deleted;
}

/**
 * Activates new service worker and clears stale caches.
 */
export async function handleActivate(
  event: ExtendableEventLike,
  validCaches: string[] = [SHELL_CACHE_NAME, IMAGES_CACHE_NAME]
): Promise<void> {
  const activatePromise = (async () => {
    await cleanupStaleCaches(validCaches);
  })();

  event.waitUntil(activatePromise);
  await activatePromise;
}

/**
 * Handles fetch events following selective caching rules:
 * - Audio: bypasses cache entirely (network-only)
 * - Images: Cache-first with network fallback and runtime caching
 * - Shell / Other eligible assets: Cache-first with network fallback
 * - Disallowed URLs: standard network fetch
 */
export async function handleFetch(request: Request): Promise<Response> {
  const url = request.url;

  // Never cache audio or non-cacheable resources
  if (!shouldCacheUrl(url) || isAudioUrl(url) || request.method !== 'GET') {
    return fetch(request);
  }

  // 1. Image caching strategy: Cache-First
  if (isImageUrl(url)) {
    const imagesCache = await caches.open(IMAGES_CACHE_NAME);
    const cachedResponse = await imagesCache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const networkResponse = await fetch(request);
      if (networkResponse && networkResponse.status === 200) {
        await imagesCache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch {
      return cachedResponse || new Response('Asset not available offline', { status: 504 });
    }
  }

  // 2. Shell & Assets caching strategy: Cache-First with Network Fallback
  const shellCache = await caches.open(SHELL_CACHE_NAME);
  const cachedResponse = await shellCache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      await shellCache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    if (request.mode === 'navigate') {
      const fallback = await shellCache.match('/index.html');
      if (fallback) return fallback;
    }
    throw err;
  }
}

/**
 * Storage Persistence Helper:
 * Requests persistent storage to prevent browser eviction of IndexedDB & caches.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    typeof navigator.storage.persist === 'function'
  ) {
    try {
      return await navigator.storage.persist();
    } catch (err) {
      console.warn('Storage persist request warning:', err);
      return false;
    }
  }
  return false;
}

/**
 * Checks whether persistent storage is granted.
 */
export async function isStoragePersisted(): Promise<boolean> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    typeof navigator.storage.persisted === 'function'
  ) {
    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Registers the Service Worker in a browser environment.
 */
export async function registerServiceWorker(
  swPath = '/sw.js'
): Promise<ServiceWorkerRegistration | null> {
  if (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator
  ) {
    try {
      const registration = await navigator.serviceWorker.register(swPath);
      return registration;
    } catch (err) {
      console.warn('Service worker registration failed:', err);
      return null;
    }
  }
  return null;
}

// Global scope listener attachment when executing inside a ServiceWorkerGlobalScope
if (
  typeof self !== 'undefined' &&
  typeof (self as unknown as { addEventListener?: unknown }).addEventListener === 'function' &&
  typeof (self as unknown as { importScripts?: unknown }).importScripts !== 'undefined'
) {
  const swSelf = self as unknown as {
    addEventListener: (type: string, listener: (event: unknown) => void) => void;
    skipWaiting: () => Promise<void>;
    clients: { claim: () => Promise<void> };
  };

  swSelf.addEventListener('install', (event: unknown) => {
    const installEvt = event as ExtendableEventLike;
    installEvt.waitUntil(handleInstall(installEvt).then(() => swSelf.skipWaiting()));
  });

  swSelf.addEventListener('activate', (event: unknown) => {
    const activateEvt = event as ExtendableEventLike;
    activateEvt.waitUntil(handleActivate(activateEvt).then(() => swSelf.clients.claim()));
  });

  swSelf.addEventListener('fetch', (event: unknown) => {
    const fetchEvt = event as FetchEventLike;
    fetchEvt.respondWith(handleFetch(fetchEvt.request));
  });
}
