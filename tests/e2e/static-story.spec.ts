import { test, expect } from '@playwright/test';

test.describe('W06 — Static Locale HTML & Semantic Layout', () => {
  test.describe('W06-AC1: Raw HTML Lang & Unknown Locale 404', () => {
    test('serves unhydrated HTML with correct lang attribute for /vi', async ({ request }) => {
      const response = await request.get('/vi');
      expect(response.status()).toBe(200);

      const html = await response.text();
      expect(html).toContain('<html lang="vi"');
    });

    test('serves unhydrated HTML with correct lang attribute for /en', async ({ request }) => {
      const response = await request.get('/en');
      expect(response.status()).toBe(200);

      const html = await response.text();
      expect(html).toContain('<html lang="en"');
    });

    test('returns HTTP 404 for unknown locales on static host', async ({ request }) => {
      const frResponse = await request.get('/fr');
      expect(frResponse.status()).toBe(404);

      const deResponse = await request.get('/de');
      expect(deResponse.status()).toBe(404);

      const invalidResponse = await request.get('/unknown-locale');
      expect(invalidResponse.status()).toBe(404);
    });
  });

  test.describe('W06-AC2: No-JavaScript Resilience (6 Stories, Services, 3 Details, CTA, Null Contacts)', () => {
    test('renders complete content without JavaScript in Vietnamese (/vi)', async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto('/vi');

      // 1. Services section
      const services = page.locator('section#services');
      await expect(services).toBeVisible();
      await expect(services.locator('h2')).toContainText('Định hướng thiết kế nhà ở');

      // 2. All 6 Phase 1 Story Chapters
      const chapterIds = ['exterior', 'approach', 'entrance', 'living', 'garden', 'finale'];
      for (const id of chapterIds) {
        const section = page.locator(`section#${id}`);
        await expect(section).toBeVisible();
        await expect(section.locator('h2')).toBeVisible();
      }

      // 3. Exactly 3 Native Hotspot Details
      const hotspotIds = ['travertine-wall', 'sliding-glass', 'garden-tree'];
      for (const id of hotspotIds) {
        const detail = page.locator(`details#detail-${id}`);
        await expect(detail).toBeAttached();
        await expect(detail.locator('summary')).toBeAttached();
      }

      // 4. CTA linking to #contact
      const ctas = page.locator('a[href="#contact"]');
      expect(await ctas.count()).toBeGreaterThanOrEqual(1);

      // 5. Contact Section & Null Channel Handling
      const contactSection = page.locator('section#contact');
      await expect(contactSection).toBeVisible();

      // Ensure NO links with href="#" or fake hrefs exist anywhere in the page
      const fakeLinks = page.locator('a[href="#"], a[href=""], a[href^="javascript:"]');
      expect(await fakeLinks.count()).toBe(0);

      // Ensure unconfigured channels display honest disabled text
      const unconfiguredBadges = contactSection.locator('[aria-disabled="true"]');
      expect(await unconfiguredBadges.count()).toBe(3);
      for (let i = 0; i < 3; i++) {
        await expect(unconfiguredBadges.nth(i)).toHaveText('Chưa cấu hình');
      }

      await context.close();
    });

    test('renders complete content without JavaScript in English (/en)', async ({ browser }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto('/en');

      // 1. Services section
      const services = page.locator('section#services');
      await expect(services).toBeVisible();
      await expect(services.locator('h2')).toContainText('Residential Architecture Direction');

      // 2. All 6 Story Chapters
      const chapterIds = ['exterior', 'approach', 'entrance', 'living', 'garden', 'finale'];
      for (const id of chapterIds) {
        const section = page.locator(`section#${id}`);
        await expect(section).toBeVisible();
      }

      // 3. Exactly 3 Native Hotspot Details
      const hotspotIds = ['travertine-wall', 'sliding-glass', 'garden-tree'];
      for (const id of hotspotIds) {
        const detail = page.locator(`details#detail-${id}`);
        await expect(detail).toBeAttached();
      }

      // 4. Unconfigured contact status
      const contactSection = page.locator('section#contact');
      const unconfiguredBadges = contactSection.locator('[aria-disabled="true"]');
      expect(await unconfiguredBadges.count()).toBe(3);
      for (let i = 0; i < 3; i++) {
        await expect(unconfiguredBadges.nth(i)).toHaveText('Not configured');
      }

      await context.close();
    });
  });

  test.describe('W06-AC3: Strict Heading Hierarchy & Unique #contact', () => {
    test('has exactly one <h1> and correct heading order (/vi)', async ({ page }) => {
      await page.goto('/vi');

      // Exactly one h1
      const h1s = page.locator('h1');
      await expect(h1s).toHaveCount(1);
      await expect(h1s).toContainText('HavenArt');

      // Check heading hierarchy order (no skipped heading levels)
      const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (elements) =>
        elements.map((el) => parseInt(el.tagName.replace('H', ''), 10))
      );

      expect(headings.length).toBeGreaterThan(0);
      expect(headings[0]).toBe(1); // First heading must be h1

      for (let i = 1; i < headings.length; i++) {
        const prevLevel = headings[i - 1];
        const currLevel = headings[i];
        // Cannot jump deeper by more than 1 level (e.g. h1 -> h3 is forbidden)
        expect(currLevel).toBeLessThanOrEqual(prevLevel + 1);
      }

      // Single unique id="contact" across the entire document
      const contactElements = page.locator('#contact');
      await expect(contactElements).toHaveCount(1);

      // Verify that finale does NOT have id="contact"
      const finale = page.locator('section#finale');
      await expect(finale).toHaveCount(1);
      expect(await finale.getAttribute('id')).toBe('finale');

      // Skip links exist and point to valid targets
      const skipToContent = page.getByRole('link', { name: 'Chuyển đến nội dung chính' });
      await expect(skipToContent).toBeAttached();

      const skipToContact = page.getByRole('link', { name: 'Chuyển đến phần liên hệ' });
      await expect(skipToContact).toBeAttached();
    });

    test('language switcher links between /vi and /en', async ({ page }) => {
      await page.goto('/vi');
      const enSwitcher = page.getByRole('link', { name: 'English' });
      await expect(enSwitcher).toBeVisible();

      await page.goto('/en');
      const viSwitcher = page.getByRole('link', { name: 'Tiếng Việt' });
      await expect(viSwitcher).toBeVisible();
    });
  });
});
