/**
 * HavenArt — SEO & Metadata Builder
 * Contract Version: havenart-contracts-1.1
 * References: docs/SEO_SPEC.md
 *
 * Local Criteria (W23):
 * - W23-AC1: Preview noindex và origin null không invented canonical; production origin verified.
 * - W23-AC2: VI/EN canonical/hreflang consistent trailing slash, chưa tạo fake schema.
 * - W23-AC3: OG chỉ reference file thật sau W25; missing asset thành release issue không silently pass.
 */

import type { Metadata } from 'next';
import type { Locale, Dictionary, SiteConfig } from '@/types/story';

/**
 * Validates that an origin string is a strictly valid HTTPS origin (protocol + host without path, query, or credentials).
 */
export function isValidHttpsOrigin(origin: string | null | undefined): boolean {
  if (!origin || typeof origin !== 'string') return false;
  try {
    const url = new URL(origin);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (url.pathname === '/' || url.pathname === '') &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export interface BuildMetadataParams {
  readonly locale: Locale;
  readonly copy: Dictionary;
  readonly siteConfig: SiteConfig;
  readonly ogImageVerified?: boolean;
}

/**
 * Builds metadata for a locale page according to SEO_SPEC.
 * Guarantees zero invented origins, zero fake canonicals, and no fake schema (W23-AC1, W23-AC2).
 */
export function buildPageMetadata(params: BuildMetadataParams): Metadata {
  const { locale, copy, siteConfig, ogImageVerified = false } = params;
  const isProduction = siteConfig.environment === 'production';
  const hasVerifiedOrigin = isProduction && isValidHttpsOrigin(siteConfig.publicOrigin);
  const cleanOrigin = hasVerifiedOrigin && siteConfig.publicOrigin
    ? siteConfig.publicOrigin.replace(/\/+$/, '')
    : null;

  // In preview or when origin is unverified, strictly enforce noindex, nofollow (W23-AC1)
  const robots = hasVerifiedOrigin
    ? {
        index: true,
        follow: true,
      }
    : {
        index: false,
        follow: false,
      };

  // Only emit canonical and hreflang when origin is HTTPS verified in production (W23-AC1, W23-AC2)
  const alternates = cleanOrigin
    ? {
        canonical: `${cleanOrigin}/${locale}`,
        languages: {
          vi: `${cleanOrigin}/vi`,
          en: `${cleanOrigin}/en`,
          'x-default': `${cleanOrigin}/vi`,
        },
      }
    : undefined;

  const ogUrl = cleanOrigin ? `${cleanOrigin}/${locale}` : undefined;
  const ogLocale = locale === 'vi' ? 'vi_VN' : 'en_US';

  return {
    title: copy.metadata.title,
    description: copy.metadata.description,
    robots,
    alternates,
    openGraph: {
      title: copy.metadata.ogTitle,
      description: copy.metadata.ogDescription,
      locale: ogLocale,
      url: ogUrl,
      // OpenGraph images only referenced if verified file exists (W23-AC3)
      ...(ogImageVerified
        ? {
            images: [
              {
                url: cleanOrigin ? `${cleanOrigin}/og-image-${locale}.jpg` : `/og-image-${locale}.jpg`,
                width: 1200,
                height: 630,
                alt: copy.metadata.ogAlt,
              },
            ],
          }
        : {}),
    },
  };
}
