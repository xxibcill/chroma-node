import type { DecodedFrame } from "../../shared/ipc";
import type { ColorNode, PrimaryCorrection } from "../../shared/colorEngine";
import {
  createColorNode,
  generateColorFragmentShader,
  normalizeNodeGraph
} from "../../shared/colorEngine";
import type { ViewerMode } from "../../shared/project";

const vertexShaderSource = `#version 300 es
layout(location = 0) in vec2 aPosition;
layout(location = 1) in vec2 aTexCoord;

out vec2 vTexCoord;

uniform vec2 uScale;

void main() {
  vTexCoord = aTexCoord;
  gl_Position = vec4(aPosition * uScale, 0.0, 1.0);
}
`;

interface ShaderUniforms {
  frame: WebGLUniformLocation;
  scale: WebGLUniformLocation;
  viewerMode: WebGLUniformLocation;
  splitPosition: WebGLUniformLocation;
  enabled: WebGLUniformLocation;
  lift: WebGLUniformLocation;
  gamma: WebGLUniformLocation;
  gain: WebGLUniformLocation;
  offset: WebGLUniformLocation;
  contrast: WebGLUniformLocation;
  pivot: WebGLUniformLocation;
  saturation: WebGLUniformLocation;
  temperature: WebGLUniformLocation;
  tint: WebGLUniformLocation;
}

export class FrameRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private readonly texture: WebGLTexture;
  private readonly vao: WebGLVertexArrayObject;
  private readonly vertexBuffer: WebGLBuffer;
  private readonly resizeObserver: ResizeObserver;
  private uniforms: ShaderUniforms;
  private imageSize: { width: number; height: number } | undefined;
  private nodes: ColorNode[] = [createColorNode(1)];
  private viewerMode: ViewerMode = "graded";
  private splitPosition = 0.5;
  private videoSource: HTMLVideoElement | undefined;
  private isPlaybackActive = false;
  private animationFrameId: number | undefined;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true
    });

    if (!context) {
      throw new Error("WebGL2 is not available in this renderer.");
    }

    this.gl = context;
    this.program = createProgram(context, vertexShaderSource, generateColorFragmentShader(this.nodes.length));
    this.texture = createTexture(context);
    this.uniforms = getShaderUniforms(context, this.program);
    const geometry = this.createGeometry();
    this.vao = geometry.vao;
    this.vertexBuffer = geometry.buffer;
    this.resizeObserver = new ResizeObserver(() => this.render());
    this.resizeObserver.observe(canvas);
    this.uploadGraphUniforms();
    this.render();
  }

  async setFrame(frame: DecodedFrame): Promise<void> {
    const image = await loadImage(frame.dataUrl);
    this.imageSize = {
      width: frame.width || image.naturalWidth,
      height: frame.height || image.naturalHeight
    };

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
    this.render();
  }

  setVideoSource(video: HTMLVideoElement | undefined): void {
    this.videoSource = video;
    this.render();
  }

  setPlaybackActive(isActive: boolean): void {
    this.isPlaybackActive = isActive;
    if (isActive) {
      this.requestVideoFrame();
      return;
    }

    if (this.animationFrameId !== undefined) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }

    this.render();
  }

  setNodeGraph(nodes: readonly ColorNode[]): void {
    const normalized = normalizeNodeGraph(nodes);
    const shouldRecompile = normalized.length !== this.nodes.length;
    this.nodes = normalized;

    if (shouldRecompile) {
      const nextProgram = createProgram(this.gl, vertexShaderSource, generateColorFragmentShader(this.nodes.length));
      this.gl.deleteProgram(this.program);
      this.program = nextProgram;
      this.uniforms = getShaderUniforms(this.gl, this.program);
    }

    this.uploadGraphUniforms();
    this.render();
  }

  setViewerMode(mode: ViewerMode, splitPosition: number): void {
    this.viewerMode = mode;
    this.splitPosition = Math.min(1, Math.max(0, splitPosition));
    this.uploadViewerUniforms();
    this.render();
  }

  dispose(): void {
    if (this.animationFrameId !== undefined) {
      window.cancelAnimationFrame(this.animationFrameId);
    }

    this.resizeObserver.disconnect();
    this.gl.deleteBuffer(this.vertexBuffer);
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteTexture(this.texture);
    this.gl.deleteProgram(this.program);
  }

  private createGeometry(): { vao: WebGLVertexArrayObject; buffer: WebGLBuffer } {
    const gl = this.gl;
    const vertices = new Float32Array([
      -1, 1, 0, 0,
      -1, -1, 0, 1,
      1, 1, 1, 0,
      1, -1, 1, 1
    ]);

    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    if (!vao || !buffer) {
      throw new Error("Could not create WebGL geometry.");
    }

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const stride = 4 * Float32Array.BYTES_PER_ELEMENT;

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

    return { vao, buffer };
  }

  private render(): void {
    const gl = this.gl;
    resizeCanvasToDisplaySize(this.canvas);

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.067, 0.071, 0.06, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.uploadVideoFrameIfNeeded();

    if (!this.imageSize) {
      return;
    }

    const scale = containScale(this.canvas.width, this.canvas.height, this.imageSize.width, this.imageSize.height);
    gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.scale, scale.x, scale.y);
    this.uploadViewerUniforms();
    this.uploadGraphUniforms();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private uploadVideoFrameIfNeeded(): void {
    const video = this.videoSource;
    if (!this.isPlaybackActive || !video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width <= 0 || height <= 0) {
      return;
    }

    this.imageSize = { width, height };
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, video);
  }

  private requestVideoFrame(): void {
    if (this.animationFrameId !== undefined) {
      return;
    }

    const renderLoop = () => {
      this.animationFrameId = undefined;
      if (!this.isPlaybackActive) {
        return;
      }

      this.render();
      this.animationFrameId = window.requestAnimationFrame(renderLoop);
    };

    this.animationFrameId = window.requestAnimationFrame(renderLoop);
  }

  private uploadViewerUniforms(): void {
    const mode = this.viewerMode === "original" ? 0 : this.viewerMode === "graded" ? 1 : 2;
    this.gl.useProgram(this.program);
    this.gl.uniform1i(this.uniforms.frame, 0);
    this.gl.uniform1i(this.uniforms.viewerMode, mode);
    this.gl.uniform1f(this.uniforms.splitPosition, this.splitPosition);
  }

  private uploadGraphUniforms(): void {
    const gl = this.gl;
    const enabled = new Int32Array(this.nodes.map((node) => (node.enabled ? 1 : 0)));
    const lift = flattenRgb(this.nodes.map((node) => node.primaries.lift));
    const gamma = flattenRgb(this.nodes.map((node) => node.primaries.gamma));
    const gain = flattenRgb(this.nodes.map((node) => node.primaries.gain));
    const offset = flattenRgb(this.nodes.map((node) => node.primaries.offset));
    const contrast = flattenScalar(this.nodes.map((node) => node.primaries.contrast));
    const pivot = flattenScalar(this.nodes.map((node) => node.primaries.pivot));
    const saturation = flattenScalar(this.nodes.map((node) => node.primaries.saturation));
    const temperature = flattenScalar(this.nodes.map((node) => node.primaries.temperature));
    const tint = flattenScalar(this.nodes.map((node) => node.primaries.tint));

    gl.useProgram(this.program);
    gl.uniform1iv(this.uniforms.enabled, enabled);
    gl.uniform3fv(this.uniforms.lift, lift);
    gl.uniform3fv(this.uniforms.gamma, gamma);
    gl.uniform3fv(this.uniforms.gain, gain);
    gl.uniform3fv(this.uniforms.offset, offset);
    gl.uniform1fv(this.uniforms.contrast, contrast);
    gl.uniform1fv(this.uniforms.pivot, pivot);
    gl.uniform1fv(this.uniforms.saturation, saturation);
    gl.uniform1fv(this.uniforms.temperature, temperature);
    gl.uniform1fv(this.uniforms.tint, tint);
  }
}

function createTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Could not create WebGL texture.");
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

function createProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
  const program = gl.createProgram();
  if (!program) {
    throw new Error("Could not create WebGL program.");
  }

  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "Could not link WebGL program.");
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  return program;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Could not create WebGL shader.");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "Could not compile WebGL shader.");
  }

  return shader;
}

function mustGetUniformLocation(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string
): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);
  if (!location) {
    throw new Error(`Missing WebGL uniform: ${name}`);
  }
  return location;
}

function getShaderUniforms(gl: WebGL2RenderingContext, program: WebGLProgram): ShaderUniforms {
  return {
    frame: mustGetUniformLocation(gl, program, "uFrame"),
    scale: mustGetUniformLocation(gl, program, "uScale"),
    viewerMode: mustGetUniformLocation(gl, program, "uViewerMode"),
    splitPosition: mustGetUniformLocation(gl, program, "uSplitPosition"),
    enabled: mustGetUniformLocation(gl, program, "uEnabled[0]"),
    lift: mustGetUniformLocation(gl, program, "uLift[0]"),
    gamma: mustGetUniformLocation(gl, program, "uGamma[0]"),
    gain: mustGetUniformLocation(gl, program, "uGain[0]"),
    offset: mustGetUniformLocation(gl, program, "uOffset[0]"),
    contrast: mustGetUniformLocation(gl, program, "uContrast[0]"),
    pivot: mustGetUniformLocation(gl, program, "uPivot[0]"),
    saturation: mustGetUniformLocation(gl, program, "uSaturation[0]"),
    temperature: mustGetUniformLocation(gl, program, "uTemperature[0]"),
    tint: mustGetUniformLocation(gl, program, "uTint[0]")
  };
}

function flattenRgb(values: PrimaryCorrection[keyof Pick<PrimaryCorrection, "lift" | "gamma" | "gain" | "offset">][]): Float32Array {
  return new Float32Array(values.flatMap((value) => [value.r, value.g, value.b]));
}

function flattenScalar(values: number[]): Float32Array {
  return new Float32Array(values);
}

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): void {
  const pixelRatio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
  const height = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

export function containScale(
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } {
  const canvasAspect = canvasWidth / Math.max(1, canvasHeight);
  const imageAspect = imageWidth / Math.max(1, imageHeight);

  if (canvasAspect > imageAspect) {
    return { x: imageAspect / canvasAspect, y: 1 };
  }

  return { x: 1, y: canvasAspect / imageAspect };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not decode preview frame image."));
    image.src = dataUrl;
  });
}
