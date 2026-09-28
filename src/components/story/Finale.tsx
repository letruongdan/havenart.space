'use client';

/**
 * HavenArt — Finale Presentation & Invitation Component
 * Contract Version: havenart-contracts-1.1
 * References: docs/UX_STORYBOARD.md §8, docs/agents/CONTRACTS.md C05
 *
 * Local Criteria (W19):
 * - W19-AC3: CTA finale dùng anchor #contact từ contract; KHÔNG tạo section#contact thứ hai.
 * - Không fake channel links; tuân thủ ngữ nghĩa DOM và accessiblity.
 */

import React from 'react';
import type { ChapterCopy } from '@/types/story';

export interface FinaleProps {
  readonly copy: ChapterCopy;
  readonly contactCtaLabel?: string;
  readonly onContactClick?: () => void;
  readonly className?: string;
}

/**
 * Finale presentation block displayed at the journey's end (p=1.0).
 * Connects the narrative conclusion to the single unique contact section (#contact).
 */
export const Finale: React.FC<FinaleProps> = ({
  copy,
  contactCtaLabel = 'Liên hệ kiến trúc sư',
  onContactClick,
  className = '',
}) => {
  return (
    <div
      className={`finale-container flex flex-col items-center text-center max-w-2xl mx-auto px-6 py-12 ${className}`}
      aria-label={copy.title}
    >
      {copy.intention && (
        <span className="text-xs uppercase tracking-widest text-[#8b8276] mb-3 font-medium">
          {copy.intention}
        </span>
      )}
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-light text-[#22201e] tracking-tight leading-snug mb-4">
        {copy.title}
      </h2>
      <p className="text-sm md:text-base text-[#5c554b] leading-relaxed mb-8 max-w-xl">
        {copy.story}
      </p>

      {/* CTA strictly linking to existing #contact without creating duplicate id */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full">
        <a
          href="#contact"
          onClick={onContactClick}
          className="inline-flex items-center justify-center px-8 py-3.5 rounded-full text-sm font-medium tracking-wide bg-[#2e2924] text-[#f7f5f0] hover:bg-[#443e37] transition-colors focus:outline-none focus:ring-2 focus:ring-[#8b8276] focus:ring-offset-2 min-h-[44px] min-w-[200px]"
        >
          {contactCtaLabel}
        </a>
      </div>
    </div>
  );
};

export default Finale;
