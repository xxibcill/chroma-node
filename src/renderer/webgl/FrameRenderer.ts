import type { DecodedFrame } from "../../shared/ipc";

const vertexShaderSource = `#version 300 es
in vec2 aPosition;
in vec2 aTexCoord;

out vec2 vTexCoord;

uniform vec2 uScale;

void main() {
  vTexCoord = aTexCoord;
  gl_Position = vec4(aPosition * uScale, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 vTexCoord;
out vec4 outColor;

uniform sampler2D uFrame;

vec4 applyColor(vec4 source) {
  return source;
}

void main() {
  outColor = applyColor(texture(uFrame, vTexCoord));
}
`;

export class FrameRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly texture: WebGLTexture;
  private readonly scaleLocation: WebGLUniformLocation;
  private readonly resizeObserver: ResizeObserver;
  private imageSize: { width: number; height: number } | undefined;

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
    this.program = createProgram(context, vertexShaderSource, fragmentShaderSource);
    this.texture = createTexture(context);
    this.scaleLocation = mustGetUniformLocation(context, this.program, "uScale");

    this.createGeometry();
    this.resizeObserver = new ResizeObserver(() => this.render());
    this.resizeObserver.observe(canvas);
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

  dispose(): void {
    this.resizeObserver.disconnect();
    this.gl.deleteTexture(this.texture);
    this.gl.deleteProgram(this.program);
  }

  private createGeometry(): void {
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

    const positionLocation = gl.getAttribLocation(this.program, "aPosition");
    const texCoordLocation = gl.getAttribLocation(this.program, "aTexCoord");
    const stride = 4 * Float32Array.BYTES_PER_ELEMENT;

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);
  }

  private render(): void {
    const gl = this.gl;
    resizeCanvasToDisplaySize(this.canvas);

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.067, 0.071, 0.06, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (!this.imageSize) {
      return;
    }

    const scale = containScale(this.canvas.width, this.canvas.height, this.imageSize.width, this.imageSize.height);
    gl.useProgram(this.program);
    gl.uniform2f(this.scaleLocation, scale.x, scale.y);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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
