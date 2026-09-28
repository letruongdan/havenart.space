/**
 * HavenArt — Mode Selection & Experience Gate Unit Tests
 * Contract Version: havenart-contracts-1.1
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import {
  selectMode,
  detectWebGlSupport,
  detectReducedMotion,
  isScrolledFar,
  SCROLLED_FAR_THRESHOLD_PX,
} from '@/lib/performance/selectMode';
import { ZoneBoundary } from '@/components/scene/ZoneBoundary';

describe('selectMode logic (W11-AC1, W11-AC2)', () => {
  it('selects static mode with reason "reduced-motion" when prefersReducedMotion is true', () => {
    const result = selectMode({
      prefersReducedMotion: true,
      webglSupported: true,
      isReady: true,
    });
    expect(result.mode).toBe('static');
    expect(result.staticReason).toBe('reduced-motion');
  });

  it('selects static mode with reason "user" when userRequestedStatic is true', () => {
    const result = selectMode({
      prefersReducedMotion: false,
      userRequestedStatic: true,
      webglSupported: true,
      isReady: true,
    });
    expect(result.mode).toBe('static');
    expect(result.staticReason).toBe('user');
  });

  it('selects static mode with reason "unsupported" when webglSupported is false', () => {
    const result = selectMode({
      prefersReducedMotion: false,
      webglSupported: false,
      isReady: false,
    });
    expect(result.mode).toBe('static');
    expect(result.staticReason).toBe('unsupported');
  });

  it('selects static mode with reason "unsupported" when GPU context is lost', () => {
    const result = selectMode({
      prefersReducedMotion: false,
      webglSupported: true,
      hasContextLost: true,
      isReady: true,
    });
    expect(result.mode).toBe('static');
    expect(result.staticReason).toBe('unsupported');
  });

  it('selects static mode with reason "load-error" when core load fails', () => {
    const result = selectMode({
      prefersReducedMotion: false,
      webglSupported: true,
      hasCoreLoadError: true,
      isReady: false,
    });
    expect(result.mode).toBe('static');
    expect(result.staticReason).toBe('load-error');
  });

  it('selects static mode with reason "user" when user scrolled far before 3D was ready', () => {
    const result = selectMode({
      prefersReducedMotion: false,
      webglSupported: true,
      hasScrolledFarBeforeReady: true,
      isReady: false,
    });
    expect(result.mode).toBe('static');
    expect(result.staticReason).toBe('user');
  });

  it('selects cinematic mode when all conditions are met and 3D is ready', () => {
    const result = selectMode({
      prefersReducedMotion: false,
      webglSupported: true,
      isReady: true,
    });
    expect(result.mode).toBe('cinematic');
    expect(result.staticReason).toBeNull();
  });

  it('selects loading mode when 3D is supported and allowed but not yet ready', () => {
    const result = selectMode({
      prefersReducedMotion: false,
      webglSupported: true,
      isReady: false,
    });
    expect(result.mode).toBe('loading');
    expect(result.staticReason).toBeNull();
  });

  it('enforces strict priority: reduced-motion overrides WebGL support and ready status', () => {
    const result = selectMode({
      prefersReducedMotion: true,
      userRequestedStatic: false,
      webglSupported: true,
      isReady: true,
    });
    expect(result.mode).toBe('static');
    expect(result.staticReason).toBe('reduced-motion');
  });
});

describe('scroll threshold & environment detection', () => {
  it('identifies scrolled far correctly based on threshold', () => {
    expect(isScrolledFar(0)).toBe(false);
    expect(isScrolledFar(SCROLLED_FAR_THRESHOLD_PX)).toBe(false);
    expect(isScrolledFar(SCROLLED_FAR_THRESHOLD_PX + 1)).toBe(true);
    expect(isScrolledFar(600)).toBe(true);
  });

  it('returns false for detectWebGlSupport in Node environment', () => {
    expect(detectWebGlSupport()).toBe(false);
  });

  it('returns false for detectReducedMotion in Node environment', () => {
    expect(detectReducedMotion()).toBe(false);
  });
});

describe('ZoneBoundary error handling (W11-AC2)', () => {
  // Silent console.error during expected boundary error catches
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error occurs', () => {
    const boundary = new ZoneBoundary({
      zoneId: 'test-zone',
      children: React.createElement('div', { id: 'child' }, 'Content'),
    });
    const rendered = boundary.render();
    expect(rendered).toBeDefined();
  });

  it('catches decorative failure and renders fallback proxy', () => {
    const fallbackNode = React.createElement('div', { id: 'proxy' }, 'Fallback Proxy');
    const boundary = new ZoneBoundary({
      zoneId: 'decorative-zone',
      isCore: false,
      fallback: fallbackNode,
    });

    const error = new Error('Decorative GLB asset load failed');
    const state = ZoneBoundary.getDerivedStateFromError(error);
    expect(state.hasError).toBe(true);
    expect(state.error).toBe(error);

    // Apply error state and render
    (boundary as unknown as { state: typeof state }).state = state;
    const rendered = boundary.render();
    expect(rendered).toBe(fallbackNode);
  });

  it('notifies onCoreFailure when a core zone fails', () => {
    const onCoreFailure = vi.fn();
    const boundary = new ZoneBoundary({
      zoneId: 'shell',
      isCore: true,
      onCoreFailure,
    });

    const error = new Error('VillaShell load failed');
    boundary.componentDidCatch(error, { componentStack: '' });

    expect(onCoreFailure).toHaveBeenCalledWith(error);
  });
});
