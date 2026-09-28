/**
 * HavenArt — Unit Tests for Language Switcher Component
 * Contract Version: havenart-contracts-1.1
 * References: docs/I18N_SPEC.md, docs/ACCESSIBILITY_SPEC.md
 *
 * Local Criteria (W24):
 * - W24-AC1: Giữ chapter/local progress, #contact và mode; restore trước reveal canvas.
 * - W24-AC2: Snapshot stale/wrong schema/unknown chapter bỏ an toàn; no-JS anchor link.
 * - W24-AC3: Đóng modal để đổi locale hủy scroll restore cũ; không bật audio ở route mới.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { consumeLocaleHandoff } from '@/lib/i18n/navigationContext';

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

describe('W24: LanguageSwitcher Semantic HTML & Accessibility (W24-AC1, W24-AC2)', () => {
  it('renders accessible navigation link with min 44x44px touch target and target URL', () => {
    const html = renderToStaticMarkup(
      <LanguageSwitcher
        currentLocale="vi"
        activeChapterId="living"
        localProgress={0.4}
        mode="cinematic"
      />
    );

    expect(html).toContain('href="/en#living"');
    expect(html).toContain('aria-label="Chuyển sang tiếng Anh (Switch to English)"');
    expect(html).toContain('min-w-[44px]');
    expect(html).toContain('min-h-[44px]');
    expect(html).toContain('VI');
    expect(html).toContain('EN');
  });

  it('generates direct anchor to #contact when switcher is triggered at contact section', () => {
    const html = renderToStaticMarkup(
      <LanguageSwitcher
        currentLocale="en"
        activeChapterId="finale"
        targetAnchor="#contact"
      />
    );

    expect(html).toContain('href="/vi#contact"');
    expect(html).toContain('aria-label="Chuyển sang tiếng Việt (Switch to Vietnamese)"');
  });
});

describe('W24: LanguageSwitcher Handoff Dispatch & Modal Handling (W24-AC3)', () => {
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
    // Inject mock sessionStorage for test
    vi.stubGlobal('sessionStorage', mockStorage);
  });

  it('invokes onBeforeSwitch callback when clicked', () => {
    const onBeforeSwitch = vi.fn();

    const props = {
      currentLocale: 'vi' as const,
      activeChapterId: 'living' as const,
      localProgress: 0.55,
      mode: 'cinematic' as const,
      isModalOpen: true,
      onBeforeSwitch,
    };

    const renderedNav = LanguageSwitcher(props) as React.ReactElement<{
      children: React.ReactElement<{ onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void }>;
    }>;

    // Call onClick on the inner <a> element
    const mockEvent = {
      stopPropagation: vi.fn(),
      preventDefault: vi.fn(),
    } as unknown as React.MouseEvent<HTMLAnchorElement>;

    renderedNav.props.children.props.onClick(mockEvent);

    expect(onBeforeSwitch).toHaveBeenCalledTimes(1);
    expect(mockEvent.stopPropagation).toHaveBeenCalledTimes(1);

    // Verify handoff was stored in sessionStorage
    const handoff = consumeLocaleHandoff('en', mockStorage);
    expect(handoff).not.toBeNull();
    expect(handoff?.fromLocale).toBe('vi');
    expect(handoff?.toLocale).toBe('en');
    expect(handoff?.chapterId).toBe('living');
    expect(handoff?.localProgress).toBe(0.55);
    expect(handoff?.mode).toBe('cinematic');
  });
});
