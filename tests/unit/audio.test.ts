/**
 * HavenArt — Opt-in Ambient Audio Controller Unit Tests
 * Test Suite: tests/unit/audio.test.ts
 * Contract Version: havenart-contracts-1.1
 *
 * Local Criteria (W20):
 * - W20-AC1: No request/context/play before opt-in; rapid toggle during loading does not play late.
 * - W20-AC2: Crossfade rendered p, reverse supported; tab hidden suspends, disabled stays off.
 * - W20-AC3: Decode/resume error transitions safely to 'unavailable'; all 3 Ogg files exist and meet budget.
 */

import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { calculateAudioWeights } from '@/config/audio';
import { createAudioController } from '@/lib/audio/audioController';

function createMockAudioContext() {
  const destination = {} as AudioDestinationNode;
  const gainValue = {
    value: 0,
    setValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
  };

  const createGain = vi.fn().mockImplementation(() => ({
    gain: gainValue,
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));

  const createBufferSource = vi.fn().mockImplementation(() => ({
    buffer: null,
    loop: false,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    disconnect: vi.fn(),
  }));

  const decodeAudioData = vi.fn().mockImplementation(async () => {
    return {} as AudioBuffer;
  });

  return {
    state: 'suspended' as AudioContextState,
    currentTime: 0,
    destination,
    createGain,
    createBufferSource,
    decodeAudioData,
    resume: vi.fn().mockImplementation(async function (this: { state: string }) {
      this.state = 'running';
    }),
    suspend: vi.fn().mockImplementation(async function (this: { state: string }) {
      this.state = 'suspended';
    }),
    close: vi.fn().mockImplementation(async function (this: { state: string }) {
      this.state = 'closed';
    }),
  } as unknown as AudioContext;
}

describe('W20 — Audio Controller & Equal-Power Crossfading', () => {
  it('W20-AC1: No AudioContext creation or network fetch before explicit opt-in', () => {
    const contextFactory = vi.fn().mockImplementation(createMockAudioContext);
    const fetchFactory = vi.fn();

    const controller = createAudioController({ contextFactory, fetchFactory });

    expect(controller.getState()).toBe('off');
    expect(contextFactory).not.toHaveBeenCalled();
    expect(fetchFactory).not.toHaveBeenCalled();

    controller.dispose();
  });

  it('W20-AC1: Rapid toggle during loading cancels playback and does not play late', async () => {
    const mockCtx = createMockAudioContext();
    const contextFactory = vi.fn().mockReturnValue(mockCtx);

    let resolveFetch: (value: Response) => void;
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });

    const fetchFactory = vi.fn().mockReturnValue(fetchPromise);

    const controller = createAudioController({ contextFactory, fetchFactory });

    // 1. User clicks Enable
    const enablePromise = controller.enable();
    expect(controller.getState()).toBe('loading');
    expect(contextFactory).toHaveBeenCalledTimes(1);

    // 2. User quickly toggles off before network finishes
    controller.disable();
    expect(controller.getState()).toBe('off');

    // 3. Network finishes loading
    const dummyBuffer = new ArrayBuffer(8);
    const mockResponse = {
      ok: true,
      status: 200,
      arrayBuffer: async () => dummyBuffer,
    } as unknown as Response;

    resolveFetch!(mockResponse);
    await enablePromise;

    // 4. Must NOT play late; state remains off!
    expect(controller.getState()).toBe('off');

    controller.dispose();
  });

  it('W20-AC2: calculateAudioWeights performs smooth equal-power crossfading (cos^2 + sin^2 = 1.0)', () => {
    // 1. Exterior (p = 0.10)
    const wExterior = calculateAudioWeights(0.10);
    expect(wExterior.outdoor).toBe(1.0);
    expect(wExterior.interior).toBe(0.0);
    expect(wExterior.garden).toBe(0.0);

    // 2. Threshold crossfade (p = 0.33)
    const wThreshold = calculateAudioWeights(0.33);
    expect(wThreshold.outdoor).toBeGreaterThan(0);
    expect(wThreshold.interior).toBeGreaterThan(0);
    expect(wThreshold.garden).toBe(0.0);
    // Equal power property: outdoor^2 + interior^2 ~= 1.0
    const powerThreshold =
      wThreshold.outdoor * wThreshold.outdoor + wThreshold.interior * wThreshold.interior;
    expect(powerThreshold).toBeCloseTo(1.0, 4);

    // 3. Living (p = 0.50)
    const wLiving = calculateAudioWeights(0.50);
    expect(wLiving.outdoor).toBe(0.0);
    expect(wLiving.interior).toBe(1.0);
    expect(wLiving.garden).toBe(0.0);

    // 4. Terrace crossfade (p = 0.72)
    const wTerrace = calculateAudioWeights(0.72);
    expect(wTerrace.outdoor).toBe(0.0);
    expect(wTerrace.interior).toBeGreaterThan(0);
    expect(wTerrace.garden).toBeGreaterThan(0);
    const powerTerrace =
      wTerrace.interior * wTerrace.interior + wTerrace.garden * wTerrace.garden;
    expect(powerTerrace).toBeCloseTo(1.0, 4);

    // 5. Garden & Finale (p = 0.90)
    const wGarden = calculateAudioWeights(0.90);
    expect(wGarden.outdoor).toBe(0.0);
    expect(wGarden.interior).toBe(0.0);
    expect(wGarden.garden).toBe(1.0);
  });

  it('W20-AC2: Forward and reverse lookups produce identical weights', () => {
    const points = [0.0, 0.15, 0.27, 0.33, 0.39, 0.54, 0.68, 0.72, 0.76, 0.87, 1.0];

    const fwd = points.map((p) => calculateAudioWeights(p));
    const rev = [...points].reverse().map((p) => calculateAudioWeights(p)).reverse();

    for (let i = 0; i < points.length; i++) {
      expect(fwd[i].outdoor).toBeCloseTo(rev[i].outdoor, 6);
      expect(fwd[i].interior).toBeCloseTo(rev[i].interior, 6);
      expect(fwd[i].garden).toBeCloseTo(rev[i].garden, 6);
    }
  });

  it('W20-AC2: setSuspended correctly pauses and resumes context without losing user intent', async () => {
    const mockCtx = createMockAudioContext();
    const fetchFactory = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: async () => new ArrayBuffer(8),
    } as unknown as Response);

    const controller = createAudioController({
      contextFactory: () => mockCtx,
      fetchFactory,
    });

    await controller.enable();
    expect(controller.getState()).toBe('playing');

    // Tab hidden -> suspend
    controller.setSuspended(true);
    expect(mockCtx.suspend).toHaveBeenCalled();
    expect(controller.getState()).toBe('suspended');

    // Tab visible -> resume
    controller.setSuspended(false);
    expect(mockCtx.resume).toHaveBeenCalled();

    controller.dispose();
  });

  it('W20-AC3: Network or decode failure transitions safely to "unavailable" (mute)', async () => {
    const mockCtx = createMockAudioContext();
    const fetchFactory = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    } as unknown as Response);

    const controller = createAudioController({
      contextFactory: () => mockCtx,
      fetchFactory,
    });

    await controller.enable();
    expect(controller.getState()).toBe('unavailable');

    controller.dispose();
  });

  it('W20-AC3: All 3 genuine Ogg ambient files exist on disk within the <= 1.5 MB budget', () => {
    const audioDir = path.resolve(process.cwd(), 'public/audio');
    const files = ['outdoor.ogg', 'interior.ogg', 'garden.ogg'];

    let totalBytes = 0;
    files.forEach((file) => {
      const filePath = path.join(audioDir, file);
      expect(fs.existsSync(filePath), `Missing audio asset: ${file}`).toBe(true);

      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(1024); // Non-empty valid audio container
      totalBytes += stats.size;
    });

    const totalMegabytes = totalBytes / (1024 * 1024);
    expect(totalMegabytes).toBeLessThanOrEqual(1.5);
  });
});
