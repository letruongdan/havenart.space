import {
  type SupportedLanguage,
  type TranslationSchema,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
} from './types';
import { TRANSLATIONS } from './translations';

export const LANGUAGE_STORAGE_KEY = 'haven_language';

const SUPPORTED_CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

/**
 * Reads user stored language preference from localStorage.
 */
export function getStoredLanguage(): SupportedLanguage | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLanguage | null;
    if (stored && SUPPORTED_CODES.has(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage read error
  }
  return null;
}

/**
 * Detects user language automatically:
 * 1. Stored user preference in localStorage (highest priority).
 * 2. Browser navigator.languages / navigator.language matching supported codes.
 * 3. Default fallback to English ('en').
 */
export function detectUserLanguage(): SupportedLanguage {
  const stored = getStoredLanguage();
  if (stored) {
    return stored;
  }

  if (typeof navigator !== 'undefined') {
    const rawList: string[] = [];
    if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
      rawList.push(...navigator.languages);
    }
    if (navigator.language) {
      rawList.push(navigator.language);
    }

    for (const raw of rawList) {
      if (!raw) continue;
      // Extract 2-letter prefix: 'vi-VN' -> 'vi', 'en-US' -> 'en', 'zh-CN' -> 'zh'
      const prefix = raw.toLowerCase().split(/[-_]/)[0] as SupportedLanguage;
      if (SUPPORTED_CODES.has(prefix)) {
        return prefix;
      }
    }
  }

  return DEFAULT_LANGUAGE;
}

/**
 * Persists user chosen language and updates document lang attribute.
 */
export function setStoredLanguage(lang: SupportedLanguage): void {
  if (!SUPPORTED_CODES.has(lang)) return;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Ignore
    }
  }

  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = lang;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('haven:language-change', { detail: lang })
    );
  }
}

/**
 * Retrieve translation dictionary for given language code.
 */
export function getTranslations(lang: SupportedLanguage = DEFAULT_LANGUAGE): TranslationSchema {
  return TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANGUAGE];
}

/**
 * Translates a dot-notated key (e.g. 'gate.enterButton' or 'moods.calm').
 */
export function t(
  path: string,
  lang: SupportedLanguage = DEFAULT_LANGUAGE
): string {
  const dict = getTranslations(lang);
  const fallbackDict = TRANSLATIONS[DEFAULT_LANGUAGE];

  const keys = path.split('.');
  let current: any = dict;
  let fallbackCurrent: any = fallbackDict;

  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      current = undefined;
    }

    if (fallbackCurrent && typeof fallbackCurrent === 'object' && k in fallbackCurrent) {
      fallbackCurrent = fallbackCurrent[k];
    } else {
      fallbackCurrent = undefined;
    }
  }

  if (typeof current === 'string') {
    return current;
  }

  if (typeof fallbackCurrent === 'string') {
    return fallbackCurrent;
  }

  return path;
}
