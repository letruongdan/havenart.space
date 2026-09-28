import { test, expect } from '@playwright/test';

test.describe('W25 — Gate G2: Opt-in Ambient Audio Controller', () => {
  test('audio button is opt-in and does not auto-play on initial page load', async ({ page }) => {
    await page.goto('/vi');

    const audioBtn = page.locator('.audio-toggle-btn');
    await expect(audioBtn).toBeVisible();

    // Check initially not pressed
    await expect(audioBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(audioBtn).toHaveAttribute('aria-label', /bật âm thanh|enable sound/i);
  });

  test('toggles audio on and off cleanly via user gesture', async ({ page }) => {
    await page.goto('/vi');
    await page.waitForTimeout(500);

    const audioBtn = page.locator('.audio-toggle-btn');
    await expect(audioBtn).toBeVisible();

    // Click to enable audio
    await audioBtn.click();
    await page.waitForTimeout(400);

    // Audio button transitions to active
    await expect(audioBtn).toHaveAttribute('aria-pressed', 'true');

    // Click again to mute/disable audio
    await audioBtn.click();
    await page.waitForTimeout(300);

    await expect(audioBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('audio button works similarly in English /en route', async ({ page }) => {
    await page.goto('/en');

    const audioBtn = page.locator('.audio-toggle-btn');
    await expect(audioBtn).toBeVisible();
    await expect(audioBtn).toHaveAttribute('aria-pressed', 'false');

    await audioBtn.click();
    await page.waitForTimeout(300);

    await expect(audioBtn).toHaveAttribute('aria-pressed', 'true');
  });
});
