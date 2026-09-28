import { test, expect } from '@playwright/test';

test.describe('W25 — Gate G2: Bilingual Navigation & Locale Restoration', () => {
  test('switches language from Vietnamese (/vi) to English (/en) and back', async ({ page }) => {
    // 1. Start on Vietnamese route
    await page.goto('/vi');
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');

    const viTitle = page.locator('h1');
    await expect(viTitle).toContainText('HavenArt');

    // 2. Click language switcher link to EN
    const switcherToEn = page.locator('.language-switcher-link, a[href*="/en"]').first();
    await expect(switcherToEn).toBeVisible();
    await switcherToEn.click();

    // 3. Verify page is now on English route
    await expect(page).toHaveURL(/\/en/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // 4. Verify English copy
    await expect(page.locator('#services-heading')).toContainText('Residential Architecture Direction');

    // 5. Click language switcher link to VI
    const switcherToVi = page.locator('.language-switcher-link, a[href*="/vi"]').first();
    await expect(switcherToVi).toBeVisible();
    await switcherToVi.click();

    // 6. Verify back to Vietnamese route
    await expect(page).toHaveURL(/\/vi/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect(page.locator('#services-heading')).toContainText('Định hướng thiết kế nhà ở');
  });

  test('preserves valid semantic hierarchy in both locales', async ({ page }) => {
    for (const locale of ['vi', 'en']) {
      await page.goto(`/${locale}`);

      // Exactly one h1 per page
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);

      // Section headings are h2
      const h2Count = await page.locator('h2').count();
      expect(h2Count).toBeGreaterThan(5);

      // Single unique #contact
      const contactCount = await page.locator('#contact').count();
      expect(contactCount).toBe(1);
    }
  });
});
