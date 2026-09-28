/**
 * HavenArt — Contact URL Resolution and Production Release Validation
 * Contract Version: havenart-contracts-1.1
 */

import type { ContactChannel, ContactConfig } from '@/types/story';

export const REQUIRED_CONTACT_CHANNELS: readonly ContactChannel[] = [
  'zalo',
  'messenger',
  'whatsapp',
] as const;

export const ALLOWED_CHANNEL_HOSTS: Record<ContactChannel, readonly string[]> = {
  zalo: ['zalo.me'],
  messenger: ['m.me', 'messenger.com', 'facebook.com'],
  whatsapp: ['wa.me', 'whatsapp.com', 'api.whatsapp.com'],
};

function isValidChannelUrl(rawUrl: string, channel: ContactChannel): boolean {
  try {
    const parsed = new URL(rawUrl);

    // Strictly enforce HTTPS protocol
    if (parsed.protocol !== 'https:') {
      return false;
    }

    // Disallow user credentials in URLs
    if (parsed.username || parsed.password) {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();
    const allowedHosts = ALLOWED_CHANNEL_HOSTS[channel];

    // Must match allowed hostname or be a subdomain of it
    const isAllowedHost = allowedHosts.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`)
    );

    if (!isAllowedHost) {
      return false;
    }

    // Must have a path or recipient identifier (more than just root '/')
    if (parsed.pathname === '/' || parsed.pathname === '') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Resolves a contact URL for the given channel.
 * Returns null if the channel is unconfigured (null) or if the configured URL fails validation.
 */
export function getContactUrl(config: ContactConfig, channel: ContactChannel): string | null {
  if (!config) {
    return null;
  }

  const rawUrl = config[channel];
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!isValidChannelUrl(trimmed, channel)) {
    return null;
  }

  return trimmed;
}

/**
 * Validates whether all required contact channels are configured and valid for a production release.
 * Returns an empty array if all 3 channels are valid, or a list of blocking errors.
 */
export function validateReleaseContacts(config: ContactConfig): string[] {
  const errors: string[] = [];

  if (!config) {
    return ['ContactConfig is missing'];
  }

  for (const channel of REQUIRED_CONTACT_CHANNELS) {
    const rawValue = config[channel];

    if (rawValue === null || rawValue === undefined) {
      errors.push(`Production release blocked: missing contact channel "${channel}"`);
    } else if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
      errors.push(`Production release blocked: contact channel "${channel}" has empty or non-string value`);
    } else if (!isValidChannelUrl(rawValue.trim(), channel)) {
      errors.push(
        `Production release blocked: contact channel "${channel}" has invalid URL "${rawValue}". Must be HTTPS and point to an official ${channel} domain.`
      );
    }
  }

  return errors;
}
