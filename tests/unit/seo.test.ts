/**
 * HavenArt — SEO, Metadata, Sitemap & Robots Unit Tests
 * Contract Version: havenart-contracts-1.1
 */

import { describe, it, expect } from 'vitest';
import { isValidHttpsOrigin, buildPageMetadata } from '@/lib/seo/metadata';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { createTestOnlyDictionary } from '../fixtures/story';
import type { SiteConfig } from '@/types/story';

describe('HTTPS Origin Validation (W23-AC1)', () => {
  it('accepts strictly valid HTTPS origins without paths or queries', () => {
    expect(isValidHttpsOrigin('https://havenart.space')).toBe(true);
    expect(isValidHttpsOrigin('https://sub.domain.havenart.space')).toBe(true);
    expect(isValidHttpsOrigin('https://havenart.space/')).toBe(true);
  });

  it('rejects HTTP, user credentials, query params, hash or relative paths', () => {
    expect(isValidHttpsOrigin('http://havenart.space')).toBe(false);
    expect(isValidHttpsOrigin('https://user:pass@havenart.space')).toBe(false);
    expect(isValidHttpsOrigin('https://havenart.space?query=1')).toBe(false);
    expect(isValidHttpsOrigin('https://havenart.space/#contact')).toBe(false);
    expect(isValidHttpsOrigin('https://havenart.space/some-path')).toBe(false);
    expect(isValidHttpsOrigin('ftp://havenart.space')).toBe(false);
    expect(isValidHttpsOrigin('')).toBe(false);
    expect(isValidHttpsOrigin(null)).toBe(false);
    expect(isValidHttpsOrigin(undefined)).toBe(false);
  });
});

describe('Page Metadata Builder (W23-AC1, W23-AC2, W23-AC3)', () => {
  const viCopy = createTestOnlyDictionary('vi');
  const enCopy = createTestOnlyDictionary('en');

  it('W23-AC1: sets noindex and omits canonical when in preview or origin is null', () => {
    const previewConfig: SiteConfig = {
      publicOrigin: null,
      environment: 'preview',
    };

    const metadata = buildPageMetadata({
      locale: 'vi',
      copy: viCopy,
      siteConfig: previewConfig,
    });

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toBeUndefined();
    expect(metadata.openGraph?.url).toBeUndefined();
  });

  it('W23-AC1/W23-AC2: emits index and consistent canonical/hreflang in production with verified origin', () => {
    const prodConfig: SiteConfig = {
      publicOrigin: 'https://havenart.space',
      environment: 'production',
    };

    const viMetadata = buildPageMetadata({
      locale: 'vi',
      copy: viCopy,
      siteConfig: prodConfig,
    });

    expect(viMetadata.robots).toEqual({ index: true, follow: true });
    expect(viMetadata.alternates?.canonical).toBe('https://havenart.space/vi');
    expect(viMetadata.alternates?.languages).toEqual({
      vi: 'https://havenart.space/vi',
      en: 'https://havenart.space/en',
      'x-default': 'https://havenart.space/vi',
    });
    expect(viMetadata.openGraph?.url).toBe('https://havenart.space/vi');
    expect(viMetadata.openGraph?.locale).toBe('vi_VN');

    const enMetadata = buildPageMetadata({
      locale: 'en',
      copy: enCopy,
      siteConfig: prodConfig,
    });

    expect(enMetadata.alternates?.canonical).toBe('https://havenart.space/en');
    expect(enMetadata.openGraph?.locale).toBe('en_US');
  });

  it('W23-AC1: rejects unverified HTTP origin in production mode and falls back to noindex', () => {
    const invalidProdConfig: SiteConfig = {
      publicOrigin: 'http://insecure-domain.com',
      environment: 'production',
    };

    const metadata = buildPageMetadata({
      locale: 'vi',
      copy: viCopy,
      siteConfig: invalidProdConfig,
    });

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.alternates).toBeUndefined();
  });

  it('W23-AC3: OpenGraph images are omitted by default until verified (no fake OG assets)', () => {
    const prodConfig: SiteConfig = {
      publicOrigin: 'https://havenart.space',
      environment: 'production',
    };

    const metadata = buildPageMetadata({
      locale: 'vi',
      copy: viCopy,
      siteConfig: prodConfig,
      ogImageVerified: false,
    });

    expect(metadata.openGraph?.images).toBeUndefined();

    // When verified
    const verifiedMetadata = buildPageMetadata({
      locale: 'vi',
      copy: viCopy,
      siteConfig: prodConfig,
      ogImageVerified: true,
    });

    expect(verifiedMetadata.openGraph?.images).toEqual([
      {
        url: 'https://havenart.space/og-image-vi.jpg',
        width: 1200,
        height: 630,
        alt: viCopy.metadata.ogAlt,
      },
    ]);
  });
});

describe('Sitemap and Robots Route Handlers (W23-AC1, W23-AC2)', () => {
  it('generates sitemap and robots cleanly based on site configuration', () => {
    // In current environment (preview or unverified origin by default)
    const currentSitemap = sitemap();
    const currentRobots = robots();

    expect(Array.isArray(currentSitemap)).toBe(true);
    expect(currentRobots).toHaveProperty('rules');
  });
});
