/**
 * HavenArt — Site & Environment Configuration
 * Contract Version: havenart-contracts-1.1
 */

import type { SiteConfig } from '@/types/story';

export const SITE_CONFIG: SiteConfig = {
  publicOrigin: process.env.NEXT_PUBLIC_SITE_ORIGIN || null,
  environment: process.env.NEXT_PUBLIC_APP_ENV === 'production' ? 'production' : 'preview',
};
