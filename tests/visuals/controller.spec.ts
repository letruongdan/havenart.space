import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  VisualController,
  type VisualMode,
  type VisualControllerOptions,
  CURATED_ARTWORKS,
  getAllArtworks,
  getArtworkById,
  getDefaultArtwork,
} from '../../src/lib/visuals/controller';

function createMockWebGL2Context() {
  const gl = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    TRIANGLES: 4,

    createShader: vi.fn((type: number) => ({ id: `shader-${type}`, type })),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(),
    detachShader: vi.fn(),

    createProgram: vi.fn(() => ({ id: 'mock-program' })),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    deleteProgram: vi.fn(),
    useProgram: vi.fn(),

    getUniformLocation: vi.fn((_prog: unknown, name: string) => ({ name })),
    getAttribLocation: vi.fn((_prog: unknown, name: string) => (name === 'a_position' ? 0 : -1)),

    createVertexArray: vi.fn(() => ({ id: 'mock-vao' })),
    bindVertexArray: vi.fn(),
    deleteVertexArray: vi.fn(),

    createBuffer: vi.fn(() => ({ id: 'mock-buffer' })),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    deleteBuffer: vi.fn(),

    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),

    viewport: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    drawArrays: vi.fn(),
  };

  return gl;
}

describe('VisualController', () => {
  let originalDevicePixelRatio: number | undefined;
  let originalHidden: boolean | undefined;
  let activeControllers: VisualController[] = [];

  function createController(options?: VisualControllerOptions): VisualController {
    const controller = new VisualController(options);
    activeControllers.push(controller);
    return controller;
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    originalDevicePixelRatio = window.devicePixelRatio;
    originalHidden = document.hidden;
  });

  afterEach(() => {
    activeControllers.forEach((c) => c.destroy());
    activeControllers = [];

    if (originalDevicePixelRatio !== undefined) {
      window.devicePixelRatio = originalDevicePixelRatio;
    }
    Object.defineProperty(document, 'hidden', {
      value: originalHidden ?? false,
      configurable: true,
      writable: true,
    });
  });

  describe('1. WebGL2 Fallback & Accessibility Gating', () => {
    it('falls back to static image mode if webgl2 is not supported', () => {
      const controller = createController({ hasWebGL2: false, prefersReducedMotion: false });
      expect(controller.getActiveMode()).toBe('static');
      expect(controller.getVisualMode()).toBe('static');
    });

    it('forces static image mode when prefers-reduced-motion is true', () => {
      const controller = createController({ hasWebGL2: true, prefersReducedMotion: true });
      expect(controller.getActiveMode()).toBe('static');
      expect(controller.getVisualMode()).toBe('static');
    });

    it('defaults to shader mode when webgl2 is supported and reduced motion is false', () => {
      const controller = createController({ hasWebGL2: true, prefersReducedMotion: false });
      expect(controller.getActiveMode()).toBe('shader');
      expect(controller.getVisualMode()).toBe('shader');
    });

    it('prevents switching to shader mode when webgl2 is not supported', () => {
      const onModeChange = vi.fn();
      const controller = createController({
        hasWebGL2: false,
        prefersReducedMotion: false,
        onModeChange,
      });

      controller.setMode('shader');
      expect(controller.getActiveMode()).toBe('static');
      expect(onModeChange).toHaveBeenCalledWith('static');
    });

    it('prevents switching to shader mode when prefers-reduced-motion is active', () => {
      const controller = createController({
        hasWebGL2: true,
        prefersReducedMotion: true,
      });

      controller.setMode('shader');
      expect(controller.getActiveMode()).toBe('static');
    });

    it('switches between shader and static modes via setMode and setVisualMode when supported', () => {
      const modes: VisualMode[] = [];
      const controller = createController({
        hasWebGL2: true,
        prefersReducedMotion: false,
        onModeChange: (m) => modes.push(m),
      });

      expect(controller.getActiveMode()).toBe('shader');

      controller.setMode('static');
      expect(controller.getActiveMode()).toBe('static');

      controller.setVisualMode('shader');
      expect(controller.getActiveMode()).toBe('shader');

      expect(modes).toEqual(['static', 'shader']);
    });
  });

  describe('2. WebGL Context Loss & Recovery', () => {
    it('gracefully falls back to static mode on webglcontextlost event and prevents default', async () => {
      const canvas = document.createElement('canvas');
      const mockGl = createMockWebGL2Context();
      vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl as unknown as WebGL2RenderingContext);

      const controller = createController({
        hasWebGL2: true,
        prefersReducedMotion: false,
      });

      await controller.init(canvas);
      expect(controller.getActiveMode()).toBe('shader');

      // Dispatch webglcontextlost
      const event = new Event('webglcontextlost', { cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      canvas.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(controller.getActiveMode()).toBe('static');

      // Attempting to switch back to shader while context is lost should be blocked
      controller.setMode('shader');
      expect(controller.getActiveMode()).toBe('static');
    });

    it('restores shader mode on webglcontextrestored if shader mode was previously requested', async () => {
      const canvas = document.createElement('canvas');
      const mockGl = createMockWebGL2Context();
      vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl as unknown as WebGL2RenderingContext);

      const controller = createController({
        hasWebGL2: true,
        prefersReducedMotion: false,
      });

      await controller.init(canvas);
      expect(controller.getActiveMode()).toBe('shader');

      // Lose context
      const lostEvent = new Event('webglcontextlost', { cancelable: true });
      canvas.dispatchEvent(lostEvent);
      expect(controller.getActiveMode()).toBe('static');

      // Restore context
      const restoredEvent = new Event('webglcontextrestored');
      canvas.dispatchEvent(restoredEvent);

      expect(controller.getActiveMode()).toBe('shader');
    });
  });

  describe('3. Power & Performance Optimization (DPR Capping & Visibility)', () => {
    it('caps canvas resolution to maxDpr (1.5 by default) on high-DPI displays', async () => {
      window.devicePixelRatio = 3.0; // Retina / high-end mobile display

      const canvas = document.createElement('canvas');
      Object.defineProperty(canvas, 'clientWidth', { value: 1000, configurable: true });
      Object.defineProperty(canvas, 'clientHeight', { value: 800, configurable: true });

      const mockGl = createMockWebGL2Context();
      vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl as unknown as WebGL2RenderingContext);

      const controller = createController({
        hasWebGL2: true,
        prefersReducedMotion: false,
      });

      await controller.init(canvas);
      controller.updateCanvasSize();

      // With clientWidth 1000 and maxDpr 1.5: 1000 * 1.5 = 1500 (NOT 3000)
      expect(canvas.width).toBe(1500);
      expect(canvas.height).toBe(1200);
      expect(mockGl.viewport).toHaveBeenCalledWith(0, 0, 1500, 1200);
    });

    it('honors custom maxDpr option', async () => {
      window.devicePixelRatio = 3.0;

      const canvas = document.createElement('canvas');
      Object.defineProperty(canvas, 'clientWidth', { value: 800, configurable: true });
      Object.defineProperty(canvas, 'clientHeight', { value: 600, configurable: true });

      const mockGl = createMockWebGL2Context();
      vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl as unknown as WebGL2RenderingContext);

      const controller = createController({
        hasWebGL2: true,
        prefersReducedMotion: false,
        maxDpr: 2.0,
      });

      await controller.init(canvas);
      controller.updateCanvasSize();

      // 800 * 2.0 = 1600
      expect(canvas.width).toBe(1600);
      expect(canvas.height).toBe(1200);
    });

    it('pauses render loop when document.hidden is true and resumes when document becomes visible', async () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
      const cancelRafSpy = vi.spyOn(window, 'cancelAnimationFrame');

      const canvas = document.createElement('canvas');
      const mockGl = createMockWebGL2Context();
      vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl as unknown as WebGL2RenderingContext);

      const controller = createController({
        hasWebGL2: true,
        prefersReducedMotion: false,
      });

      await controller.init(canvas);
      expect(rafSpy).toHaveBeenCalled();
      const initialRafCalls = rafSpy.mock.calls.length;

      // Hide document (e.g. user switched browser tabs)
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(cancelRafSpy).toHaveBeenCalled();

      // Unhide document
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      expect(rafSpy.mock.calls.length).toBeGreaterThan(initialRafCalls);
    });

    it('does not resume render loop on visibilitychange if user manually paused', async () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
      const canvas = document.createElement('canvas');
      const mockGl = createMockWebGL2Context();
      vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl as unknown as WebGL2RenderingContext);

      const controller = createController({
        hasWebGL2: true,
        prefersReducedMotion: false,
      });

      await controller.init(canvas);

      // User explicitly pauses
      controller.pause();
      const callsAfterPause = rafSpy.mock.calls.length;

      // Document switches hidden -> visible
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      // Loop should NOT have resumed because user explicitly paused
      expect(rafSpy.mock.calls.length).toBe(callsAfterPause);

      // Now manually resume
      controller.resume();
      expect(rafSpy.mock.calls.length).toBeGreaterThan(callsAfterPause);
    });

    it('provides pauseVisuals and resumeVisuals aliases conforming to module interface', async () => {
      const canvas = document.createElement('canvas');
      const mockGl = createMockWebGL2Context();
      vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl as unknown as WebGL2RenderingContext);

      const controller = createController({ hasWebGL2: true, prefersReducedMotion: false });
      await controller.init(canvas);

      const cancelRafSpy = vi.spyOn(window, 'cancelAnimationFrame');
      controller.pauseVisuals();
      expect(cancelRafSpy).toHaveBeenCalled();

      const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
      controller.resumeVisuals();
      expect(rafSpy).toHaveBeenCalled();
    });
  });

  describe('4. Curated Artwork Catalog & Navigation', () => {
    it('initializes with default artwork from curated catalog', () => {
      const controller = createController({ hasWebGL2: false });
      const current = controller.getCurrentImage();

      expect(current).toBeDefined();
      expect(current.id).toBe(getDefaultArtwork().id);
      expect(current.title).toBe('Fine Wind, Clear Morning (Red Fuji)');
      expect(current.artist).toBe('Katsushika Hokusai');
      expect(current.license).toBe('Public Domain');
      expect(current.src).toContain('hokusai-red-fuji');
    });

    it('provides getCurrentCredit returning conforming VisualCredit metadata', () => {
      const controller = createController({ hasWebGL2: false });
      const credit = controller.getCurrentCredit();

      expect(credit).toEqual({
        id: 'haven-art-fuji-morning',
        title: 'Fine Wind, Clear Morning (Red Fuji)',
        artist: 'Katsushika Hokusai',
        license: 'Public Domain',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Katsushika_Hokusai_-_Fine_Wind,_Clear_Morning_(Gaif%C5%AB_kaisei)_-_Google_Art_Project.jpg',
      });
    });

    it('navigates circularly with nextImage and previousImage', () => {
      const controller = createController({ hasWebGL2: false });
      const initial = controller.getCurrentImage();

      const second = controller.nextImage();
      expect(second.id).toBe('haven-art-monet-waterlilies');

      const third = controller.nextImage();
      expect(third.id).toBe('haven-art-turner-evening-star');

      const prev = controller.previousImage();
      expect(prev.id).toBe(second.id);

      const backToInitial = controller.previousImage();
      expect(backToInitial.id).toBe(initial.id);

      // Circular wrap backwards from start to end
      const wrappedEnd = controller.previousImage();
      const all = getAllArtworks();
      expect(wrappedEnd.id).toBe(all[all.length - 1].id);
    });

    it('invokes onArtworkChange callback during navigation', () => {
      const onArtworkChange = vi.fn();
      const controller = createController({
        hasWebGL2: false,
        onArtworkChange,
      });

      controller.nextImage();
      expect(onArtworkChange).toHaveBeenCalledTimes(1);
      expect(onArtworkChange).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'haven-art-monet-waterlilies' })
      );
    });

    it('preloads only the immediate next image in sequence', () => {
      const createdImages: { src: string }[] = [];
      const originalImage = globalThis.Image;

      class MockImage {
        private _src = '';
        set src(v: string) {
          this._src = v;
          createdImages.push({ src: v });
        }
        get src() {
          return this._src;
        }
      }

      globalThis.Image = MockImage as unknown as typeof Image;

      try {
        const controller = createController({ hasWebGL2: false });
        // Constructor preloaded index 1 (next after index 0)
        expect(createdImages.length).toBe(1);
        expect(createdImages[0].src).toBe(CURATED_ARTWORKS[1].src);

        // Next navigation: moves to index 1, preloads index 2
        controller.nextImage();
        expect(createdImages.length).toBe(2);
        expect(createdImages[1].src).toBe(CURATED_ARTWORKS[2].src);
      } finally {
        globalThis.Image = originalImage;
      }
    });

    it('exposes catalog helper utilities', () => {
      const all = getAllArtworks();
      expect(all.length).toBeGreaterThanOrEqual(4);

      const single = getArtworkById('haven-art-monet-waterlilies');
      expect(single?.title).toBe('Water Lilies (Nymphéas)');

      const notFound = getArtworkById('non-existent-id');
      expect(notFound).toBeUndefined();

      expect(getDefaultArtwork().id).toBe('haven-art-fuji-morning');
    });
  });

  describe('5. WebGL Pipeline Initialization & Lifecycle Cleanup', () => {
    it('compiles shaders, links program, sets uniforms and draws quad', async () => {
      const canvas = document.createElement('canvas');
      const mockGl = createMockWebGL2Context();
      vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl as unknown as WebGL2RenderingContext);

      const controller = createController({
        hasWebGL2: true,
        prefersReducedMotion: false,
      });

      await controller.init(canvas);

      expect(mockGl.createShader).toHaveBeenCalledTimes(2);
      expect(mockGl.compileShader).toHaveBeenCalledTimes(2);
      expect(mockGl.createProgram).toHaveBeenCalledTimes(1);
      expect(mockGl.linkProgram).toHaveBeenCalledTimes(1);
      expect(mockGl.createVertexArray).toHaveBeenCalledTimes(1);
      expect(mockGl.createBuffer).toHaveBeenCalledTimes(1);
      expect(mockGl.bufferData).toHaveBeenCalledTimes(1);
      expect(mockGl.getUniformLocation).toHaveBeenCalledWith(expect.anything(), 'u_time');
      expect(mockGl.getUniformLocation).toHaveBeenCalledWith(expect.anything(), 'u_resolution');
    });

    it('gracefully degrades to static mode if canvas.getContext("webgl2") returns null', async () => {
      const canvas = document.createElement('canvas');
      vi.spyOn(canvas, 'getContext').mockReturnValue(null);

      const controller = createController({
        hasWebGL2: true,
        prefersReducedMotion: false,
      });

      await controller.init(canvas);
      expect(controller.getActiveMode()).toBe('static');
    });

    it('gracefully degrades to static mode if shader compilation throws', async () => {
      const canvas = document.createElement('canvas');
      const mockGl = createMockWebGL2Context();
      mockGl.getShaderParameter.mockReturnValue(false); // Simulate compilation failure
      mockGl.getShaderInfoLog.mockReturnValue('Syntax error in fragment shader');

      vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl as unknown as WebGL2RenderingContext);

      const controller = createController({
        hasWebGL2: true,
        prefersReducedMotion: false,
      });

      await controller.init(canvas);
      expect(controller.getActiveMode()).toBe('static');
    });

    it('cleans up WebGL resources and event listeners on destroy()', async () => {
      const canvas = document.createElement('canvas');
      const mockGl = createMockWebGL2Context();
      vi.spyOn(canvas, 'getContext').mockReturnValue(mockGl as unknown as WebGL2RenderingContext);

      const removeEventListenerCanvas = vi.spyOn(canvas, 'removeEventListener');
      const removeEventListenerDoc = vi.spyOn(document, 'removeEventListener');
      const removeEventListenerWin = vi.spyOn(window, 'removeEventListener');
      const cancelRafSpy = vi.spyOn(window, 'cancelAnimationFrame');

      const controller = createController({
        hasWebGL2: true,
        prefersReducedMotion: false,
      });

      await controller.init(canvas);
      controller.destroy();

      expect(cancelRafSpy).toHaveBeenCalled();
      expect(removeEventListenerCanvas).toHaveBeenCalledWith('webglcontextlost', expect.any(Function));
      expect(removeEventListenerDoc).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      expect(removeEventListenerWin).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(mockGl.deleteBuffer).toHaveBeenCalled();
      expect(mockGl.deleteVertexArray).toHaveBeenCalled();
      expect(mockGl.deleteProgram).toHaveBeenCalled();
      expect(mockGl.deleteShader).toHaveBeenCalledTimes(2);

      // Repeated destroy is safe no-op
      expect(() => controller.destroy()).not.toThrow();
    });
  });
});
