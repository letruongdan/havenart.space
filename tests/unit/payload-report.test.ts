import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { measurePayload } from '../../scripts/measure-payload.mjs';

describe('W26 — Performance & Payload Report', () => {
  it('measures production build and passes all payload budgets', () => {
    const report = measurePayload();

    expect(report.allBudgetsPassed).toBe(true);

    // 1. Core 3D budget <= 8 MB
    expect(report.budgets.core3d.passed).toBe(true);
    expect(report.budgets.core3d.actual).toBeLessThanOrEqual(report.budgets.core3d.target);

    // 2. Initial scene assets budget <= 15 MB
    expect(report.budgets.initialScene.passed).toBe(true);
    expect(report.budgets.initialScene.actual).toBeLessThanOrEqual(report.budgets.initialScene.target);

    // 3. Total audio budget <= 1.5 MB
    expect(report.budgets.totalAudio.passed).toBe(true);
    expect(report.budgets.totalAudio.actual).toBeLessThanOrEqual(report.budgets.totalAudio.target);
    expect(report.counts.audioFiles).toBe(3);

    // 4. Max mobile poster budget <= 250 KB
    expect(report.budgets.mobilePoster.passed).toBe(true);
    expect(report.budgets.mobilePoster.actual).toBeLessThanOrEqual(report.budgets.mobilePoster.target);
    expect(report.counts.mobilePosters).toBe(6);
    expect(report.counts.desktopPosters).toBe(6);

    // 5. OpenGraph image present
    expect(report.counts.ogFiles).toBe(1);
    expect(report.totals.ogBytes).toBeGreaterThan(0);
  });

  it('correctly separates JS, CSS, and HTML metrics', () => {
    const report = measurePayload();

    expect(report.totals.jsBytes).toBeGreaterThan(0);
    expect(report.totals.cssBytes).toBeGreaterThan(0);
    expect(report.totals.htmlBytes).toBeGreaterThan(0);
    expect(report.counts.jsFiles).toBeGreaterThan(0);
    expect(report.counts.cssFiles).toBeGreaterThan(0);
    expect(report.counts.htmlFiles).toBeGreaterThan(0);
  });

  it('detects and flags violations when mobile poster exceeds budget', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'havenart-payload-'));
    try {
      const storyDir = path.join(tempDir, 'public/images/story');
      fs.mkdirSync(storyDir, { recursive: true });

      // Create an oversized mobile poster (300 KB > 250 KB target)
      const oversizedBuffer = Buffer.alloc(300 * 1024);
      fs.writeFileSync(path.join(storyDir, 'exterior-mobile.webp'), oversizedBuffer);

      const report = measurePayload({ rootDir: tempDir });
      expect(report.budgets.mobilePoster.passed).toBe(false);
      expect(report.allBudgetsPassed).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
