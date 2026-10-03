import {
  type Artwork,
  type VisualCredit,
  CURATED_ARTWORKS,
  getAllArtworks,
  getArtworkById,
  getDefaultArtwork,
} from './artworks';
import ambientVertRaw from '../../shaders/ambient.vert?raw';
import ambientFragRaw from '../../shaders/ambient.frag?raw';

export {
  type Artwork,
  type VisualCredit,
  CURATED_ARTWORKS,
  getAllArtworks,
  getArtworkById,
  getDefaultArtwork,
};

export type VisualMode = 'shader' | 'static';

export interface VisualControllerOptions {
  hasWebGL2?: boolean;
  prefersReducedMotion?: boolean;
  artworks?: Artwork[];
  maxDpr?: number;
  canvas?: HTMLCanvasElement;
  vertexShaderSource?: string;
  fragmentShaderSource?: string;
  onModeChange?: (mode: VisualMode) => void;
  onArtworkChange?: (artwork: Artwork) => void;
}

const DEFAULT_VERT_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = (a_position + 1.0) * 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const DEFAULT_FRAG_SHADER = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform vec2 u_resolution;

void main() {
  vec2 uv = gl_FragCoord.xy / max(u_resolution.xy, vec2(1.0, 1.0));
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 p = uv;
  p.x *= aspect;

  float t = u_time * 0.04;
  float wave1 = sin(p.x * 1.8 + t + sin(p.y * 2.2 + t * 0.6));
  float wave2 = cos(p.y * 2.0 - t * 0.7 + cos(p.x * 1.6 + t * 0.5));
  float wave3 = sin((p.x + p.y) * 1.5 + t * 0.9);

  float blend = (wave1 + wave2 + wave3) / 3.0;
  blend = smoothstep(-0.8, 0.8, blend);

  vec3 colBase = vec3(0.984, 0.976, 0.961);
  vec3 colMist = vec3(0.910, 0.929, 0.918);
  vec3 colAmber = vec3(0.957, 0.925, 0.882);

  vec3 col = mix(colBase, colMist, blend);
  float accentFactor = sin(t * 0.5 + uv.y * 1.5) * 0.15 + 0.15;
  col = mix(col, colAmber, accentFactor);

  fragColor = vec4(col, 1.0);
}
`;

function detectWebGL2Support(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  try {
    const testCanvas = document.createElement('canvas');
    return !!(
      testCanvas.getContext &&
      (testCanvas.getContext('webgl2') || testCanvas.getContext('experimental-webgl2'))
    );
  } catch {
    return false;
  }
}

function detectPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export class VisualController {
  private mode: VisualMode = 'shader';
  private userRequestedMode: VisualMode = 'shader';
  private hasWebGL2: boolean;
  private prefersReducedMotion: boolean;
  private isContextLost: boolean = false;
  private maxDpr: number;

  private artworks: Artwork[];
  private currentArtworkIndex: number = 0;

  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private vertexShader: WebGLShader | null = null;
  private fragmentShader: WebGLShader | null = null;
  private quadBuffer: WebGLBuffer | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private uTimeLoc: WebGLUniformLocation | null = null;
  private uResLoc: WebGLUniformLocation | null = null;

  private animationFrameId: number | null = null;
  private startTime: number = 0;
  private pausedAt: number = 0;
  private currentElapsedSec: number = 0;
  private isPaused: boolean = false;
  private isManuallyPaused: boolean = false;
  private isDestroyed: boolean = false;

  private vertexShaderSource: string;
  private fragmentShaderSource: string;

  private options: VisualControllerOptions;

  private boundHandleVisibilityChange: (() => void) | null = null;
  private boundHandleContextLost: ((e: Event) => void) | null = null;
  private boundHandleContextRestored: ((e: Event) => void) | null = null;
  private boundHandleResize: (() => void) | null = null;
  private boundHandleReducedMotionChange: ((e: MediaQueryListEvent) => void) | null = null;
  private reducedMotionMediaQuery: MediaQueryList | null = null;

  constructor(options: VisualControllerOptions = {}) {
    this.options = options;
    this.hasWebGL2 = options.hasWebGL2 !== undefined ? options.hasWebGL2 : detectWebGL2Support();
    this.prefersReducedMotion =
      options.prefersReducedMotion !== undefined
        ? options.prefersReducedMotion
        : detectPrefersReducedMotion();

    this.maxDpr = options.maxDpr ?? 1.5;
    this.artworks = options.artworks && options.artworks.length > 0
      ? [...options.artworks]
      : getAllArtworks();

    this.vertexShaderSource =
      options.vertexShaderSource || ambientVertRaw || DEFAULT_VERT_SHADER;
    this.fragmentShaderSource =
      options.fragmentShaderSource || ambientFragRaw || DEFAULT_FRAG_SHADER;

    // Evaluate initial mode based on environment support and accessibility
    if (!this.hasWebGL2 || this.prefersReducedMotion) {
      this.mode = 'static';
      this.userRequestedMode = 'static';
    } else {
      this.mode = 'shader';
      this.userRequestedMode = 'shader';
    }

    this.setupAccessibilityListener();
    this.preloadNextImage();

    if (options.canvas) {
      void this.init(options.canvas);
    }
  }

  /**
   * Initializes the canvas and WebGL2 rendering pipeline if supported.
   * Gracefully degrades to static image mode if WebGL2 is unavailable or context fails.
   */
  public async init(canvas: HTMLCanvasElement): Promise<void> {
    if (this.isDestroyed) return;
    this.canvas = canvas;

    this.setupWindowListeners();

    // If WebGL2 is unsupported or reduced motion active, ensure static mode and return early
    if (!this.hasWebGL2 || this.prefersReducedMotion) {
      this.mode = 'static';
      this.preloadNextImage();
      return;
    }

    try {
      const gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
        preserveDrawingBuffer: false,
      }) as WebGL2RenderingContext | null;

      if (!gl) {
        this.fallbackToStatic('Failed to acquire WebGL2 rendering context');
        return;
      }

      this.gl = gl;
      this.setupContextLostListeners(canvas);
      this.compileShadersAndProgram(gl);
      this.createFullscreenQuad(gl);

      if (this.mode === 'shader' && !this.isPaused) {
        this.startLoop();
      }
    } catch (err) {
      this.fallbackToStatic(`WebGL2 pipeline initialization error: ${String(err)}`);
    }
  }

  /**
   * Returns current active presentation mode: 'shader' or 'static'.
   */
  public getActiveMode(): VisualMode {
    return this.mode;
  }

  /**
   * Contract alias for getActiveMode().
   */
  public getVisualMode(): VisualMode {
    return this.getActiveMode();
  }

  /**
   * Sets active presentation mode with strict hardware & accessibility gating.
   */
  public setMode(mode: VisualMode): void {
    if (this.isDestroyed) return;
    this.userRequestedMode = mode;

    if (mode === 'shader') {
      if (!this.hasWebGL2 || this.prefersReducedMotion || this.isContextLost) {
        // Force static fallback if WebGL2 is missing, context is lost, or reduced-motion requested
        this.mode = 'static';
        this.stopLoop();
        this.options.onModeChange?.('static');
        return;
      }

      this.mode = 'shader';
      if (this.canvas && !this.gl) {
        void this.init(this.canvas);
      } else if (!this.isPaused) {
        this.startLoop();
      }
      this.options.onModeChange?.(this.mode);
    } else {
      this.mode = 'static';
      this.stopLoop();
      this.preloadNextImage();
      this.options.onModeChange?.('static');
    }
  }

  /**
   * Contract alias for setMode(mode).
   */
  public setVisualMode(mode: VisualMode): void {
    this.setMode(mode);
  }

  /**
   * Pauses the WebGL render loop (e.g. user toggled pause or document is hidden).
   */
  public pause(): void {
    this.isPaused = true;
    this.isManuallyPaused = true;
    this.pauseLoop();
  }

  /**
   * Contract alias for pause().
   */
  public pauseVisuals(): void {
    this.pause();
  }

  /**
   * Resumes the WebGL render loop if in shader mode.
   */
  public resume(): void {
    this.isPaused = false;
    this.isManuallyPaused = false;

    if (this.mode === 'shader' && !this.isDestroyed && !this.isContextLost) {
      this.startLoop();
    }
  }

  /**
   * Contract alias for resume().
   */
  public resumeVisuals(): void {
    this.resume();
  }

  /**
   * Returns currently selected artwork object.
   */
  public getCurrentImage(): Artwork {
    return this.artworks[this.currentArtworkIndex] || getDefaultArtwork();
  }

  /**
   * Returns current artwork attribution / credit metadata conforming to VisualCredit.
   */
  public getCurrentCredit(): VisualCredit {
    const art = this.getCurrentImage();
    return {
      id: art.id,
      title: art.title,
      artist: art.artist,
      license: art.license,
      sourceUrl: art.sourceUrl,
    };
  }

  /**
   * Navigates to the next artwork with circular wraparound and preloads the subsequent image.
   */
  public nextImage(): Artwork {
    if (this.artworks.length > 0) {
      this.currentArtworkIndex = (this.currentArtworkIndex + 1) % this.artworks.length;
    }
    const current = this.getCurrentImage();
    this.preloadNextImage();
    this.options.onArtworkChange?.(current);
    return current;
  }

  /**
   * Navigates to the previous artwork with circular wraparound and preloads the subsequent image.
   */
  public previousImage(): Artwork {
    if (this.artworks.length > 0) {
      this.currentArtworkIndex =
        (this.currentArtworkIndex - 1 + this.artworks.length) % this.artworks.length;
    }
    const current = this.getCurrentImage();
    this.preloadNextImage();
    this.options.onArtworkChange?.(current);
    return current;
  }

  /**
   * Sets the active artwork directly (e.g., from weather, mood, or smart session selector).
   */
  public setArtwork(artwork: Artwork): Artwork {
    const existingIndex = this.artworks.findIndex((a) => a.id === artwork.id);
    if (existingIndex !== -1) {
      this.currentArtworkIndex = existingIndex;
    } else {
      this.artworks.push(artwork);
      this.currentArtworkIndex = this.artworks.length - 1;
    }
    this.preloadNextImage();
    this.options.onArtworkChange?.(artwork);
    return artwork;
  }

  /**
   * Cleans up all WebGL resources, timers, animation loops, and DOM event listeners.
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.stopLoop();

    // Remove window and document event listeners
    if (typeof document !== 'undefined' && this.boundHandleVisibilityChange) {
      document.removeEventListener('visibilitychange', this.boundHandleVisibilityChange);
      this.boundHandleVisibilityChange = null;
    }

    if (typeof window !== 'undefined' && this.boundHandleResize) {
      window.removeEventListener('resize', this.boundHandleResize);
      this.boundHandleResize = null;
    }

    if (this.reducedMotionMediaQuery && this.boundHandleReducedMotionChange) {
      this.reducedMotionMediaQuery.removeEventListener('change', this.boundHandleReducedMotionChange);
      this.boundHandleReducedMotionChange = null;
      this.reducedMotionMediaQuery = null;
    }

    // Remove canvas context loss listeners
    if (this.canvas) {
      if (this.boundHandleContextLost) {
        this.canvas.removeEventListener('webglcontextlost', this.boundHandleContextLost);
        this.boundHandleContextLost = null;
      }
      if (this.boundHandleContextRestored) {
        this.canvas.removeEventListener('webglcontextrestored', this.boundHandleContextRestored);
        this.boundHandleContextRestored = null;
      }
    }

    // Release WebGL resources
    if (this.gl) {
      const gl = this.gl;
      if (this.quadBuffer) {
        gl.deleteBuffer(this.quadBuffer);
        this.quadBuffer = null;
      }
      if (this.vao) {
        gl.deleteVertexArray(this.vao);
        this.vao = null;
      }
      if (this.program) {
        if (this.vertexShader) {
          gl.detachShader(this.program, this.vertexShader);
          gl.deleteShader(this.vertexShader);
          this.vertexShader = null;
        }
        if (this.fragmentShader) {
          gl.detachShader(this.program, this.fragmentShader);
          gl.deleteShader(this.fragmentShader);
          this.fragmentShader = null;
        }
        gl.deleteProgram(this.program);
        this.program = null;
      }
      this.gl = null;
    }

    this.canvas = null;
  }

  // ---------------------------------------------------------------------------
  // Internal WebGL & Event Pipeline
  // ---------------------------------------------------------------------------

  private fallbackToStatic(reason?: string): void {
    if (reason && typeof console !== 'undefined' && console.warn) {
      console.warn(`[Haven VisualController] Falling back to static mode: ${reason}`);
    }
    this.mode = 'static';
    this.stopLoop();
    this.preloadNextImage();
    this.options.onModeChange?.('static');
  }

  private setupAccessibilityListener(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    try {
      this.reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.boundHandleReducedMotionChange = (e: MediaQueryListEvent) => {
        this.prefersReducedMotion = e.matches;
        if (this.prefersReducedMotion) {
          this.fallbackToStatic('prefers-reduced-motion is active');
        } else if (this.userRequestedMode === 'shader' && this.hasWebGL2 && !this.isContextLost) {
          this.setMode('shader');
        }
      };
      this.reducedMotionMediaQuery.addEventListener('change', this.boundHandleReducedMotionChange);
    } catch {
      // Graceful ignore if matchMedia addEventListener is unsupported
    }
  }

  private setupWindowListeners(): void {
    if (typeof document !== 'undefined' && !this.boundHandleVisibilityChange) {
      this.boundHandleVisibilityChange = () => {
        if (document.hidden) {
          // Tab hidden: pause render loop to conserve mobile power and GPU battery
          this.pauseLoop();
        } else {
          // Tab visible: resume loop if in shader mode and not manually paused
          if (this.mode === 'shader' && !this.isPaused && !this.isManuallyPaused && !this.isContextLost) {
            this.startLoop();
          }
        }
      };
      document.addEventListener('visibilitychange', this.boundHandleVisibilityChange);
    }

    if (typeof window !== 'undefined' && !this.boundHandleResize) {
      this.boundHandleResize = () => {
        this.updateCanvasSize();
      };
      window.addEventListener('resize', this.boundHandleResize, { passive: true });
    }
  }

  private setupContextLostListeners(canvas: HTMLCanvasElement): void {
    this.boundHandleContextLost = (e: Event) => {
      e.preventDefault();
      this.isContextLost = true;
      this.fallbackToStatic('webglcontextlost event received');
    };
    canvas.addEventListener('webglcontextlost', this.boundHandleContextLost);

    this.boundHandleContextRestored = () => {
      this.isContextLost = false;
      if (this.userRequestedMode === 'shader' && !this.prefersReducedMotion && this.hasWebGL2) {
        this.mode = 'shader';
        if (this.canvas) {
          if (this.gl) {
            try {
              this.compileShadersAndProgram(this.gl);
              this.createFullscreenQuad(this.gl);
              if (!this.isPaused) {
                this.startLoop();
              }
            } catch {
              this.fallbackToStatic('Failed to recompile shaders on context restoration');
              return;
            }
          } else {
            void this.init(this.canvas);
          }
        }
        this.options.onModeChange?.(this.mode);
      }
    };
    canvas.addEventListener('webglcontextrestored', this.boundHandleContextRestored);
  }

  private compileShadersAndProgram(gl: WebGL2RenderingContext): void {
    const vert = gl.createShader(gl.VERTEX_SHADER);
    if (!vert) throw new Error('Failed to create WebGL vertex shader');
    gl.shaderSource(vert, this.vertexShaderSource);
    gl.compileShader(vert);
    if (!gl.getShaderParameter(vert, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(vert);
      gl.deleteShader(vert);
      throw new Error(`Vertex shader compilation failed: ${info || 'unknown'}`);
    }
    this.vertexShader = vert;

    const frag = gl.createShader(gl.FRAGMENT_SHADER);
    if (!frag) throw new Error('Failed to create WebGL fragment shader');
    gl.shaderSource(frag, this.fragmentShaderSource);
    gl.compileShader(frag);
    if (!gl.getShaderParameter(frag, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(frag);
      gl.deleteShader(frag);
      throw new Error(`Fragment shader compilation failed: ${info || 'unknown'}`);
    }
    this.fragmentShader = frag;

    const program = gl.createProgram();
    if (!program) throw new Error('Failed to create WebGL program');
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Shader program link failed: ${info || 'unknown'}`);
    }
    this.program = program;

    this.uTimeLoc = gl.getUniformLocation(program, 'u_time');
    this.uResLoc = gl.getUniformLocation(program, 'u_resolution');
  }

  private createFullscreenQuad(gl: WebGL2RenderingContext): void {
    if (!this.program) return;

    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Failed to create WebGL VertexArrayObject');
    gl.bindVertexArray(vao);
    this.vao = vao;

    const quadBuffer = gl.createBuffer();
    if (!quadBuffer) throw new Error('Failed to create WebGL Buffer');
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    this.quadBuffer = quadBuffer;

    const aPosLoc = gl.getAttribLocation(this.program, 'a_position');
    if (aPosLoc >= 0) {
      gl.enableVertexAttribArray(aPosLoc);
      gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);
    }

    gl.bindVertexArray(null);
  }

  /**
   * Resizes the canvas buffer capped strictly to maxDpr (defaults to 1.5)
   * to conserve GPU compute and mobile battery life.
   */
  public updateCanvasSize(): void {
    if (!this.canvas) return;

    const dpr = typeof window !== 'undefined'
      ? Math.min(window.devicePixelRatio || 1, this.maxDpr)
      : 1;

    const displayWidth = Math.max(1, Math.floor((this.canvas.clientWidth || 800) * dpr));
    const displayHeight = Math.max(1, Math.floor((this.canvas.clientHeight || 600) * dpr));

    if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
      this.canvas.width = displayWidth;
      this.canvas.height = displayHeight;
    }

    if (this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private startLoop(): void {
    if (this.animationFrameId !== null || this.isDestroyed || !this.gl || !this.program) {
      return;
    }

    if (this.pausedAt > 0) {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.startTime += (now - this.pausedAt);
      this.pausedAt = 0;
    } else if (this.startTime === 0) {
      this.startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    }

    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  }

  private pauseLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      this.pausedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    }
  }

  private stopLoop(): void {
    this.pauseLoop();
    this.pausedAt = 0;
    this.startTime = 0;
  }

  private renderLoop = (timeMs: number): void => {
    if (
      this.isDestroyed ||
      this.isPaused ||
      this.mode !== 'shader' ||
      !this.gl ||
      !this.program ||
      this.isContextLost
    ) {
      this.animationFrameId = null;
      return;
    }

    this.updateCanvasSize();

    const elapsed = Math.max(0, (timeMs - this.startTime) / 1000.0);
    this.currentElapsedSec = elapsed;

    const gl = this.gl;
    gl.useProgram(this.program);

    if (this.uTimeLoc) {
      gl.uniform1f(this.uTimeLoc, elapsed);
    }
    if (this.uResLoc && this.canvas) {
      gl.uniform2f(this.uResLoc, this.canvas.width, this.canvas.height);
    }

    if (this.vao) {
      gl.bindVertexArray(this.vao);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindVertexArray(null);
    }

    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  };

  /**
   * Preloads only the immediate next image in catalog sequence to conserve network bandwidth.
   */
  private preloadNextImage(): void {
    if (typeof window === 'undefined' || typeof Image === 'undefined') return;
    if (this.artworks.length <= 1) return;

    const nextIndex = (this.currentArtworkIndex + 1) % this.artworks.length;
    const nextArt = this.artworks[nextIndex];
    if (nextArt && nextArt.src) {
      try {
        const img = new Image();
        img.src = nextArt.src;
      } catch {
        // Safe preload swallow in non-standard runtimes
      }
    }
  }
}

/**
 * Convenience factory to initialize VisualController on a canvas element.
 */
export async function initVisuals(
  canvas: HTMLCanvasElement,
  options?: VisualControllerOptions
): Promise<VisualController> {
  const controller = new VisualController(options);
  await controller.init(canvas);
  return controller;
}
