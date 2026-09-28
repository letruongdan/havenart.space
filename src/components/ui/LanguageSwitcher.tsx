'use client';

/**
 * HavenArt — Accessible Language Switcher Component
 * Contract Version: havenart-contracts-1.1
 * References: docs/I18N_SPEC.md, docs/ACCESSIBILITY_SPEC.md
 *
 * Local Criteria (W24):
 * - W24-AC1: Giữ chapter/local progress, #contact và mode qua locale handoff.
 * - W24-AC2: Link anchor chuẩn HTML khi không có JS.
 * - W24-AC3: Đóng modal để đổi locale hủy scroll restore cũ; không tự bật audio ở route mới.
 */

import React from 'react';
import type { Locale, ChapterId, ExperienceMode } from '@/types/story';
import {
  saveLocaleHandoff,
  getLocaleSwitchUrl,
} from '@/lib/i18n/navigationContext';

export interface LanguageSwitcherProps {
  readonly currentLocale: Locale;
  readonly activeChapterId?: ChapterId;
  readonly localProgress?: number;
  readonly mode?: ExperienceMode;
  readonly targetAnchor?: string | null;
  readonly isModalOpen?: boolean;
  readonly onBeforeSwitch?: () => void;
  readonly className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  currentLocale,
  activeChapterId = 'exterior',
  localProgress = 0,
  mode = 'cinematic',
  targetAnchor = null,
  isModalOpen = false,
  onBeforeSwitch,
  className = '',
}) => {
  const targetLocale: Locale = currentLocale === 'vi' ? 'en' : 'vi';
  const targetUrl = getLocaleSwitchUrl(targetLocale, activeChapterId, targetAnchor);

  const ariaLabel =
    targetLocale === 'en'
      ? 'Chuyển sang tiếng Anh (Switch to English)'
      : 'Chuyển sang tiếng Việt (Switch to Vietnamese)';

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Notify consumer / close open modal with navigate semantics (W24-AC3)
    onBeforeSwitch?.();

    // Persist single-use handoff snapshot in sessionStorage before page navigation (W24-AC1)
    saveLocaleHandoff({
      fromLocale: currentLocale,
      toLocale: targetLocale,
      chapterId: activeChapterId,
      localProgress,
      mode,
      targetAnchor,
    });

    // Native navigation will proceed to targetUrl (or SPA router if intercepted).
    // Note: Audio is NOT initialized or carried over to the new route (W24-AC3).
    if (isModalOpen) {
      // Allow link navigation to happen cleanly
      event.stopPropagation();
    }
  };

  return (
    <nav
      aria-label="Language navigation"
      className={`language-switcher inline-flex items-center gap-1 text-sm font-medium ${className}`}
    >
      <a
        href={targetUrl}
        onClick={handleClick}
        aria-label={ariaLabel}
        className="flex items-center justify-center min-w-[44px] min-h-[44px] px-3 py-1.5 rounded-full border border-border/60 bg-surface/70 hover:bg-surface hover:border-border text-foreground transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 cursor-pointer shadow-sm backdrop-blur-sm"
      >
        <span
          className={`px-1 font-semibold ${
            currentLocale === 'vi' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-hidden={currentLocale !== 'vi'}
        >
          VI
        </span>
        <span className="text-border/80 select-none" aria-hidden="true">
          /
        </span>
        <span
          className={`px-1 font-semibold ${
            currentLocale === 'en' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-hidden={currentLocale !== 'en'}
        >
          EN
        </span>
      </a>
    </nav>
  );
};

export default LanguageSwitcher;
