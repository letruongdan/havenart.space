import { describe, it, expect } from 'vitest';
import { parseLocale, isValidLocale, DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/i18n/locale';

describe('Locale Utilities', () => {
  it('correctly parses supported locales regardless of case and whitespace', () => {
    expect(parseLocale('vi')).toBe('vi');
    expect(parseLocale('en')).toBe('en');
    expect(parseLocale('VI')).toBe('vi');
    expect(parseLocale('EN')).toBe('en');
    expect(parseLocale('  vi  ')).toBe('vi');
    expect(parseLocale('  en\n')).toBe('en');
  });

  it('returns null for unsupported strings and non-string inputs', () => {
    expect(parseLocale('fr')).toBeNull();
    expect(parseLocale('de')).toBeNull();
    expect(parseLocale('')).toBeNull();
    expect(parseLocale('   ')).toBeNull();
    expect(parseLocale(null)).toBeNull();
    expect(parseLocale(undefined)).toBeNull();
    expect(parseLocale(123)).toBeNull();
    expect(parseLocale({})).toBeNull();
  });

  it('validates locale types using isValidLocale predicate', () => {
    expect(isValidLocale('vi')).toBe(true);
    expect(isValidLocale('en')).toBe(true);
    expect(isValidLocale('fr')).toBe(false);
    expect(isValidLocale(null)).toBe(false);
    expect(isValidLocale(undefined)).toBe(false);
  });

  it('exposes correct default and supported locales list', () => {
    expect(DEFAULT_LOCALE).toBe('vi');
    expect(SUPPORTED_LOCALES).toEqual(['vi', 'en']);
  });
});
