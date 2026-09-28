/**
 * HavenArt — Story Overlay Component
 * Contract Version: havenart-contracts-1.1
 * Constraints:
 * - Purely reactive presentation component: receives activeChapterId and copy via props
 * - NEVER reads window.scrollY, listens to scroll events, or creates a store (W07-AC3)
 * - Presents one central idea per scene with clean Vietnamese diacritics (W07-AC1)
 * - Non-obstructive layout: positioned in safe corner/dock with pass-through events so 3D architecture remains visible (W07-AC2)
 * - Accessible keyboard focus, minimum 44px touch targets on mobile (W07-AC2)
 */

import React from 'react';
import type { ChapterId, Dictionary, Locale } from '@/types/story';

export interface StoryOverlayProps {
  readonly locale?: Locale;
  readonly activeChapterId: ChapterId | null;
  readonly copy: Dictionary;
}

export function StoryOverlay({ locale = 'vi', activeChapterId, copy }: StoryOverlayProps) {
  if (!activeChapterId) {
    return null;
  }

  const chapterCopy = copy.chapters[activeChapterId];
  if (!chapterCopy) {
    return null;
  }

  const isVi = locale === 'vi';
  const chapterNumberMap: Record<ChapterId, string> = {
    exterior: '01',
    approach: '02',
    entrance: '03',
    living: '04',
    garden: '05',
    finale: '06',
  };

  const chapterNum = chapterNumberMap[activeChapterId] || '01';

  return (
    <aside
      aria-label={`${isVi ? 'Không gian' : 'Scene'}: ${chapterCopy.title}`}
      className="pointer-events-none fixed bottom-6 left-4 sm:left-6 z-30 max-w-[calc(100vw-2rem)] sm:max-w-md md:max-w-lg"
    >
      <div className="pointer-events-auto rounded-xl border border-stone-200/90 bg-stone-50/90 backdrop-blur-md p-5 sm:p-6 shadow-xl text-stone-900 transition-all duration-300">
        {/* Chapter numbering & slug */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-mono font-semibold tracking-widest uppercase text-stone-500">
            {chapterNum} / {activeChapterId}
          </span>
          <span className="text-stone-400 text-[11px] font-medium uppercase tracking-wider">
            HavenArt
          </span>
        </div>

        {/* Central scene title (One primary idea per scene) */}
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight leading-snug mb-2">
          {chapterCopy.title}
        </h2>

        {/* Story copy */}
        <p className="text-sm sm:text-base text-stone-700 leading-relaxed font-light mb-4 line-clamp-3 sm:line-clamp-none">
          {chapterCopy.story}
        </p>

        {/* Intention excerpt */}
        <div className="border-t border-stone-200/80 pt-3 flex items-center justify-between gap-4">
          <p className="text-xs text-stone-500 italic truncate max-w-[240px] sm:max-w-[300px]">
            {chapterCopy.intention}
          </p>

          <a
            href="#contact"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-xs font-semibold text-stone-900 hover:text-stone-700 underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-stone-900 rounded shrink-0 transition-colors"
          >
            {copy.contact.cta} →
          </a>
        </div>
      </div>
    </aside>
  );
}
