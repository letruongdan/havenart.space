'use client';

/**
 * HavenArt — Brand Header Shell Component (Gate G2)
 * Contract Version: havenart-contracts-1.1
 * Constraints:
 * - Compact top bar that does not obstruct architectural views
 * - Minimum 44px tap targets for mobile usability (WCAG 2.2 AA)
 * - Clear focus rings for keyboard navigation
 * - Real anchor link to #contact
 * - Up to 2 font families (Serif for brand, Sans for UI)
 * - Integrated LanguageSwitcher (W24) & Opt-in Audio Control (W20)
 */

import React from 'react';
import Link from 'next/link';
import type { ChapterId, Dictionary, Locale, ExperienceMode } from '@/types/story';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export interface BrandHeaderProps {
  readonly locale: Locale;
  readonly copy: Dictionary;
  readonly activeChapterId?: ChapterId | null;
  readonly currentLocalProgress?: number;
  readonly currentMode?: ExperienceMode;
  readonly isAudioActive?: boolean;
  readonly onToggleAudio?: () => void;
  readonly onBeforeLanguageChange?: () => void;
}

export function BrandHeader({
  locale,
  copy,
  activeChapterId,
  currentLocalProgress,
  currentMode,
  isAudioActive = false,
  onToggleAudio,
  onBeforeLanguageChange,
}: BrandHeaderProps) {
  const activeChapterTitle = activeChapterId ? copy.chapters[activeChapterId]?.title : null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-md transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Brand identity & active chapter indicator */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <Link
            href={`/${locale}`}
            className="min-h-[44px] flex items-center font-serif text-lg sm:text-xl font-bold tracking-tight text-stone-900 hover:text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-900 rounded px-1 transition-colors"
          >
            {copy.brand.name}
          </Link>

          {activeChapterId && (
            <div className="hidden md:flex items-center space-x-2 text-xs text-stone-500 border-l border-stone-300 pl-3">
              <span className="font-mono uppercase tracking-wider text-stone-400">
                {activeChapterId}
              </span>
              <span className="text-stone-300">/</span>
              <span className="truncate max-w-[200px] text-stone-700 font-medium">
                {activeChapterTitle}
              </span>
            </div>
          )}
        </div>

        {/* Global Controls & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Opt-in Audio Control (W20, W25) */}
          {onToggleAudio && (
            <button
              type="button"
              onClick={onToggleAudio}
              className="audio-toggle-btn min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-2 rounded-md text-stone-700 hover:text-stone-950 hover:bg-stone-200/50 focus:outline-none focus:ring-2 focus:ring-stone-900 transition-colors"
              aria-label={isAudioActive ? copy.controls.muteSound : copy.controls.enableSound}
              aria-pressed={isAudioActive}
              title={isAudioActive ? copy.controls.muteSound : copy.controls.enableSound}
            >
              {isAudioActive ? (
                <svg
                  className="w-5 h-5 text-stone-900"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-stone-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                </svg>
              )}
            </button>
          )}

          {/* Quick CTA to #contact anchor */}
          <a
            href="#contact"
            className="min-h-[44px] px-3 sm:px-4 inline-flex items-center justify-center text-xs sm:text-sm font-medium text-stone-900 hover:text-stone-700 underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-stone-900 rounded transition-colors"
          >
            {copy.contact.cta}
          </a>

          {/* Integrated Accessible Language Switcher with Handoff (W24) */}
          <LanguageSwitcher
            currentLocale={locale}
            activeChapterId={activeChapterId ?? undefined}
            localProgress={currentLocalProgress}
            mode={currentMode}
            onBeforeSwitch={onBeforeLanguageChange}
          />
        </div>
      </div>
    </header>
  );
}

export default BrandHeader;
