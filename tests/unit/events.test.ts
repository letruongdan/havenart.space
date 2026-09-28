/**
 * HavenArt — Analytics Event Validation, Dwell Controller & Lifecycle Unit Tests
 * Contract Version: havenart-contracts-1.1
 */

import { describe, it, expect, vi } from 'vitest';
import {
  validateAnalyticsEvent,
  validateEventPayload,
  createAnalyticsTracker,
  createChapterDwellTracker,
  createExperienceLifecycleTracker,
  createCtaCoordinator,
} from '@/lib/analytics/events';
import type { AnalyticsEvent } from '@/types/telemetry';

describe('Analytics Event Validation (W22-AC1)', () => {
  it('validates all 10 canonical event payloads correctly', () => {
    expect(validateEventPayload('experience_started', { trigger: 'scroll' })).toBe(true);
    expect(validateEventPayload('experience_started', { trigger: 'chapter-nav' })).toBe(true);
    expect(validateEventPayload('experience_started', { trigger: 'hotspot' })).toBe(true);

    expect(
      validateEventPayload('chapter_entered', {
        previousChapterId: null,
        direction: 'initial',
        entryIndex: 1,
      })
    ).toBe(true);
    expect(
      validateEventPayload('chapter_entered', {
        previousChapterId: 'exterior',
        direction: 'forward',
        entryIndex: 2,
      })
    ).toBe(true);

    expect(
      validateEventPayload('hotspot_opened', {
        hotspotId: 'travertine-wall',
        category: 'material',
      })
    ).toBe(true);

    expect(
      validateEventPayload('language_changed', {
        fromLocale: 'vi',
        toLocale: 'en',
      })
    ).toBe(true);

    expect(validateEventPayload('audio_enabled', {})).toBe(true);

    expect(
      validateEventPayload('cta_clicked', {
        placement: 'persistent',
        target: 'contact-section',
      })
    ).toBe(true);

    expect(validateEventPayload('zalo_clicked', { placement: 'finale' })).toBe(true);
    expect(validateEventPayload('messenger_clicked', { placement: 'mid' })).toBe(true);
    expect(validateEventPayload('whatsapp_clicked', { placement: 'persistent' })).toBe(true);

    expect(validateEventPayload('experience_completed', {})).toBe(true);
  });

  it('rejects unknown event names, extra unknown properties, or invalid enums', () => {
    // Unknown trigger
    expect(
      validateEventPayload('experience_started', { trigger: 'auto-load' as unknown as 'scroll' })
    ).toBe(false);

    // Extra property / PII attempt
    expect(
      validateEventPayload('cta_clicked', {
        placement: 'persistent',
        target: 'contact-section',
        userEmail: 'test@example.com',
      } as unknown as { placement: 'persistent'; target: 'contact-section' })
    ).toBe(false);

    // Same locale change
    expect(
      validateEventPayload('language_changed', { fromLocale: 'vi', toLocale: 'vi' })
    ).toBe(false);

    // Invalid chapter ID
    expect(
      validateEventPayload('chapter_entered', {
        previousChapterId: 'invalid-chapter' as unknown as null,
        direction: 'forward',
        entryIndex: 1,
      })
    ).toBe(false);
  });

  it('validates complete AnalyticsEvent envelope strictly', () => {
    const validEvent: AnalyticsEvent = {
      schemaVersion: 1,
      sequence: 1,
      locale: 'vi',
      mode: 'cinematic',
      chapterId: 'living',
      elapsedMs: 1500,
      name: 'cta_clicked',
      payload: {
        placement: 'persistent',
        target: 'contact-section',
      },
    };

    expect(validateAnalyticsEvent(validEvent)).toBe(true);

    // Invalid schema version
    expect(validateAnalyticsEvent({ ...validEvent, schemaVersion: 2 as 1 })).toBe(false);

    // Non-integer or zero sequence
    expect(validateAnalyticsEvent({ ...validEvent, sequence: 0 })).toBe(false);
    expect(validateAnalyticsEvent({ ...validEvent, sequence: 1.5 })).toBe(false);

    // Invalid mode
    expect(validateAnalyticsEvent({ ...validEvent, mode: 'custom' as 'cinematic' })).toBe(false);

    // Negative elapsed time
    expect(validateAnalyticsEvent({ ...validEvent, elapsedMs: -100 })).toBe(false);
  });
});

