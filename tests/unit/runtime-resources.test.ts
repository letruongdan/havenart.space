import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  validateRuntimeResources,
  DECLARED_REGISTRIES,
  computeSha256,
} from '../../scripts/validate-runtime-resources.mjs';

describe('W25 — Runtime Resources Validation', () => {
  it('passes cleanly on actual project runtime resources', () => {
    const errors = validateRuntimeResources(process.cwd());
    expect(errors).toEqual([]);
  });

  it('declares all expected registries per CONTRACTS.md C03 & C10', () => {
    expect(DECLARED_REGISTRIES.lighting).toEqual(['golden', 'sunset', 'dusk']);
    expect(DECLARED_REGISTRIES.audio).toEqual(['outdoor', 'threshold', 'indoor', 'garden']);
    expect(DECLARED_REGISTRIES.zones).toEqual(['exterior', 'entrance', 'living', 'garden']);
    expect(DECLARED_REGISTRIES.posters).toHaveLength(6);
    expect(DECLARED_REGISTRIES.hotspots).toEqual(['travertine-wall', 'sliding-glass', 'garden-tree']);
  });

  it('fails if an asset file is missing in mock directory', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'havenart-test-'));
    try {
      const errors = validateRuntimeResources(tempDir);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('Missing asset file'))).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('fails if an asset has corrupted magic bytes', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'havenart-corrupt-'));
    try {
      // Create mock audio directory and corrupted file
      fs.mkdirSync(path.join(tempDir, 'public/audio'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'public/images/story'), { recursive: true });

      // Corrupted file (not starting with OggS)
      fs.writeFileSync(path.join(tempDir, 'public/audio/outdoor.ogg'), Buffer.from('NOT_AN_OGG_FILE_CORRUPT_BYTES'));

      const errors = validateRuntimeResources(tempDir);
      expect(errors.some((e) => e.includes('Invalid file signature'))).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('fails if an asset file is 0 bytes (empty)', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'havenart-empty-'));
    try {
      fs.mkdirSync(path.join(tempDir, 'public/audio'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'public/audio/outdoor.ogg'), Buffer.alloc(0));

      const errors = validateRuntimeResources(tempDir);
      expect(errors.some((e) => e.includes('Empty asset file'))).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('fails if ASSET_LICENSES.md is missing or does not include the asset', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'havenart-nolicense-'));
    try {
      fs.mkdirSync(path.join(tempDir, 'public/audio'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'public/images/story'), { recursive: true });

      // Create valid outdoor.ogg buffer from actual project
      const actualOgg = fs.readFileSync(path.join(process.cwd(), 'public/audio/outdoor.ogg'));
      fs.writeFileSync(path.join(tempDir, 'public/audio/outdoor.ogg'), actualOgg);

      // Create mock ASSET_LICENSES.md without outdoor.ogg
      fs.writeFileSync(path.join(tempDir, 'ASSET_LICENSES.md'), '# Empty License Registry');

      const errors = validateRuntimeResources(tempDir);
      expect(errors.some((e) => e.includes('not registered in ASSET_LICENSES.md'))).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('correctly calculates SHA-256 uppercase hex', () => {
    const testBuf = Buffer.from('HavenArt');
    const hash = computeSha256(testBuf);
    expect(hash).toMatch(/^[0-9A-F]{64}$/);
  });
});
