/**
 * Haven Art - Service Worker Cache Policy & Precaching Rules
 *
 * Rules:
 * - HTML, CSS, JS, Fonts, and viewed images (/images/**) -> true
 * - Heavy Audio assets (/audio/**) -> false (never pre-cache to conserve user mobile data)
 * - Non-HTTP(S) or chrome-extension URLs -> false
 */

export const SHELL_CACHE_NAME = 'haven-shell-v1';
export const IMAGES_CACHE_NAME = 'haven-images-v1';

export const CORE_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/credits.json',
];

const AUDIO_EXTENSIONS_REGEX = /\.(mp3|ogg|wav|aac|flac|m4a|weba|opus)($|[?#])/i;
const IMAGE_EXTENSIONS_REGEX = /\.(webp|png|jpg|jpeg|svg|gif|ico|avif|bmp)($|[?#])/i;
const FONT_EXTENSIONS_REGEX = /\.(woff|woff2|ttf|otf|eot)($|[?#])/i;
const CODE_EXTENSIONS_REGEX = /\.(js|mjs|css|json)($|[?#])/i;

/**
 * Checks if a given URL is an audio asset that should not be cached in shell/asset caches.
 */
export function isAudioUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const path = url.split(/[?#]/)[0];
  return (
    path.startsWith('/audio/') ||
    path.includes('/audio/') ||
    AUDIO_EXTENSIONS_REGEX.test(url)
  );
}

/**
 * Checks if a given URL represents an image asset.
 */
export function isImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (isAudioUrl(url)) return false;
  const path = url.split(/[?#]/)[0];
  return (
    path.startsWith('/images/') ||
    path.startsWith('/icons/') ||
    IMAGE_EXTENSIONS_REGEX.test(url)
  );
}

/**
 * Evaluates whether a request URL qualifies for offline caching under Haven Art's policy.
 */
export function shouldCacheUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Reject unsupported / non-HTTP protocols
  if (
    url.startsWith('chrome-extension://') ||
    url.startsWith('moz-extension://') ||
    url.startsWith('file://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('javascript:') ||
    url.startsWith('about:') ||
    url.startsWith('ws://') ||
    url.startsWith('wss://')
  ) {
    return false;
  }

  let parsedUrl: URL | null = null;
  if (url.includes('://')) {
    try {
      parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return false;
      }
    } catch {
      return false;
    }
  }

  // Absolute or relative path normalization
  const pathname = parsedUrl ? parsedUrl.pathname : url.split(/[?#]/)[0];
  const fullUrl = parsedUrl ? parsedUrl.href : url;

  // 1. STRICT FORBID: Heavy audio assets must NEVER be cached to conserve user mobile data
  if (
    pathname.startsWith('/audio/') ||
    pathname.includes('/audio/') ||
    AUDIO_EXTENSIONS_REGEX.test(fullUrl)
  ) {
    return false;
  }

  // 2. Images (artworks, icons, backgrounds, external art)
  if (
    pathname.startsWith('/images/') ||
    pathname.startsWith('/icons/') ||
    IMAGE_EXTENSIONS_REGEX.test(fullUrl)
  ) {
    return true;
  }

  // 3. Core Shell routes and manifest
  if (
    pathname === '/' ||
    pathname === '' ||
    pathname.endsWith('.html') ||
    pathname.endsWith('.webmanifest') ||
    pathname.endsWith('manifest.json')
  ) {
    return true;
  }

  // 4. Stylesheets, JavaScript bundles, Fonts, and App JSON
  if (
    CODE_EXTENSIONS_REGEX.test(fullUrl) ||
    FONT_EXTENSIONS_REGEX.test(fullUrl) ||
    pathname.startsWith('/_astro/') ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/styles/') ||
    pathname.startsWith('/fonts/')
  ) {
    return true;
  }

  // 5. External CDN web fonts or stylesheets (e.g., Google Fonts)
  if (
    parsedUrl &&
    (parsedUrl.hostname.includes('googleapis.com') ||
      parsedUrl.hostname.includes('gstatic.com') ||
      parsedUrl.hostname.includes('cloudflare.com') ||
      parsedUrl.hostname.includes('cdnjs.com'))
  ) {
    return true;
  }

  return false;
}
