import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  type SupportedLanguage,
} from '../../src/lib/i18n/types';
import {
  detectUserLanguage,
  getStoredLanguage,
  setStoredLanguage,
  t,
  getTranslations,
} from '../../src/lib/i18n/store';
import { TRANSLATIONS } from '../../src/lib/i18n/translations';

describe('Internationalization (i18n) Subsystem', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Supported Languages Configuration', () => {
    it('sets English (en) as the default language', () => {
      expect(DEFAULT_LANGUAGE).toBe('en');
    });

    it('supports English, Vietnamese, Japanese, French, Korean, Chinese, German, Spanish', () => {
      const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
      expect(codes).toContain('en');
      expect(codes).toContain('vi');
      expect(codes).toContain('ja');
      expect(codes).toContain('fr');
      expect(codes).toContain('ko');
      expect(codes).toContain('zh');
      expect(codes).toContain('de');
      expect(codes).toContain('es');
    });
  });

  describe('Automatic Language Detection (detectUserLanguage)', () => {
    it('defaults to English when no storage and no browser languages match', () => {
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ru-RU', 'ru']);
      const lang = detectUserLanguage();
      expect(lang).toBe('en');
    });

    it('defaults to English when navigator.languages is empty', () => {
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue([]);
      vi.spyOn(navigator, 'language', 'get').mockReturnValue('');
      const lang = detectUserLanguage();
      expect(lang).toBe('en');
    });

    it('auto-detects Vietnamese when browser preferences include vi-VN', () => {
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['vi-VN', 'vi', 'en-US']);
      const lang = detectUserLanguage();
      expect(lang).toBe('vi');
    });

    it('auto-detects Japanese when browser preferences include ja-JP', () => {
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ja-JP', 'ja', 'en-US']);
      const lang = detectUserLanguage();
      expect(lang).toBe('ja');
    });

    it('auto-detects French when browser preferences include fr-FR', () => {
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR', 'fr']);
      const lang = detectUserLanguage();
      expect(lang).toBe('fr');
    });

    it('auto-detects Korean when browser preferences include ko-KR', () => {
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ko-KR', 'ko']);
      const lang = detectUserLanguage();
      expect(lang).toBe('ko');
    });

    it('auto-detects Chinese when browser preferences include zh-CN', () => {
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['zh-CN', 'zh']);
      const lang = detectUserLanguage();
      expect(lang).toBe('zh');
    });

    it('auto-detects German when browser preferences include de-DE', () => {
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['de-DE', 'de']);
      const lang = detectUserLanguage();
      expect(lang).toBe('de');
    });

    it('auto-detects Spanish when browser preferences include es-ES', () => {
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['es-ES', 'es']);
      const lang = detectUserLanguage();
      expect(lang).toBe('es');
    });

    it('respects stored user preference in localStorage over browser language', () => {
      // Browser says Japanese
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ja-JP', 'ja']);
      // User explicitly picked Vietnamese
      setStoredLanguage('vi');

      const detected = detectUserLanguage();
      expect(detected).toBe('vi');
    });
  });

  describe('Language Persistence', () => {
    it('saves and reads language preference from localStorage', () => {
      expect(getStoredLanguage()).toBeNull();
      setStoredLanguage('fr');
      expect(getStoredLanguage()).toBe('fr');
      expect(localStorage.getItem('haven_language')).toBe('fr');
    });
  });

  describe('Translation Completeness & Key Resolution', () => {
    const requiredKeys = [
      'gate.title',
      'gate.subtitle',
      'gate.enterButton',
      'dock.play',
      'dock.pause',
      'dock.writeJournal',
      'dock.journalList',
      'dock.zenMode',
      'write.title',
      'write.saveButton',
      'write.titlePlaceholder',
      'write.bodyPlaceholder',
      'journal.searchPlaceholder',
      'journal.timeline',
      'journal.today',
      'journal.yesterday',
      'moods.calm',
      'moods.grateful',
      'moods.reflective',
      'moods.peaceful',
      'moods.hopeful',
    ];

    it('provides all essential translation keys across all supported languages', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        const dict = getTranslations(lang.code);
        for (const key of requiredKeys) {
          const val = t(key as any, lang.code);
          expect(val).toBeDefined();
          expect(typeof val).toBe('string');
          expect(val.length).toBeGreaterThan(0);
          expect(val).not.toBe(key); // Must not return fallback raw key
        }
      }
    });

    it('resolves correct translated strings for specific languages', () => {
      expect(t('gate.enterButton', 'en')).toBe('Enter Haven');
      expect(t('gate.enterButton', 'vi')).toBe('Bước vào');
      expect(t('gate.enterButton', 'ja')).toBe('入る');
      expect(t('gate.enterButton', 'fr')).toBe('Entrer');
      expect(t('gate.enterButton', 'ko')).toBe('들어가기');
      expect(t('gate.enterButton', 'zh')).toBe('进入');
      expect(t('gate.enterButton', 'de')).toBe('Eintreten');
      expect(t('gate.enterButton', 'es')).toBe('Entrar');
    });
  });
});
