import { test, expect } from '@playwright/test';

test.describe('W25 — Gate G2: Full Phase 1 Journey Montage', () => {
  test.describe('W25-AC1: Single Runtime, Unified Montage & DOM Hierarchy', () => {
    test('renders full journey with single unique #contact and all chapters in /vi', async ({ page }) => {
      await page.goto('/vi');

      // 1. Single unique #contact across entire route
      const contactElements = page.locator('#contact');
      await expect(contactElements).toHaveCount(1);
      await expect(contactElements).toBeVisible();

      // 2. All 6 chapters exist in semantic DOM
      const chapters = ['exterior', 'approach', 'entrance', 'living', 'garden', 'finale'];
      for (const id of chapters) {
        await expect(page.locator(`section#${id}`)).toBeAttached();
      }

      // 3. Brand header and navigation controls
      const header = page.getByRole('banner');
      await expect(header).toBeVisible();
      await expect(page.getByRole('link', { name: 'HavenArt' })).toBeVisible();

      // 4. Opt-in audio toggle button exists in header
      const audioBtn = page.locator('.audio-toggle-btn');
      await expect(audioBtn).toBeVisible();
    });

    test('renders full journey with single unique #contact in English /en', async ({ page }) => {
      await page.goto('/en');

      const contactElements = page.locator('#contact');
      await expect(contactElements).toHaveCount(1);
      await expect(contactElements).toBeVisible();

      const chapters = ['exterior', 'approach', 'entrance', 'living', 'garden', 'finale'];
      for (const id of chapters) {
        await expect(page.locator(`section#${id}`)).toBeAttached();
      }
    });
  });

  test.describe('W25-AC2: Continuous Scroll Journey & Bidirectional Progression', () => {
    test('scrolls continuously through all chapters from exterior to finale and reverses smoothly', async ({ page }) => {
      await page.goto('/vi');
      await page.waitForTimeout(500);

      // Verify initial snapshot
      const initialSnapshot = await page.evaluate(() => {
        const rt = (window as unknown as { __havenart_runtime__?: { getSnapshot(): { rawScrollProgress: number; renderedStoryProgress: number; chapterId: string } } }).__havenart_runtime__;
        return rt ? rt.getSnapshot() : null;
      });

      expect(initialSnapshot).not.toBeNull();
      expect(initialSnapshot?.chapterId).toBe('exterior');
      expect(initialSnapshot?.renderedStoryProgress).toBeCloseTo(0, 1);

      // Scroll to mid-journey (living room area)
      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight * 0.55);
      });
      await page.waitForTimeout(600);

      const midSnapshot = await page.evaluate(() => {
        const rt = (window as unknown as { __havenart_runtime__?: { getSnapshot(): { rawScrollProgress: number; renderedStoryProgress: number; chapterId: string } } }).__havenart_runtime__;
        return rt ? rt.getSnapshot() : null;
      });

      expect(midSnapshot?.rawScrollProgress).toBeGreaterThan(0.3);
      expect(midSnapshot?.renderedStoryProgress).toBeGreaterThan(0.01);

      // Scroll to bottom (finale & contact)
      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      await page.waitForTimeout(600);

      const endSnapshot = await page.evaluate(() => {
        const rt = (window as unknown as { __havenart_runtime__?: { getSnapshot(): { rawScrollProgress: number; renderedStoryProgress: number; chapterId: string } } }).__havenart_runtime__;
        return rt ? rt.getSnapshot() : null;
      });

      expect(endSnapshot?.rawScrollProgress).toBe(1.0);
      expect(endSnapshot?.renderedStoryProgress).toBeGreaterThan(midSnapshot!.renderedStoryProgress);

      // Scroll reverse to top
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(600);

      const reverseSnapshot = await page.evaluate(() => {
        const rt = (window as unknown as { __havenart_runtime__?: { getSnapshot(): { rawScrollProgress: number; renderedStoryProgress: number; chapterId: string } } }).__havenart_runtime__;
        return rt ? rt.getSnapshot() : null;
      });

      expect(reverseSnapshot?.rawScrollProgress).toBe(0.0);
      expect(reverseSnapshot?.renderedStoryProgress).toBeLessThan(endSnapshot!.renderedStoryProgress);
    });

    test('respects prefers-reduced-motion by keeping WebGL unmounted while preserving all content', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await page.goto('/vi');
      await page.waitForTimeout(500);

      // Canvas element is NOT mounted
      const canvases = page.locator('canvas');
      expect(await canvases.count()).toBe(0);

      // All story sections and contact remain fully readable
      await expect(page.locator('section#exterior')).toBeVisible();
      await expect(page.locator('section#living')).toBeVisible();
      await expect(page.locator('section#garden')).toBeVisible();
      await expect(page.locator('section#finale')).toBeVisible();
      await expect(page.locator('#contact')).toBeVisible();

      await context.close();
    });

    test('toggles cleanly to static mode via UI button', async ({ page }) => {
      await page.goto('/vi');
      await page.waitForTimeout(500);

      const staticToggle = page.locator('.static-mode-control button');
      if (await staticToggle.isVisible()) {
        await staticToggle.click();
        await page.waitForTimeout(400);

        const canvases = page.locator('canvas');
        expect(await canvases.count()).toBe(0);

        await expect(page.locator('#contact')).toBeVisible();
      }
    });
  });
});
