'use client';

/**
 * HavenArt — Interactive Hotspot Marker Button
 * Contract Version: havenart-contracts-1.1
 * References: docs/HOTSPOT_SPEC.md, docs/ACCESSIBILITY_SPEC.md
 *
 * Local Criteria (W17):
 * - W17-AC1: Button/keyboard/touch mở cùng dialog; touch target >= 44x44px.
 * - W17-AC3: Marker tương thích anchor W02/W10.
 */

import React from 'react';
import type { HotspotId } from '@/types/story';

export interface HotspotButtonProps {
  readonly id: HotspotId;
  readonly screenX: number;
  readonly screenY: number;
  readonly visible: boolean;
  readonly title: string;
  readonly triggerLabel: string;
  readonly categoryLabel: string;
  readonly isOpen: boolean;
  readonly onClick: () => void;
  readonly onFocus?: () => void;
  readonly className?: string;
}

export const HotspotButton: React.FC<HotspotButtonProps> = ({
  id,
  screenX,
  screenY,
  visible,
  title,
  triggerLabel,
  categoryLabel,
  isOpen,
  onClick,
  onFocus,
  className = '',
}) => {
  if (!visible) {
    return null;
  }

  const ariaLabel = triggerLabel || `${title} (${categoryLabel})`;

  return (
    <div
      className={`hotspot-marker-container absolute z-20 pointer-events-auto transition-opacity duration-300 ${className}`}
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        transform: 'translate(-50%, -50%)',
      }}
      data-hotspot-id={id}
    >
      <button
        type="button"
        className="group relative flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 bg-transparent cursor-pointer"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="hotspot-panel"
        aria-label={ariaLabel}
        onClick={onClick}
        onFocus={onFocus}
      >
        {/* Animated pulse halo */}
        <span
          className="absolute inset-2 rounded-full bg-primary/20 animate-ping pointer-events-none"
          aria-hidden="true"
        />

        {/* Outer boundary ring */}
        <span
          className="absolute w-8 h-8 rounded-full border border-primary/40 bg-background/80 backdrop-blur-sm shadow-md transition-transform duration-200 group-hover:scale-110 group-focus-visible:scale-110"
          aria-hidden="true"
        />

        {/* Central accent core dot */}
        <span
          className="relative w-3 h-3 rounded-full bg-primary shadow-sm transition-colors duration-200 group-hover:bg-primary/90"
          aria-hidden="true"
        />

        {/* Hover/focus tooltip bubble */}
        <span
          className="absolute left-1/2 -top-8 -translate-x-1/2 px-2.5 py-1 text-xs font-medium text-foreground bg-surface/90 backdrop-blur-md rounded shadow-lg border border-border opacity-0 pointer-events-none transition-opacity duration-200 whitespace-nowrap group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden="true"
        >
          {title}
        </span>
      </button>
    </div>
  );
};

export default HotspotButton;
