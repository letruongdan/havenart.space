/**
 * HavenArt — Release Readiness & Contact / Domain Integrity Validator
 * Contract Version: havenart-contracts-1.1
 * References: docs/ACCEPTANCE_CRITERIA.md (AC12, AC17), docs/SEO_SPEC.md, docs/agents/tasks/W29.md
 *
 * Local Criteria (W29-AC2):
 * - Preview build được nhưng release không pass khi contact/domain chưa thật.
 * - Enforces zero fake contacts, zero placeholder domains, and honest unconfigured status.
 * - In production mode, all 3 channels (Zalo, Messenger, WhatsApp) and publicOrigin must be verified.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const VALID_CHANNEL_PATTERNS = {
  zalo: /^https:\/\/zalo\.me\/[a-zA-Z0-9_.-]+$/,
  messenger: /^https:\/\/m\.me\/[a-zA-Z0-9_.-]+$/,
  whatsapp: /^https:\/\/wa\.me\/[0-9]+$/,
};

export const FORBIDDEN_PLACEHOLDER_SUBSTRINGS = [
  'example.com',
  'test.com',
  'localhost',
  '0123456789',
  '123456',
  'placeholder',
  'havenart-fake',
  'your-channel',
  'username',
];

/**
 * Validates site and contact release readiness.
 *
 * @param {Object} options
 * @param {Object} [options.contacts] - Object containing { zalo, messenger, whatsapp }
 * @param {Object} [options.siteConfig] - Object containing { publicOrigin, environment }
 * @param {'auto'|'preview'|'production'} [options.targetMode='auto'] - Targeted evaluation mode
 * @returns {{ isPreviewValid: boolean, isProductionReady: boolean, errors: string[], warnings: string[] }}
 */
export function validateRelease({
  contacts,
  siteConfig,
  targetMode = 'auto',
}) {
  const errors = [];
  const warnings = [];

  const effectiveMode =
    targetMode !== 'auto'
      ? targetMode
      : siteConfig?.environment === 'production'
      ? 'production'
      : 'preview';

  // 1. Verify that no forbidden placeholder/fake strings exist anywhere in contacts
  if (contacts) {
    for (const [channel, url] of Object.entries(contacts)) {
      if (typeof url === 'string') {
        const lowerUrl = url.toLowerCase();
        for (const placeholder of FORBIDDEN_PLACEHOLDER_SUBSTRINGS) {
          if (lowerUrl.includes(placeholder)) {
            errors.push(
              `Channel [${channel}] contains forbidden placeholder or fake string: "${placeholder}" in "${url}"`
            );
          }
        }

        // Validate scheme and pattern
        const pattern = VALID_CHANNEL_PATTERNS[channel];
        if (pattern && !pattern.test(url)) {
          errors.push(
            `Channel [${channel}] URL does not match required format pattern (${pattern}): "${url}"`
          );
        }
      }
    }
  }

  // 2. Verify that no placeholder exists in publicOrigin
  if (siteConfig?.publicOrigin) {
    const origin = siteConfig.publicOrigin.toLowerCase();
    for (const placeholder of FORBIDDEN_PLACEHOLDER_SUBSTRINGS) {
      if (origin.includes(placeholder)) {
        errors.push(
          `publicOrigin contains forbidden placeholder or fake string: "${placeholder}" in "${siteConfig.publicOrigin}"`
        );
      }
    }

    if (!siteConfig.publicOrigin.startsWith('https://')) {
      errors.push(
        `publicOrigin must use secure https:// scheme. Got: "${siteConfig.publicOrigin}"`
      );
    }
  }

  // 3. Evaluate Preview Readiness
  const isPreviewValid = errors.length === 0;

  // 4. Evaluate Production Release Gate
  const missingProductionContacts = [];
  const requiredChannels = ['zalo', 'messenger', 'whatsapp'];

  for (const channel of requiredChannels) {
    const url = contacts?.[channel];
    if (!url || typeof url !== 'string' || url.trim() === '') {
      missingProductionContacts.push(channel);
    }
  }

  const missingProductionOrigin = !siteConfig?.publicOrigin || siteConfig.publicOrigin.trim() === '';

  const productionGateBlockers = [];
  if (missingProductionContacts.length > 0) {
    productionGateBlockers.push(
      `Missing verified business contact channels for production: [${missingProductionContacts.join(', ')}]. Currently set to null/unconfigured.`
    );
  }
  if (missingProductionOrigin) {
    productionGateBlockers.push(
      'Missing verified publicOrigin (e.g. "https://havenart.space"). Currently set to null.'
    );
  }

  const isProductionReady = errors.length === 0 && productionGateBlockers.length === 0;

  if (effectiveMode === 'production' && !isProductionReady) {
    errors.push(...productionGateBlockers);
  } else if (productionGateBlockers.length > 0) {
    warnings.push(...productionGateBlockers);
  }

  return {
    isPreviewValid,
    isProductionReady,
    effectiveMode,
    errors,
    warnings,
  };
}

