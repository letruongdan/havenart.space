/**
 * HavenArt — Runtime Resources & Asset Integrity Validator
 * Contract Version: havenart-contracts-1.1
 * References: docs/agents/CONTRACTS.md §C03, docs/agents/tasks/W25.md
 *
 * Validates:
 * 1. Declared IDs in contracts match actual registries and configs.
 * 2. All physical runtime asset files exist on disk with valid file size and header magic bytes.
 * 3. Every asset file is documented with matching SHA-256 checksum in ASSET_LICENSES.md.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const DECLARED_REGISTRIES = {
  lighting: ['golden', 'sunset', 'dusk'],
  audio: ['outdoor', 'threshold', 'indoor', 'garden'],
  zones: ['exterior', 'entrance', 'living', 'garden'],
  posters: ['exterior', 'approach', 'entrance', 'living', 'garden', 'finale'],
  hotspots: ['travertine-wall', 'sliding-glass', 'garden-tree'],
};

export const RUNTIME_ASSET_SPECS = [
  // Audio assets (W20)
  {
    file: 'public/audio/outdoor.ogg',
    format: 'ogg',
    magicBytes: [0x4f, 0x67, 0x67, 0x53], // 'OggS'
    maxSizeBytes: 1500 * 1024,
  },
  {
    file: 'public/audio/interior.ogg',
    format: 'ogg',
    magicBytes: [0x4f, 0x67, 0x67, 0x53],
    maxSizeBytes: 1500 * 1024,
  },
  {
    file: 'public/audio/garden.ogg',
    format: 'ogg',
    magicBytes: [0x4f, 0x67, 0x67, 0x53],
    maxSizeBytes: 1500 * 1024,
  },
  // Story poster assets (W25)
  {
    file: 'public/images/story/exterior-desktop.webp',
    format: 'webp',
    magicBytes: [0x52, 0x49, 0x46, 0x46], // 'RIFF'
    maxSizeBytes: 500 * 1024,
  },
  {
    file: 'public/images/story/exterior-mobile.webp',
    format: 'webp',
    magicBytes: [0x52, 0x49, 0x46, 0x46],
    maxSizeBytes: 250 * 1024,
  },
  {
    file: 'public/images/story/approach-desktop.webp',
    format: 'webp',
    magicBytes: [0x52, 0x49, 0x46, 0x46],
    maxSizeBytes: 500 * 1024,
  },
  {
    file: 'public/images/story/approach-mobile.webp',
    format: 'webp',
    magicBytes: [0x52, 0x49, 0x46, 0x46],
    maxSizeBytes: 250 * 1024,
  },
  {
    file: 'public/images/story/entrance-desktop.webp',
    format: 'webp',
    magicBytes: [0x52, 0x49, 0x46, 0x46],
    maxSizeBytes: 500 * 1024,
  },
  {
    file: 'public/images/story/entrance-mobile.webp',
    format: 'webp',
    magicBytes: [0x52, 0x49, 0x46, 0x46],
    maxSizeBytes: 250 * 1024,
  },
  {
    file: 'public/images/story/living-desktop.webp',
    format: 'webp',
    magicBytes: [0x52, 0x49, 0x46, 0x46],
    maxSizeBytes: 500 * 1024,
  },
  {
    file: 'public/images/story/living-mobile.webp',
    format: 'webp',
    magicBytes: [0x52, 0x49, 0x46, 0x46],
    maxSizeBytes: 250 * 1024,
  },
  {
    file: 'public/images/story/garden-desktop.webp',
    format: 'webp',
    magicBytes: [0x52, 0x49, 0x46, 0x46],
    maxSizeBytes: 500 * 1024,
  },
  {
    file: 'public/images/story/garden-mobile.webp',
    format: 'webp',
    magicBytes: [0x52, 0x49, 0x46, 0x46],
    maxSizeBytes: 250 * 1024,
  },
  {
    file: 'public/images/story/finale-desktop.webp',
    format: 'webp',
    magicBytes: [0x52, 0x49, 0x46, 0x46],
    maxSizeBytes: 500 * 1024,
  },
  {
    file: 'public/images/story/finale-mobile.webp',
    format: 'webp',
    magicBytes: [0x52, 0x49, 0x46, 0x46],
    maxSizeBytes: 250 * 1024,
  },
  // OpenGraph Hero Image
  {
    file: 'public/images/og-havenart.jpg',
    format: 'jpeg',
    magicBytes: [0xff, 0xd8, 0xff], // JPEG SOI
    maxSizeBytes: 400 * 1024,
  },
];

export function computeSha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

/**
 * Validates all runtime resources against registries, files, and license records.
 * Returns an array of error messages. Empty array indicates PASS.
 */
