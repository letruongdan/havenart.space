'use client';

/**
 * HavenArt — Semantic Detail List (HTML Equivalent)
 * Contract Version: havenart-contracts-1.1
 * References: docs/HOTSPOT_SPEC.md (Section 7), docs/ACCESSIBILITY_SPEC.md
 *
 * Local Criteria (W17):
 * - W17-AC3: Cả ba chi tiết có DOM anchor (detail-{id}) và nội dung semantic tương đương.
 *   Hoạt động không cần JavaScript, kết nối tới duy nhất một #contact anchor.
 */

import React from 'react';
import type { Hotspot, HotspotId } from '@/types/story';
import type { HotspotCopyData } from './HotspotPanel';

export interface DetailListProps {
  readonly hotspots: readonly Hotspot[];
  readonly copy: Record<HotspotId, HotspotCopyData>;
  readonly activeHotspotId?: HotspotId | null;
  readonly onSelectHotspot?: (id: HotspotId) => void;
  readonly contactCtaLabel?: string;
  readonly className?: string;
}

export const DetailList: React.FC<DetailListProps> = ({
  hotspots,
  copy,
  activeHotspotId,
  onSelectHotspot,
  contactCtaLabel = 'Liên hệ kiến trúc sư về giải pháp này',
  className = '',
}) => {
  return (
    <div
      className={`detail-list-semantic space-y-6 ${className}`}
      aria-label="Danh mục chi tiết kiến trúc giải thích"
    >
      {hotspots.map((hotspot) => {
        const itemCopy = copy[hotspot.id];
        if (!itemCopy) return null;

        const isHighlighted = activeHotspotId === hotspot.id;

        return (
          <article
            key={hotspot.id}
            id={`detail-${hotspot.id}`}
            tabIndex={-1}
            className={`detail-item-card rounded-2xl border p-6 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isHighlighted
                ? 'bg-muted/80 border-primary shadow-lg ring-1 ring-primary/20'
                : 'bg-surface border-border/50 shadow-sm hover:border-border'
            }`}
            data-hotspot-id={hotspot.id}
            data-room={hotspot.room}
          >
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-3">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary">
                {itemCopy.categoryLabel}
              </span>
              <span className="text-xs text-muted-foreground">
                Chương: <strong className="capitalize">{hotspot.room}</strong>
              </span>
            </div>

            <h3 className="font-serif text-xl sm:text-2xl font-normal text-foreground mb-3">
              {itemCopy.title}
            </h3>

            <p className="text-foreground/90 leading-relaxed mb-4">
              {itemCopy.description}
            </p>

            <div className="bg-muted/30 rounded-xl p-4 border border-border/30 mb-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
                Lý do thiết kế
              </h4>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {itemCopy.rationale}
              </p>

              {itemCopy.insight && (
                <div className="pt-2 border-t border-border/20">
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-accent mb-1">
                    Lưu ý kiến trúc
                  </h5>
                  <p className="text-sm text-foreground/80 leading-relaxed italic">
                    {itemCopy.insight}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {onSelectHotspot && (
                <button
                  type="button"
                  className="text-sm font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded py-1 px-2 cursor-pointer"
                  onClick={() => onSelectHotspot(hotspot.id)}
                >
                  {itemCopy.triggerLabel}
                </button>
              )}

              <a
                href="#contact"
                className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline ml-auto"
              >
                {contactCtaLabel} &rarr;
              </a>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default DetailList;
