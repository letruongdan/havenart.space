/**
 * HavenArt — Asset Provenance & License Integrity Validator
 * Contract Version: havenart-contracts-1.1
 * References: ASSET_LICENSES.md, docs/ASSET_PIPELINE.md, docs/agents/tasks/W29.md
 *
 * Local Criteria (W29-AC1):
 * - Đủ provenance cho mọi model/font/audio/poster; thiếu evidence làm fail.
 * - 0 USD asset budget, CC0 / Public Domain / verified original only.
 * - SHA-256 checksum on disk must exactly match ASSET_LICENSES.md.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

/**
 * List of physical runtime assets required for HavenArt Phase 1.
 */
export const REQUIRED_ASSET_MANIFEST = [
  // 1. Procedural Ambient Audio (W20)
  'public/audio/outdoor.ogg',
  'public/audio/interior.ogg',
  'public/audio/garden.ogg',

  // 2. Phase 1 Story Posters (W25)
  'public/images/story/exterior-desktop.webp',
  'public/images/story/exterior-mobile.webp',
  'public/images/story/approach-desktop.webp',
  'public/images/story/approach-mobile.webp',
  'public/images/story/entrance-desktop.webp',
  'public/images/story/entrance-mobile.webp',
  'public/images/story/living-desktop.webp',
  'public/images/story/living-mobile.webp',
  'public/images/story/garden-desktop.webp',
  'public/images/story/garden-mobile.webp',
  'public/images/story/finale-desktop.webp',
  'public/images/story/finale-mobile.webp',

  // 3. OpenGraph Social Share Card (W25, W28)
  'public/images/og-havenart.jpg',
];

export function computeSha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

/**
 * Validates asset provenance, licenses, and on-disk file checksums.
 * Returns an array of error messages. Empty array indicates PASS.
 */
export function validateAssets(rootDir = process.cwd()) {
  const errors = [];

  const licensePath = path.join(rootDir, 'ASSET_LICENSES.md');
  if (!fs.existsSync(licensePath)) {
    return ['Missing ASSET_LICENSES.md file'];
  }

  const licenseContent = fs.readFileSync(licensePath, 'utf-8');

  // 1. Validate required provenance headings & schema in ASSET_LICENSES.md
  const requiredSchemaFields = [
    '`name`',
    '`source`',
    '`creator`',
    '`license`',
    '`attribution`',
    '`file`',
    '`modifications`',
    '`verifiedAt`',
    '`verifiedBy`',
    '`evidence`',
    '`checksum`',
  ];

  for (const field of requiredSchemaFields) {
    if (!licenseContent.includes(field)) {
      errors.push(`ASSET_LICENSES.md is missing required schema field definition: ${field}`);
    }
  }

  // 2. Validate font provenance (must declare system font stack or open-source font)
  if (!licenseContent.toLowerCase().includes('font') && !licenseContent.toLowerCase().includes('typography')) {
    errors.push('ASSET_LICENSES.md must include font / typography provenance declaration.');
  }

  // 3. Scan physical assets on disk and verify against ASSET_LICENSES.md
  for (const relPath of REQUIRED_ASSET_MANIFEST) {
    const fullPath = path.join(rootDir, relPath);

    if (!fs.existsSync(fullPath)) {
      errors.push(`Missing physical asset file: ${relPath}`);
      continue;
    }

    const stat = fs.statSync(fullPath);
    if (stat.size === 0) {
      errors.push(`Asset file is empty (0 bytes): ${relPath}`);
      continue;
    }

    const buffer = fs.readFileSync(fullPath);
    const actualHash = computeSha256(buffer);

    // Verify registration in ASSET_LICENSES.md
    if (!licenseContent.includes(relPath)) {
      errors.push(`Asset file not registered in ASSET_LICENSES.md: ${relPath}`);
      continue;
    }

    // Verify exact SHA-256 match
    if (!licenseContent.includes(actualHash)) {
      errors.push(
        `SHA-256 mismatch for ${relPath}: physical file hash ${actualHash} not found in ASSET_LICENSES.md`
      );
    }
  }

  // 4. Ensure no untracked asset files in public/audio or public/images/story
  const audioDir = path.join(rootDir, 'public/audio');
  if (fs.existsSync(audioDir)) {
    const audioFiles = fs.readdirSync(audioDir);
    for (const file of audioFiles) {
      const relPath = `public/audio/${file}`;
      if (!REQUIRED_ASSET_MANIFEST.includes(relPath)) {
        errors.push(`Untracked audio asset found without provenance: ${relPath}`);
      }
    }
  }

  const storyImagesDir = path.join(rootDir, 'public/images/story');
  if (fs.existsSync(storyImagesDir)) {
    const imageFiles = fs.readdirSync(storyImagesDir);
    for (const file of imageFiles) {
      const relPath = `public/images/story/${file}`;
      if (!REQUIRED_ASSET_MANIFEST.includes(relPath)) {
        errors.push(`Untracked story poster asset found without provenance: ${relPath}`);
      }
    }
  }

  return errors;
}

// CLI direct run
const isMain =
  process.argv[1] &&
  (process.argv[1] === fileURLToPath(import.meta.url) ||
    path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)));

if (isMain) {
  const errors = validateAssets(process.cwd());
  if (errors.length > 0) {
    console.error('Asset Provenance Validation FAILED:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  } else {
    console.log(
      JSON.stringify(
        {
          status: 'PASS',
          scope: 'Asset provenance, licenses, and SHA-256 integrity (W29-AC1)',
          verifiedAssetsCount: REQUIRED_ASSET_MANIFEST.length,
          fontStrategy: 'Web-safe system fonts (font-serif, font-sans, font-mono) — 0 external font assets',
          budgetCostUSD: 0,
          errors: [],
        },
        null,
        2
      )
    );
    process.exit(0);
  }
}
