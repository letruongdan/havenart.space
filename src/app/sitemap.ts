import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/config/site';
import { isValidHttpsOrigin } from '@/lib/seo/metadata';

export const dynamic = 'force-static';


export default function sitemap(): MetadataRoute.Sitemap {
  const isProduction = SITE_CONFIG.environment === 'production';
  const hasVerifiedOrigin = isProduction && isValidHttpsOrigin(SITE_CONFIG.publicOrigin);

  if (!hasVerifiedOrigin || !SITE_CONFIG.publicOrigin) {
    // In preview or when publicOrigin is null/unverified, do not emit canonical sitemap (W23-AC1)
    return [];
  }

  const cleanOrigin = SITE_CONFIG.publicOrigin.replace(/\/+$/, '');
  const lastModified = new Date('2026-09-28T00:00:00.000Z');

  return [
    {
      url: `${cleanOrigin}/vi`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1.0,
      alternates: {
        languages: {
          vi: `${cleanOrigin}/vi`,
          en: `${cleanOrigin}/en`,
          'x-default': `${cleanOrigin}/vi`,
        },
      },
    },
    {
      url: `${cleanOrigin}/en`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: {
        languages: {
          vi: `${cleanOrigin}/vi`,
          en: `${cleanOrigin}/en`,
          'x-default': `${cleanOrigin}/vi`,
        },
      },
    },
  ];
}
