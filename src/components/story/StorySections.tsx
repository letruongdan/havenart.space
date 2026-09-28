/**
 * HavenArt — Semantic Story Sections Component
 * Contract Version: havenart-contracts-1.1
 * Note: Pure semantic DOM representation for all 6 Phase 1 chapters,
 * services philosophy, 3 hotspot details, and final contact section.
 * Renders cleanly with zero JavaScript hydration.
 */

import React from 'react';
import type { ContactConfig, Dictionary, StoryChapter } from '@/types/story';
import { ContactSection } from '@/components/ui/ContactSection';

export interface StorySectionsProps {
  readonly chapters: readonly StoryChapter[];
  readonly copy: Dictionary;
  readonly contacts: ContactConfig;
}

export function StorySections({ chapters, copy, contacts }: StorySectionsProps) {
  const isVi = copy.navigation.languageLabel.toLowerCase().includes('ngôn ngữ');

  const labels = {
    intention: isVi ? 'Ý đồ thiết kế' : 'Design intention',
    principles: isVi ? 'Nguyên tắc không gian' : 'Spatial principles',
    materials: isVi ? 'Vật liệu & Ánh sáng' : 'Materials & Light',
    rationale: isVi ? 'Lý do thiết kế' : 'Design rationale',
    insight: isVi ? 'Điểm lưu ý' : 'Spatial insight',
  };

  return (
    <div className="space-y-16">
      {/* Brand Hero & Positioning */}
      <header className="py-20 px-6 max-w-4xl mx-auto text-center border-b border-stone-200">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-stone-900 tracking-tight mb-4">
          {copy.brand.name} — {copy.brand.tagline}
        </h1>
        <p className="text-xl sm:text-2xl text-stone-600 font-light max-w-2xl mx-auto mb-6 leading-relaxed">
          {copy.brand.supporting}
        </p>
        <span className="inline-block text-xs uppercase tracking-widest text-stone-500 bg-stone-100 border border-stone-200 px-3 py-1 rounded">
          {copy.brand.conceptLabel}
        </span>
      </header>

      {/* Services & Architectural Approach */}
      <section
        id="services"
        aria-labelledby="services-heading"
        className="py-12 px-6 max-w-4xl mx-auto bg-stone-100/50 rounded-xl border border-stone-200"
      >
        <h2 id="services-heading" className="text-2xl sm:text-3xl font-serif text-stone-900 mb-4">
          {copy.services.title}
        </h2>
        <p className="text-stone-700 leading-relaxed text-base sm:text-lg">
          {copy.services.description}
        </p>
      </section>

      {/* 6 Story Chapters */}
      <div className="space-y-24 max-w-4xl mx-auto px-6">
        {chapters.map((chapter) => {
          const chapterCopy = copy.chapters[chapter.id];

          return (
            <section
              key={chapter.id}
              id={chapter.id}
              aria-labelledby={`chapter-${chapter.id}-heading`}
              className="scroll-mt-20 border-b border-stone-200 pb-16 last:border-b-0"
            >
              <div className="mb-6">
                <span className="text-xs font-mono uppercase tracking-widest text-stone-500 block mb-2">
                  Chapter — {chapter.slug}
                </span>
                <h2
                  id={`chapter-${chapter.id}-heading`}
                  className="text-3xl sm:text-4xl font-serif text-stone-900 mb-4"
                >
                  {chapterCopy.title}
                </h2>
                <p className="text-lg sm:text-xl text-stone-700 leading-relaxed font-light">
                  {chapterCopy.story}
                </p>
              </div>

              {/* Spatial Attributes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8 bg-stone-50 p-6 rounded-lg border border-stone-200/80">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-700 mb-2">
                    {labels.intention}
                  </h3>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {chapterCopy.intention}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-700 mb-2">
                    {labels.principles}
                  </h3>
                  <ul className="text-sm text-stone-600 space-y-1 list-disc pl-4">
                    {chapterCopy.principles.map((principle, idx) => (
                      <li key={idx}>{principle}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-700 mb-2">
                    {labels.materials}
                  </h3>
                  <p className="text-sm text-stone-600 leading-relaxed mb-2">
                    {chapterCopy.materials}
                  </p>
                  <p className="text-xs text-stone-500 italic">
                    {chapterCopy.light}
                  </p>
                </div>
              </div>

              {/* Native Hotspot Details (if any in this chapter) */}
              {chapter.hotspotIds.length > 0 && (
                <div className="my-8 space-y-4">
                  {chapter.hotspotIds.map((hotspotId) => {
                    const hotspotCopy = copy.hotspots[hotspotId];

                    return (
                      <details
                        key={hotspotId}
                        id={`detail-${hotspotId}`}
                        className="group border border-stone-200 bg-white rounded-lg p-4 transition-colors"
                      >
                        <summary className="cursor-pointer font-medium text-stone-900 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-stone-900 rounded p-1">
                          <span>
                            {hotspotCopy.title}
                            <span className="ml-2 text-xs font-normal text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                              {hotspotCopy.categoryLabel}
                            </span>
                          </span>
                          <span className="text-xs text-stone-400 group-open:rotate-180 transition-transform">
                            ▼
                          </span>
                        </summary>

                        <div className="mt-4 pt-4 border-t border-stone-100 text-sm text-stone-600 space-y-2">
                          <p className="font-normal text-stone-800">
                            {hotspotCopy.description}
                          </p>
                          <p>
                            <strong className="text-stone-700 font-medium">
                              {labels.rationale}:{' '}
                            </strong>
                            {hotspotCopy.rationale}
                          </p>
                          <p>
                            <strong className="text-stone-700 font-medium">
                              {labels.insight}:{' '}
                            </strong>
                            {hotspotCopy.insight}
                          </p>
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}

              {/* In-chapter CTA */}
              <div className="mt-8 pt-4">
                <a
                  href="#contact"
                  className="inline-flex items-center text-sm font-semibold text-stone-900 hover:text-stone-700 underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-stone-900 rounded"
                >
                  {copy.contact.cta} →
                </a>
              </div>
            </section>
          );
        })}
      </div>

      {/* Semantic Contact Section (Only single id="contact" on page) */}
      <ContactSection copy={copy.contact} contacts={contacts} />
    </div>
  );
}
