'use client';

/**
 * HavenArt — Architectural Detail Modal Panel
 * Contract Version: havenart-contracts-1.1
 * References: docs/HOTSPOT_SPEC.md, docs/ACCESSIBILITY_SPEC.md
 *
 * Local Criteria (W17):
 * - W17-AC1: Button/keyboard/touch mở cùng dialog; Escape/backdrop/focus restore, không modal lồng.
 * - W17-AC2: Freeze snapshot khi mở; đóng lúc raw xa rendered không teleport; CTA hủy old restore.
 */

import React, { useEffect, useRef } from 'react';
import type { HotspotId } from '@/types/story';
import type { FreezeToken, StoryRuntime } from '@/types/runtime';

export interface HotspotCopyData {
  readonly title: string;
  readonly categoryLabel: string;
  readonly description: string;
  readonly rationale: string;
  readonly insight: string;
  readonly triggerLabel: string;
}

export interface HotspotPanelProps {
  readonly isOpen: boolean;
  readonly hotspotId: HotspotId | null;
  readonly copy: HotspotCopyData | null;
  readonly onClose: () => void;
  readonly onContactCta?: () => void;
  readonly closeLabel?: string;
  readonly contactCtaLabel?: string;
  readonly runtime?: StoryRuntime | null;
  readonly returnFocusRef?: React.RefObject<HTMLElement | null>;
}

export const HotspotPanel: React.FC<HotspotPanelProps> = ({
  isOpen,
  hotspotId,
  copy,
  onClose,
  onContactCta,
  closeLabel = 'Đóng chi tiết',
  contactCtaLabel = 'Liên hệ kiến trúc sư về giải pháp này',
  runtime,
  returnFocusRef,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const tokenRef = useRef<FreezeToken | null>(null);
  const isMouseDownOnBackdropRef = useRef<boolean>(false);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // 1. Freeze lifecycle and background scroll lock (W17-AC2)
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Capture currently focused element for restoration if returnFocusRef is absent
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      previousActiveElementRef.current = document.activeElement;
    }

    // Freeze story runtime snapshot (W17-AC2)
    const currentScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    if (runtime && !tokenRef.current) {
      tokenRef.current = runtime.freeze(currentScrollY);
    }

    // Lock background scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button initially
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, runtime]);

  // Helper function to cleanly close with runtime resume & focus restoration
  const handleClose = React.useCallback(
    (reason: 'close' | 'navigate') => {
      // Resume runtime if token exists (W17-AC2)
      if (runtime && tokenRef.current) {
        runtime.resume(tokenRef.current, reason);
        tokenRef.current = null;
      }

      onClose();

      // Focus restoration prioritizing triggering button, then DOM anchor (W17-AC1)
      setTimeout(() => {
        if (returnFocusRef?.current && document.contains(returnFocusRef.current)) {
          returnFocusRef.current.focus();
        } else if (
          previousActiveElementRef.current &&
          document.contains(previousActiveElementRef.current)
        ) {
          previousActiveElementRef.current.focus();
        } else if (hotspotId) {
          const fallbackAnchor = document.getElementById(`detail-${hotspotId}`);
          fallbackAnchor?.focus();
        }
      }, 50);
    },
    [runtime, onClose, returnFocusRef, hotspotId]
  );

  // 2. Keyboard handling (Escape & Focus Trap) (W17-AC1)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose('close');
        return;
      }

      if (event.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const focusableElements = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  const handleContactClick = () => {
    // CTA navigation cancels old restore to prevent snapping back (W17-AC2)
    handleClose('navigate');
    onContactCta?.();
  };

  if (!isOpen || !copy) {
    return null;
  }

  return (
    <div
      id="hotspot-panel"
      className="hotspot-modal-backdrop fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm p-4 sm:p-6 transition-opacity duration-300"
      onMouseDown={(e) => {
        isMouseDownOnBackdropRef.current = e.target === e.currentTarget;
      }}
      onMouseUp={(e) => {
        // Only close if click started and ended on backdrop (HOTSPOT_SPEC section 5)
        if (isMouseDownOnBackdropRef.current && e.target === e.currentTarget) {
          handleClose('close');
        }
        isMouseDownOnBackdropRef.current = false;
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hotspot-dialog-title"
        aria-describedby="hotspot-dialog-desc"
        className="hotspot-dialog-container relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-surface p-6 sm:p-8 shadow-2xl border border-border text-foreground transition-all duration-300 transform scale-100"
      >
        {/* Header with category label and close button */}
        <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-4">
          <div>
            <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary mb-1">
              {copy.categoryLabel}
            </span>
            <h2
              id="hotspot-dialog-title"
              className="font-serif text-2xl sm:text-3xl font-normal leading-tight text-foreground"
            >
              {copy.title}
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className="flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 -mt-2 p-2 rounded-full text-foreground/70 hover:text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors cursor-pointer"
            aria-label={closeLabel}
            onClick={() => handleClose('close')}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content body */}
        <div className="space-y-6 pt-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Mô tả chi tiết
            </h3>
            <p id="hotspot-dialog-desc" className="text-base text-foreground/90 leading-relaxed">
              {copy.description}
            </p>
          </section>

          <section className="bg-muted/40 rounded-xl p-4 border border-border/30">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
              Lý do thiết kế
            </h3>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {copy.rationale}
            </p>
          </section>

          {copy.insight && (
            <section className="bg-surface-tint/20 rounded-xl p-4 border border-primary/20">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-accent mb-1">
                Lưu ý kiến trúc
              </h3>
              <p className="text-sm text-foreground/80 leading-relaxed italic">
                {copy.insight}
              </p>
            </section>
          )}

          {/* Action CTA leading directly to contact anchor */}
          <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row gap-3">
            <a
              href="#contact"
              className="btn btn-primary w-full text-center py-3 px-5 rounded-full font-medium transition-colors"
              onClick={handleContactClick}
            >
              {contactCtaLabel}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotspotPanel;