describe('Analytics Tracker, Bounded Buffer & No-op Sink (W22-AC1, W22-AC3)', () => {
  const currentTime = 1000;
  const mockClock = () => currentTime;

  it('emits events, increments sequence and populates bounded dev buffer up to 100 events', () => {
    const tracker = createAnalyticsTracker({ clock: mockClock, isDev: true, maxBufferSize: 100 });

    expect(tracker.getCurrentSequence()).toBe(1);

    const emitted = tracker.emit(
      'experience_started',
      { trigger: 'scroll' },
      { locale: 'vi', mode: 'cinematic', chapterId: 'exterior' }
    );
    expect(emitted).toBe(true);
    expect(tracker.getCurrentSequence()).toBe(2);

    const buffer = tracker.getDevBuffer();
    expect(buffer.length).toBe(1);
    expect(buffer[0].name).toBe('experience_started');
    expect(buffer[0].sequence).toBe(1);

    // Fill buffer beyond 100 events to verify FIFO capping
    for (let i = 0; i < 110; i++) {
      tracker.emit(
        'cta_clicked',
        { placement: 'persistent', target: 'contact-section' },
        { locale: 'vi', mode: 'cinematic', chapterId: 'exterior' }
      );
    }

    const cappedBuffer = tracker.getDevBuffer();
    expect(cappedBuffer.length).toBe(100);
    expect(cappedBuffer[cappedBuffer.length - 1].sequence).toBe(111);
  });


  it('calls sink safely without crashing on sink exception', () => {
    const throwingSink = vi.fn().mockImplementation(() => {
      throw new Error('Sink network failure');
    });

    const tracker = createAnalyticsTracker({ clock: mockClock, sink: throwingSink });

    expect(() => {
      tracker.emit(
        'audio_enabled',
        {},
        { locale: 'vi', mode: 'cinematic', chapterId: 'living' }
      );
    }).not.toThrow();

    expect(throwingSink).toHaveBeenCalledTimes(1);
  });
});

