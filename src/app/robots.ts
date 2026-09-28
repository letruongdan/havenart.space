import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/config/site';
import { isValidHttpsOrigin } from '@/lib/seo/metadata';

export const dynamic = 'force-static';


export default function robots(): MetadataRoute.Robots {
  const isProduction = SITE_CONFIG.environment === 'production';
  const hasVerifiedOrigin = isProduction && isValidHttpsOrigin(SITE_CONFIG.publicOrigin);

  if (!hasVerifiedOrigin || !SITE_CONFIG.publicOrigin) {
    // In preview or when publicOrigin is null/unverified, block crawling (W23-AC1)
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  const cleanOrigin = SITE_CONFIG.publicOrigin.replace(/\/+$/, '');

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${cleanOrigin}/sitemap.xml`,
  };
}
