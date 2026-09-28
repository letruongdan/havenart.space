/**
 * HavenArt — Contact & Channel Test Fixtures
 * Contract Version: havenart-contracts-1.1
 */

import type { ContactConfig, SiteConfig } from '@/types/story';

export const validPreviewContacts: ContactConfig = {
  zalo: null,
  messenger: null,
  whatsapp: null,
};

export const validConfiguredContacts: ContactConfig = {
  zalo: 'https://zalo.me/0900000000',
  messenger: 'https://m.me/havenart.space',
  whatsapp: 'https://wa.me/84900000000',
};

export const invalidPartialContacts: ContactConfig = {
  zalo: 'https://zalo.me/0900000000',
  messenger: 'https://m.me/havenart.space',
  whatsapp: null,
};

export const invalidProtocolContacts: ContactConfig = {
  zalo: 'http://insecure-zalo.test',
  messenger: 'javascript:void(0)',
  whatsapp: 'ftp://files.test',
};

export const previewSiteConfig: SiteConfig = {
  publicOrigin: null,
  environment: 'preview',
};

export const productionSiteConfig: SiteConfig = {
  publicOrigin: 'https://havenart.space',
  environment: 'production',
};
