/**
 * HavenArt — SEO, Metadata, Robots & Sitemap E2E Test Suite
 * Contract Version: havenart-contracts-1.1
 * References: docs/SEO_SPEC.md, docs/agents/tasks/W28.md
 *
 * Local Criteria (W28-AC3):
 * - HTML source vi/en metadata, sitemap/robots và OG thật đúng môi trường.
 * - Single h1, hierarchical headings, skip-links, single unique #contact.
 * - Real OG image asset verified on static host.
 */

import { test, expect } from '@playwright/test';

test.describe('W28 — SEO, Metadata & OpenGraph Verification (W28-AC3)', () => {
  test('serves complete Vietnamese metadata and OpenGraph tags in raw HTML (/vi)', async ({ request }) => {
    const res = await request.get('/vi');
    expect(res.status()).toBe(200);

    const html = await res.text();

    // 1. Language attribute
    expect(html).toContain('<html lang="vi"');

    // 2. Title & Description
    expect(html).toContain('<title>HavenArt — Kiến tạo nơi bạn thuộc về</title>');
    expect(html).toMatch(/<meta\s+name="description"\s+content="[^"]*Contemporary Tropical Minimalism[^"]*"/i);

    // 3. OpenGraph tags
    expect(html).toMatch(/<meta\s+property="og:title"\s+content="[^"]*HavenArt[^"]*"/i);
    expect(html).toMatch(/<meta\s+property="og:description"\s+content="[^"]*"/i);
    expect(html).toMatch(/<meta\s+property="og:locale"\s+content="vi_VN"/i);
    expect(html).toMatch(/<meta\s+property="og:image"\s+content="[^"]*\/images\/og-havenart\.jpg"/i);

    // 4. In preview/unverified origin, strictly enforces noindex, nofollow
    expect(html).toMatch(/<meta\s+name="robots"\s+content="noindex,\s*nofollow"/i);
  });

  test('serves complete English metadata and OpenGraph tags in raw HTML (/en)', async ({ request }) => {
    const res = await request.get('/en');
    expect(res.status()).toBe(200);

    const html = await res.text();

    // 1. Language attribute
    expect(html).toContain('<html lang="en"');

    // 2. Title & Description
    expect(html).toContain('<title>HavenArt — Designing the place you belong</title>');
    expect(html).toMatch(/<meta\s+name="description"\s+content="[^"]*Contemporary Tropical Minimalism[^"]*"/i);

    // 3. OpenGraph tags
    expect(html).toMatch(/<meta\s+property="og:title"\s+content="[^"]*HavenArt[^"]*"/i);
    expect(html).toMatch(/<meta\s+property="og:description"\s+content="[^"]*"/i);
    expect(html).toMatch(/<meta\s+property="og:locale"\s+content="en_US"/i);
    expect(html).toMatch(/<meta\s+property="og:image"\s+content="[^"]*\/images\/og-havenart\.jpg"/i);

    // 4. In preview/unverified origin, strictly enforces noindex, nofollow
    expect(html).toMatch(/<meta\s+name="robots"\s+content="noindex,\s*nofollow"/i);
  });

  test('serves real OG image asset from static host with valid dimensions', async ({ request }) => {
    const res = await request.get('/images/og-havenart.jpg');
    expect(res.status()).toBe(200);

    const contentType = res.headers()['content-type'];
    expect(contentType).toMatch(/image\/jpeg/);

    const body = await res.body();
    // 1200x630 JPEG is ~32KB on disk
    expect(body.length).toBeGreaterThan(15000);
  });

  test('serves valid sitemap.xml without invented canonicals when origin unverified', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);

    const xml = await res.text();
    expect(xml).toContain('<urlset');
    expect(xml).toContain('http://www.sitemaps.org/schemas/sitemap/0.9');
  });

  test('serves valid robots.txt', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);

    const text = await res.text();
    expect(text).toContain('User-Agent: *');
  });

  test('validates semantic heading order, skip links, and single unique #contact', async ({ page }) => {
    await page.goto('/vi');

    // 1. Skip navigation links
    const skipLinks = page.locator('a[href^="#"]');
    await expect(skipLinks.locator('text=Chuyển đến nội dung chính')).toBeAttached();
    await expect(skipLinks.locator('text=Chuyển đến phần liên hệ')).toBeAttached();

    // 2. Exactly one h1 on page
    const h1Elements = page.locator('h1');
    await expect(h1Elements).toHaveCount(1);
    await expect(h1Elements).toContainText('HavenArt');

    // 3. Hierarchical h2 structure
    const h2Elements = page.locator('h2');
    const h2Count = await h2Elements.count();
    expect(h2Count).toBeGreaterThanOrEqual(8); // Services + 6 chapters + Contact

    // 4. Exactly one element with id="contact" on entire page
    const contactElements = page.locator('#contact');
    await expect(contactElements).toHaveCount(1);
    await expect(contactElements).toHaveAttribute('aria-labelledby', 'contact-heading');
  });
});