/**
 * Loads current project configuration from disk for standalone script execution.
 */
export async function loadCurrentProjectConfig(rootDir = process.cwd()) {
  // Read contacts.ts content
  const contactsPath = path.join(rootDir, 'src/config/contacts.ts');
  let contacts = { zalo: null, messenger: null, whatsapp: null };
  if (fs.existsSync(contactsPath)) {
    const content = fs.readFileSync(contactsPath, 'utf-8');
    const zaloMatch = content.match(/zalo:\s*(null|['"`]([^'"`]+)['"`])/);
    const messengerMatch = content.match(/messenger:\s*(null|['"`]([^'"`]+)['"`])/);
    const whatsappMatch = content.match(/whatsapp:\s*(null|['"`]([^'"`]+)['"`])/);

    contacts = {
      zalo: zaloMatch && zaloMatch[1] !== 'null' ? zaloMatch[2] : null,
      messenger: messengerMatch && messengerMatch[1] !== 'null' ? messengerMatch[2] : null,
      whatsapp: whatsappMatch && whatsappMatch[1] !== 'null' ? whatsappMatch[2] : null,
    };
  }

  // Read site.ts or env
  const siteConfig = {
    publicOrigin: process.env.NEXT_PUBLIC_SITE_ORIGIN || null,
    environment: process.env.NEXT_PUBLIC_APP_ENV === 'production' ? 'production' : 'preview',
  };

  return { contacts, siteConfig };
}

// CLI direct run
const isMain =
  process.argv[1] &&
  (process.argv[1] === fileURLToPath(import.meta.url) ||
    path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)));

if (isMain) {
  const isStrictProduction =
    process.argv.includes('--production') ||
    process.argv.includes('--strict-production') ||
    process.env.STRICT_PRODUCTION_RELEASE === 'true';

  const { contacts, siteConfig } = await loadCurrentProjectConfig(process.cwd());

  const result = validateRelease({
    contacts,
    siteConfig,
    targetMode: isStrictProduction ? 'production' : 'auto',
  });

  if (isStrictProduction && !result.isProductionReady) {
    console.error('Production Release Validation BLOCKED:');
    result.errors.forEach((err) => console.error(`  - ❌ ${err}`));
    console.error('\nProduction release cannot proceed until real contacts and public domain are verified.');
    process.exit(1);
  }

  if (result.errors.length > 0) {
    console.error('Release Validation FAILED with errors:');
    result.errors.forEach((err) => console.error(`  - ❌ ${err}`));
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        status: 'PASS',
        scope: 'Release readiness and contact / domain integrity (W29-AC2)',
        previewValid: result.isPreviewValid,
        productionReleaseReady: result.isProductionReady,
        productionGateStatus: result.isProductionReady ? 'APPROVED' : 'BLOCKED_PENDING_OWNER_CONTACTS',
        currentContacts: contacts,
        siteConfig,
        warnings: result.warnings,
        errors: [],
      },
      null,
      2
    )
  );

  process.exit(0);
}
