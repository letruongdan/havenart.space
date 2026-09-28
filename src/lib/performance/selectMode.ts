/**
 * HavenArt — Experience Mode Selection & Fallback Logic
 * Contract Version: havenart-contracts-1.1
 * References: docs/ACCESSIBILITY_SPEC.md, docs/SCENE_ARCHITECTURE.md
 *
 * Local Criteria (W11):
 * - W11-AC1: prefers-reduced-motion và userStatic được kiểm tra trước khi import Three/R3F.
 * - W11-AC2: Decorative failure dùng proxy; core/context failure về static;
 *            cuộn xa trước khi sẵn sàng giữ static.
 */

import type { ExperienceMode } from '@/types/story';

export type StaticReason =
  | 'reduced-motion'
  | 'user'
  | 'unsupported'
  | 'load-error'
  | 'performance'
  | null;

export interface SelectModeInput {
  /** Hệ điều hành hoặc người dùng yêu cầu giảm chuyển động */
  readonly prefersReducedMotion: boolean;
  /** Người dùng chủ động chọn chế độ tĩnh */
  readonly userRequestedStatic?: boolean;
  /** Thiết bị và trình duyệt hỗ trợ WebGL (WebGL 1 hoặc WebGL 2) */
  readonly webglSupported: boolean;
  /** Lỗi nghiêm trọng khi tải shell hoặc core zone */
  readonly hasCoreLoadError?: boolean;
  /** GPU context bị mất (webglcontextlost) và không thể phục hồi */
  readonly hasContextLost?: boolean;
  /** Người dùng đã cuộn xa khỏi hero trước khi 3D tải xong (late-load guard) */
  readonly hasScrolledFarBeforeReady?: boolean;
  /** Tải core 3D hoàn tất */
  readonly isReady?: boolean;
}

export interface SelectModeResult {
  readonly mode: ExperienceMode;
  readonly staticReason: StaticReason;
}

/**
 * Ngưỡng cuộn (pixels) coi là đã cuộn xa khỏi phần mở đầu trang
 */
export const SCROLLED_FAR_THRESHOLD_PX = 300;

/**
 * Quyết định chế độ hiển thị (poster | loading | cinematic | static)
 * theo thứ tự ưu tiên nghiêm ngặt từ cao xuống thấp.
 */
export function selectMode(input: SelectModeInput): SelectModeResult {
  // 1. Accessibility: prefers-reduced-motion có độ ưu tiên cao nhất
  if (input.prefersReducedMotion) {
    return {
      mode: 'static',
      staticReason: 'reduced-motion',
    };
  }

  // 2. Lựa chọn chủ động của người dùng
  if (input.userRequestedStatic) {
    return {
      mode: 'static',
      staticReason: 'user',
    };
  }

  // 3. Khả năng phần cứng: Không hỗ trợ WebGL hoặc đã mất WebGL context
  if (!input.webglSupported || input.hasContextLost) {
    return {
      mode: 'static',
      staticReason: 'unsupported',
    };
  }

  // 4. Lỗi tải cốt lõi (Core/Shell failure)
  if (input.hasCoreLoadError) {
    return {
      mode: 'static',
      staticReason: 'load-error',
    };
  }

  // 5. Late-load guard: Người dùng đã cuộn xa trong khi core đang tải -> giữ bản đọc tĩnh
  if (input.hasScrolledFarBeforeReady && !input.isReady) {
    return {
      mode: 'static',
      staticReason: 'user',
    };
  }

  // 6. Trải nghiệm 3D: 'cinematic' khi sẵn sàng, 'loading' khi đang nạp tài nguyên
  if (input.isReady) {
    return {
      mode: 'cinematic',
      staticReason: null,
    };
  }

  return {
    mode: 'loading',
    staticReason: null,
  };
}

/**
 * Kiểm tra hỗ trợ WebGL trên môi trường client một cách an toàn.
 * Trả về false ngay lập tức trên SSR / Node.js.
 */
export function detectWebGlSupport(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

/**
 * Kiểm tra cài đặt prefers-reduced-motion từ hệ điều hành qua matchMedia.
 * Trả về false trên SSR / Node.js.
 */
export function detectReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Kiểm tra xem vị trí cuộn hiện tại có vượt quá ngưỡng cuộn xa hay không.
 */
export function isScrolledFar(scrollY: number, thresholdPx = SCROLLED_FAR_THRESHOLD_PX): boolean {
  return scrollY > thresholdPx;
}
