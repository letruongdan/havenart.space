import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Haven Art SEO & Crawling Verification', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const publicDir = path.join(rootDir, 'public');
  const distDir = path.join(rootDir, 'dist/client');

  it('verifies public/robots.txt exists with sitemap and private route protections', () => {
    const robotsPath = path.join(publicDir, 'robots.txt');
    expect(fs.existsSync(robotsPath)).toBe(true);

    const content = fs.readFileSync(robotsPath, 'utf8');
    expect(content).toContain('User-agent: *');
    expect(content).toContain('Allow: /');
    expect(content).toContain('Disallow: /admin');
    expect(content).toContain('Disallow: /api/');
    expect(content).toContain('Sitemap: https://havenart.space/sitemap-index.xml');
  });

  it('verifies SEO component exists and defines required openGraph and jsonLd structures', () => {
    const seoCompPath = path.join(rootDir, 'src/components/SEO.astro');
    expect(fs.existsSync(seoCompPath)).toBe(true);

    const content = fs.readFileSync(seoCompPath, 'utf8');
    expect(content).toContain('AstroSEO');
    expect(content).toContain('jsonLdWebSite');
    expect(content).toContain('jsonLdWebApp');
    expect(content).toContain('application/ld+json');
    expect(content).toContain('canonical');
    expect(content).toContain('summary_large_image');
    expect(content).toContain('hreflang');
  });

  it('verifies astro.config.mjs configures site URL and sitemap integration', () => {
    const configPath = path.join(rootDir, 'astro.config.mjs');
    const content = fs.readFileSync(configPath, 'utf8');
    expect(content).toContain("site: 'https://havenart.space'");
    expect(content).toContain('@astrojs/sitemap');
    expect(content).toContain('sitemap(');
  });

  it('verifies build output index.html contains essential SEO tags if build exists', () => {
    const indexHtmlPath = path.join(rootDir, 'tests/reports/build-root.html');
    if (fs.existsSync(indexHtmlPath)) {
      const html = fs.readFileSync(indexHtmlPath, 'utf8');

      // Title & Description
      expect(html).toMatch(/<title>Haven Art — Góc tĩnh lặng cho tâm hồn<\/title>/);
      expect(html).toContain('name="description"');

      // Canonical
      expect(html).toContain('<link rel="canonical" href="https://havenart.space/">');

      // Open Graph
      expect(html).toContain('property="og:title"');
      expect(html).toContain('property="og:description"');
      expect(html).toContain('property="og:image"');
      expect(html).toContain('property="og:url"');

      // Twitter Cards
      expect(html).toContain('name="twitter:card" content="summary_large_image"');

      // Schema.org
      expect(html).toContain('"@type":"WebSite"');
      expect(html).toContain('"@type":"WebApplication"');

      // Hreflang
      expect(html).toContain('hreflang="vi"');
      expect(html).toContain('hreflang="en"');
    }
  });

  it('verifies build output admin.html is protected with noindex', () => {
    const adminHtmlPath = path.join(distDir, 'admin/index.html');
    if (fs.existsSync(adminHtmlPath)) {
      const html = fs.readFileSync(adminHtmlPath, 'utf8');
      expect(html).toContain('noindex');
    }
  });
});
