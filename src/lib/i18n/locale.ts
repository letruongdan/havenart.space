/**
 * HavenArt — Locale Parsing and Utilities
 * Contract Version: havenart-contracts-1.1
 */

import type { Locale } from '@/types/story';

export const DEFAULT_LOCALE: Locale = 'vi';
export const SUPPORTED_LOCALES: readonly Locale[] = ['vi', 'en'] as const;

export function isValidLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (value === 'vi' || value === 'en');
}

export function parseLocale(value: unknown): Locale | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'vi') {
    return 'vi';
  }
  if (normalized === 'en') {
    return 'en';
  }
  return null;
}
