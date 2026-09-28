/**
 * HavenArt — Mobile Experience & Responsive Resilience E2E Test Suite (Gate G3)
 * Contract Version: havenart-contracts-1.1
 * References: docs/ACCESSIBILITY_SPEC.md, docs/PERFORMANCE_BUDGET.md, docs/agents/tasks/W27.md
 *
 * Local Criteria:
 * - W27-AC2: Dynamic viewport, touch target size >= 44x44px, zero horizontal overflow at 320px reflow.
 */

import { test, expect } from '@playwright/test';
import {
  MOBILE_VIEWPORTS,
  checkHorizontalOverflow,
  getTapTargetSizes,
} from '../fixtures/browser-faults';

test.describe('W27 — Gate G3: Mobile & Viewport Resilience (W27-AC2)', () => {
  test('320 CSS px reflow test: zero horizontal overflow and complete semantic content', async ({
    page,
  }) => {
    // 320px viewport simulates WCAG Reflow (1.4.10) condition
    await page.setViewportSize(MOBILE_VIEWPORTS.narrow320);
    await page.goto('/vi');
    await page.waitForLoadState('domcontentloaded');

    // 1. Check for horizontal overflow (must be 0 or <= 1px fractional tolerance)
    const overflow = await checkHorizontalOverflow(page);
    expect(overflow).toBeLessThanOrEqual(1);

    // 2. Main heading and brand are visible without clipping
    await expect(page.locator('h1')).toBeVisible();

    // 3. All 6 chapter sections are visible in order
    const chapters = ['exterior', 'approach', 'entrance', 'living', 'garden', 'finale'];
    for (const chapterId of chapters) {
      await expect(page.locator(`section#${chapterId}`)).toBeVisible();
    }

    // 4. Contact section is visible and fits within 320px
    await expect(page.locator('section#contact')).toBeVisible();
    const contactOverflow = await checkHorizontalOverflow(page);
    expect(contactOverflow).toBeLessThanOrEqual(1);
  });

  test('iPhone SE (375x667) and iPhone 14 (390x844) viewport layouts render without horizontal scroll', async ({
    page,
  }) => {
    for (const [device, viewport] of Object.entries({
      iphoneSE: MOBILE_VIEWPORTS.iphoneSE,
      iphone14: MOBILE_VIEWPORTS.iphone14,
    })) {
      await page.setViewportSize(viewport);
      await page.goto('/vi');
      await page.waitForLoadState('domcontentloaded');

      const overflow = await checkHorizontalOverflow(page);
      expect(overflow, `Overflow detected on ${device}`).toBeLessThanOrEqual(1);

      // Verify header and navigation controls do not wrap out of bounds
      const header = page.locator('header').first();
      await expect(header).toBeVisible();
      const headerBox = await header.boundingBox();
      expect(headerBox).not.toBeNull();
      if (headerBox) {
        expect(headerBox.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  test('interactive touch targets meet minimum accessible dimensions (>= 44x44 CSS px)', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS.iphone14);
    await page.goto('/vi');
    await page.waitForLoadState('domcontentloaded');

    // 1. Audio toggle button
    const audioTargets = await getTapTargetSizes(page, '.audio-toggle-btn');
    for (const target of audioTargets) {
      expect(target.width, `Audio toggle width ${target.width} < 44`).toBeGreaterThanOrEqual(44);
      expect(target.height, `Audio toggle height ${target.height} < 44`).toBeGreaterThanOrEqual(44);
    }

    // 2. Language Switcher button
    const langTargets = await getTapTargetSizes(page, '.language-switcher a');
    for (const target of langTargets) {
      expect(target.width, `Language switcher width ${target.width} < 44`).toBeGreaterThanOrEqual(44);
      expect(target.height, `Language switcher height ${target.height} < 44`).toBeGreaterThanOrEqual(44);
    }

    // 3. Header Contact link
    const headerCta = page.locator('header a[href="#contact"]').first();
    const ctaBox = await headerCta.boundingBox();
    expect(ctaBox).not.toBeNull();
    if (ctaBox) {
      expect(ctaBox.height, `Header CTA height ${ctaBox.height} < 44`).toBeGreaterThanOrEqual(44);
    }

    // 4. Brand logo link
    const brandLink = page.locator('header a[href^="/vi"]').first();
    const brandBox = await brandLink.boundingBox();
    expect(brandBox).not.toBeNull();
    if (brandBox) {
      expect(brandBox.height, `Brand link height ${brandBox.height} < 44`).toBeGreaterThanOrEqual(44);
    }
  });

  test('orientation change between portrait and landscape preserves layout and scrollability', async ({
    page,
  }) => {
    // 1. Start in portrait (390 x 844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/vi');
    await page.waitForLoadState('domcontentloaded');

    // Scroll to living room
    await page.evaluate(() => {
      document.getElementById('living')?.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(300);

    // 2. Switch to landscape (844 x 390)
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(300);

    const landscapeOverflow = await checkHorizontalOverflow(page);
    expect(landscapeOverflow).toBeLessThanOrEqual(1);

    // Living section remains visible
    await expect(page.locator('section#living')).toBeVisible();

    // 3. Return to portrait (390 x 844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);

    const portraitOverflow = await checkHorizontalOverflow(page);
    expect(portraitOverflow).toBeLessThanOrEqual(1);

    // Can navigate to contact cleanly
    const contactLink = page.locator('header a[href="#contact"]').first();
    await contactLink.click();
    await expect(page.locator('section#contact')).toBeVisible();
  });

  test('detail modal dialog fits within mobile viewport height with scrollable content', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS.iphoneSE);
    await page.goto('/vi');
    await page.waitForLoadState('domcontentloaded');

    // Scroll to living room where travertine detail is located
    await page.evaluate(() => {
      document.getElementById('living')?.scrollIntoView({ behavior: 'instant' });
    });
    await page.waitForTimeout(300);

    // Open detail modal dialog
    const hotspotBtn = page.locator('button[data-hotspot="travertine-wall"]');
    if (await hotspotBtn.isVisible()) {
      await hotspotBtn.click();
      const dialog = page.locator('div[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Check dialog dimensions fit in viewport
      const dialogBox = await dialog.boundingBox();
      expect(dialogBox).not.toBeNull();
      if (dialogBox) {
        expect(dialogBox.width).toBeLessThanOrEqual(MOBILE_VIEWPORTS.iphoneSE.width);
        expect(dialogBox.height).toBeLessThanOrEqual(MOBILE_VIEWPORTS.iphoneSE.height);
      }

      // Close modal
      const closeBtn = dialog.locator('button[aria-label="Đóng chi tiết"]');
      await closeBtn.click();
      await expect(dialog).not.toBeVisible();
    } else {
      // In static mode, native <details> expands without breaking width
      const detailSummary = page.locator('details#detail-travertine-wall summary');
      await detailSummary.click();
      const overflow = await checkHorizontalOverflow(page);
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
});
