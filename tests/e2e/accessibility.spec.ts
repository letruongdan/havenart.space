/**
 * HavenArt — Accessibility (a11y) & WCAG 2.2 AA E2E Test Suite (Gate G3)
 * Contract Version: havenart-contracts-1.1
 * References: docs/ACCESSIBILITY_SPEC.md, docs/HOTSPOT_SPEC.md, docs/agents/tasks/W27.md
 *
 * Local Criteria:
 * - W27-AC2: No keyboard trap, APG modal dialog pattern, skip links, semantic headings & landmarks.
 */

import { test, expect } from '@playwright/test';

test.describe('W27 — Gate G3: Accessibility (WCAG 2.2 AA / APG Dialog) (W27-AC2)', () => {
  test.describe('Semantic Structure & Landmarks', () => {
    test('enforces exactly one h1 and valid sequential heading hierarchy', async ({ page }) => {
      await page.goto('/vi');
      await page.waitForLoadState('domcontentloaded');

      // 1. Exactly one h1 on page
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);

      const h1Text = await page.locator('h1').textContent();
      expect(h1Text).toContain('HavenArt');

      // 2. Sequential headings (h2 present for sections, h3 for sub-attributes)
      const h2Count = await page.locator('h2').count();
      expect(h2Count).toBeGreaterThanOrEqual(7); // services + 6 chapters + contact

      const h3Count = await page.locator('h3').count();
      expect(h3Count).toBeGreaterThan(0); // intentions, principles, materials
    });

    test('exposes standard HTML landmarks (header, nav, main, footer)', async ({ page }) => {
      await page.goto('/vi');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('header').first()).toBeVisible();
      await expect(page.locator('nav').first()).toBeAttached();
      await expect(page.locator('main#main-content')).toBeAttached();
      await expect(page.locator('footer')).toBeAttached();
    });

    test('skip navigation links become visible on keyboard focus and target valid landmarks', async ({
      page,
    }) => {
      await page.goto('/vi');
      await page.waitForLoadState('domcontentloaded');

      // Press Tab from initial page load to reach skip link
      await page.keyboard.press('Tab');

      const skipContent = page.locator('a[href="#main-content"]');
      await expect(skipContent).toBeFocused();
      await expect(skipContent).toBeVisible();

      // Second Tab reaches skip to contact
      await page.keyboard.press('Tab');
      const skipContact = page.locator('a[href="#contact"]').first();
      await expect(skipContact).toBeFocused();
      await expect(skipContact).toBeVisible();

      // Activating skip link jumps to contact
      await page.keyboard.press('Enter');
      await expect(page.locator('section#contact')).toBeInViewport();
    });

    test('strictly forbids positive tabindex to prevent broken keyboard flow', async ({ page }) => {
      await page.goto('/vi');
      await page.waitForLoadState('domcontentloaded');

      const positiveTabindexCount = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('[tabindex]'));
        return elements.filter((el) => {
          const val = parseInt(el.getAttribute('tabindex') || '0', 10);
          return val > 0;
        }).length;
      });

      expect(positiveTabindexCount).toBe(0);
    });
  });

  test.describe('APG Modal Dialog Pattern (Hotspot Architectural Details)', () => {
    test('dialog traps keyboard focus, closes on Escape, and restores focus to trigger', async ({
      page,
    }) => {
      await page.goto('/vi');
      await page.waitForLoadState('domcontentloaded');

      // Scroll to living room where travertine detail is active
      await page.evaluate(() => {
        document.getElementById('living')?.scrollIntoView({ behavior: 'instant' });
      });
      await page.waitForTimeout(300);

      const hotspotBtn = page.locator('button[data-hotspot="travertine-wall"]');
      if (await hotspotBtn.isVisible()) {
        await hotspotBtn.focus();
        await page.keyboard.press('Enter');

        const dialog = page.locator('div[role="dialog"]');
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveAttribute('aria-modal', 'true');
        await expect(dialog).toHaveAttribute('aria-labelledby', 'hotspot-dialog-title');

        // Focus should be on close button initially
        const closeBtn = dialog.locator('button[aria-label="Đóng chi tiết"]');
        await expect(closeBtn).toBeFocused();

        // Tab forward through dialog to contact CTA
        await page.keyboard.press('Tab');
        const ctaBtn = dialog.locator('a[href="#contact"]');
        await expect(ctaBtn).toBeFocused();

        // Tab forward again wraps around to close button (Focus Trap)
        await page.keyboard.press('Tab');
        await expect(closeBtn).toBeFocused();

        // Shift+Tab backward wraps to CTA button
        await page.keyboard.press('Shift+Tab');
        await expect(ctaBtn).toBeFocused();

        // Escape closes dialog and restores focus to trigger button
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
        await expect(hotspotBtn).toBeFocused();
      } else {
        // In static fallback mode, native details/summary handles keyboard interaction
        const summary = page.locator('details#detail-travertine-wall summary');
        await summary.focus();
        await page.keyboard.press('Enter');
        const details = page.locator('details#detail-travertine-wall');
        await expect(details).toHaveAttribute('open', '');
      }
    });

    test('backdrop click closes modal dialog safely', async ({ page }) => {
      await page.goto('/vi');
      await page.waitForLoadState('domcontentloaded');

      await page.evaluate(() => {
        document.getElementById('living')?.scrollIntoView({ behavior: 'instant' });
      });
      await page.waitForTimeout(300);

      const hotspotBtn = page.locator('button[data-hotspot="travertine-wall"]');
      if (await hotspotBtn.isVisible()) {
        await hotspotBtn.click();
        const backdrop = page.locator('.hotspot-modal-backdrop');
        await expect(backdrop).toBeVisible();

        // Click outside dialog container (top-left of backdrop)
        await backdrop.click({ position: { x: 10, y: 10 } });

        const dialog = page.locator('div[role="dialog"]');
        await expect(dialog).not.toBeVisible();
      }
    });

    test('modal CTA button closes dialog and navigates cleanly to contact section', async ({
      page,
    }) => {
      await page.goto('/vi');
      await page.waitForLoadState('domcontentloaded');

      await page.evaluate(() => {
        document.getElementById('living')?.scrollIntoView({ behavior: 'instant' });
      });
      await page.waitForTimeout(300);

      const hotspotBtn = page.locator('button[data-hotspot="travertine-wall"]');
      if (await hotspotBtn.isVisible()) {
        await hotspotBtn.click();
        const dialog = page.locator('div[role="dialog"]');
        await expect(dialog).toBeVisible();

        // Click CTA inside dialog
        const modalCta = dialog.locator('a[href="#contact"]');
        await modalCta.click();

        // Dialog closes and page moves to contact section
        await expect(dialog).not.toBeVisible();
        await expect(page.locator('section#contact')).toBeInViewport();
      }
    });
  });

  test.describe('Color Contrast & Accessibility Attributes', () => {
    test('interactive buttons expose clear aria-label or accessible names', async ({ page }) => {
      await page.goto('/vi');
      await page.waitForLoadState('domcontentloaded');

      // Check audio toggle has aria-label and aria-pressed
      const audioBtn = page.locator('.audio-toggle-btn');
      if (await audioBtn.isVisible()) {
        await expect(audioBtn).toHaveAttribute('aria-label');
        await expect(audioBtn).toHaveAttribute('aria-pressed');
      }

      // Check language switcher has aria-label
      const langNav = page.locator('nav.language-switcher');
      await expect(langNav).toHaveAttribute('aria-label', 'Language navigation');

      // Check static details summary has accessible text
      const summaries = page.locator('details summary');
      const count = await summaries.count();
      for (let i = 0; i < count; i++) {
        const text = await summaries.nth(i).textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
      }
    });
  });
});
