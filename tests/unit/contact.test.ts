import { describe, it, expect } from 'vitest';
import { getContactUrl, validateReleaseContacts } from '@/lib/contact';
import {
  validPreviewContacts,
  validConfiguredContacts,
  invalidPartialContacts,
  invalidProtocolContacts,
  previewSiteConfig,
  productionSiteConfig,
} from '../fixtures/contacts';
import { SITE_CONFIG } from '@/config/site';

describe('Contact URL Resolution (getContactUrl)', () => {
  it('returns null for all channels in unconfigured preview state', () => {
    expect(getContactUrl(validPreviewContacts, 'zalo')).toBeNull();
    expect(getContactUrl(validPreviewContacts, 'messenger')).toBeNull();
    expect(getContactUrl(validPreviewContacts, 'whatsapp')).toBeNull();
  });

  it('resolves valid HTTPS URLs for configured channels', () => {
    expect(getContactUrl(validConfiguredContacts, 'zalo')).toBe('https://zalo.me/0900000000');
    expect(getContactUrl(validConfiguredContacts, 'messenger')).toBe('https://m.me/havenart.space');
    expect(getContactUrl(validConfiguredContacts, 'whatsapp')).toBe('https://wa.me/84900000000');
  });

  it('rejects non-HTTPS schemes (http, javascript, ftp)', () => {
    expect(getContactUrl(invalidProtocolContacts, 'zalo')).toBeNull();
    expect(getContactUrl(invalidProtocolContacts, 'messenger')).toBeNull();
    expect(getContactUrl(invalidProtocolContacts, 'whatsapp')).toBeNull();
  });

  it('rejects URLs containing embedded user credentials', () => {
    const credentialContacts = {
      zalo: 'https://user:pass@zalo.me/0900000000',
      messenger: null,
      whatsapp: null,
    };
    expect(getContactUrl(credentialContacts, 'zalo')).toBeNull();
  });

  it('rejects domains outside official channel allowlists', () => {
    const spoofedContacts = {
      zalo: 'https://phishing-zalo.test/0900000000',
      messenger: 'https://fake-messenger.org/havenart',
      whatsapp: 'https://malicious-whatsapp.xyz/12345',
    };
    expect(getContactUrl(spoofedContacts, 'zalo')).toBeNull();
    expect(getContactUrl(spoofedContacts, 'messenger')).toBeNull();
    expect(getContactUrl(spoofedContacts, 'whatsapp')).toBeNull();
  });

  it('rejects bare domain URLs without account or target identifier', () => {
    const bareContacts = {
      zalo: 'https://zalo.me/',
      messenger: 'https://m.me',
      whatsapp: 'https://wa.me/',
    };
    expect(getContactUrl(bareContacts, 'zalo')).toBeNull();
    expect(getContactUrl(bareContacts, 'messenger')).toBeNull();
    expect(getContactUrl(bareContacts, 'whatsapp')).toBeNull();
  });
});

describe('Production Release Contact Validation (validateReleaseContacts)', () => {
  it('blocks production release when channels are unconfigured (preview state)', () => {
    const errors = validateReleaseContacts(validPreviewContacts);
    expect(errors.length).toBe(3);
    expect(errors.some((e) => e.includes('missing contact channel "zalo"'))).toBe(true);
    expect(errors.some((e) => e.includes('missing contact channel "messenger"'))).toBe(true);
    expect(errors.some((e) => e.includes('missing contact channel "whatsapp"'))).toBe(true);
  });

  it('blocks production release when any required channel is missing', () => {
    const errors = validateReleaseContacts(invalidPartialContacts);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('missing contact channel "whatsapp"');
  });

  it('blocks production release on invalid URLs or disallowed schemes', () => {
    const errors = validateReleaseContacts(invalidProtocolContacts);
    expect(errors.length).toBe(3);
    expect(errors.every((e) => e.includes('has invalid URL'))).toBe(true);
  });

  it('passes cleanly when all 3 required channels have valid official HTTPS URLs', () => {
    const errors = validateReleaseContacts(validConfiguredContacts);
    expect(errors).toEqual([]);
  });
});

describe('Site Configuration (site.ts)', () => {
  it('defaults to nullable publicOrigin and preview environment', () => {
    expect(SITE_CONFIG.publicOrigin).toBeNull();
    expect(SITE_CONFIG.environment).toBe('preview');
  });

  it('conforms to SiteConfig interface in test fixtures', () => {
    expect(previewSiteConfig.environment).toBe('preview');
    expect(productionSiteConfig.environment).toBe('production');
    expect(productionSiteConfig.publicOrigin).toBe('https://havenart.space');
  });
});
