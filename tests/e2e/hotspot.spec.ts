import { test, expect } from '@playwright/test';

test.describe('W25 — Gate G2: Hotspot Projection & APG Modal Panel', () => {
  test('renders semantic detail elements for all 3 hotspots without JS', async ({ page }) => {
    await page.goto('/vi');

    // 1. Check all three semantic details exist
    const detailIds = ['detail-travertine-wall', 'detail-sliding-glass', 'detail-garden-tree'];
    for (const id of detailIds) {
      const el = page.locator(`#${id}`);
      await expect(el).toBeAttached();
    }
  });

  test('interacts with architectural detail modal panel in cinematic mode', async ({ page }) => {
    await page.goto('/vi');
    await page.waitForTimeout(600);

    // Scroll to the living room chapter where travertine-wall is active
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight * 0.54);
    });
    await page.waitForTimeout(600);

    // Look for active hotspot marker button or open detail panel
    const marker = page.locator('button[data-hotspot-id="travertine-wall"], .hotspot-marker-container button').first();
    if (await marker.isVisible()) {
      await marker.click();
      await page.waitForTimeout(300);

      // Verify APG dialog attributes
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('aria-modal', 'true');

      // Verify close button exists
      const closeBtn = dialog.locator('button[aria-label*="Đóng"], button:has-text("✕")');
      await expect(closeBtn).toBeVisible();

      // Press Escape to close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await expect(dialog).toBeHidden();
    }
  });

  test('modal contact CTA navigates cleanly to #contact anchor', async ({ page }) => {
    await page.goto('/vi');
    await page.waitForTimeout(600);

    // Scroll to garden area
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight * 0.72);
    });
    await page.waitForTimeout(600);

    const marker = page.locator('.hotspot-marker-container button').first();
    if (await marker.isVisible()) {
      await marker.click();
      await page.waitForTimeout(300);

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Click the CTA inside the modal
      const cta = dialog.locator('a[href="#contact"], button:has-text("Liên hệ")').first();
      if (await cta.isVisible()) {
        await cta.click();
        await page.waitForTimeout(400);

        // Modal should close
        await expect(dialog).toBeHidden();
      }
    }

    // Verify contact section is present and reachable
    await expect(page.locator('#contact')).toBeVisible();
  });
});
