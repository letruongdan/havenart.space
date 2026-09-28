/**
 * HavenArt — Unit Tests for Navigation Context & Locale Handoff
 * Contract Version: havenart-contracts-1.1
 * References: docs/I18N_SPEC.md, docs/agents/CONTRACTS.md (C08)
 *
 * Local Criteria (W24):
 * - W24-AC1: Giữ chapter/local progress, #contact và mode; restore trước reveal canvas.
 * - W24-AC2: Snapshot stale/wrong schema/unknown chapter bỏ an toàn; no PII; storage unavailable vẫn navigation dùng được.
 * - W24-AC3: Đóng modal để đổi locale hủy scroll restore cũ; không bật audio ở route mới; hard navigation/back-forward covered.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveLocaleHandoff,
  consumeLocaleHandoff,
  saveHistoryState,
  getHistoryState,
  isAllowedAnchor,
  getLocaleSwitchUrl,
  LOCALE_HANDOFF_KEY,
  LOCALE_HANDOFF_TTL_MS,
} from '@/lib/i18n/navigationContext';

class MockStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('W24: Locale Handoff Lifecycle (W24-AC1, W24-AC2)', () => {
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
  });

  it('saves and consumes locale handoff preserving chapter, progress, mode, and anchor', () => {
    const success = saveLocaleHandoff(
      {
        fromLocale: 'vi',
        toLocale: 'en',
        chapterId: 'living',
        localProgress: 0.65,
        mode: 'cinematic',
        targetAnchor: '#contact',
      },
      mockStorage
    );

    expect(success).toBe(true);

    const consumed = consumeLocaleHandoff('en', mockStorage);
    expect(consumed).not.toBeNull();
    expect(consumed?.schemaVersion).toBe(1);
    expect(consumed?.fromLocale).toBe('vi');
    expect(consumed?.toLocale).toBe('en');
    expect(consumed?.chapterId).toBe('living');
    expect(consumed?.localProgress).toBe(0.65);
    expect(consumed?.mode).toBe('cinematic');
    expect(consumed?.targetAnchor).toBe('#contact');

    // Consume-once semantics: second call must return null
    const secondCall = consumeLocaleHandoff('en', mockStorage);
    expect(secondCall).toBeNull();
    expect(mockStorage.getItem(LOCALE_HANDOFF_KEY)).toBeNull();
  });

  it('discards stale handoff snapshots exceeding 5 minutes TTL', () => {
    saveLocaleHandoff(
      {
        fromLocale: 'vi',
        toLocale: 'en',
        chapterId: 'garden',
        localProgress: 0.5,
        mode: 'cinematic',
      },
      mockStorage
    );

    // Advance time by 5 minutes + 1 second
    const simulatedNow = Date.now() + LOCALE_HANDOFF_TTL_MS + 1000;
    const consumed = consumeLocaleHandoff('en', mockStorage, simulatedNow);

    expect(consumed).toBeNull();
    expect(mockStorage.getItem(LOCALE_HANDOFF_KEY)).toBeNull();
  });

  it('discards handoffs when schema version or target locale mismatch', () => {
    saveLocaleHandoff(
      {
        fromLocale: 'vi',
        toLocale: 'en',
        chapterId: 'living',
        localProgress: 0.5,
        mode: 'cinematic',
      },
      mockStorage
    );

    // Expected locale is 'vi' but payload was for 'en'
    const consumedWrongLocale = consumeLocaleHandoff('vi', mockStorage);
    expect(consumedWrongLocale).toBeNull();

    // Corrupt schemaVersion
    mockStorage.setItem(
      LOCALE_HANDOFF_KEY,
      JSON.stringify({
        schemaVersion: 99,
        toLocale: 'en',
        chapterId: 'living',
        localProgress: 0.5,
        mode: 'cinematic',
        createdAtMs: Date.now(),
      })
    );
    expect(consumeLocaleHandoff('en', mockStorage)).toBeNull();
  });

  it('discards unknown chapters safely without crashing', () => {
    mockStorage.setItem(
      LOCALE_HANDOFF_KEY,
      JSON.stringify({
        schemaVersion: 1,
        fromLocale: 'vi',
        toLocale: 'en',
        chapterId: 'unknown-room-not-in-story',
        localProgress: 0.5,
        mode: 'cinematic',
        createdAtMs: Date.now(),
      })
    );

    expect(consumeLocaleHandoff('en', mockStorage)).toBeNull();
  });

  it('rejects malicious or arbitrary anchor URLs while allowing valid anchors', () => {
    expect(isAllowedAnchor('#contact')).toBe(true);
    expect(isAllowedAnchor('#living')).toBe(true);
    expect(isAllowedAnchor('#detail-travertine-wall')).toBe(true);
    expect(isAllowedAnchor(null)).toBe(true);

    expect(isAllowedAnchor('https://malicious-site.com')).toBe(false);
    expect(isAllowedAnchor('javascript:alert(1)')).toBe(false);
    expect(isAllowedAnchor('contact')).toBe(false); // missing #
  });

  it('fails safely when storage throws QuotaExceededError or is disabled', () => {
    const brokenStorage: Storage = {
      length: 0,
      clear: () => {},
      getItem: () => {
        throw new Error('SecurityError: storage disabled');
      },
      key: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };

    const saveResult = saveLocaleHandoff(
      {
        fromLocale: 'vi',
        toLocale: 'en',
        chapterId: 'living',
        localProgress: 0.5,
        mode: 'cinematic',
      },
      brokenStorage
    );
    expect(saveResult).toBe(false);

    const consumeResult = consumeLocaleHandoff('en', brokenStorage);
    expect(consumeResult).toBeNull();
  });
});

describe('W24: History State & Navigation URLs (W24-AC1, W24-AC3)', () => {
  it('namespaces history state under havenart without overwriting existing router keys', () => {
    let currentHistoryState: Record<string, unknown> = {
      __next_key: 'next-1234',
      existingData: true,
    };

    const mockHistory = {
      get state() {
        return currentHistoryState;
      },
      replaceState(newState: unknown) {
        currentHistoryState = newState as Record<string, unknown>;
      },
    } as unknown as History;

    saveHistoryState(
      {
        chapterId: 'entrance',
        localProgress: 0.35,
        mode: 'static',
        targetAnchor: '#entrance',
      },
      mockHistory
    );

    expect(mockHistory.state).toMatchObject({
      __next_key: 'next-1234',
      existingData: true,
      havenart: {
        chapterId: 'entrance',
        localProgress: 0.35,
        mode: 'static',
        targetAnchor: '#entrance',
      },
    });

    const retrieved = getHistoryState(mockHistory);
    expect(retrieved).toEqual({
      chapterId: 'entrance',
      localProgress: 0.35,
      mode: 'static',
      targetAnchor: '#entrance',
    });
  });

  it('builds valid anchor destination URLs for no-JS fallback resilience', () => {
    expect(getLocaleSwitchUrl('en', 'living')).toBe('/en#living');
    expect(getLocaleSwitchUrl('vi', 'garden')).toBe('/vi#garden');
    expect(getLocaleSwitchUrl('en', 'living', '#contact')).toBe('/en#contact');
    expect(getLocaleSwitchUrl('vi')).toBe('/vi');
  });
});
