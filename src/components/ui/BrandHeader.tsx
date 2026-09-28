/**
 * HavenArt — Brand Header Shell Component
 * Contract Version: havenart-contracts-1.1
 * Constraints:
 * - Compact top bar that does not obstruct architectural views
 * - Minimum 44px tap targets for mobile usability
 * - Clear focus rings for keyboard navigation (WCAG 2.2 AA)
 * - Real anchor link to #contact
 * - Up to 2 font families (Serif for brand, Sans for UI)
 */

import React from 'react';
import Link from 'next/link';
import type { ChapterId, Dictionary, Locale } from '@/types/story';

export interface BrandHeaderProps {
  readonly locale: Locale;
  readonly copy: Dictionary;
  readonly activeChapterId?: ChapterId | null;
}

export function BrandHeader({ locale, copy, activeChapterId }: BrandHeaderProps) {
  const altLocale: Locale = locale === 'vi' ? 'en' : 'vi';
  const altLocaleLabel = locale === 'vi' ? 'English' : 'Tiếng Việt';

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
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Quick CTA to #contact anchor */}
          <a
            href="#contact"
            className="min-h-[44px] px-3 sm:px-4 inline-flex items-center justify-center text-xs sm:text-sm font-medium text-stone-900 hover:text-stone-700 underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-stone-900 rounded transition-colors"
          >
            {copy.contact.cta}
          </a>

          {/* Locale switcher link */}
          <Link
            href={`/${altLocale}`}
            hrefLang={altLocale}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-xs sm:text-sm font-semibold text-stone-700 hover:text-stone-950 px-2 py-1 border border-stone-300 rounded hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 transition-colors"
            aria-label={`${copy.navigation.languageLabel}: ${altLocaleLabel}`}
          >
            {altLocale === 'vi' ? 'VI' : 'EN'}
          </Link>
        </div>
      </div>
    </header>
  );
}
