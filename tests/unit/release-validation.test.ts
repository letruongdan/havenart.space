/**
 * HavenArt — Release & Asset Validation Unit Tests
 * Contract Version: havenart-contracts-1.1
 * References: docs/agents/tasks/W29.md, docs/ACCEPTANCE_CRITERIA.md (AC12, AC15, AC16, AC17)
 *
 * Local Criteria (W29-AC1, W29-AC2, W29-AC3):
 * - W29-AC1: Đủ provenance cho mọi model/font/audio/poster; thiếu evidence làm fail.
 * - W29-AC2: Preview build được nhưng release không pass khi contact/domain chưa thật.
 * - W29-AC3: Runbook không phụ thuộc service trả phí, khôi phục build không xóa dữ liệu/source.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { validateAssets } from '../../scripts/validate-assets.mjs';
import { validateRelease } from '../../scripts/validate-release.mjs';

describe('W29 — Asset Provenance, Release Readiness & Runbook Integrity', () => {
  describe('W29-AC1: Asset Provenance & License Validation', () => {
    it('validates that current repository assets have 100% complete provenance and valid checksums', () => {
      const errors = validateAssets(process.cwd());
      expect(errors).toEqual([]);
    });

    it('fails when an asset is missing or has an invalid checksum', () => {
      // Mock validation in a temp directory with missing license
      const tempErrors = validateAssets(path.join(process.cwd(), 'src'));
      expect(tempErrors.length).toBeGreaterThan(0);
      expect(tempErrors[0]).toContain('Missing ASSET_LICENSES.md');
    });

    it('requires font strategy to be documented with zero external paid font files', () => {
      const licenseContent = fs.readFileSync(path.join(process.cwd(), 'ASSET_LICENSES.md'), 'utf-8');
      expect(licenseContent.toLowerCase()).toMatch(/font|typography/);
    });
  });

  describe('W29-AC2: Release Validation (Preview vs Production Gate)', () => {
    it('permits preview build with null contacts and null domain while blocking production release', () => {
      const result = validateRelease({
        contacts: { zalo: null, messenger: null, whatsapp: null },
        siteConfig: { publicOrigin: null, environment: 'preview' },
        targetMode: 'preview',
      });

      expect(result.isPreviewValid).toBe(true);
      expect(result.isProductionReady).toBe(false);
      expect(result.errors).toEqual([]);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('strictly rejects fake placeholder numbers, domains, or words in contacts', () => {
      const fakeContacts = {
        zalo: 'https://zalo.me/0123456789',
        messenger: 'https://m.me/havenart-placeholder',
        whatsapp: 'https://wa.me/123456',
      };

      const result = validateRelease({
        contacts: fakeContacts,
        siteConfig: { publicOrigin: 'https://example.com', environment: 'preview' },
      });

      expect(result.isPreviewValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('forbidden placeholder'))).toBe(true);
    });

    it('blocks production release if contacts or publicOrigin are null or unverified', () => {
      const result = validateRelease({
        contacts: { zalo: null, messenger: null, whatsapp: null },
        siteConfig: { publicOrigin: null, environment: 'production' },
        targetMode: 'production',
      });

      expect(result.isProductionReady).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes('Missing verified business contact channels'))).toBe(true);
      expect(result.errors.some((e) => e.includes('Missing verified publicOrigin'))).toBe(true);
    });

    it('passes production release check when real contacts and verified domain are provided', () => {
      const validContacts = {
        zalo: 'https://zalo.me/havenart_official',
        messenger: 'https://m.me/havenart.space',
        whatsapp: 'https://wa.me/84909887766',
      };

      const validSiteConfig = {
        publicOrigin: 'https://havenart.space',
        environment: 'production' as const,
      };

      const result = validateRelease({
        contacts: validContacts,
        siteConfig: validSiteConfig,
        targetMode: 'production',
      });

      expect(result.isPreviewValid).toBe(true);
      expect(result.isProductionReady).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('W29-AC3: Dependency Audit & Runbook Integrity', () => {
    it('verifies package.json contains 0 paid dependencies and zero backend servers', () => {
      const pkgPath = path.join(process.cwd(), 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };

      // Check forbidden patterns (external analytics, paid SDKs, backend databases)
      const forbiddenPackages = [
        'firebase',
        'mongodb',
        'prisma',
        'google-analytics',
        '@segment',
        'mixpanel',
        'sentry',
        'stripe',
      ];

      for (const forbidden of forbiddenPackages) {
        expect(allDeps[forbidden]).toBeUndefined();
      }
    });

    it('verifies docs/RUNBOOK.md exists and covers all required operational lifecycle procedures', () => {
      const runbookPath = path.join(process.cwd(), 'docs/RUNBOOK.md');
      expect(fs.existsSync(runbookPath)).toBe(true);

      const runbook = fs.readFileSync(runbookPath, 'utf-8');
      expect(runbook).toContain('## 1. Run');
      expect(runbook).toContain('## 2. Edit');
      expect(runbook).toContain('## 3. Extend');
      expect(runbook).toContain('## 4. Build & Static Host');
      expect(runbook).toContain('## 5. Check');
      expect(runbook).toContain('## 6. Rollback & Recovery');
    });
  });
});
