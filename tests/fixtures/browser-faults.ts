/**
 * HavenArt — Browser Fault Injection & Test Adapters (Gate G3)
 * Contract Version: havenart-contracts-1.1
 * References: docs/ACCESSIBILITY_SPEC.md, docs/PERFORMANCE_BUDGET.md, docs/CONTRACTS.md (C08)
 */

import type { Page } from '@playwright/test';

/**
 * Common mobile device viewport profiles for testing reflow and tap targets.
 */
export const MOBILE_VIEWPORTS = {
  narrow320: { width: 320, height: 568 }, // Minimum WCAG reflow test width
  iphoneSE: { width: 375, height: 667 },
  iphone14: { width: 390, height: 844 },
  pixel7: { width: 412, height: 915 },
  tabletPortrait: { width: 768, height: 1024 },
  tabletLandscape: { width: 1024, height: 768 },
} as const;

/**
 * Simulates a WebGL context loss event on the active Three.js/SceneCanvas canvas.
 */
export async function triggerWebGLContextLoss(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const canvas = document.querySelector('.scene-canvas, canvas') as HTMLCanvasElement | null;
    if (!canvas) return false;

    // Use WebGL extension to lose context if available, otherwise dispatch event
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');

    if (gl) {
      const ext = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context');
      if (ext) {
        ext.loseContext();
        return true;
      }
    }

    // Fallback: dispatch standard event
    const event = new Event('webglcontextlost', { bubbles: true, cancelable: true });
    canvas.dispatchEvent(event);
    return true;
  });
}

/**
 * Checks whether WebGL canvas is mounted in the DOM.
 */
export async function isWebGLCanvasMounted(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const canvas = document.querySelector('.scene-canvas, canvas');
    return canvas !== null;
  });
}

/**
 * Checks whether there is any horizontal page overflow (scrollWidth > innerWidth).
 */
export async function checkHorizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    return Math.max(0, docWidth - winWidth);
  });
}

/**
 * Collects bounding client rect of all interactive elements to check minimum touch targets.
 */
export async function getTapTargetSizes(page: Page, selector: string): Promise<Array<{ width: number; height: number; text: string }>> {
  return page.evaluate((sel) => {
    const elements = Array.from(document.querySelectorAll(sel));
    return elements.map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30),
      };
    });
  }, selector);
}

/**
 * Intercepts audio or 3D asset network requests to simulate server failure.
 */
export async function simulateAssetFailures(page: Page, pattern: RegExp | string): Promise<void> {
  await page.route(pattern, (route) => route.abort('failed'));
}
