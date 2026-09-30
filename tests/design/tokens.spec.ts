import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import tokens from '../../src/styles/tokens.json';

// Helper to calculate relative luminance for WCAG AA contrast verification
function parseHexColor(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return [r, g, b];
}

function getChannelLuminance(val: number): number {
  return val <= 0.04045 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance(hex: string): number {
  const [r, g, b] = parseHexColor(hex);
  return (
    0.2126 * getChannelLuminance(r) +
    0.7152 * getChannelLuminance(g) +
    0.0722 * getChannelLuminance(b)
  );
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Design Tokens Contract', () => {
  it('must define essential calm palette and accessible contrast tokens', () => {
    expect(tokens.color).toHaveProperty('background');
    expect(tokens.color).toHaveProperty('surface');
    expect(tokens.color).toHaveProperty('textPrimary');
    expect(tokens.color).toHaveProperty('textMuted');
    expect(tokens.color).toHaveProperty('border');
    expect(tokens.color).toHaveProperty('accent');
    expect(tokens.motion).toHaveProperty('reducedMotionFallback');
  });

  it('must provide complete motion tokens and strict 0s reduced motion fallback', () => {
    expect(tokens.motion).toHaveProperty('durationNormal');
    expect(tokens.motion).toHaveProperty('durationFast');
    expect(tokens.motion).toHaveProperty('durationSlow');
    expect(tokens.motion).toHaveProperty('easing');
    expect(tokens.motion.reducedMotionFallback).toBe('0s');
  });

  it('must provide spacing and radius scale including radius-haven', () => {
    expect(tokens.radius).toHaveProperty('haven');
    expect(tokens.radius.haven).toBeDefined();
    expect(tokens.spacing).toHaveProperty('md');
    expect(tokens.spacing).toHaveProperty('lg');
  });

  it('must satisfy WCAG AA contrast ratio (>= 4.5:1) for primary and muted text in light palette', () => {
    const bg = tokens.color.background;
    const textPrimary = tokens.color.textPrimary;
    const textMuted = tokens.color.textMuted;

    const primaryContrast = getContrastRatio(bg, textPrimary);
    const mutedContrast = getContrastRatio(bg, textMuted);

    expect(primaryContrast).toBeGreaterThanOrEqual(4.5);
    expect(mutedContrast).toBeGreaterThanOrEqual(4.5);
  });

  it('must define calm dark theme with WCAG AA compliant contrast ratio', () => {
    expect(tokens.color).toHaveProperty('dark');
    const dark = tokens.color.dark;
    expect(dark).toHaveProperty('background');
    expect(dark).toHaveProperty('surface');
    expect(dark).toHaveProperty('textPrimary');
    expect(dark).toHaveProperty('textMuted');

    const darkPrimaryContrast = getContrastRatio(dark.background, dark.textPrimary);
    const darkMutedContrast = getContrastRatio(dark.background, dark.textMuted);

    expect(darkPrimaryContrast).toBeGreaterThanOrEqual(4.5);
    expect(darkMutedContrast).toBeGreaterThanOrEqual(4.5);
  });

  it('must have matching CSS custom properties in tokens.css', () => {
    const cssPath = path.resolve(__dirname, '../../src/styles/tokens.css');
    expect(fs.existsSync(cssPath)).toBe(true);

    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    // Root properties
    expect(cssContent).toContain('--color-bg:');
    expect(cssContent).toContain('--color-surface:');
    expect(cssContent).toContain('--color-text:');
    expect(cssContent).toContain('--color-text-primary:');
    expect(cssContent).toContain('--color-text-muted:');
    expect(cssContent).toContain('--color-border:');
    expect(cssContent).toContain('--color-accent:');
    expect(cssContent).toContain('--radius-haven:');
    expect(cssContent).toContain('--motion-safe-duration:');

    // Strict prefers-reduced-motion override
    expect(cssContent).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(cssContent).toMatch(/--motion-safe-duration:\s*0s/);

    // Dark theme override
    expect(cssContent).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)|\[data-theme="dark"\]/);
  });
});
