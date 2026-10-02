"use strict";
(() => {
  // src/sw-policy.ts
  var SHELL_CACHE_NAME = "haven-shell-v1";
  var IMAGES_CACHE_NAME = "haven-images-v1";
  var CORE_SHELL_ASSETS = [
    "/",
    "/index.html",
    "/manifest.webmanifest",
    "/favicon.svg",
    "/credits.json"
  ];
  var AUDIO_EXTENSIONS_REGEX = /\.(mp3|ogg|wav|aac|flac|m4a|weba|opus)($|[?#])/i;
  var IMAGE_EXTENSIONS_REGEX = /\.(webp|png|jpg|jpeg|svg|gif|ico|avif|bmp)($|[?#])/i;
  var FONT_EXTENSIONS_REGEX = /\.(woff|woff2|ttf|otf|eot)($|[?#])/i;
  var CODE_EXTENSIONS_REGEX = /\.(js|mjs|css|json)($|[?#])/i;
  function isAudioUrl(url) {
    if (!url || typeof url !== "string") return false;
    const path = url.split(/[?#]/)[0];
    return path.startsWith("/audio/") || path.includes("/audio/") || AUDIO_EXTENSIONS_REGEX.test(url);
  }
  function isImageUrl(url) {
    if (!url || typeof url !== "string") return false;
    if (isAudioUrl(url)) return false;
    const path = url.split(/[?#]/)[0];
    return path.startsWith("/images/") || path.startsWith("/icons/") || IMAGE_EXTENSIONS_REGEX.test(url);
  }
  function shouldCacheUrl(url) {
    if (!url || typeof url !== "string") {
      return false;
    }
    if (url.startsWith("chrome-extension://") || url.startsWith("moz-extension://") || url.startsWith("file://") || url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("javascript:") || url.startsWith("about:") || url.startsWith("ws://") || url.startsWith("wss://")) {
      return false;
    }
    let parsedUrl = null;
    if (url.includes("://")) {
      try {
        parsedUrl = new URL(url);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          return false;
        }
      } catch {
        return false;
      }
    }
    const pathname = parsedUrl ? parsedUrl.pathname : url.split(/[?#]/)[0];
    const fullUrl = parsedUrl ? parsedUrl.href : url;
    if (pathname.startsWith("/audio/") || pathname.includes("/audio/") || AUDIO_EXTENSIONS_REGEX.test(fullUrl)) {
      return false;
    }
    if (pathname.startsWith("/images/") || pathname.startsWith("/icons/") || IMAGE_EXTENSIONS_REGEX.test(fullUrl)) {
      return true;
    }
    if (pathname === "/" || pathname === "" || pathname.endsWith(".html") || pathname.endsWith(".webmanifest") || pathname.endsWith("manifest.json")) {
      return true;
    }
    if (CODE_EXTENSIONS_REGEX.test(fullUrl) || FONT_EXTENSIONS_REGEX.test(fullUrl) || pathname.startsWith("/_astro/") || pathname.startsWith("/assets/") || pathname.startsWith("/styles/") || pathname.startsWith("/fonts/")) {
      return true;
    }
    if (parsedUrl && (parsedUrl.hostname.includes("googleapis.com") || parsedUrl.hostname.includes("gstatic.com") || parsedUrl.hostname.includes("cloudflare.com") || parsedUrl.hostname.includes("cdnjs.com"))) {
      return true;
    }
    return false;
  }

  // src/sw.ts
  async function handleInstall(event, cacheAssets = CORE_SHELL_ASSETS) {
    const cachePromise = (async () => {
      const cache = await caches.open(SHELL_CACHE_NAME);
      const safeAssets = cacheAssets.filter((asset) => !isAudioUrl(asset));
      await cache.addAll(safeAssets);
    })();
    event.waitUntil(cachePromise);
    await cachePromise;
  }
  async function cleanupStaleCaches(validCaches = [SHELL_CACHE_NAME, IMAGES_CACHE_NAME]) {
    const allCacheNames = await caches.keys();
    const deleted = [];
    for (const name of allCacheNames) {
      if (!validCaches.includes(name)) {
        await caches.delete(name);
        deleted.push(name);
      }
    }
    return deleted;
  }
  async function handleActivate(event, validCaches = [SHELL_CACHE_NAME, IMAGES_CACHE_NAME]) {
    const activatePromise = (async () => {
      await cleanupStaleCaches(validCaches);
    })();
    event.waitUntil(activatePromise);
    await activatePromise;
  }
  async function handleFetch(request) {
    const url = request.url;
    if (!shouldCacheUrl(url) || isAudioUrl(url) || request.method !== "GET") {
      return fetch(request);
    }
    if (isImageUrl(url)) {
      const imagesCache = await caches.open(IMAGES_CACHE_NAME);
      const cachedResponse2 = await imagesCache.match(request);
      if (cachedResponse2) {
        return cachedResponse2;
      }
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          await imagesCache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        return cachedResponse2 || new Response("Asset not available offline", { status: 504 });
      }
    }
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
      if (request.mode === "navigate") {
        const fallback = await shellCache.match("/index.html");
        if (fallback) return fallback;
      }
      throw err;
    }
  }
  async function requestPersistentStorage() {
    if (typeof navigator !== "undefined" && navigator.storage && typeof navigator.storage.persist === "function") {
      try {
        return await navigator.storage.persist();
      } catch (err) {
        console.warn("Storage persist request warning:", err);
        return false;
      }
    }
    return false;
  }
  async function isStoragePersisted() {
    if (typeof navigator !== "undefined" && navigator.storage && typeof navigator.storage.persisted === "function") {
      try {
        return await navigator.storage.persisted();
      } catch {
        return false;
      }
    }
    return false;
  }
  async function registerServiceWorker(swPath = "/sw.js") {
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register(swPath);
        return registration;
      } catch (err) {
        console.warn("Service worker registration failed:", err);
        return null;
      }
    }
    return null;
  }
  if (typeof self !== "undefined" && typeof self.addEventListener === "function" && typeof self.importScripts !== "undefined") {
    const swSelf = self;
    swSelf.addEventListener("install", (event) => {
      const installEvt = event;
      installEvt.waitUntil(handleInstall(installEvt).then(() => swSelf.skipWaiting()));
    });
    swSelf.addEventListener("activate", (event) => {
      const activateEvt = event;
      activateEvt.waitUntil(handleActivate(activateEvt).then(() => swSelf.clients.claim()));
    });
    swSelf.addEventListener("fetch", (event) => {
      const fetchEvt = event;
      fetchEvt.respondWith(handleFetch(fetchEvt.request));
    });
  }
})();