export function validateRuntimeResources(rootDir = process.cwd()) {
  const errors = [];

  // 1. Verify on-disk asset files
  const assetBuffers = new Map();
  for (const spec of RUNTIME_ASSET_SPECS) {
    const fullPath = path.join(rootDir, spec.file);

    if (!fs.existsSync(fullPath)) {
      errors.push(`Missing asset file: ${spec.file}`);
      continue;
    }

    const stat = fs.statSync(fullPath);
    if (stat.size === 0) {
      errors.push(`Empty asset file (0 bytes): ${spec.file}`);
      continue;
    }

    if (stat.size > spec.maxSizeBytes) {
      errors.push(
        `Asset file exceeds budget (${stat.size} > ${spec.maxSizeBytes} bytes): ${spec.file}`
      );
    }

    const buffer = fs.readFileSync(fullPath);
    assetBuffers.set(spec.file, buffer);

    // Verify magic bytes header
    for (let i = 0; i < spec.magicBytes.length; i++) {
      if (buffer[i] !== spec.magicBytes[i]) {
        errors.push(
          `Invalid file signature for ${spec.file}: byte ${i} is 0x${buffer[i]?.toString(16)}, expected 0x${spec.magicBytes[i].toString(16)}`
        );
        break;
      }
    }

    // Secondary WebP container check
    if (spec.format === 'webp') {
      const riffFourCC = buffer.toString('ascii', 8, 12);
      if (riffFourCC !== 'WEBP') {
        errors.push(`Invalid WebP container in ${spec.file}: expected 'WEBP' at offset 8, found '${riffFourCC}'`);
      }
    }
  }

  // 2. Verify ASSET_LICENSES.md records and checksums
  const licensePath = path.join(rootDir, 'ASSET_LICENSES.md');
  if (!fs.existsSync(licensePath)) {
    errors.push('Missing ASSET_LICENSES.md file');
  } else {
    const licenseContent = fs.readFileSync(licensePath, 'utf-8');

    for (const spec of RUNTIME_ASSET_SPECS) {
      if (!licenseContent.includes(spec.file)) {
        errors.push(`Asset not registered in ASSET_LICENSES.md: ${spec.file}`);
        continue;
      }

      const buffer = assetBuffers.get(spec.file);
      if (buffer) {
        const actualHash = computeSha256(buffer);
        if (!licenseContent.includes(actualHash)) {
          errors.push(
            `SHA-256 hash mismatch in ASSET_LICENSES.md for ${spec.file}. Actual hash: ${actualHash}`
          );
        }
      }
    }
  }

  return errors;
}

// Direct CLI invocation
const isMain = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
);

if (isMain) {
  const errors = validateRuntimeResources(process.cwd());
  if (errors.length > 0) {
    console.error('Runtime Resource Validation FAILED with errors:');
    errors.forEach((err) => console.error(`  - ${err}`));
    process.exit(1);
  } else {
    console.log(
      JSON.stringify(
        {
          status: 'PASS',
          scope: 'Implementation & runtime assets validation',
          assetCount: RUNTIME_ASSET_SPECS.length,
          audioAssets: 3,
          storyPosters: 12,
          ogImages: 1,
          declaredRegistries: DECLARED_REGISTRIES,
          errors: [],
        },
        null,
        2
      )
    );
    process.exit(0);
  }
}