describe('Chapter Dwell Controller (W22-AC2)', () => {
  let currentTime = 1000;
  const mockClock = () => currentTime;

  it('emits chapter_entered only after stable 300ms dwell while visible', () => {
    const onEnter = vi.fn();
    const dwellTracker = createChapterDwellTracker({ onEnter, dwellMs: 300, clock: mockClock });

    // Step 1: Initial visit to exterior
    dwellTracker.update('exterior', true);
    expect(onEnter).not.toHaveBeenCalled();

    // Fast scroll after 150ms to approach (did not dwell 300ms on exterior)
    currentTime += 150;
    dwellTracker.update('approach', true);
    expect(onEnter).not.toHaveBeenCalled();

    // Dwell on approach for 300ms
    currentTime += 300;
    dwellTracker.update('approach', true);
    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onEnter).toHaveBeenCalledWith({
      chapterId: 'approach',
      previousChapterId: null,
      direction: 'initial',
      entryIndex: 1,
    });
  });

  it('cancels dwell timer if document becomes hidden before 300ms', () => {
    const onEnter = vi.fn();
    const dwellTracker = createChapterDwellTracker({ onEnter, dwellMs: 300, clock: mockClock });

    dwellTracker.update('entrance', true);
    currentTime += 200;

    // User hides tab
    dwellTracker.update('entrance', false);
    currentTime += 200;

    // User returns
    dwellTracker.update('entrance', true);
    currentTime += 100;
    // Only 100ms since return, must not fire yet
    expect(onEnter).not.toHaveBeenCalled();

    // Dwell 200ms more to reach 300ms
    currentTime += 200;
    dwellTracker.update('entrance', true);
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it('supports A -> B -> A sequence with backward direction and incremented entryIndex', () => {
    const onEnter = vi.fn();
    const dwellTracker = createChapterDwellTracker({ onEnter, dwellMs: 300, clock: mockClock });

    // 1. Visit living (A)
    dwellTracker.update('living', true);
    currentTime += 300;
    dwellTracker.update('living', true);
    expect(onEnter).toHaveBeenLastCalledWith({
      chapterId: 'living',
      previousChapterId: null,
      direction: 'initial',
      entryIndex: 1,
    });

    // 2. Advance to garden (B)
    currentTime += 100;
    dwellTracker.update('garden', true);
    currentTime += 300;
    dwellTracker.update('garden', true);
    expect(onEnter).toHaveBeenLastCalledWith({
      chapterId: 'garden',
      previousChapterId: 'living',
      direction: 'forward',
      entryIndex: 1,
    });

    // 3. Return back to living (A)
    currentTime += 100;
    dwellTracker.update('living', true);
    currentTime += 300;
    dwellTracker.update('living', true);
    expect(onEnter).toHaveBeenLastCalledWith({
      chapterId: 'living',
      previousChapterId: 'garden',
      direction: 'backward',
      entryIndex: 2, // Second entry into living
    });

    expect(onEnter).toHaveBeenCalledTimes(3);
  });
});

describe('Experience Lifecycle Controller (W22-AC2)', () => {
  let currentTime = 1000;
  const mockClock = () => currentTime;

  it('experience_started emits at most once upon user exploration', () => {
    const onStart = vi.fn();
    const onComplete = vi.fn();
    const lifecycle = createExperienceLifecycleTracker({ onStart, onComplete, clock: mockClock });

    expect(lifecycle.hasStarted()).toBe(false);

    expect(lifecycle.triggerStart('scroll')).toBe(true);
    expect(onStart).toHaveBeenCalledWith('scroll');
    expect(lifecycle.hasStarted()).toBe(true);

    // Second trigger attempt is ignored
    expect(lifecycle.triggerStart('chapter-nav')).toBe(false);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('experience_completed requires started state, progress >= 0.99, and 1000ms CTA dwell', () => {
    const onStart = vi.fn();
    const onComplete = vi.fn();
    const lifecycle = createExperienceLifecycleTracker({
      onStart,
      onComplete,
      ctaDwellMs: 1000,
      clock: mockClock,
    });

    // Cannot complete before starting
    lifecycle.updateCompletionState({ renderedProgress: 1.0, ctaRatioVisible: 1.0, isVisible: true });
    expect(onComplete).not.toHaveBeenCalled();

    // Start experience
    lifecycle.triggerStart('scroll');

    // Progress at 0.95 (not >= 0.99)
    lifecycle.updateCompletionState({ renderedProgress: 0.95, ctaRatioVisible: 1.0, isVisible: true });
    currentTime += 1200;
    lifecycle.updateCompletionState({ renderedProgress: 0.95, ctaRatioVisible: 1.0, isVisible: true });
    expect(onComplete).not.toHaveBeenCalled();

    // Progress 0.99 and CTA visible 50%
    lifecycle.updateCompletionState({ renderedProgress: 0.99, ctaRatioVisible: 0.5, isVisible: true });
    currentTime += 500;
    lifecycle.updateCompletionState({ renderedProgress: 0.99, ctaRatioVisible: 0.5, isVisible: true });
    expect(onComplete).not.toHaveBeenCalled();

    // Dwell reaches 1000ms
    currentTime += 500;
    lifecycle.updateCompletionState({ renderedProgress: 0.99, ctaRatioVisible: 0.5, isVisible: true });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(lifecycle.hasCompleted()).toBe(true);

    // Subsequent updates do not re-emit
    currentTime += 2000;
    lifecycle.updateCompletionState({ renderedProgress: 1.0, ctaRatioVisible: 1.0, isVisible: true });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe('CTA Click Coordinator & Deduplication (W22-AC3)', () => {
  let currentTime = 1000;
  const mockClock = () => currentTime;

  it('suppresses duplicate click events within 300ms window', () => {
    const onCta = vi.fn();
    const onChannel = vi.fn();
    const coordinator = createCtaCoordinator(onCta, onChannel, { dedupeWindowMs: 300, clock: mockClock });

    // First click
    const res1 = coordinator.handleClick('persistent', 'contact-section');
    expect(res1).toBe(true);
    expect(onCta).toHaveBeenCalledTimes(1);

    // Rapid second click (e.g. bubbling from inner button to outer link at +10ms)
    currentTime += 10;
    const res2 = coordinator.handleClick('persistent', 'contact-section');
    expect(res2).toBe(false);
    expect(onCta).toHaveBeenCalledTimes(1);

    // Click after dedupe window expires (+350ms)
    currentTime += 350;
    const res3 = coordinator.handleClick('persistent', 'contact-section');
    expect(res3).toBe(true);
    expect(onCta).toHaveBeenCalledTimes(2);
  });

  it('triggers both CTA and specific channel callback for channel links', () => {
    const onCta = vi.fn();
    const onChannel = vi.fn();
    const coordinator = createCtaCoordinator(onCta, onChannel, { clock: mockClock });

    coordinator.handleClick('finale', 'zalo');
    expect(onCta).toHaveBeenCalledWith({ placement: 'finale', target: 'zalo' });
    expect(onChannel).toHaveBeenCalledWith('zalo', 'finale');
  });
});
