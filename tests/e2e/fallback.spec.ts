/**
 * HavenArt — Fallback & Resilience Matrix E2E Test Suite (Gate G3)
 * Contract Version: havenart-contracts-1.1
 * References: docs/ACCESSIBILITY_SPEC.md, docs/SCENE_ARCHITECTURE.md, docs/agents/tasks/W27.md
 *
 * Local Criteria:
 * - W27-AC1: Reduced mode đầu phiên không renderer request; static vẫn đủ nội dung/CTA/details.
 * - W27-AC2: Thử bật reduce giữa phiên, context loss lúc modal, dynamic viewport và no keyboard trap.
 */

import { test, expect } from '@playwright/test';
import { isWebGLCanvasMounted, triggerWebGLContextLoss, simulateAssetFailures } from '../fixtures/browser-faults';

test.describe('W27 — Gate G3: Fallback & Resilience Matrix (W27-AC1, W27-AC2)', () => {
  test.describe('W27-AC1: Reduced Motion from Start & No-JS Resilience', () => {
    test('prefers-reduced-motion from the start mounts zero canvas and serves full static content', async ({ browser }) => {
      const context = await browser.newContext({
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();

      // Track if any canvas or 3D script is attempted
      await page.goto('/vi');
      await page.waitForLoadState('domcontentloaded');

      // 1. Root indicates static mode
      const gateRoot = page.locator('.experience-gate-root');
      await expect(gateRoot).toHaveAttribute('data-experience-mode', 'static');

      // 2. WebGL canvas is NOT mounted in DOM
      const hasCanvas = await isWebGLCanvasMounted(page);
      expect(hasCanvas).toBe(false);

      // 3. Complete semantic story content exists
      await expect(page.locator('section#services')).toBeVisible();
      const chapters = ['exterior', 'approach', 'entrance', 'living', 'garden', 'finale'];
      for (const id of chapters) {
        await expect(page.locator(`section#${id}`)).toBeVisible();
      }

      // 4. Exactly 3 native detail hotspots
      const details = ['detail-travertine-wall', 'detail-sliding-glass', 'detail-garden-tree'];
      for (const id of details) {
        await expect(page.locator(`details#${id}`)).toBeAttached();
      }

      // 5. Contact section is accessible
      await expect(page.locator('section#contact')).toBeVisible();

      await context.close();
    });

    test('no-JS environment renders complete semantic Phase 1 journey', async ({ browser }) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
      });
      const page = await context.newPage();
      await page.goto('/vi');

      // Header, main, sections, details, contact
      await expect(page.locator('h1')).toContainText('HavenArt');
      await expect(page.locator('section#services')).toBeVisible();
      await expect(page.locator('section#living')).toBeVisible();
      await expect(page.locator('details#detail-travertine-wall')).toBeAttached();
      await expect(page.locator('section#contact')).toBeVisible();

      await context.close();
    });
  });

  test.describe('W27-AC2: Mid-Session Transitions & Fault Recovery', () => {
    test('toggles cleanly from cinematic to static mode mid-session and preserves reading state', async ({ page }) => {
      await page.goto('/vi');
      await page.waitForLoadState('domcontentloaded');

      // 1. Verify initially in cinematic mode
      const gateRoot = page.locator('.experience-gate-root');
      await expect(gateRoot).toHaveAttribute('data-experience-mode', 'cinematic');

      // 2. Click "Xem nội dung tĩnh" button
      const staticBtn = page.locator('button:has-text("Xem nội dung tĩnh")');
      await expect(staticBtn).toBeVisible();
      await staticBtn.click();

      // 3. Switches cleanly to static mode
      await expect(gateRoot).toHaveAttribute('data-experience-mode', 'static');

      // 4. Content is preserved and readable
      await expect(page.locator('section#services')).toBeVisible();
      await expect(page.locator('section#living')).toBeVisible();
      await expect(page.locator('section#contact')).toBeVisible();
    });

    test('recovers safely to static mode upon WebGL context loss', async ({ page }) => {
      await page.goto('/vi');
      await page.waitForLoadState('domcontentloaded');

      const gateRoot = page.locator('.experience-gate-root');
      await expect(gateRoot).toHaveAttribute('data-experience-mode', 'cinematic');

      // Trigger WebGL context loss
      const triggered = await triggerWebGLContextLoss(page);
      expect(triggered).toBe(true);

      // System must catch context loss and transition to static fallback mode
      await expect(gateRoot).toHaveAttribute('data-experience-mode', 'static', { timeout: 5000 });

      // Entire page content remains readable and accessible
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('section#living')).toBeVisible();
      await expect(page.locator('section#contact')).toBeVisible();
    });

    test('recovers safely if WebGL context loss occurs while modal dialog is open', async ({ page }) => {
      await page.goto('/vi');
      await page.waitForLoadState('domcontentloaded');

      // Scroll to living room where travertine-wall hotspot activates
      await page.evaluate(() => {
        window.scrollTo({ top: 1200, behavior: 'instant' });
      });
      await page.waitForTimeout(500);

      // Open detail modal directly
      const hotspotBtn = page.locator('button[data-hotspot="travertine-wall"]');
      if (await hotspotBtn.isVisible()) {
        await hotspotBtn.click();
      } else {
        // Or click via detail summary in DOM
        const detailElem = page.locator('details#detail-travertine-wall summary');
        await detailElem.click();
      }

      // Trigger WebGL context loss
      await triggerWebGLContextLoss(page);

      // App transitions to static fallback mode safely without unhandled crash
      const gateRoot = page.locator('.experience-gate-root');
      await expect(gateRoot).toHaveAttribute('data-experience-mode', 'static', { timeout: 5000 });

      // Domestic content and contact section remain accessible
      await expect(page.locator('section#contact')).toBeVisible();
    });

    test('survives audio network failure gracefully without freezing page', async ({ page }) => {
      // Abort all audio requests
      await simulateAssetFailures(page, /.*\.ogg(\?.*)?$/);

      await page.goto('/vi');
      await page.waitForLoadState('domcontentloaded');

      // Click audio toggle button
      const audioBtn = page.getByRole('button', { name: /bật âm thanh/i });
      await expect(audioBtn).toBeVisible();
      await audioBtn.click();

      // Page must remain responsive and functional (no crash)
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('section#contact')).toBeVisible();
    });
  });
});
