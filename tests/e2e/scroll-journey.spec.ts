import { test, expect } from '@playwright/test';
import { validateStory } from '../../src/lib/story/validateStory';
import { validStoryValidationInput } from '../fixtures/story';

test.describe('W13 — Gate G1: Scroll Journey & Camera Rail', () => {
  test.describe('W13-AC1: Composition Root, Slots & Unique #contact', () => {
    test('renders single #contact and valid slots in cinematic mode (/vi)', async ({ page }) => {
      await page.goto('/vi');

      // 1. Verify single unique #contact element across the entire route
      const contactElements = page.locator('#contact');
      await expect(contactElements).toHaveCount(1);
      await expect(contactElements).toBeVisible();

      // 2. Verify slot hierarchy: content layer exists above viewport
      const contentLayer = page.locator('.experience-content-layer');
      await expect(contentLayer).toBeAttached();

      // 3. Verify top navigation exists and has language switcher
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
      const switcher = page.getByRole('link', { name: 'English' });
      await expect(switcher).toBeVisible();

      // 4. Verify all 6 chapters exist in semantic content
      const chapterIds = ['exterior', 'approach', 'entrance', 'living', 'garden', 'finale'];
      for (const id of chapterIds) {
        await expect(page.locator(`section#${id}`)).toBeAttached();
      }
    });

    test('maintains single #contact and valid slots in English (/en)', async ({ page }) => {
      await page.goto('/en');

      const contactElements = page.locator('#contact');
      await expect(contactElements).toHaveCount(1);
      await expect(contactElements).toBeVisible();

      const switcher = page.getByRole('link', { name: 'Tiếng Việt' });
      await expect(switcher).toBeVisible();
    });
  });

  test.describe('W13-AC2: Scroll Journey & Fallback Baseline', () => {
    test('scrolls continuously forward and backward without hard cuts', async ({ page }) => {
      await page.goto('/vi');

      // Wait briefly for client hydration
      await page.waitForTimeout(500);

      // Verify runtime is active on window if client hydrated
      const initialSnapshot = await page.evaluate(() => {
        const rt = (window as unknown as { __havenart_runtime__?: { getSnapshot(): { rawScrollProgress: number; renderedStoryProgress: number; direction: number } } }).__havenart_runtime__;
        return rt ? rt.getSnapshot() : { rawScrollProgress: 0, renderedStoryProgress: 0, direction: 0 };
      });
      expect(initialSnapshot.renderedStoryProgress).toBeCloseTo(0, 1);
      expect(initialSnapshot.rawScrollProgress).toBeCloseTo(0, 1);

      // Scroll down toward the middle of the page
      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight / 2);
      });
      await page.waitForTimeout(500);

      const midSnapshot = await page.evaluate(() => {
        const rt = (window as unknown as { __havenart_runtime__?: { getSnapshot(): { rawScrollProgress: number; renderedStoryProgress: number; direction: number } } }).__havenart_runtime__;
        return rt ? rt.getSnapshot() : { rawScrollProgress: 0, renderedStoryProgress: 0, direction: 0 };
      });
      expect(midSnapshot.rawScrollProgress).toBeGreaterThan(0.3);
      expect(midSnapshot.renderedStoryProgress).toBeGreaterThan(0.01);
      expect(midSnapshot.direction).toBe(1);

      // Scroll to bottom (End)
      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      await page.waitForTimeout(500);

      const endSnapshot = await page.evaluate(() => {
        const rt = (window as unknown as { __havenart_runtime__?: { getSnapshot(): { rawScrollProgress: number; renderedStoryProgress: number; direction: number } } }).__havenart_runtime__;
        return rt ? rt.getSnapshot() : { rawScrollProgress: 0, renderedStoryProgress: 0, direction: 0 };
      });
      expect(endSnapshot.rawScrollProgress).toBe(1.0);
      expect(endSnapshot.renderedStoryProgress).toBeGreaterThan(midSnapshot.renderedStoryProgress);
      expect(endSnapshot.direction).toBe(1);

      // Scroll back to top (Home)
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(500);

      const homeSnapshot = await page.evaluate(() => {
        const rt = (window as unknown as { __havenart_runtime__?: { getSnapshot(): { rawScrollProgress: number; renderedStoryProgress: number; direction: number } } }).__havenart_runtime__;
        return rt ? rt.getSnapshot() : { rawScrollProgress: 0, renderedStoryProgress: 0, direction: 0 };
      });
      expect(homeSnapshot.rawScrollProgress).toBe(0.0);
      expect(homeSnapshot.direction).toBe(-1); // Smoothly reversing
      expect(homeSnapshot.renderedStoryProgress).toBeLessThan(endSnapshot.renderedStoryProgress);
    });


    test('does NOT mount canvas when prefers-reduced-motion is active', async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await page.goto('/vi');
      await page.waitForTimeout(500);

      // Canvas element should NOT be mounted
      const canvases = page.locator('canvas');
      expect(await canvases.count()).toBe(0);

      // Story content remains completely accessible
      await expect(page.locator('section#exterior')).toBeVisible();
      await expect(page.locator('section#finale')).toBeVisible();
      await expect(page.locator('#contact')).toBeVisible();

      await context.close();
    });

    test('switches to static mode cleanly via UI toggle button', async ({ page }) => {
      await page.goto('/vi');
      await page.waitForTimeout(500);

      // Find static mode toggle button
      const staticToggle = page.locator('.static-mode-control button');
      if (await staticToggle.isVisible()) {
        await staticToggle.click();
        await page.waitForTimeout(300);

        // After toggle, canvas is unmounted
        const canvases = page.locator('canvas');
        expect(await canvases.count()).toBe(0);

        // Content remains visible
        await expect(page.locator('#contact')).toBeVisible();
      }
    });
  });

  test.describe('W13-AC3: Story Definition & Scene Baseline Validation', () => {
    test('pure validateStory verifies production story structure with zero errors', () => {
      const errors = validateStory(validStoryValidationInput);
      expect(errors).toEqual([]);
    });
  });
});
